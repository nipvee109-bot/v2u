"""The orchestrator: project manager, agent router, quota/resume manager and autonomous loop."""
from __future__ import annotations

import json
import os
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from typing import Callable

import quota
import tasks as T
from agents import READ, WRITE, AgentResult, BaseAgent, make_agents
from git_manager import GitManager, sanitize_commit_message
from goal import Goal, load_goal, load_rules, rules_forbid_push
from prompts import build_prompt, extract_json, human_gate_reason
from state import (AGENTS, AVAILABLE, BUSY, COOLDOWN, ERROR, GOAL_COMPLETE, IMPLEMENTING, IMPROVING,
                   INITIALIZING, NEEDS_HUMAN, PAUSED, PLANNING, PROJECT_STABLE, REVIEWING, UNAVAILABLE,
                   VALIDATING, WAITING_FOR_QUOTA, ProjectPaths, StateStore, atomic_write_json, iso, utcnow)
from ui import UI, bar
from validation import detect_commands, run_validation, summarize

WRITE_ROLES = {"implement", "fix"}
ROLE_LABEL = {"plan": "planning", "plan_merge": "backlog review", "analyze": "architecture analysis",
              "implement": "implementation", "review": "code review", "fix": "review fixes",
              "evaluate": "goal evaluation", "discover_product": "improvement discovery",
              "discover_engineering": "improvement discovery", "review_project": "project review"}
STATUS_FOR_PHASE = {"analyze": PLANNING, "implement": IMPLEMENTING, "review": REVIEWING, "fix": IMPLEMENTING,
                    "validate": VALIDATING, "checkpoint": VALIDATING}


class AllAgentsDown(Exception):
    """No agent can take work right now (quota cooldown and/or logged out)."""


class AgentCallFailed(Exception):
    """Every usable agent failed with a non-quota error for this call."""


class HumanNeeded(Exception):
    def __init__(self, question: str, task_id: str | None = None):
        super().__init__(question)
        self.question = question
        self.task_id = task_id


class PauseRequested(Exception):
    pass


def _pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    if os.name == "nt":
        import ctypes
        handle = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION
        if not handle:
            return False
        code = ctypes.c_ulong()
        ctypes.windll.kernel32.GetExitCodeProcess(handle, ctypes.byref(code))
        ctypes.windll.kernel32.CloseHandle(handle)
        return code.value == 259  # STILL_ACTIVE
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


class Manager:
    def __init__(self, root: Path, cfg: dict, *, agents: dict[str, BaseAgent] | None = None,
                 git: GitManager | None = None, dry_run: bool = False, ui: UI | None = None,
                 clock: Callable[[], datetime] = utcnow, sleeper: Callable[[float], None] = time.sleep,
                 run_validation_fn=None):
        self.cfg = cfg
        self.dry_run = dry_run
        self.paths = ProjectPaths(root, "dry-run" if dry_run else None)
        self.paths.ensure()
        self.store = StateStore(self.paths)
        self.taskstore = T.TaskStore(self.paths)
        self.state = self.store.load()
        self.tasks = self.taskstore.load()
        self.agents = agents if agents is not None else make_agents(cfg)
        self.git = git or GitManager(self.paths.root, dry_run=dry_run)
        self.ui = ui or UI()
        self.clock = clock
        self.sleep = sleeper
        self.quota = quota.QuotaManager(self.state, cfg["quotaProbeMinutes"])
        self.lock = threading.RLock()
        self.probe_lock = threading.Lock()
        self.goal: Goal | None = None
        self.rules = ""
        self._validate = run_validation_fn or (lambda cmds: run_validation(self.paths.root, cmds, cfg["validationTimeoutMinutes"]))

    # ------------------------------------------------------------------ persistence
    def save(self) -> None:
        with self.lock:
            self.taskstore.save(self.tasks)
            self.store.save(self.state)

    def log(self, event: str, **kw) -> None:
        self.store.log(event, cycle=self.state.get("cycle"), **kw)

    def set_status(self, status: str, reason: str = "") -> None:
        with self.lock:
            self.taskstore.save(self.tasks)
            self.store.set_status(self.state, status, reason)

    def owned(self) -> set[str]:
        return set(self.state.get("ownedPaths", []))

    def add_owned(self, paths: set[str]) -> None:
        self.state["ownedPaths"] = sorted(self.owned() | set(paths))

    # ------------------------------------------------------------------ pause / lock
    def check_pause(self) -> None:
        if self.paths.pause_flag.exists():
            raise PauseRequested()

    def acquire_lock(self) -> bool:
        lock = self.paths.lock
        if lock.exists():
            try:
                info = json.loads(lock.read_text(encoding="utf-8"))
                if _pid_alive(int(info.get("pid", 0))) and int(info.get("pid", 0)) != os.getpid():
                    return False
            except (ValueError, OSError):
                pass
        atomic_write_json(lock, {"pid": os.getpid(), "since": iso(utcnow())})
        return True

    def release_lock(self) -> None:
        try:
            self.paths.lock.unlink()
        except OSError:
            pass

    # ------------------------------------------------------------------ routing
    def preferences(self, role: str) -> list[str]:
        if role in ("implement", "fix", "plan_merge", "discover_engineering"):
            first = self.cfg["preferredImplementer"]
        elif role in ("review", "review_project"):
            first = self.cfg["preferredReviewer"]
        else:
            first = self.cfg["preferredPlanner"]
        return [first] + [a for a in AGENTS if a != first]

    def probe_due_agents(self) -> None:
        with self.probe_lock:  # parallel calls must not probe the same agent twice
            self._probe_due_agents()

    def _probe_due_agents(self) -> None:
        for name in AGENTS:
            if not self.quota.probe_due(name, self.clock()):
                continue
            self.ui.agent(name, "probing usage availability...")
            res = self.agents[name].probe(self.paths.root)
            with self.lock:
                if res.ok:
                    self.quota.mark_available(name)
                    self.ui.agent(name, "usage available again -> AVAILABLE")
                    self.log("quota_recovered", agent=name)
                elif res.outcome in (quota.AUTH, quota.NOT_FOUND):
                    self.quota.mark_unavailable(name, res.detail)
                    self.ui.agent(name, f"needs login -> UNAVAILABLE ({res.detail})")
                    self.log("agent_unavailable", agent=name, detail=res.detail)
                else:  # still limited (or flaky): back to cooldown, next probe one full interval later
                    nxt = self.quota.mark_cooldown(name, res.detail or res.outcome, self.clock(), res.reset_at)
                    self.ui.agent(name, f"still limited -> COOLDOWN until {iso(nxt)}")
                    self.log("quota_probe_failed", agent=name, outcome=res.outcome, nextProbe=iso(nxt))
                self.save()

    def pick(self, role: str, exclude: set[str], prefer: str | None = None) -> str | None:
        self.probe_due_agents()
        order = self.preferences(role)
        if prefer in order:
            order = [prefer] + [a for a in order if a != prefer]
        usable = [a for a in order if a not in exclude and self.quota.usable(a)]
        healthy = [a for a in usable if self.quota.status(a) in (AVAILABLE, BUSY)]
        return (healthy or usable or [None])[0]

    def call(self, role: str, ctx: dict, *, task: dict | None = None, phase: str | None = None,
             prefer: str | None = None) -> tuple[str, AgentResult, dict]:
        tried: set[str] = set()
        primary = self.preferences(role)[0] if prefer is None else prefer
        while True:
            name = self.pick(role, tried, prefer)
            if name is None:
                if self.quota.all_down():
                    raise AllAgentsDown(role)
                raise AgentCallFailed(f"{role}: all agents failed")
            if name != primary:
                self.ui.say(f"Fallback: {name.capitalize()} will handle {ROLE_LABEL.get(role, role)} temporarily.")
            local = dict(ctx)
            if task is not None and phase and task["partial"].get(phase):
                local["partial"] = task["partial"][phase]
            prompt = build_prompt(role, local, self.cfg["maxContextChars"])
            mode = WRITE if role in WRITE_ROLES else READ
            with self.lock:
                prev = self.quota.status(name)
                self.quota.set_status(name, BUSY)
                self.save()
            self.ui.agent(name, f"{ROLE_LABEL.get(role, role)}...")
            self.log("agent_call", agent=name, role=role, task=task["id"] if task else None, mode=mode)
            res = self.agents[name].invoke(prompt, mode, self.paths.root)
            with self.lock:
                self.quota.set_status(name, prev if prev != BUSY else AVAILABLE)
                report = self.store.write_report(
                    f"{self.clock().strftime('%Y%m%d-%H%M%S')}-{task['id'] if task else 'project'}-{role}-{name}.md",
                    f"# {role} by {name}\noutcome: {res.outcome} {res.detail}\nexit: {res.exit_code}\n\n{res.text}\n\n## stderr\n{res.stderr}")
                if task is not None:
                    task["reports"].append(report.name)
                self.log("agent_result", agent=name, role=role, task=task["id"] if task else None,
                         outcome=res.outcome, detail=res.detail[:300], seconds=round(res.duration, 1), report=report.name)
                if res.ok:
                    self.quota.mark_available(name)
                    if task is not None and phase:
                        task["partial"].pop(phase, None)
                    self.save()
                    parsed = extract_json(res.text) or {}
                    self.ui.agent(name, f"{ROLE_LABEL.get(role, role)} complete")
                    return name, res, parsed
                tried.add(name)
                if task is not None and phase and res.text.strip():
                    prior = task["partial"].get(phase, "")
                    task["partial"][phase] = (prior + f"\n--- partial output from {name} ---\n" + res.text)[-12000:]
                other = next(a for a in AGENTS if a != name)
                if res.outcome == quota.QUOTA:
                    nxt = self.quota.mark_cooldown(name, res.detail, self.clock(), res.reset_at)
                    self.ui.agent(name, "usage limit reached")
                    self.ui.say(f"{name.capitalize()} -> COOLDOWN (next probe {iso(nxt)})")
                    self.log("quota_exhausted", agent=name, detail=res.detail, nextProbe=iso(nxt))
                    self.log("fallback", from_agent=name, to_agent=other, role=role)
                elif res.outcome in (quota.AUTH, quota.NOT_FOUND):
                    self.quota.mark_unavailable(name, res.detail)
                    self.ui.agent(name, f"unavailable: {res.detail}. Please log in again (run '{name}' and sign in).")
                    self.log("agent_unavailable", agent=name, detail=res.detail)
                else:
                    self.quota.mark_error(name, res.detail)
                    self.ui.agent(name, f"error ({res.outcome}): {res.detail[:160]}")
                    self.log("agent_error", agent=name, outcome=res.outcome, detail=res.detail)
                self.save()

    def run_parallel(self, calls: list[tuple]) -> list:
        """calls: [(role, ctx, prefer)] -> [(name,res,parsed) | Exception]. Read-only roles only."""
        def one(c):
            try:
                return self.call(c[0], c[1], prefer=c[2])
            except (AllAgentsDown, AgentCallFailed) as exc:
                return exc
        if self.cfg.get("parallelAnalysis") and len(calls) > 1:
            with ThreadPoolExecutor(max_workers=len(calls)) as ex:
                return list(ex.map(one, calls))
        return [one(c) for c in calls]

    # ------------------------------------------------------------------ context
    def context(self, task: dict | None = None, *, diff: bool = False, **extra) -> dict:
        st = self.state
        summary = (f"mode={st['mode']} status={st['status']} cycle={st['cycle']} currentTask={st['currentTaskId']} "
                   f"lastCompleted={st['lastCompletedTask']} lastCommit={st['lastCommit']}")
        tasks_summary = "\n".join(f"{t['id']} [{t['status']}] ({t['kind']}) {t['title']}" for t in self.tasks)
        ctx = {"goal": self.goal.raw if self.goal else "", "rules": self.rules, "state_summary": summary,
               "tasks_summary": tasks_summary, "task": task, "git_status": self.git.status_short()}
        if task is not None:
            ctx["reports"] = "\n\n".join(f"[{p} by {o['agent']}]\n{o['text'][-4000:]}" for p, o in task["phaseOutputs"].items())
        if diff:
            ctx["git_diff"] = self.git.diff(self.cfg["maxDiffChars"])
        ctx.update({k: v for k, v in extra.items() if v})
        return ctx

    def record_phase(self, task: dict, phase: str, name: str, res: AgentResult, parsed: dict) -> None:
        task["phaseOutputs"][phase] = {"agent": name, "text": res.text[-6000:], "json": parsed, "at": iso(utcnow())}

    def check_needs_human(self, parsed: dict, task: dict | None = None) -> None:
        q = parsed.get("needsHuman") if isinstance(parsed, dict) else None
        if q and str(q).strip().lower() not in ("null", "none", "false", "no"):
            raise HumanNeeded(str(q), task["id"] if task else None)

    # ------------------------------------------------------------------ preflight
    def load_project(self) -> None:
        self.goal = load_goal(self.paths.goal)
        self.rules = load_rules(self.paths.rules)

    def preflight(self) -> bool:
        self.ui.banner()
        if not self.git.available():
            return self.to_human("Git is not installed or not on PATH.")
        if not self.git.is_repo():
            return self.to_human(f"{self.paths.root} is not the root of a Git repository. Run 'git init' (and an initial commit) first.")
        self.load_project()
        if self.goal is None:
            return self.to_human("GOAL.md is missing. Run 'aiteam init' and write your goal into GOAL.md.")
        if self.goal.is_template:
            return self.to_human("GOAL.md is still the template. Paste your real goal and delete the AITEAM_TEMPLATE line.")
        if self.git.has_conflicts():
            return self.to_human("Git has unresolved merge conflicts. Resolve them, then run 'aiteam start'.")
        user = self.git.user_changes(self.owned())
        if user:
            listing = "\n".join(f"  - {p}" for p in sorted(user)[:30])
            return self.to_human("Uncommitted changes that were NOT made by AI-Team were found. AI-Team will not touch them.\n"
                                 f"Commit or stash them first, then run 'aiteam start':\n{listing}")
        if self.state["goalHash"] != self.goal.hash:
            if self.state["goalHash"]:
                self.ui.say("GOAL.md changed -> re-planning against the new goal.")
                self.state["replan"] = True
                if self.state["mode"] == "IMPROVEMENT" or self.state["status"] == PROJECT_STABLE:
                    self.state["mode"] = "GOAL"
            self.log("goal_loaded", hash=self.goal.hash, previous=self.state["goalHash"])
            self.state["goalHash"] = self.goal.hash
            self.state["goalVersion"] = self.state.get("goalVersion", 0) + 1
        self.state["project"] = self.paths.root.name
        # CLI availability (never touches auth config; just runs --version / tiny probe)
        for name in AGENTS:
            ok, info = self.agents[name].check_installed(self.paths.root)
            if not ok:
                self.quota.mark_unavailable(name, info)
                self.ui.agent(name, f"not available: {info}")
                self.log("agent_unavailable", agent=name, detail=info)
            elif self.cfg.get("startupProbe") and self.quota.status(name) != COOLDOWN:
                res = self.agents[name].probe(self.paths.root)
                if res.ok:
                    self.quota.mark_available(name)
                elif res.outcome == quota.QUOTA:
                    self.quota.mark_cooldown(name, res.detail, self.clock(), res.reset_at)
                elif res.outcome in (quota.AUTH, quota.NOT_FOUND):
                    self.quota.mark_unavailable(name, res.detail)
                    self.ui.agent(name, f"login required: run '{self.agents[name].cfg['command']}' and sign in "
                                        f"(Claude: Claude account / Codex: Sign in with ChatGPT).")
                else:
                    self.quota.mark_error(name, res.detail)
        self.save()
        if all(self.quota.status(a) == UNAVAILABLE for a in AGENTS):
            return self.to_human("Neither Claude Code nor Codex CLI is usable (missing or not logged in). "
                                 "Install/login: run 'claude' and 'codex' once interactively, then 'aiteam start'.")
        return True

    def to_human(self, question: str, task_id: str | None = None) -> bool:
        with self.lock:
            self.state.setdefault("humanQuestions", [])
            entry = {"question": question, "task": task_id, "at": iso(utcnow())}
            if not any(q["question"] == question for q in self.state["humanQuestions"]):
                self.state["humanQuestions"].append(entry)
            self.store.write_report("NEEDS_HUMAN.md", "# Decisions needed\n\n" + "\n\n".join(
                f"- ({q['task'] or 'project'}) {q['question']}" for q in self.state["humanQuestions"]))
            self.set_status(NEEDS_HUMAN, question[:300])
        self.ui.say("")
        self.ui.say("STATUS: NEEDS_HUMAN")
        self.ui.say(question)
        self.ui.say(f"(saved to {self.paths.reports / 'NEEDS_HUMAN.md'})")
        return False

    # ------------------------------------------------------------------ main entry
    def run(self, *, improve: bool = False) -> str:
        if not self.acquire_lock():
            self.ui.say("Another 'aiteam start' is already running for this project.")
            return "locked"
        try:
            self.state["humanQuestions"] = []
            if not self.preflight():
                return self.state["status"]
            if improve:
                self.state["mode"] = "IMPROVEMENT"
                self.state["stableRounds"] = 0
                self.state["improvementRound"] = 0
            while True:
                try:
                    return self.loop()
                except AllAgentsDown:
                    if self.wait_for_quota() != "resumed":
                        return self.state["status"]
                except PauseRequested:
                    if self.state["status"] == NEEDS_HUMAN:
                        return NEEDS_HUMAN
                    self.set_status(PAUSED, "pause requested")
                    self.ui.say("Paused after saving state. Safe to close terminal. Run 'aiteam resume' to continue.")
                    return PAUSED
                except KeyboardInterrupt:
                    self.set_status(PAUSED, "interrupted by user (Ctrl+C)")
                    self.ui.say("\nInterrupted. State saved. Safe to close terminal. Run 'aiteam start' to continue.")
                    return PAUSED
        finally:
            self.release_lock()

    def loop(self) -> str:
        eval_rounds_without_progress = 0
        while self.state["cycle"] < self.cfg["maxCycles"]:
            self.check_pause()
            if self.state.get("replan") or not [t for t in self.tasks if t["kind"] == "goal"]:
                self.plan()
                continue
            T.refresh_blocked(self.tasks)
            task = T.select_next(self.tasks)
            if task:
                self.run_task(task)
                self.state["cycle"] += 1
                self.save()
                continue
            waiting = [t for t in self.tasks if t["status"] in (T.NEEDS_HUMAN, T.BLOCKED)
                       or (t["status"] == T.FAILED and t.get("humanQuestion"))]
            if waiting:
                qs = "; ".join(f"{t['id']}: {t.get('humanQuestion') or 'blocked by ' + ','.join(t['dependencies'])}" for t in waiting)
                self.to_human(f"Remaining tasks need a decision: {qs}. Answer with 'aiteam answer <TASK> \"...\"'.")
                return NEEDS_HUMAN
            if self.state["mode"] == "GOAL":
                before = len(self.tasks)
                if self.evaluate_goal():
                    self.set_status(GOAL_COMPLETE, "independent evaluation passed")
                    self.ui.say(c_ok("GOAL COMPLETE"))
                    self.log("goal_complete")
                    if not self.cfg["improvementMode"]:
                        self.set_status(PROJECT_STABLE, "improvement mode disabled")
                        return PROJECT_STABLE
                    self.state["mode"] = "IMPROVEMENT"
                    self.state["stableRounds"] = 0
                    self.save()
                    continue
                if len(self.tasks) == before:
                    eval_rounds_without_progress += 1
                    if eval_rounds_without_progress >= 2:
                        self.to_human("Claude and Codex keep disagreeing on whether the goal is complete and propose no "
                                      "concrete work. Please clarify the Definition of Done in GOAL.md.")
                        return NEEDS_HUMAN
                else:
                    eval_rounds_without_progress = 0
                continue
            # improvement mode
            if self.state["improvementRound"] >= self.cfg["maxImprovementRounds"]:
                self.set_status(PROJECT_STABLE, "max improvement rounds reached")
                return self.stable()
            created = self.discover()
            if created == 0:
                self.state["stableRounds"] = self.state.get("stableRounds", 0) + 1
                if self.state["stableRounds"] >= self.cfg["stableRoundsRequired"]:
                    self.set_status(PROJECT_STABLE, "no meaningful improvements left")
                    return self.stable()
            else:
                self.state["stableRounds"] = 0
            self.save()
        self.set_status(PAUSED, "maxCycles reached (safety limit); run 'aiteam start' to continue")
        self.ui.say("Safety limit maxCycles reached. State saved.")
        return PAUSED

    def stable(self) -> str:
        self.ui.say("")
        self.ui.say(c_ok("PROJECT_STABLE") + " - no meaningful improvement remains. Nothing more to do.")
        self.log("project_stable", rounds=self.state["improvementRound"])
        return PROJECT_STABLE

    # ------------------------------------------------------------------ planning
    def plan(self) -> None:
        self.set_status(PLANNING, "building task backlog")
        self.ui.say("Planning: analysing GOAL.md and repository...")
        ctx = self.context()
        try:
            name, res, parsed = self.call("plan", ctx, prefer=self.cfg["preferredPlanner"])
            self.check_needs_human(parsed)
            proposal = parsed
            try:
                other = [a for a in AGENTS if a != name][0]
                if self.quota.usable(other):
                    _, res2, parsed2 = self.call("plan_merge", self.context(proposal=json.dumps(proposal, indent=1)), prefer=other)
                    self.check_needs_human(parsed2)
                    if parsed2.get("tasks"):
                        proposal = parsed2
            except AgentCallFailed:
                pass  # second opinion is optional; keep the first plan
        except HumanNeeded as h:
            self.to_human(h.question)
            raise PauseRequested() from None
        except AgentCallFailed:
            self.state["planFailures"] = self.state.get("planFailures", 0) + 1
            if self.state["planFailures"] >= self.cfg["maxTaskRetries"]:
                self.to_human("Planning failed repeatedly (agents returned errors). See .aiteam/reports.")
                raise PauseRequested() from None
            return
        items = proposal.get("tasks") or []
        if not items:
            self.state["planFailures"] = self.state.get("planFailures", 0) + 1
            if self.state["planFailures"] >= self.cfg["maxTaskRetries"]:
                self.to_human("Agents could not produce a parsable task backlog. See .aiteam/reports.")
                raise PauseRequested()
            return
        self.state["planFailures"] = 0
        self.add_tasks(items, kind="goal", replace_pending=bool(self.state.get("replan")))
        self.state["replan"] = False
        self.save()

    def add_tasks(self, items: list[dict], *, kind: str, replace_pending: bool = False, source: str = "") -> int:
        if replace_pending:
            dropped = [t["id"] for t in self.tasks if t["kind"] == kind and t["status"] in (T.BACKLOG, T.READY, T.BLOCKED)]
            self.tasks = [t for t in self.tasks if t["id"] not in dropped]
            if dropped:
                self.log("tasks_dropped_for_replan", tasks=dropped)
        existing = {_norm(t["title"]): t for t in self.tasks}
        key_to_id: dict[str, str] = {}
        created = []
        for item in items:
            title = str(item.get("title", "")).strip()
            if not title:
                continue
            prior = existing.get(_norm(title))
            if prior is not None:
                key_to_id[str(item.get("key", title))] = prior["id"]
                if prior["status"] == T.FAILED:
                    prior["humanQuestion"] = (f"Task '{title}' is needed for the goal but FAILED earlier "
                                              f"({prior.get('failureReason', '')}). Retry it ('aiteam answer {prior['id']} retry') or adjust GOAL.md?")
                continue
            tid = T.next_id(self.tasks, "I" if kind == "improvement" else "T")
            task = T.new_task(tid, title, str(item.get("description", "")), priority=item.get("priority", "medium"),
                              impact=item.get("impact", "medium"), risk=item.get("risk", "medium"),
                              effort=item.get("effort", "medium"), acceptance=item.get("acceptanceCriteria") or [],
                              kind=kind, source=source)
            task["_deps"] = [str(d) for d in item.get("dependsOn", []) or []]
            key_to_id[str(item.get("key", title))] = tid
            self.tasks.append(task)
            existing[_norm(title)] = task
            created.append(task)
        for task in created:
            task["dependencies"] = [key_to_id[d] for d in task.pop("_deps") if d in key_to_id and key_to_id[d] != task["id"]]
            reason = human_gate_reason(f"{task['title']}\n{task['description']}", self.cfg["allowDeploy"])
            if reason:
                task["humanQuestion"] = f"'{task['title']}' involves {reason}. Approve (with instructions) or skip?"
                T.transition(task, T.NEEDS_HUMAN)
                self.log("human_gate", task=task["id"], reason=reason)
            else:
                T.transition(task, T.READY)
        self.log("tasks_created", kind=kind, tasks=[t["id"] for t in created])
        if created:
            self.ui.say(f"Backlog: {len(created)} new {kind} task(s).")
        return len(created)

    # ------------------------------------------------------------------ task pipeline
    def run_task(self, task: dict) -> None:
        self.state["currentTaskId"] = task["id"]
        if task["status"] in (T.READY, T.BACKLOG):
            T.transition(task, T.IN_PROGRESS)
        self.save()
        self.ui.say("")
        self.ui.say(f"Current Task: {task['id']} {task['title']}  (phase: {task['phase']})")
        self.log("task_start", task=task["id"], phase=task["phase"], attempts=task["attempts"])
        try:
            while task["phase"] != "done" and task["status"] not in (T.FAILED, T.NEEDS_HUMAN):
                self.check_pause()
                self.set_status(IMPROVING if self.state["mode"] == "IMPROVEMENT" and task["phase"] == "analyze"
                                else STATUS_FOR_PHASE[task["phase"]], f"{task['id']} {task['phase']}")
                getattr(self, "phase_" + task["phase"])(task)
                self.save()
        except HumanNeeded as h:
            self.log("human_gate", task=task["id"], question=h.question)
            task["humanQuestion"] = h.question
            dirty = self.git.changed_paths() & self.owned()
            if task["status"] == T.REVIEW:
                T.transition(task, T.IN_PROGRESS)
            T.transition(task, T.NEEDS_HUMAN)
            self.state["currentTaskId"] = None
            self.save()
            if dirty:  # work in progress in the tree: stop everything rather than mix tasks
                self.to_human(f"{task['id']} '{task['title']}': {h.question}", task["id"])
                raise PauseRequested() from None
            self.ui.say(f"{task['id']} needs a human decision; continuing with other tasks.")
        except AgentCallFailed as exc:
            task["attempts"] += 1
            self.log("task_attempt_failed", task=task["id"], error=str(exc), attempts=task["attempts"])
            if task["attempts"] >= self.cfg["maxTaskRetries"]:
                self.fail_task(task, f"agents failed repeatedly: {exc}")
            self.save()

    def phase_analyze(self, task: dict) -> None:
        name, res, parsed = self.call("analyze", self.context(task), task=task, phase="analyze",
                                      prefer=self.cfg["preferredPlanner"])
        self.record_phase(task, "analyze", name, res, parsed)
        self.check_needs_human(parsed, task)
        task["phase"] = "implement"

    def phase_implement(self, task: dict) -> None:
        before = self.git.changed_paths()
        try:
            name, res, parsed = self.call("implement", self.context(task, diff=bool(task["partial"].get("implement"))),
                                          task=task, phase="implement", prefer=self.cfg["preferredImplementer"])
        finally:
            self.add_owned(self.git.changed_paths() - (before - self.owned()))
        self.record_phase(task, "implement", name, res, parsed)
        task["commitMessage"] = parsed.get("commitMessage") or task["commitMessage"]
        self.check_needs_human(parsed, task)
        T.transition(task, T.REVIEW)
        task["phase"] = "review"

    def phase_review(self, task: dict) -> None:
        name, res, parsed = self.call("review", self.context(task, diff=True), task=task, phase="review",
                                      prefer=self.cfg["preferredReviewer"])
        self.record_phase(task, "review", name, res, parsed)
        self.check_needs_human(parsed, task)
        findings = [f for f in parsed.get("findings", []) if isinstance(f, dict)]
        task["reviewFindings"] = findings
        blocking = [f for f in findings if str(f.get("severity", "")).lower() in ("critical", "major")]
        self.log("review", task=task["id"], agent=name, approve=parsed.get("approve"), findings=len(findings),
                 blocking=len(blocking))
        if parsed.get("approve") is True and not blocking and not findings:
            task["phase"] = "validate"
        else:
            task["phase"] = "fix"

    def phase_fix(self, task: dict) -> None:
        if task["status"] == T.REVIEW:
            T.transition(task, T.IN_PROGRESS)
        findings = json.dumps(task["reviewFindings"], indent=1, ensure_ascii=False) if task["reviewFindings"] else ""
        val = task.get("validation") or {}
        failures = "\n\n".join(f"[{s['name']} FAIL] {' '.join(s['argv'])}\n{s['output']}"
                               for s in val.get("steps", []) if not s["ok"]) if val.get("passed") is False else ""
        before = self.git.changed_paths()
        try:
            name, res, parsed = self.call("fix", self.context(task, diff=True, findings=findings, validation=failures),
                                          task=task, phase="fix", prefer=self.cfg["preferredImplementer"])
        finally:
            self.add_owned(self.git.changed_paths() - (before - self.owned()))
        self.record_phase(task, "fix", name, res, parsed)
        if parsed.get("commitMessage"):
            task["commitMessage"] = parsed["commitMessage"]
        self.log("fix", task=task["id"], agent=name, fixed=len(parsed.get("fixed", []) or []),
                 rejected=len(parsed.get("rejected", []) or []))
        self.check_needs_human(parsed, task)
        if task["status"] == T.IN_PROGRESS:
            T.transition(task, T.REVIEW)
        task["phase"] = "validate"

    def validation_commands(self) -> dict:
        return detect_commands(self.paths.root, self.cfg.get("validation"))

    def run_checks(self) -> dict:
        cmds = self.validation_commands()
        if self.dry_run:
            return {"passed": True, "configured": bool(cmds), "summary": {k: "SKIPPED (dry-run)" for k in cmds}, "steps": []}
        if not cmds:
            return {"passed": True, "configured": False, "summary": {"validation": "NOT CONFIGURED"}, "steps": []}
        results = self._validate(cmds)
        return {"passed": all(r.ok for r in results), "configured": True, "summary": summarize(results),
                "steps": [{"name": r.name, "argv": r.argv, "ok": r.ok, "output": r.output[-3000:]} for r in results]}

    def phase_validate(self, task: dict) -> None:
        val = self.run_checks()
        task["validation"] = val
        for k, v in val["summary"].items():
            self.ui.say(f"{k.capitalize():<9}: {v}")
        self.log("validation", task=task["id"], summary=val["summary"], passed=val["passed"])
        if self.git.has_conflicts():
            raise HumanNeeded("Git conflict appeared in the working tree during this task.", task["id"])
        if val["passed"]:
            task["phase"] = "checkpoint"
            return
        task["attempts"] += 1
        if task["attempts"] >= self.cfg["maxTaskRetries"]:
            self.fail_task(task, "validation still failing after max retries")
            return
        task["phase"] = "fix"

    def phase_checkpoint(self, task: dict) -> None:
        paths = (self.git.changed_paths() & self.owned()) | (self.git.changed_paths() & {"GOAL.md", "PROJECT_RULES.md"})
        msg = sanitize_commit_message(task.get("commitMessage"), task["title"])
        commit = None
        if paths:
            r = self.git.commit(paths, msg)
            if r.ok:
                commit = self.git.head() if not self.dry_run else "dry-run"
                self.ui.say(f"Committed: {msg}")
                self.log("commit", task=task["id"], commit=commit, message=msg, files=len(paths))
                if self.cfg["autoPush"] and self.git.has_origin() and not rules_forbid_push(self.rules):
                    p = self.git.push()
                    self.log("push", ok=p.ok, detail=(p.err or p.out)[-300:])
                    self.ui.say("Pushed to origin." if p.ok else f"Push failed (will retry next checkpoint): {(p.err or '')[-160:]}")
            else:
                self.log("commit_failed", task=task["id"], detail=(r.err or r.out)[-500:])
                self.ui.say(f"Commit failed: {(r.err or r.out)[-200:]}")
                raise AgentCallFailed("git commit failed")
        else:
            self.ui.say("No file changes for this task (nothing to commit).")
        checkpoint = {"task": task["id"], "commit": commit, "validation": task["validation"]["summary"] if task.get("validation") else None,
                      "at": iso(utcnow()), "message": msg}
        atomic_write_json(self.paths.checkpoints / f"{self.clock().strftime('%Y%m%d-%H%M%S')}-{task['id']}.json", checkpoint)
        T.transition(task, T.DONE)
        task["phase"] = "done"
        self.state["ownedPaths"] = sorted(self.owned() - paths) if not self.dry_run else []
        self.state["lastCompletedTask"] = task["id"]
        self.state["currentTaskId"] = None
        self.state["lastCheckpoint"] = checkpoint["at"]
        if commit:
            self.state["lastCommit"] = commit
        self.ui.say("Checkpoint saved.")
        self.print_progress()

    def fail_task(self, task: dict, reason: str) -> None:
        owned_dirty = self.git.changed_paths() & self.owned()
        stash_msg = f"aiteam-failed-{task['id']}"
        if owned_dirty:
            self.git.stash_paths(owned_dirty, stash_msg)
            self.state["ownedPaths"] = sorted(self.owned() - owned_dirty)
            reason += f" (changes parked in git stash '{stash_msg}', not deleted)"
        if task["status"] == T.REVIEW:
            T.transition(task, T.IN_PROGRESS)
        T.transition(task, T.FAILED)
        task["phase"] = "analyze"
        task["failureReason"] = reason
        self.state["currentTaskId"] = None
        self.log("task_failed", task=task["id"], reason=reason)
        self.ui.say(f"Task {task['id']} FAILED: {reason}")
        self.save()

    # ------------------------------------------------------------------ goal evaluation
    def evaluate_goal(self) -> bool:
        self.set_status(VALIDATING, "independent goal evaluation")
        self.ui.say("")
        self.ui.say("All goal tasks finished -> independent goal evaluation by both agents...")
        checks = self.run_checks()
        git_sane = not self.git.has_conflicts() and not self.git.user_changes(self.owned())
        val_text = json.dumps(checks["summary"])
        ctx = self.context(diff=False, validation=val_text)
        results = self.run_parallel([("evaluate", ctx, "claude"), ("evaluate", ctx, "codex")])
        evals = [r for r in results if not isinstance(r, Exception)]
        if not evals:
            if all(isinstance(r, AllAgentsDown) for r in results):
                raise AllAgentsDown("evaluate")
            raise AgentCallFailed("goal evaluation failed")
        for _, _, parsed in evals:
            self.check_needs_human_project(parsed)
        verdicts = [bool(p.get("complete")) and not p.get("critical") for _, _, p in evals]
        # Two independent verdicts are required. If only one agent could answer, have the same agent re-check
        # adversarially once more later rather than trusting a single opinion now.
        if len(evals) == 2 and verdicts[0] != verdicts[1]:
            self.ui.say("Evaluations conflict -> extra verification round.")
            self.log("goal_eval_conflict", verdicts=verdicts)
            second = []
            for (name, _, parsed), (oname, _, oparsed) in zip(evals, reversed(evals)):
                try:
                    second.append(self.call("evaluate", self.context(validation=val_text, other_eval=json.dumps(oparsed)), prefer=name))
                except AgentCallFailed:
                    pass
            if second:
                evals = second
                verdicts = [bool(p.get("complete")) and not p.get("critical") for _, _, p in evals]
        independent = len({n for n, _, _ in evals}) == 2 or self.state.get("singleAgentEvalOk")
        complete = all(verdicts) and checks["passed"] and git_sane and independent
        self.state["goalEvaluation"] = {"at": iso(utcnow()), "verdicts": {n: v for (n, _, _), v in zip(evals, verdicts)},
                                        "validation": checks["summary"], "gitSane": git_sane, "complete": complete}
        self.log("goal_evaluation", **self.state["goalEvaluation"])
        if complete:
            return True
        if not (all(verdicts) and not independent):
            self.state["singleAgentEvalOk"] = False
        if all(verdicts) and not independent:
            # Only one agent available: accept only after it agreed twice in separate rounds.
            self.state["singleAgentEvalOk"] = True
            self.ui.say("Only one agent could evaluate; will re-verify next round before declaring completion.")
            return False
        new_items = []
        for _, _, p in evals:
            for u in p.get("unmet", []) or []:
                if isinstance(u, dict):
                    title = u.get("suggestedTask") or f"Satisfy requirement: {u.get('requirement', '')}"
                    new_items.append({"title": title, "description": f"{u.get('requirement', '')}\nEvidence: {u.get('evidence', '')}",
                                      "priority": "high", "impact": "high",
                                      "acceptanceCriteria": [u.get("requirement") or title]})
                elif str(u).strip():
                    new_items.append({"title": str(u), "priority": "high", "impact": "high", "acceptanceCriteria": [str(u)]})
            for crit in p.get("critical", []) or []:
                new_items.append({"title": f"Fix critical issue: {str(crit)[:120]}", "description": str(crit),
                                  "priority": "high", "impact": "high", "acceptanceCriteria": [str(crit)]})
        if not checks["passed"]:
            failing = [s["name"] for s in checks["steps"] if not s["ok"]]
            new_items.append({"title": f"Fix failing validation: {', '.join(failing)}", "priority": "high", "impact": "high",
                              "description": "\n".join(s["output"][-1500:] for s in checks["steps"] if not s["ok"]),
                              "acceptanceCriteria": [f"{n} passes" for n in failing]})
        self.add_tasks(new_items, kind="goal", source="goal-evaluation")
        self.save()
        return False

    def check_needs_human_project(self, parsed: dict) -> None:
        try:
            self.check_needs_human(parsed)
        except HumanNeeded as h:
            self.to_human(h.question)
            raise PauseRequested() from None

    # ------------------------------------------------------------------ improvement mode
    def discover(self) -> int:
        self.state["improvementRound"] = self.state.get("improvementRound", 0) + 1
        rnd = self.state["improvementRound"]
        self.set_status(IMPROVING, f"improvement discovery round {rnd}")
        self.ui.say("")
        self.ui.say(f"IMPROVEMENT MODE - discovery round {rnd}")
        ctx = self.context(diff=False)
        results = self.run_parallel([("discover_product", ctx, "claude"), ("discover_engineering", ctx, "codex")])
        ok = [r for r in results if not isinstance(r, Exception)]
        if not ok:
            self.state["improvementRound"] -= 1
            if all(isinstance(r, AllAgentsDown) for r in results):
                raise AllAgentsDown("discover")
            raise AgentCallFailed("discovery failed")
        candidates = []
        for name, _, parsed in ok:
            self.check_needs_human_project(parsed)
            for cand in parsed.get("candidates", []) or []:
                if isinstance(cand, dict):
                    cand["_from"] = name
                    candidates.append(cand)
        selected, report = select_improvements(candidates, self.tasks, self.cfg)
        self.store.write_report(f"improvement-round-{rnd:03d}.md", report)
        self.log("improvement_discovery", round=rnd, candidates=len(candidates), selected=[c["title"] for c in selected])
        if not selected:
            self.ui.say("No meaningful improvements found this round.")
            return 0
        return self.add_tasks([{**c, "priority": c.get("impact", "medium"),
                                "acceptanceCriteria": c.get("acceptanceCriteria") or [f"{c['title']}: {c.get('reason', '')}"]}
                               for c in selected], kind="improvement", source=f"improvement-round-{rnd}")

    # ------------------------------------------------------------------ quota waiting
    def wait_for_quota(self) -> str:
        if not any(self.quota.status(a) == COOLDOWN for a in AGENTS):
            self.to_human("No agent is usable and none is in cooldown: log in to Claude Code and/or Codex, then 'aiteam start'.")
            return NEEDS_HUMAN
        snap = {"at": iso(utcnow()), "task": self.state["currentTaskId"], "head": self.git.head(),
                "status": self.git.status_short(), "ownedPaths": self.state["ownedPaths"]}
        atomic_write_json(self.paths.checkpoints / f"{self.clock().strftime('%Y%m%d-%H%M%S')}-quota-wait.json", snap)
        diff = self.git.diff(self.cfg["maxDiffChars"])
        if diff.strip():
            self.store.write_report(f"{self.clock().strftime('%Y%m%d-%H%M%S')}-quota-wait.diff", diff)
        self.set_status(WAITING_FOR_QUOTA, "both agents in cooldown")
        self.log("waiting_for_quota", nextProbe=iso(self.quota.next_probe_time()))
        self.ui.say("")
        self.ui.say(f"Claude : {self.quota.status('claude')}")
        self.ui.say(f"Codex  : {self.quota.status('codex')}")
        self.ui.say("")
        self.ui.say("State saved safely. Uncommitted work kept in the working tree.")
        self.ui.say("")
        self.ui.say("STATUS:")
        self.ui.say("WAITING_FOR_QUOTA")
        self.ui.say("")
        self.ui.say("Safe to close terminal.")
        if not self.cfg["waitForQuota"] or self.dry_run:
            return WAITING_FOR_QUOTA
        while True:
            nxt = self.quota.next_probe_time()
            if nxt is None:
                break
            remaining = (nxt - self.clock()).total_seconds()
            if remaining > 0:
                self.ui.say(f"Next usage probe at {iso(nxt)} (~{int(remaining // 60)} min). Waiting...")
                while remaining > 0:
                    if self.paths.pause_flag.exists():
                        self.set_status(PAUSED, "pause requested while waiting for quota")
                        return PAUSED
                    self.sleep(min(60.0, remaining))
                    remaining = (nxt - self.clock()).total_seconds()
            self.probe_due_agents()
            if not self.quota.all_down():
                self.ui.say("Usage available again -> resuming.")
                self.log("resume_after_quota")
                return "resumed"
        self.to_human("Agents are no longer in cooldown but none is usable (login needed?).")
        return NEEDS_HUMAN

    # ------------------------------------------------------------------ status / review
    def print_progress(self) -> None:
        kind = "improvement" if self.state["mode"] == "IMPROVEMENT" else "goal"
        p = T.progress(self.tasks, "goal")
        if p["criteriaTotal"]:
            self.ui.say(f"Goal Progress: {bar(p['percent'])} {p['percent']}%  "
                        f"({p['criteriaDone']} / {p['criteriaTotal']} acceptance criteria complete)")
        else:
            self.ui.say(f"Goal Progress: {p['tasksDone']} / {p['tasksTotal']} tasks done")
        if kind == "improvement":
            ip = T.progress(self.tasks, "improvement")
            self.ui.say(f"Improvements: {ip['tasksDone']} / {ip['tasksTotal']} done (round {self.state['improvementRound']})")

    def review_only(self) -> str:
        self.ui.banner("AI DEV TEAM - REVIEW (no implementation)")
        if not self.git.is_repo():
            return self.to_human("Not a Git repository.") or NEEDS_HUMAN
        self.load_project()
        if self.goal is None:
            return self.to_human("GOAL.md is missing.") or NEEDS_HUMAN
        ctx = self.context(diff=True)
        results = self.run_parallel([("review_project", ctx, "claude"), ("review_project", ctx, "codex")])
        lines = ["# Project review", ""]
        for r in results:
            if isinstance(r, Exception):
                lines.append(f"- review unavailable: {type(r).__name__}")
                continue
            name, res, parsed = r
            lines += [f"## {name}", parsed.get("summary", ""), ""] + [f"- {i}" for i in parsed.get("issues", []) or []]
            lines += ["", "Suggested tasks:"] + [f"- {s}" for s in parsed.get("suggestedTasks", []) or []] + [""]
        text = "\n".join(lines)
        path = self.store.write_report(f"{self.clock().strftime('%Y%m%d-%H%M%S')}-project-review.md", text)
        self.ui.say(text)
        self.ui.say(f"Saved: {path}")
        self.save()
        return "REVIEWED"


def c_ok(text: str) -> str:
    from ui import c
    return c("ok", text)


def _norm(title: str) -> str:
    return re.sub(r"[^a-z0-9ก-๙]+", " ", title.lower()).strip()


def select_improvements(candidates: list[dict], tasks: list[dict], cfg: dict) -> tuple[list[dict], str]:
    """Keep only meaningful, low-churn improvements tied to the goal. Returns (selected, markdown report)."""
    existing = {_norm(t["title"]) for t in tasks}
    scored, lines = [], ["# Improvement candidates", ""]
    for cand in candidates:
        title = str(cand.get("title", "")).strip()
        impact, risk, effort = T.level(cand.get("impact")), T.level(cand.get("risk")), T.level(cand.get("effort"))
        value = impact * 2 - risk - effort * 0.5
        reasons = []
        if not title:
            reasons.append("no title")
        if cand.get("cosmetic") is True:
            reasons.append("cosmetic churn")
        if impact < cfg["minImprovementImpact"]:
            reasons.append("low impact")
        if risk >= 3 and impact < 3:
            reasons.append("high risk without clear value")
        if value < 2:
            reasons.append("value does not justify risk/effort")
        if not str(cand.get("reason", "")).strip() or not str(cand.get("evidence", "")).strip():
            reasons.append("missing reason/evidence")
        if _norm(title) in existing:
            reasons.append("duplicate of existing task")
        gate = human_gate_reason(f"{title}\n{cand.get('description', '')}", cfg["allowDeploy"])
        if gate:
            reasons.append(f"needs human decision ({gate})")
        verdict = "SELECTED" if not reasons else "rejected: " + ", ".join(reasons)
        lines.append(f"- [{cand.get('_from', '?')}] {title or '(untitled)'} | impact={impact} risk={risk} effort={effort} "
                     f"| {verdict}\n  reason: {cand.get('reason', '')}\n  evidence: {cand.get('evidence', '')}")
        if not reasons:
            scored.append((value, cand))
            existing.add(_norm(title))
    scored.sort(key=lambda x: -x[0])
    selected = [c for _, c in scored[: cfg["maxImprovementsPerRound"]]]
    return selected, "\n".join(lines)
