"""Regression: a stored validation step without "status" (written by an older AI-Team, e.g. the original V3
format {name, argv, ok, output}) crashed phase_fix with KeyError: 'status'. It must be handled FAIL-CLOSED:
reported as BLOCKED (malformed validation record), never ignored, never PASS. Normal records are unchanged."""
import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import tasks as T  # noqa: E402
import validation as V  # noqa: E402
from mock_agents import MockAgent  # noqa: E402
from test_aiteam import RepoCase  # noqa: E402

# Exactly what the original V3 release (e32d28d) stored in tasks.json
LEGACY_VALIDATION = {"passed": False, "configured": True, "summary": {"lint": "FAIL", "test": "PASS"},
                     "steps": [{"name": "lint", "argv": ["npm", "run", "lint"], "ok": False, "output": "10 errors"},
                               {"name": "test", "argv": ["npm", "run", "test"], "ok": True, "output": "56 passed"}]}

NORMAL_FAIL = {"name": "test", "argv": ["npm", "run", "test"], "status": V.FAIL, "kind": "test", "critical": False,
               "output": "1 failed", "reason": "exit code 1", "required_action": "", "notes": [], "details": {}}
NORMAL_LINT = {"name": "lint", "argv": ["npm", "run", "lint"], "status": V.FAIL_REGRESSION, "kind": "lint", "critical": False,
               "output": "", "reason": "1 new", "required_action": "", "notes": [],
               "details": {"newFindings": ["NEW_REGRESSION src/a.ts:1:1 error r: m"], "movedFindings": [],
                           "baselineErrors": 10, "baselineWarnings": 176,
                           "reportLines": ["Baseline errors: 10", "Current errors: 11", "New errors: 1", "Status: FAIL_REGRESSION"]}}
NORMAL_RLS = {"name": "test:rls", "argv": ["npm", "run", "test:rls"], "status": V.BLOCKED, "kind": "security", "critical": True,
              "output": "", "reason": "PostgreSQL test runtime unavailable", "required_action": "set PG_BIN", "notes": ["n1"], "details": {}}


class NormalizeStepTests(unittest.TestCase):
    def test_missing_status_is_blocked_and_named(self):
        st = V.normalize_step({"name": "lint", "argv": ["npm", "run", "lint"], "ok": False, "output": "x"})
        self.assertEqual(st["status"], V.BLOCKED)
        self.assertTrue(st["malformed"])
        self.assertIn("malformed validation record: missing validation status", st["reason"])
        self.assertIn("'lint'", st["reason"])
        self.assertFalse(st["ok"])

    def test_legacy_ok_true_is_not_pass(self):
        st = V.normalize_step({"name": "test", "ok": True})
        self.assertEqual(st["status"], V.BLOCKED)
        self.assertFalse(st["ok"])
        self.assertNotIn(st["status"], V.OK_STATES)

    def test_unknown_status_and_garbage_are_blocked(self):
        self.assertEqual(V.normalize_step({"name": "x", "status": "GREEN"})["status"], V.BLOCKED)
        self.assertIn("unknown validation status 'GREEN'", V.normalize_step({"name": "x", "status": "GREEN"})["reason"])
        junk = V.normalize_step("not a dict")
        self.assertEqual((junk["name"], junk["status"], junk["malformed"]), ("unknown-step", V.BLOCKED, True))

    def test_normal_records_unchanged(self):
        for status in V.ALL_STATES:
            rec = dict(NORMAL_FAIL, status=status)
            st = V.normalize_step(rec)
            self.assertEqual(st["status"], status)
            self.assertFalse(st["malformed"])
            for k in ("name", "argv", "kind", "critical", "output", "reason", "required_action", "notes", "details"):
                self.assertEqual(st[k], rec[k], k)
            self.assertEqual(st["ok"], V.StepResult("t", [], status).ok)   # same gate semantics as live results

    def test_normalization_is_idempotent(self):
        once = V.normalize_validation(LEGACY_VALIDATION)
        twice = V.normalize_validation(once)
        self.assertEqual(twice["malformed"], ["lint", "test"])
        self.assertEqual([st["reason"] for st in twice["steps"]], [st["reason"] for st in once["steps"]])
        self.assertFalse(twice["passed"])

    def test_malformed_validation_never_passes(self):
        n = V.normalize_validation(dict(LEGACY_VALIDATION, passed=True))   # even if the stored flag claims passed
        self.assertFalse(n["passed"])
        self.assertEqual(n["malformed"], ["lint", "test"])
        self.assertTrue(V.normalize_validation({"passed": True, "steps": [NORMAL_FAIL | {"status": V.PASS}]})["passed"])
        self.assertFalse(V.normalize_validation(None)["passed"])


class ManagerRenderingTests(RepoCase):
    def test_failure_text_with_missing_status_does_not_crash_and_reports_blocked(self):
        m = self.manager()
        text = m.failure_text(LEGACY_VALIDATION)                       # was: KeyError: 'status'
        self.assertIn("[lint BLOCKED] malformed validation record: missing validation status", text)
        self.assertIn("[test BLOCKED]", text)                           # legacy ok=true is NOT silently passed
        self.assertIn("do not assume it passed", text)

    def test_validation_lines_with_missing_status(self):
        m = self.manager()
        lines = m.validation_lines(LEGACY_VALIDATION)
        self.assertIn("Lint     : BLOCKED (malformed validation record: missing validation status (step 'lint'))", lines)
        self.assertIn(f"Validation infrastructure: lint BLOCKED - {V.MALFORMED}; re-run validation", lines)
        self.assertFalse(any(": PASS" in ln for ln in lines))

    def test_normal_records_render_unchanged(self):
        m = self.manager()
        val = {"passed": False, "steps": [NORMAL_LINT, NORMAL_FAIL, NORMAL_RLS], "goalBlockers": [], "summary": {}}
        self.assertEqual(m.validation_lines(val), [
            "Lint:", "Baseline errors: 10", "Current errors: 11", "New errors: 1", "Status: FAIL_REGRESSION",
            "Test     : FAIL (exit code 1)",
            "RLS security validation:", "Status: BLOCKED", "Reason: PostgreSQL test runtime unavailable",
            "Required action: set PG_BIN", "  note: n1"])
        text = m.failure_text(val)
        self.assertIn("[lint FAIL_REGRESSION] npm run lint\nNEW_REGRESSION src/a.ts:1:1 error r: m", text)
        self.assertIn("[test FAIL] npm run test\n1 failed", text)
        self.assertNotIn("test:rls", text)                              # BLOCKED security is not a code failure
        self.assertNotIn("malformed", text)

    def test_resume_task_stuck_in_fix_with_legacy_record(self):
        """Mirrors the real T001: status IMPLEMENTING, phase fix, cycle 1, legacy validation in tasks.json."""
        prompts = {}
        m = self.manager(codex=MockAgent("codex", on_call=lambda n, r, p: prompts.setdefault(r, p)),
                         validation={"test": ["npm", "test"]})
        m.preflight()
        m.plan()
        task = T.select_next(m.tasks)
        T.transition(task, T.IN_PROGRESS)
        T.transition(task, T.REVIEW)
        task.update(phase="fix", validation=json.loads(json.dumps(LEGACY_VALIDATION)), attempts=1)
        m.state.update(status="IMPLEMENTING", currentTaskId=task["id"], cycle=1)
        m.save()
        tid = task["id"]
        m2 = self.manager(codex=MockAgent("codex", on_call=lambda n, r, p: prompts.setdefault(r, p)),
                          validation={"test": ["npm", "test"]})      # fresh process = "aiteam resume"
        m2.preflight()
        resumed = T.find(m2.tasks, tid)
        self.assertEqual(resumed["phase"], "fix")
        m2.run_task(resumed)                                            # previously crashed here
        self.assertIn("malformed validation record: missing validation status", prompts["fix"])
        self.assertEqual(resumed["status"], T.DONE)                     # re-validated with a well-formed record
        self.assertTrue(all("status" in st for st in resumed["validation"]["steps"]))
        self.assertEqual(m2.state["cycle"], 1)                          # state preserved, not reset


if __name__ == "__main__":
    unittest.main()
