import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))

import quota  # noqa: E402
import tasks as T  # noqa: E402
from agents import ClaudeAgent, CodexAgent, subscription_env  # noqa: E402
from config import DEFAULTS, load_config  # noqa: E402
from goal import TEMPLATE_MARKER, parse_goal, rules_forbid_push  # noqa: E402
from git_manager import GitManager, sanitize_commit_message  # noqa: E402
from manager import Manager, select_improvements  # noqa: E402
from mock_agents import MockAgent  # noqa: E402
from prompts import extract_json, human_gate_reason  # noqa: E402
from state import (COOLDOWN, ProjectPaths, StateStore, atomic_write_json, read_json)  # noqa: E402
from ui import UI  # noqa: E402

GOAL = """# Product Goal

Build a tiny study app.

# Requirements

- start studying easily
- timer

# Definition of Done

- [ ] timer works
- [ ] tests pass

# Never Do

- no production deploy
"""


class Clock:
    def __init__(self):
        self.t = datetime(2026, 1, 1, tzinfo=timezone.utc)

    def __call__(self):
        return self.t

    def sleep(self, seconds):
        self.t += timedelta(seconds=seconds)


def git(root, *args):
    subprocess.run(["git", *args], cwd=root, check=True, capture_output=True)


class RepoCase(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="aiteam-test-"))
        git(self.tmp, "init", "-q")
        git(self.tmp, "config", "user.email", "t@example.com")
        git(self.tmp, "config", "user.name", "t")
        (self.tmp / "GOAL.md").write_text(GOAL, encoding="utf-8")
        (self.tmp / "README.md").write_text("x\n", encoding="utf-8")
        git(self.tmp, "add", ".")
        git(self.tmp, "commit", "-qm", "init")
        self.clock = Clock()

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def cfg(self, **kw):
        c = json.loads(json.dumps(DEFAULTS))
        c.update({"autoPush": False, "parallelAnalysis": False, "waitForQuota": False, "maxCycles": 50})
        c.update(kw)
        return c

    def manager(self, claude=None, codex=None, **cfg):
        self.claude = claude or MockAgent("claude")
        self.codex = codex or MockAgent("codex")
        return Manager(self.tmp, self.cfg(**cfg), agents={"claude": self.claude, "codex": self.codex},
                       ui=UI(quiet=True), clock=self.clock, sleeper=self.clock.sleep,
                       command_runner=lambda argv, cwd, env, timeout: (0, "ok", False, False), pg_globs=[])


# 1, 2 -------------------------------------------------------------------------
class StateTests(unittest.TestCase):
    def test_save_load_roundtrip(self):
        with tempfile.TemporaryDirectory() as d:
            paths = ProjectPaths(d)
            paths.ensure()
            store = StateStore(paths)
            st = store.load()
            st["cycle"] = 7
            st["currentTaskId"] = "T001"
            store.save(st)
            again = StateStore(paths).load()
            self.assertEqual(again["cycle"], 7)
            self.assertEqual(again["currentTaskId"], "T001")
            for key in ("project", "goalHash", "mode", "status", "claudeStatus", "codexStatus", "claudeNextProbe",
                        "codexNextProbe", "lastCheckpoint", "lastCommit", "startedAt", "updatedAt", "lastCompletedTask"):
                self.assertIn(key, again)

    def test_atomic_write_survives_corruption(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "state.json"
            atomic_write_json(p, {"v": 1})
            atomic_write_json(p, {"v": 2})
            self.assertFalse(list(Path(d).glob("*.tmp")))
            p.write_text('{"v": 3, "trunc', encoding="utf-8")  # simulate torn write from a killed terminal
            self.assertEqual(read_json(p, None), {"v": 1})  # recovered from .bak (previous good version)

    def test_history_redacts_secrets(self):
        with tempfile.TemporaryDirectory() as d:
            paths = ProjectPaths(d)
            paths.ensure()
            StateStore(paths).log("x", detail="api_key=sk-ant-abcdefghijklmnopqrstuvwxyz123")
            text = paths.history.read_text()
            self.assertNotIn("abcdefghijklmnop", text)
            self.assertIn("[REDACTED]", text)


# 3 -----------------------------------------------------------------------------
class QuotaClassificationTests(unittest.TestCase):
    def test_quota_errors(self):
        for err in ["Claude AI usage limit reached|1767225600", "Error: 429 Too Many Requests", "rate limit exceeded",
                    "You've hit your usage limit. Try again later.", "quota exceeded", "Overloaded (529)"]:
            self.assertEqual(quota.classify(1, "", err).outcome, quota.QUOTA, err)

    def test_structured_claude_json_error(self):
        out = json.dumps({"type": "result", "is_error": True, "result": "Usage limit reached, resets 5pm"})
        self.assertEqual(quota.classify(0, out, "").outcome, quota.QUOTA)

    def test_success_mentioning_rate_limit_is_ok(self):
        long_ok = "I implemented a rate limit middleware returning 429 Too Many Requests.\n" * 20
        self.assertEqual(quota.classify(0, long_ok, "").outcome, quota.OK)

    def test_short_banner_with_zero_exit(self):
        self.assertEqual(quota.classify(0, "Claude AI usage limit reached|1767225600", "").outcome, quota.QUOTA)

    def test_auth_notfound_timeout_error(self):
        self.assertEqual(quota.classify(1, "", "Invalid API key · Please run /login").outcome, quota.AUTH)
        self.assertEqual(quota.classify(None, "", "", not_found=True).outcome, quota.NOT_FOUND)
        self.assertEqual(quota.classify(None, "", "", timed_out=True).outcome, quota.TRANSIENT)
        self.assertEqual(quota.classify(2, "", "segfault").outcome, quota.ERROR)

    def test_reset_time_parsed(self):
        now = datetime(2026, 1, 1, tzinfo=timezone.utc)
        c = quota.classify(1, "", "usage limit reached, try again in 2 hours", now=now)
        self.assertEqual(c.reset_at, now + timedelta(hours=2))


# 4-8 ---------------------------------------------------------------------------
class FallbackTests(RepoCase):
    def test_claude_quota_falls_back_to_codex_and_continues(self):
        claude = MockAgent("claude", {"plan": [quota.QUOTA]})
        m = self.manager(claude=claude)
        self.assertTrue(m.preflight())
        name, res, parsed = m.call("plan", m.context())
        self.assertEqual(name, "codex")
        self.assertEqual(m.state["claudeStatus"], COOLDOWN)
        self.assertTrue(parsed["tasks"])
        # Claude must not be retried while in cooldown
        n = len(claude.calls)
        m.call("review", m.context())
        self.assertEqual(len(claude.calls), n)

    def test_codex_quota_falls_back_to_claude_for_implementation(self):
        codex = MockAgent("codex", {"implement": [quota.QUOTA]})
        m = self.manager(codex=codex)
        m.preflight()
        task = T.new_task("T001", "x", acceptance=["a"])
        m.tasks.append(task)
        name, _, _ = m.call("implement", m.context(task), task=task, phase="implement")
        self.assertEqual(name, "claude")
        self.assertIn(("implement", "write"), self.claude.calls)
        self.assertEqual(m.state["codexStatus"], COOLDOWN)
        self.assertIn("partial work before limit", task["partial"].get("implement", "") or "partial work before limit")

    def test_fallback_agent_receives_partial_output(self):
        seen = {}
        codex = MockAgent("codex", on_call=lambda n, r, p: seen.setdefault(r, p))
        claude = MockAgent("claude", {"review": [quota.QUOTA]})
        m = self.manager(claude=claude, codex=codex)
        m.preflight()
        task = T.new_task("T001", "x")
        m.call("review", m.context(task), task=task, phase="review")
        self.assertIn("CONTINUE its work", seen["review"])
        self.assertIn("partial work before limit", seen["review"])

    def test_both_unavailable_waits_for_quota_without_crash(self):
        m = self.manager(MockAgent("claude", {"*": [quota.QUOTA]}), MockAgent("codex", {"*": [quota.QUOTA]}),
                         startupProbe=False)
        (self.tmp / "work.txt").write_text("good work\n")
        m.state["ownedPaths"] = ["work.txt"]
        m.save()
        status = m.run()
        self.assertEqual(status, "WAITING_FOR_QUOTA")
        st = StateStore(m.paths).load()
        self.assertEqual(st["claudeStatus"], COOLDOWN)
        self.assertEqual(st["codexStatus"], COOLDOWN)
        self.assertTrue((self.tmp / "work.txt").exists())  # nothing discarded / rolled back
        self.assertTrue(list(m.paths.checkpoints.glob("*quota-wait.json")))

    def test_cooldown_probe_interval_and_recovery(self):
        claude = MockAgent("claude", {"probe": [quota.QUOTA, quota.QUOTA, "AITEAM_OK"]})
        m = self.manager(claude=claude, quotaProbeMinutes=30)
        m.quota.mark_cooldown("claude", "limit", self.clock())
        m.probe_due_agents()
        self.assertEqual(claude.calls, [])                       # not due yet -> no spam
        self.clock.sleep(30 * 60)
        m.probe_due_agents()
        self.assertEqual(m.state["claudeStatus"], COOLDOWN)       # still limited
        self.assertEqual(len(claude.calls), 1)
        m.probe_due_agents()
        self.assertEqual(len(claude.calls), 1)                   # re-armed for another full interval
        self.clock.sleep(30 * 60)
        m.probe_due_agents()                                      # second failing probe
        self.clock.sleep(30 * 60)
        m.probe_due_agents()
        self.assertEqual(m.state["claudeStatus"], "AVAILABLE")

    def test_wait_loop_resumes_when_quota_returns(self):
        claude = MockAgent("claude", {"probe": ["AITEAM_OK"]})
        codex = MockAgent("codex", {"probe": [quota.QUOTA]})
        m = self.manager(claude=claude, codex=codex, waitForQuota=True)
        m.quota.mark_cooldown("claude", "x", self.clock())
        m.quota.mark_cooldown("codex", "x", self.clock())
        self.assertEqual(m.wait_for_quota(), "resumed")
        self.assertEqual(m.state["claudeStatus"], "AVAILABLE")

    def test_auth_failure_marks_unavailable_and_both_missing_needs_human(self):
        m = self.manager(MockAgent("claude", installed=False), MockAgent("codex", installed=False))
        self.assertFalse(m.preflight())
        self.assertEqual(m.state["status"], "NEEDS_HUMAN")


# 9 -----------------------------------------------------------------------------
class TaskTests(unittest.TestCase):
    def test_transitions(self):
        t = T.new_task("T001", "a", acceptance=["c1"])
        T.transition(t, T.READY)
        T.transition(t, T.IN_PROGRESS)
        T.transition(t, T.REVIEW)
        T.transition(t, T.DONE)
        self.assertTrue(all(c["done"] for c in t["acceptanceCriteria"]))
        with self.assertRaises(T.InvalidTransition):
            T.transition(t, T.READY)

    def test_selection_respects_dependencies_and_priority(self):
        a = T.new_task("T001", "low", priority="low", impact="low")
        b = T.new_task("T002", "high but blocked", priority="high", impact="high", dependencies=["T003"])
        c = T.new_task("T003", "dep", priority="medium")
        ts = [a, b, c]
        self.assertEqual(T.select_next(ts)["id"], "T003")
        c["status"] = T.DONE
        self.assertEqual(T.select_next(ts)["id"], "T002")

    def test_in_progress_task_resumed_first(self):
        a = T.new_task("T001", "a", priority="high")
        b = T.new_task("T002", "b", priority="low")
        b["status"] = T.REVIEW
        self.assertEqual(T.select_next([a, b])["id"], "T002")

    def test_progress_from_acceptance_criteria(self):
        a = T.new_task("T001", "a", acceptance=["1", "2"])
        b = T.new_task("T002", "b", acceptance=["3"])
        a["status"] = T.REVIEW
        T.transition(a, T.DONE)
        p = T.progress([a, b])
        self.assertEqual((p["criteriaDone"], p["criteriaTotal"], p["percent"]), (2, 3, 67))


# 10, 13 ------------------------------------------------------------------------
class LoopTests(RepoCase):
    def test_full_run_to_project_stable_with_commits(self):
        def implement():
            (self.tmp / "timer.py").write_text("def timer():\n    return 1\n")
            return {"summary": "timer", "complete": True, "commitMessage": "feat(timer): add study timer"}
        codex = MockAgent("codex", {"implement": implement})
        m = self.manager(codex=codex)
        status = m.run()
        self.assertEqual(status, "PROJECT_STABLE")
        log = subprocess.run(["git", "log", "--oneline"], cwd=self.tmp, capture_output=True, text=True).stdout
        self.assertIn("feat(timer): add study timer", log)
        self.assertTrue(all(t["status"] == T.DONE for t in m.tasks))
        events = [json.loads(l)["event"] for l in m.paths.history.read_text().splitlines()]
        for e in ("goal_complete", "project_stable", "commit", "review", "validation"):
            self.assertIn(e, events)
        # .aiteam is never committed
        files = subprocess.run(["git", "ls-files"], cwd=self.tmp, capture_output=True, text=True).stdout
        self.assertNotIn(".aiteam", files)

    def test_resume_after_interruption_continues_same_phase(self):
        m = self.manager()
        m.preflight()
        m.plan()
        task = T.select_next(m.tasks)
        T.transition(task, T.IN_PROGRESS)
        task["phase"] = "review"
        task["partial"]["review"] = "half of the review"
        m.save()
        # "terminal closed" -> brand-new manager instance
        seen = []
        m2 = self.manager(claude=MockAgent("claude", on_call=lambda n, r, p: seen.append((r, p))))
        status = m2.run()
        self.assertEqual(status, "PROJECT_STABLE")
        roles = [r for r, _ in seen]
        first_task_role = next(r for r in roles if r not in ("probe",))
        self.assertEqual(first_task_role, "review")             # did not restart at analyze/implement
        self.assertIn("half of the review", next(p for r, p in seen if r == "review"))

    def test_pause_flag_stops_safely_and_resume_continues(self):
        m = self.manager()
        m.paths.pause_flag.write_text("x")
        self.assertEqual(m.run(), "PAUSED")
        self.assertEqual(StateStore(m.paths).load()["status"], "PAUSED")
        m.paths.pause_flag.unlink()
        self.assertEqual(self.manager().run(), "PROJECT_STABLE")

    def test_goal_not_complete_on_single_conflicting_opinion(self):
        unmet = {"complete": False, "unmet": [{"requirement": "timer", "suggestedTask": "Add timer persistence"}]}
        # incomplete in first round AND in the verification round, then satisfied after the new task is done
        codex = MockAgent("codex", {"evaluate": [unmet, dict(unmet), {"complete": True}]})
        m = self.manager(codex=codex)
        status = m.run()
        self.assertEqual(status, "PROJECT_STABLE")
        self.assertTrue(any(t["title"] == "Add timer persistence" for t in m.tasks))
        events = [json.loads(l)["event"] for l in m.paths.history.read_text().splitlines()]
        self.assertIn("goal_eval_conflict", events)

    def test_improvement_mode_selects_meaningful_and_stops(self):
        rounds = [{"candidates": [
            {"title": "Persist active session across reloads", "impact": "high", "risk": "low", "effort": "low",
             "reason": "users lose study progress", "evidence": "store.ts has no persistence"},
            {"title": "Change button colour", "impact": "low", "risk": "low", "effort": "low", "cosmetic": True,
             "reason": "prettier", "evidence": "-"}]}, {"candidates": []}]
        m = self.manager(claude=MockAgent("claude", {"discover": rounds}))
        self.assertEqual(m.run(), "PROJECT_STABLE")
        imp = [t for t in m.tasks if t["kind"] == "improvement"]
        self.assertEqual([t["title"] for t in imp], ["Persist active session across reloads"])
        self.assertEqual(imp[0]["status"], T.DONE)

    def test_validation_failure_triggers_fix_then_fails_safely(self):
        def implement():
            (self.tmp / "bad.py").write_text("broken\n")
            return {"complete": True}
        m = self.manager(codex=MockAgent("codex", {"implement": implement}), maxTaskRetries=2,
                         validation={"test": ["npm", "test"]})
        m.runner = lambda argv, cwd, env, timeout: (1, "1 failed", False, False)
        m.preflight()
        m.plan()
        task = T.select_next(m.tasks)
        m.run_task(task)
        self.assertEqual(task["status"], T.FAILED)
        self.assertIn(("fix", "write"), self.codex.calls)
        self.assertFalse((self.tmp / "bad.py").exists())        # parked in git stash, not deleted
        stash = subprocess.run(["git", "stash", "list"], cwd=self.tmp, capture_output=True, text=True).stdout
        self.assertIn("aiteam-failed-" + task["id"], stash)


# 11 ----------------------------------------------------------------------------
class GoalTests(unittest.TestCase):
    def test_parse(self):
        g = parse_goal(GOAL)
        self.assertEqual(g.title, "Build a tiny study app.")
        self.assertEqual(g.requirements, ["start studying easily", "timer"])
        self.assertEqual(g.definition_of_done, ["timer works", "tests pass"])
        self.assertEqual(g.never_do, ["no production deploy"])
        self.assertFalse(g.is_template)
        self.assertTrue(parse_goal(TEMPLATE_MARKER + "\n" + GOAL).is_template)

    def test_push_rule(self):
        self.assertTrue(rules_forbid_push("Push after validated checkpoints: no"))
        self.assertTrue(rules_forbid_push("- Do not push to origin"))
        self.assertFalse(rules_forbid_push("Push after validated checkpoints: yes\n<!-- do not push -->"))

    def test_extract_json(self):
        self.assertEqual(extract_json("blah\nAITEAM_JSON_BEGIN\n{\"a\": 1}\nAITEAM_JSON_END"), {"a": 1})
        self.assertEqual(extract_json("x ```json\n{\"b\": 2}\n``` y"), {"b": 2})
        self.assertEqual(extract_json("final: {\"c\": {\"d\": 3}}"), {"c": {"d": 3}})
        self.assertIsNone(extract_json("no json here"))


# 12 ----------------------------------------------------------------------------
class HumanGateTests(RepoCase):
    def test_static_gate(self):
        self.assertTrue(human_gate_reason("Deploy the app to production"))
        self.assertTrue(human_gate_reason("Write migration to DROP TABLE sessions"))
        self.assertTrue(human_gate_reason("Delete user data older than 30 days"))
        self.assertTrue(human_gate_reason("Requires a Stripe API key to be provided"))
        self.assertIsNone(human_gate_reason("Preserve user data when the timer restarts"))
        self.assertIsNone(human_gate_reason("Deploy to production", allow_deploy=True))

    def test_gated_task_is_not_executed(self):
        plan = {"tasks": [{"key": "a", "title": "Deploy app to production", "acceptanceCriteria": ["live"]},
                          {"key": "b", "title": "Add timer", "acceptanceCriteria": ["timer"]}]}
        m = self.manager(claude=MockAgent("claude", {"plan": [plan]}), codex=MockAgent("codex", {"plan_merge": [plan]}))
        status = m.run()
        self.assertEqual(status, "NEEDS_HUMAN")
        deploy = next(t for t in m.tasks if "production" in t["title"])
        self.assertEqual(deploy["status"], T.NEEDS_HUMAN)
        self.assertEqual(next(t for t in m.tasks if t["title"] == "Add timer")["status"], T.DONE)
        self.assertTrue((m.paths.reports / "NEEDS_HUMAN.md").exists())

    def test_agent_raised_question_stops(self):
        m = self.manager(claude=MockAgent("claude", {"analyze": [{"needsHuman": "Which auth provider?"}]}))
        status = m.run()
        self.assertEqual(status, "NEEDS_HUMAN")
        self.assertTrue(any(t.get("humanQuestion") == "Which auth provider?" for t in m.tasks))


# 14 ----------------------------------------------------------------------------
class GitTests(RepoCase):
    def test_dirty_user_changes_block_start(self):
        (self.tmp / "README.md").write_text("user edit\n")
        m = self.manager()
        self.assertFalse(m.preflight())
        self.assertEqual(m.state["status"], "NEEDS_HUMAN")
        self.assertEqual((self.tmp / "README.md").read_text(), "user edit\n")  # untouched

    def test_owned_changes_allowed_and_only_owned_committed(self):
        g = GitManager(self.tmp)
        (self.tmp / "a.txt").write_text("ai\n")
        self.assertEqual(g.user_changes({"a.txt"}), set())
        self.assertEqual(g.user_changes(set()), {"a.txt"})

    def test_commit_message_sanitized(self):
        self.assertEqual(sanitize_commit_message("fix(timer): keep session", "x"), "fix(timer): keep session")
        self.assertEqual(sanitize_commit_message("did stuff", "Simplify start flow"), "feat: simplify start flow")

    def test_not_a_repo_needs_human(self):
        d = Path(tempfile.mkdtemp())
        try:
            (d / "GOAL.md").write_text(GOAL)
            m = Manager(d, self.cfg(), agents={"claude": MockAgent("claude"), "codex": MockAgent("codex")}, ui=UI(quiet=True))
            self.assertFalse(m.preflight())
        finally:
            shutil.rmtree(d, ignore_errors=True)


# subscription-only ---------------------------------------------------------------
class SubscriptionOnlyTests(unittest.TestCase):
    def test_api_keys_stripped_from_agent_env(self):
        os.environ["ANTHROPIC_API_KEY"] = "sk-ant-should-not-pass"
        os.environ["OPENAI_API_KEY"] = "sk-should-not-pass"
        try:
            env = subscription_env()
            self.assertNotIn("ANTHROPIC_API_KEY", env)
            self.assertNotIn("OPENAI_API_KEY", env)
        finally:
            del os.environ["ANTHROPIC_API_KEY"], os.environ["OPENAI_API_KEY"]

    def test_config_rejects_api_keys(self):
        with tempfile.TemporaryDirectory() as d:
            Path(d, "config.json").write_text(json.dumps({"openaiApiKey": "x", "quotaProbeMinutes": 5}))
            cfg = load_config(None, install_dir=Path(d))
            self.assertNotIn("openaiApiKey", cfg)
            self.assertEqual(cfg["quotaProbeMinutes"], 5)

    def test_cli_flags_detected_from_help(self):
        claude = ClaudeAgent(DEFAULTS["claude"])
        claude._help = "-p, --print  --output-format <format>  --permission-mode <mode>  --allowedTools  --disallowedTools"
        argv, stdin = claude.build("read", Path("."), None)
        self.assertEqual(argv[:4], ["claude", "-p", "--output-format", "json"])
        self.assertIn("plan", argv)
        self.assertTrue(stdin)
        argv, _ = claude.build("write", Path("."), None)
        self.assertIn("acceptEdits", argv)
        old = ClaudeAgent(DEFAULTS["claude"])
        old._help = "-p, --print"
        self.assertEqual(old.build("read", Path("."), None)[0], ["claude", "-p"])
        codex = CodexAgent(DEFAULTS["codex"])
        codex._help = "exec  --sandbox <mode>  --skip-git-repo-check  --output-last-message <file>  read from stdin"
        argv, stdin = codex.build("write", Path("."), Path("o.txt"))
        self.assertEqual(argv[:4], ["codex", "exec", "--sandbox", "workspace-write"])
        self.assertEqual(argv[-1], "-")
        self.assertNotIn("API", " ".join(argv).upper().replace("SKIP", ""))

    def test_no_api_sdk_imports(self):
        for f in HERE.glob("*.py"):
            text = f.read_text(encoding="utf-8")
            self.assertNotRegex(text, r"^\s*(import|from)\s+(anthropic|openai)\b", f.name)


class ImprovementSelectionTests(unittest.TestCase):
    def test_rejects_churn(self):
        cands = [{"title": "Rewrite entire architecture in Rust", "impact": "high", "risk": "high", "effort": "high",
                  "reason": "fast", "evidence": "none"},
                 {"title": "Missing evidence", "impact": "high", "risk": "low", "effort": "low", "reason": "x"},
                 {"title": "Fix crash on empty quiz", "impact": "high", "risk": "low", "effort": "low",
                  "reason": "crash", "evidence": "quiz.ts:40"}]
        sel, report = select_improvements(cands, [], DEFAULTS)
        self.assertEqual([c["title"] for c in sel], ["Fix crash on empty quiz"])
        self.assertIn("missing reason/evidence", report)


if __name__ == "__main__":
    unittest.main()
