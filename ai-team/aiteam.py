#!/usr/bin/env python3
"""AI DEV TEAM V3 - autonomous Claude Code + Codex CLI orchestrator (subscription-only).

Usage: aiteam {init|start|status|pause|resume|review|improve|answer|doctor} [--project PATH]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import tasks as T  # noqa: E402
from config import load_config  # noqa: E402
from goal import GOAL_TEMPLATE, RULES_TEMPLATE, load_goal  # noqa: E402
from state import AGENTS, ProjectPaths, StateStore, atomic_write_text  # noqa: E402
from ui import UI, bar  # noqa: E402


def project_root(arg: str | None) -> Path:
    return Path(arg or Path.cwd()).resolve()


def cmd_init(args) -> int:
    root = project_root(args.project)
    paths = ProjectPaths(root)
    paths.ensure()
    ui = UI()
    if not paths.goal.exists():
        atomic_write_text(paths.goal, GOAL_TEMPLATE)
        ui.say(f"Created {paths.goal}  <- paste your goal here")
    else:
        ui.say(f"Kept existing {paths.goal}")
    if not paths.rules.exists():
        atomic_write_text(paths.rules, RULES_TEMPLATE)
        ui.say(f"Created {paths.rules}  <- review the rules (production/data rules were NOT guessed)")
    else:
        ui.say(f"Kept existing {paths.rules}")
    store = StateStore(paths)
    if not paths.state.exists():
        store.save(store.load())
    if not paths.tasks.exists():
        T.TaskStore(paths).save([])
    store.log("init")
    from git_manager import GitManager
    if not GitManager(root).is_repo():
        ui.say("NOTE: this folder is not a Git repository root. Run 'git init' and make a first commit before 'aiteam start'.")
    ui.say(f"Initialized {paths.aidir} (machine-local, git-ignored).")
    return 0


def build_manager(args, ui=None):
    from manager import Manager
    root = project_root(args.project)
    cfg = load_config(root)
    if getattr(args, "no_wait", False):
        cfg["waitForQuota"] = False
    if getattr(args, "max_cycles", None):
        cfg["maxCycles"] = args.max_cycles
    agents = None
    if getattr(args, "dry_run", False):
        from mock_agents import MockAgent
        agents = {a: MockAgent(a) for a in AGENTS}
        cfg["startupProbe"] = True
        cfg["autoPush"] = False
    return Manager(root, cfg, agents=agents, dry_run=getattr(args, "dry_run", False), ui=ui or UI())


def cmd_start(args, improve: bool = False) -> int:
    paths = ProjectPaths(project_root(args.project))
    if paths.pause_flag.exists():
        paths.pause_flag.unlink()
    m = build_manager(args)
    if args.dry_run:
        m.ui.say("DRY RUN: mock agents, no real Claude/Codex calls, no commits, state in .aiteam/dry-run/")
    result = m.run(improve=improve)
    m.ui.say("")
    m.ui.say(f"Finished with status: {result}")
    return 0 if result in ("PROJECT_STABLE", "PAUSED", "WAITING_FOR_QUOTA", "GOAL_COMPLETE") else 1


def cmd_status(args) -> int:
    root = project_root(args.project)
    paths = ProjectPaths(root, "dry-run" if args.dry_run else None)
    ui = UI()
    if not paths.aidir.exists():
        ui.say("No .aiteam/ here. Run 'aiteam init' first.")
        return 1
    st = StateStore(paths).load()
    tasks = T.TaskStore(paths).load()
    goal = load_goal(paths.goal)
    cur = T.find(tasks, st.get("currentTaskId"))
    p = T.progress(tasks, "goal")
    ui.banner()
    ui.say(f"Project : {st['project']}")
    ui.say(f"Goal    : {goal.title if goal else '(GOAL.md missing)'}")
    ui.say(f"Status  : {st['status']}" + (f"  ({st['statusReason']})" if st.get("statusReason") else ""))
    ui.say(f"Mode    : {st['mode']}")
    ui.say(f"Cycle   : {st['cycle']}")
    ui.say("")
    for a in AGENTS:
        line = f"{a.capitalize():<7}: {st.get(a + 'Status')}"
        if st.get(a + "Status") == "COOLDOWN":
            line += f"  (next probe {st.get(a + 'NextProbe')})"
        if st.get(a + "LastError") and st.get(a + "Status") != "AVAILABLE":
            line += f"  last error: {str(st[a + 'LastError'])[:80]}"
        ui.say(line)
    ui.say("")
    if p["criteriaTotal"]:
        ui.say(f"Goal Progress:\n{bar(p['percent'])} {p['percent']}%  ({p['criteriaDone']} / {p['criteriaTotal']} acceptance criteria complete)")
    else:
        ui.say(f"Goal Progress: {p['tasksDone']} / {p['tasksTotal']} tasks done")
    ui.say("Tasks   : " + (", ".join(f"{k}={v}" for k, v in sorted(p["byStatus"].items())) or "none"))
    ip = T.progress(tasks, "improvement")
    if ip["tasksTotal"]:
        ui.say(f"Improvements: {ip['tasksDone']} / {ip['tasksTotal']} done, round {st.get('improvementRound')}")
    ui.say("")
    ui.say(f"Current Task: {cur['id'] + ' ' + cur['title'] + ' (phase ' + cur['phase'] + ')' if cur else '-'}")
    ui.say(f"Last Task   : {st.get('lastCompletedTask') or '-'}")
    ui.say(f"Last Commit : {st.get('lastCommit') or '-'}")
    if paths.pause_flag.exists():
        ui.say("Pause requested: yes")
    if st.get("humanQuestions"):
        ui.say("")
        ui.say("Decisions needed:")
        for q in st["humanQuestions"]:
            ui.say(f"  - ({q.get('task') or 'project'}) {q['question']}")
    if args.verbose:
        ui.say("")
        for t in tasks:
            ui.say(f"  {t['id']:<5} {t['status']:<12} {t['phase']:<10} {t['title']}")
    return 0


def cmd_pause(args) -> int:
    paths = ProjectPaths(project_root(args.project))
    paths.ensure()
    atomic_write_text(paths.pause_flag, "pause requested\n")
    StateStore(paths).log("pause_requested")
    print("Pause requested. The running team stops after the current step and saves state.")
    print("If nothing is running, the next 'aiteam start' / 'aiteam resume' clears this flag.")
    return 0


def cmd_answer(args) -> int:
    paths = ProjectPaths(project_root(args.project))
    store = T.TaskStore(paths)
    tasks = store.load()
    task = T.find(tasks, args.task)
    if task is None:
        print(f"No task {args.task}")
        return 1
    st_store = StateStore(paths)
    state = st_store.load()
    text = " ".join(args.text).strip()
    if text.lower() in ("skip", "no", "reject"):
        if task["status"] != T.FAILED:
            T.transition(task, T.FAILED)
        task["failureReason"] = "skipped by human decision"
        task["humanQuestion"] = None
    else:
        task["humanAnswer"] = text
        task["humanQuestion"] = None
        if task["status"] == T.FAILED:
            task["attempts"] = 0
            task["phase"] = "analyze"
        T.transition(task, T.READY)
    state["humanQuestions"] = [q for q in state.get("humanQuestions", []) if q.get("task") != task["id"]]
    store.save(tasks)
    st_store.save(state)
    st_store.log("human_answer", task=task["id"], answer=text)
    print(f"{task['id']} -> {task['status']}. Run 'aiteam resume' to continue.")
    return 0


def cmd_review(args) -> int:
    m = build_manager(args)
    return 0 if m.review_only() == "REVIEWED" else 1


def cmd_doctor(args) -> int:
    """Show which CLI flags were detected - no prompts are sent, no quota is used."""
    from agents import FORBIDDEN_ENV, READ, WRITE, make_agents
    import os
    root = project_root(args.project)
    cfg = load_config(root)
    ui = UI()
    leaked = [k for k in FORBIDDEN_ENV if os.environ.get(k)]
    if leaked:
        ui.say(f"Found {', '.join(leaked)} in your environment: AI-Team removes them from agent processes (subscription-only).")
    for name, agent in make_agents(cfg).items():
        ok, info = agent.check_installed(root)
        ui.say(f"{name}: {'OK ' + info if ok else 'NOT AVAILABLE - ' + info}")
        if ok:
            for mode in (READ, WRITE):
                argv, stdin = agent.build(mode, root, Path("last-message.txt"))
                ui.say(f"  {mode:<5}: {' '.join(argv)} {'(prompt via stdin)' if stdin else '<prompt>'}")
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="aiteam", description="AI DEV TEAM V3 - Claude Code + Codex orchestrator")
    ap.add_argument("--project", "-C", help="project directory (default: current directory)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("init", help="create GOAL.md, PROJECT_RULES.md and .aiteam/")
    for name, hlp in (("start", "start or resume autonomous development"), ("resume", "clear pause flag and continue"),
                      ("improve", "enter improvement mode")):
        p = sub.add_parser(name, help=hlp)
        p.add_argument("--dry-run", action="store_true", help="use mock agents; no real CLI calls or commits")
        p.add_argument("--no-wait", action="store_true", help="exit instead of waiting when both agents are out of quota")
        p.add_argument("--max-cycles", type=int, help="stop after N task cycles (safety limit)")
    p = sub.add_parser("status", help="show project / agent / task status")
    p.add_argument("--dry-run", action="store_true", help="show dry-run state")
    p.add_argument("-v", "--verbose", action="store_true", help="list all tasks")
    sub.add_parser("pause", help="stop safely after the current step")
    p = sub.add_parser("review", help="both agents assess the project without implementing")
    p.add_argument("--dry-run", action="store_true")
    p = sub.add_parser("answer", help="answer a NEEDS_HUMAN question for a task ('skip' to drop it, 'retry' to retry)")
    p.add_argument("task")
    p.add_argument("text", nargs="+")
    sub.add_parser("doctor", help="check installed CLIs and the exact flags that will be used (no quota used)")
    args = ap.parse_args(argv)
    if args.cmd == "init":
        return cmd_init(args)
    if args.cmd in ("start", "resume"):
        return cmd_start(args)
    if args.cmd == "improve":
        return cmd_start(args, improve=True)
    if args.cmd == "status":
        return cmd_status(args)
    if args.cmd == "pause":
        return cmd_pause(args)
    if args.cmd == "review":
        return cmd_review(args)
    if args.cmd == "answer":
        return cmd_answer(args)
    if args.cmd == "doctor":
        return cmd_doctor(args)
    return 2


if __name__ == "__main__":
    sys.exit(main())
