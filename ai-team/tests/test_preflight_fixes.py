"""Pre-flight blocker fixes: baseline lint comparison, honest RLS/SKIPPED handling, PG_BIN,
first-cycle autoPush safety and intent-based human gate. All CLIs and linters are faked."""
import contextlib
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import aiteam  # noqa: E402
import lint_baseline as LB  # noqa: E402
import tasks as T  # noqa: E402
import validation as V  # noqa: E402
from agents import ClaudeAgent  # noqa: E402
from config import DEFAULTS, load_config  # noqa: E402
from manager import Manager, select_improvements  # noqa: E402
from mock_agents import MockAgent  # noqa: E402
from prompts import human_gate_reason  # noqa: E402
from state import ProjectPaths, StateStore  # noqa: E402
from test_aiteam import GOAL, RepoCase, git  # noqa: E402
from ui import UI  # noqa: E402

RLS_GOAL = GOAL.replace("- [ ] tests pass", "- [ ] tests pass\n- [ ] Security/RLS tests pass")
RLS_SKIPPED = "\n> v2u@0.0.0 test:rls\n> node scripts/test-supabase-rls.mjs\n\nSKIPPED: PostgreSQL server binaries not found (set PG_BIN)\n"
RLS_PASS = "=== Supabase RLS (1 migration(s), PostgreSQL 16.4) ===\n  ✅ anon denied\n\n" \
           "  (client end-to-end SKIPPED: PostgREST binary not found — set POSTGREST_BIN)\n\nTotal: 16 | Passed: 16 | Failed: 0\n"
RLS_FAIL = "  ❌ self role escalation\n     expected the database to refuse\n\nTotal: 16 | Passed: 15 | Failed: 1\n"

V2U_LINT = """
> nextstep@0.0.0 lint
> oxlint

scripts/test-phase-57.js:17:7: error react-hooks(rules-of-hooks): React Hook "useActionableRegistry" cannot be called at the top level. React Hooks must be called in a React function component or a custom React Hook function.
scripts/test-knowledge-gap.js:9:3: warning eslint(no-unused-vars): Parameter 'learningSessionsHistory' is declared but never used. Unused parameters should start with a '_'. help: Consider removing this parameter.
src/pages/LessonDetail.tsx:241:39: warning react(purity): Cannot call impure function during render help: `Date` is an impure function.
"""


def fake_lint(root: Path) -> tuple[int, str]:
    """A tiny deterministic 'linter': error for each line containing BAD, warning for each WARN (oxlint layout)."""
    lines, errors = [], 0
    for f in sorted(root.rglob("*.js")):
        if ".git" in f.parts or ".aiteam" in f.parts:
            continue
        rel = f.relative_to(root).as_posix()
        for i, text in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
            if "BAD" in text:
                errors += 1
                lines.append(f"{rel}:{i}:1: error custom(no-bad): Unexpected BAD token help: remove it")
            if "WARN" in text:
                lines.append(f"{rel}:{i}:1: warning custom(no-warn): Avoid WARN")
    return (1 if errors else 0), "\n> app lint\n> fakelint\n\n" + "\n".join(lines) + "\n"


class Runner:
    """Dispatches validation commands; records the env each step received."""

    def __init__(self, root, rls=(0, RLS_PASS), test=(0, "Total: 3 | Passed: 3 | Failed: 0")):
        self.root, self.rls, self.test = Path(root), rls, test
        self.calls = []

    def __call__(self, argv, cwd, env, timeout):
        self.calls.append((list(argv), dict(env)))
        if argv[-1] == "lint":
            code, out = fake_lint(self.root)
            return code, out, False, False
        if argv[-1] == "test:rls":
            return self.rls[0], self.rls[1], False, False
        if argv[0] == "missing-tool":
            return None, "missing-tool not found on PATH", True, False
        return self.test[0], self.test[1], False, False


LINT_CFG = {"lint": ["npm", "run", "lint"], "test": ["npm", "test"]}


class LintRepoCase(RepoCase):
    def setUp(self):
        super().setUp()
        src = self.tmp / "src"
        src.mkdir()
        # 10 pre-existing errors + 2 warnings = BASELINE_DEBT
        (src / "a.js").write_text("\n".join([f"const x{i} = BAD;" for i in range(10)] + ["WARN one", "WARN two"]) + "\n")
        git(self.tmp, "add", ".")
        git(self.tmp, "commit", "-qm", "baseline with lint debt")

    def lint_manager(self, implement=None, fix=None, on_call=None, **cfg):
        script = {}
        if implement:
            script["implement"] = implement
        if fix:
            script["fix"] = fix
        codex = MockAgent("codex", script, on_call=on_call)
        m = self.manager(codex=codex, validation=LINT_CFG, **cfg)
        m.runner = Runner(self.tmp)
        m.pg_globs = []
        return m

    def one_task(self, m):
        m.preflight()
        m.ensure_lint_baseline()
        m.plan()
        task = T.select_next(m.tasks)
        m.run_task(task)
        return task


# ============================================================ 1. lint baseline comparison
class LintParseTests(unittest.TestCase):
    def test_parse_v2u_oxlint_output(self):
        findings, _ = LB.parse_lint_output(V2U_LINT)
        self.assertEqual(LB.counts(findings), {"errors": 1, "warnings": 2})
        f = findings[0]
        self.assertEqual((f.file, f.line, f.col, f.rule), ("scripts/test-phase-57.js", 17, 7, "react-hooks(rules-of-hooks)"))
        self.assertNotIn("help:", findings[1].message)

    def test_parse_other_formats(self):
        stylish = "/repo/src/a.ts\n  3:7  error  'x' is defined but never used  no-unused-vars\n  4:1  warning  Unexpected console  no-console\n\n✖ 2 problems (1 error, 1 warning)\n"
        f, reported = LB.parse_lint_output(stylish, Path("/repo"))
        self.assertEqual([(x.file, x.line, x.severity) for x in f], [("src/a.ts", 3, "error"), ("src/a.ts", 4, "warning")])
        self.assertEqual(reported, {"errors": 1, "warnings": 1})
        unix = "C:\\proj\\src\\b.js:2:5: Missing semicolon. [Error/semi]\n"
        f, _ = LB.parse_lint_output(unix, Path("C:\\proj"))
        self.assertEqual((f[0].file, f[0].rule, f[0].severity), ("src/b.js", "semi", "error"))
        graphical = "  ⚠ eslint(no-unused-vars): Variable 'x' is declared but never used.\n   ╭─[src/c.ts:3:7]\n  × eslint(no-debugger): debugger\n   ╭─[src/c.ts:9:1]\nFound 1 warning and 1 error.\n"
        f, reported = LB.parse_lint_output(graphical)
        self.assertEqual([(x.line, x.severity) for x in f], [(3, "warning"), (9, "error")])
        self.assertEqual(reported, {"errors": 1, "warnings": 1})
        js = json.dumps([{"filePath": "/r/d.js", "messages": [{"ruleId": "eqeqeq", "severity": 2, "message": "m", "line": 1, "column": 2}]}])
        f, _ = LB.parse_lint_output(js, Path("/r"))
        self.assertEqual((f[0].file, f[0].rule, f[0].severity), ("d.js", "eqeqeq", "error"))

    def test_line_mapping(self):
        hunks = LB.parse_hunks("@@ -0,0 +1,3 @@\n+a\n+b\n+c\n@@ -5,1 +8,2 @@\n-x\n+y\n+z\n")
        self.assertEqual(LB.map_line(1, hunks), 4)    # shifted by insertion above
        self.assertEqual(LB.map_line(5, hunks), 8)    # in-place edit keeps position
        self.assertEqual(LB.map_line(9, hunks), 13)   # after both hunks: +3 then +1
        self.assertIsNone(LB.map_line(2, LB.parse_hunks("@@ -2,1 +1,0 @@\n-gone\n")))


class LintCompareTests(unittest.TestCase):
    def f(self, line, sev="error", file="a.js", rule="r", msg="m"):
        return LB.Finding(file, line, 1, sev, rule, msg)

    def test_baseline_failure_accepted(self):
        base = [self.f(i) for i in range(1, 11)]
        comp = LB.compare(base, list(base))
        self.assertEqual(comp.status, V.PASS_WITH_BASELINE_DEBT)
        self.assertEqual((comp.baseline["errors"], comp.current["errors"], comp.new_errors), (10, 10, 0))
        self.assertIn("Status: PASS_WITH_BASELINE_DEBT", comp.report_lines())

    def test_new_regression_rejected(self):
        base = [self.f(i) for i in range(1, 11)]
        comp = LB.compare(base, base + [self.f(3, file="new.js")])
        self.assertEqual(comp.status, V.FAIL_REGRESSION)
        self.assertEqual((comp.current["errors"], comp.new_errors), (11, 1))
        self.assertTrue(any(x.startswith("NEW_REGRESSION new.js:3") for x in comp.details()["newFindings"]))

    def test_same_key_count_increase_is_regression(self):
        base = [self.f(1)]
        self.assertEqual(LB.compare(base, [self.f(1), self.f(7)]).status, V.FAIL_REGRESSION)

    def test_removed_baseline_errors_accepted(self):
        base = [self.f(i) for i in range(1, 11)]
        comp = LB.compare(base, base[:8])
        self.assertEqual((comp.status, comp.fixed_errors), (V.PASS_WITH_BASELINE_DEBT, 2))
        self.assertEqual(LB.compare(base, []).status, V.PASS)

    def test_changed_location_detected(self):
        base = [self.f(5)]
        hunks = LB.parse_hunks("@@ -5,1 +5,3 @@\n")    # task rewrote line 5 into 3 lines
        comp = LB.compare(base, [self.f(7)], lambda file, line: LB.map_line(line, hunks))
        self.assertEqual((comp.status, comp.moved_errors), (V.FAIL_REGRESSION, 1))
        self.assertTrue(comp.details()["movedFindings"][0].startswith("MOVED a.js:7"))

    def test_warnings_delta(self):
        base = [self.f(1), self.f(2, "warning")]
        cur = base + [self.f(9, "warning", msg="w2")]
        comp = LB.compare(base, cur, warnings_policy=LB.WARN_ONLY)
        self.assertEqual((comp.status, comp.new_warnings), (V.PASS_WITH_BASELINE_DEBT, 1))
        self.assertTrue(any("new 1" in line and "warning-only" in line for line in comp.report_lines()))
        self.assertTrue(any("NEW_WARNING" in line for line in comp.report_lines()))
        self.assertEqual(LB.compare(base, cur, warnings_policy=LB.FAIL_ON_WARNINGS).status, V.FAIL_REGRESSION)

    def test_warnings_policy_from_rules(self):
        self.assertEqual(LB.warnings_policy_from(None, "Do not introduce new lint regressions."), LB.WARN_ONLY)
        self.assertEqual(LB.warnings_policy_from(None, "- No new lint warnings"), LB.FAIL_ON_WARNINGS)
        self.assertEqual(LB.warnings_policy_from("warn", "- No new lint warnings"), LB.WARN_ONLY)


class LintManagerTests(LintRepoCase):
    def test_baseline_recorded_before_first_task(self):
        m = self.lint_manager()
        m.preflight()
        m.ensure_lint_baseline()
        base = m.load_lint_baseline()
        self.assertEqual(base["counts"], {"errors": 10, "warnings": 2})
        self.assertEqual(base["commit"], m.git.head_full())
        self.assertTrue((m.paths.reports / "lint-baseline.md").exists())
        self.assertEqual(m.state["lintBaseline"]["counts"]["errors"], 10)

    def test_baseline_debt_does_not_fail_task(self):
        def implement():
            (self.tmp / "src" / "clean.js").write_text("export const ok = 1;\n")
            return {"complete": True, "commitMessage": "feat: add clean module"}
        m = self.lint_manager(implement)
        task = self.one_task(m)
        self.assertEqual(task["status"], T.DONE)
        lint = next(s for s in task["validation"]["steps"] if s["kind"] == "lint")
        self.assertEqual(lint["status"], V.PASS_WITH_BASELINE_DEBT)
        self.assertEqual((lint["details"]["baselineErrors"], lint["details"]["currentErrors"], lint["details"]["newErrors"]), (10, 10, 0))
        self.assertNotIn(("fix", "write"), self.codex.calls)       # agent was never asked to touch old debt
        self.assertIn("Status: PASS_WITH_BASELINE_DEBT", m.ui.lines)
        # rolling baseline: accepted state becomes the new comparison point
        self.assertEqual(m.load_lint_baseline()["commit"], m.git.head_full())
        self.assertEqual(m.load_lint_baseline()["original"]["errors"], 10)

    def test_new_regression_rejected_and_fix_sees_only_regression(self):
        prompts = {}
        def implement():
            (self.tmp / "src" / "new.js").write_text("const y = BAD;\n")
            return {"complete": True}
        def fix():
            (self.tmp / "src" / "new.js").write_text("const y = 1;\n")
            return {"fixed": ["removed BAD"]}
        m = self.lint_manager(implement, fix, on_call=lambda n, r, p: prompts.setdefault(r, p))
        task = self.one_task(m)
        self.assertEqual(task["status"], T.DONE)
        self.assertIn("Status: FAIL_REGRESSION", m.ui.lines)
        self.assertIn("New errors: 1", m.ui.lines)
        fixp = prompts["fix"]
        self.assertIn("NEW_REGRESSION src/new.js:1", fixp)
        self.assertIn("BASELINE_DEBT: do NOT fix", fixp)
        self.assertNotIn("src/a.js:1:1", fixp)                      # old debt is not presented as work
        self.assertEqual((self.tmp / "src" / "a.js").read_text().count("BAD"), 10)

    def test_line_shift_above_baseline_is_not_regression(self):
        def implement():
            a = self.tmp / "src" / "a.js"
            a.write_text("// header\n// more\n// docs\n" + a.read_text())
            return {"complete": True}
        task = self.one_task(self.lint_manager(implement))
        lint = next(s for s in task["validation"]["steps"] if s["kind"] == "lint")
        self.assertEqual(lint["status"], V.PASS_WITH_BASELINE_DEBT)
        self.assertEqual(task["status"], T.DONE)

    def test_changed_baseline_finding_location_is_regression(self):
        def implement():
            a = self.tmp / "src" / "a.js"
            lines = a.read_text().splitlines()
            lines[2] = "const x2 =\n  BAD;"   # task rewrote line 3 itself; its BAD now sits on line 4
            a.write_text("\n".join(lines) + "\n")
            return {"complete": True}
        m = self.lint_manager(implement, maxTaskRetries=1)
        task = self.one_task(m)
        lint = next(s for s in task["validation"]["steps"] if s["kind"] == "lint")
        self.assertEqual(lint["status"], V.FAIL_REGRESSION)
        self.assertEqual(lint["details"]["movedErrors"], 1)
        self.assertEqual(task["status"], T.FAILED)

    def test_in_place_edit_of_debt_line_keeps_debt(self):
        def implement():
            a = self.tmp / "src" / "a.js"
            a.write_text(a.read_text().replace("const x2 = BAD;", "let x2 = BAD; // touched"))
            return {"complete": True}
        task = self.one_task(self.lint_manager(implement))
        self.assertEqual(task["status"], T.DONE)

    def test_new_warning_reported_but_warning_only(self):
        def implement():
            (self.tmp / "src" / "w.js").write_text("WARN new\n")
            return {"complete": True}
        m = self.lint_manager(implement)
        task = self.one_task(m)
        self.assertEqual(task["status"], T.DONE)
        self.assertTrue(any("new 1 (warning-only)" in line for line in m.ui.lines))

    def test_new_warning_fails_when_configured(self):
        def implement():
            (self.tmp / "src" / "w.js").write_text("WARN new\n")
            return {"complete": True}
        m = self.lint_manager(implement, maxTaskRetries=1, lint={"warnings": "fail"})
        self.assertEqual(self.one_task(m)["status"], T.FAILED)

    def test_unparseable_lint_failure_is_blocked_not_pass(self):
        step = V.Step("lint", ["npm", "run", "lint"], "lint")
        m = self.lint_manager()
        m.preflight()
        res = m.lint_evaluator()(step, 2, "Error: config file broken\n")
        self.assertEqual(res.status, V.BLOCKED)          # never PASS, never a "regression" for agents to fix
        self.assertEqual(V.task_verdict([res])[0], "human")


# ============================================================ 2. RLS / SKIPPED handling
class ValidationStateTests(unittest.TestCase):
    rls = V.Step("test:rls", ["npm", "run", "test:rls"], "security", True)

    def test_rls_pass(self):
        r = V.classify(self.rls, 0, RLS_PASS)
        self.assertEqual(r.status, V.PASS)
        self.assertTrue(any("POSTGREST_BIN" in n for n in r.notes))   # partial skip reported, not hidden

    def test_rls_fail(self):
        self.assertEqual(V.classify(self.rls, 1, RLS_FAIL).status, V.FAIL)

    def test_rls_skipped_is_blocked(self):
        r = V.classify(self.rls, 0, RLS_SKIPPED)
        self.assertEqual(r.status, V.BLOCKED)
        self.assertIn("PostgreSQL test runtime unavailable", r.reason)
        self.assertIn("PG_BIN", r.required_action)
        self.assertFalse(r.status in V.OK_STATES)

    def test_non_critical_skip_is_skipped_not_pass(self):
        r = V.classify(V.Step("e2e", ["npm", "run", "e2e"]), 0, "SKIPPED: browser not installed")
        self.assertEqual(r.status, V.SKIPPED)

    def test_missing_prerequisite_executable(self):
        r = V.classify(self.rls, None, "", not_found=True)
        self.assertEqual(r.status, V.BLOCKED)
        self.assertTrue(r.env_missing)
        self.assertEqual(V.task_verdict([r])[0], "human")

    def test_states_and_gates(self):
        ok = V.StepResult("test", [], V.PASS)
        blocked = V.StepResult("test:rls", [], V.BLOCKED, "security", True, reason="PostgreSQL test runtime unavailable")
        self.assertEqual(V.task_verdict([ok, blocked])[0], "pass")          # task may continue, flagged UNVERIFIED
        self.assertTrue(V.goal_blockers([ok, blocked], True))                # ...but the goal may not complete
        self.assertEqual(V.goal_blockers([ok, V.StepResult("test:rls", [], V.PASS, "security", True)], True), [])
        self.assertTrue(V.goal_blockers([ok], True))                          # RLS required but not configured
        self.assertEqual(V.task_verdict([V.StepResult("lint", [], V.FAIL_REGRESSION, "lint")])[0], "fail")

    def test_detect_steps_v2u(self):
        with tempfile.TemporaryDirectory() as d:
            Path(d, "package.json").write_text(json.dumps({"scripts": {
                "dev": "vite", "build": "tsc -b && vite build", "lint": "oxlint", "test": "node scripts/run-all-tests.js",
                "test:rls": "node scripts/test-supabase-rls.mjs", "audit:content": "node x"}}))
            steps = V.detect_steps(Path(d))
            self.assertEqual([(s.name, s.kind, s.critical) for s in steps],
                             [("lint", "lint", False), ("test", "test", False), ("test:rls", "security", True), ("build", "build", False)])

    def test_requires_security(self):
        self.assertTrue(V.requires_security(RLS_GOAL))
        self.assertFalse(V.requires_security(GOAL))


class PgBinTests(unittest.TestCase):
    def setUp(self):
        self.d = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.d, ignore_errors=True)

    def make(self, version, exe="initdb.exe"):
        b = self.d / "Program Files" / "PostgreSQL" / version / "bin"
        b.mkdir(parents=True)
        (b / exe).write_text("")
        return b

    def test_autodetect_picks_highest_version_without_hardcoding(self):
        self.make("15")
        self.make("17")
        self.make("9.6")
        (self.d / "Program Files" / "PostgreSQL" / "18" / "bin").mkdir(parents=True)   # no initdb -> ignored
        pg, source = V.find_pg_bin({}, [str(self.d / "Program Files" / "PostgreSQL" / "*" / "bin")])
        self.assertTrue(pg.endswith(os.path.join("17", "bin")))
        self.assertEqual(source, "auto-detected")

    def test_pg_bin_env_wins(self):
        self.make("17")
        pg, source = V.find_pg_bin({"PG_BIN": r"D:\pg\16\bin"}, [str(self.d / "**")])
        self.assertEqual((pg, source), (r"D:\pg\16\bin", "PG_BIN (environment/config)"))

    def test_not_found(self):
        self.assertEqual(V.find_pg_bin({}, [str(self.d / "nothing" / "*")]), (None, "not found"))

    def test_pg_bin_supplied_reaches_command_and_is_reported(self):
        b = self.make("17")
        seen = {}
        def runner(argv, cwd, env, timeout):
            seen.update(env)
            return 0, RLS_PASS, False, False
        step = V.Step("test:rls", ["npm", "run", "test:rls"], "security", True)
        res = V.run_validation(self.d, [step], runner=runner, extra_env={"PG_BIN": str(b)}, pg_globs=[])
        self.assertEqual(seen["PG_BIN"], str(b))
        self.assertEqual(res[0].status, V.PASS)
        self.assertIn(f"PG_BIN={b}", res[0].notes[0])

    def test_windows_initdb_exe_hint_when_script_still_skips(self):
        b = self.make("17")
        step = V.Step("test:rls", ["npm", "run", "test:rls"], "security", True)
        res = V.run_validation(self.d, [step], runner=lambda *a: (0, RLS_SKIPPED, False, False),
                               extra_env={"PG_BIN": str(b)}, pg_globs=[])
        self.assertEqual(res[0].status, V.BLOCKED)
        self.assertTrue(any("initdb.exe" in n and "WSL" in n for n in res[0].notes))


class SecurityGoalTests(RepoCase):
    def setUp(self):
        super().setUp()
        (self.tmp / "GOAL.md").write_text(RLS_GOAL, encoding="utf-8")
        git(self.tmp, "commit", "-qam", "rls goal")

    def run_with(self, rls):
        m = self.manager(validation={"test": ["npm", "test"],
                                     "test:rls": {"command": ["npm", "run", "test:rls"], "critical": True}})
        m.runner = Runner(self.tmp, rls=rls)
        m.pg_globs = []
        return m, m.run()

    def transitions(self, m):
        return [json.loads(l).get("new") for l in m.paths.history.read_text().splitlines()]

    def test_rls_skipped_blocks_goal_completion(self):
        m, status = self.run_with((0, RLS_SKIPPED))
        self.assertEqual(status, "NEEDS_HUMAN")
        self.assertNotIn("GOAL_COMPLETE", self.transitions(m))
        self.assertFalse(m.state["goalEvaluation"]["complete"])
        q = (m.paths.reports / "NEEDS_HUMAN.md").read_text()
        self.assertIn("test:rls: BLOCKED", q)
        self.assertIn("PG_BIN", q)
        self.assertIn("RLS security validation:", m.ui.lines)
        self.assertIn("Status: BLOCKED", m.ui.lines)
        self.assertTrue(any(l.startswith("Required action: install/configure PostgreSQL or set PG_BIN") for l in m.ui.lines))

    def test_rls_pass_allows_goal_completion(self):
        m, status = self.run_with((0, RLS_PASS))
        self.assertEqual(status, "PROJECT_STABLE")
        self.assertIn("GOAL_COMPLETE", self.transitions(m))

    def test_rls_fail_creates_fix_task_not_complete(self):
        m = self.manager(validation={"test:rls": {"command": ["npm", "run", "test:rls"], "critical": True}}, maxCycles=3)
        m.runner = Runner(self.tmp, rls=(1, RLS_FAIL))
        m.pg_globs = []
        m.run()
        self.assertNotIn("GOAL_COMPLETE", self.transitions(m))

    def test_goal_needs_rls_but_none_configured(self):
        m, status = self.run_with((0, RLS_PASS))
        m2 = self.manager(validation={"test": ["npm", "test"]})
        m2.runner = Runner(self.tmp)
        m2.preflight()
        checks = m2.run_checks()
        self.assertTrue(any("no security validation command" in b for b in checks["goalBlockers"]))

    def test_missing_tool_needs_human_not_pass(self):
        def implement():
            (self.tmp / "x.txt").write_text("x\n")
            return {"complete": True}
        m = self.manager(codex=MockAgent("codex", {"implement": implement}), validation={"test": ["missing-tool", "test"]})
        m.runner = Runner(self.tmp)
        self.assertEqual(m.run(), "NEEDS_HUMAN")
        self.assertIn("missing-tool", (m.paths.reports / "NEEDS_HUMAN.md").read_text())

    def test_dry_run_reports_not_run(self):
        m = Manager(self.tmp, self.cfg(), agents={"claude": MockAgent("claude"), "codex": MockAgent("codex")},
                    dry_run=True, ui=UI(quiet=True))
        self.assertEqual(m.run(), "PROJECT_STABLE")
        self.assertTrue(any("NOT_RUN (dry-run)" in l for l in m.ui.lines))
        self.assertIn("(real Goal completion also requires RLS/security validation = PASS)", m.ui.lines)


# ============================================================ 3. first real cycle safety (autoPush)
class AutoPushTests(RepoCase):
    def add_remote(self):
        self.remote = Path(tempfile.mkdtemp(prefix="aiteam-remote-"))
        git(self.remote, "init", "-q", "--bare")
        git(self.tmp, "remote", "add", "origin", str(self.remote))
        git(self.tmp, "push", "-q", "-u", "origin", "HEAD")
        self.addCleanup(shutil.rmtree, self.remote, True)

    def remote_head(self):
        br = subprocess.run(["git", "branch", "--show-current"], cwd=self.tmp, capture_output=True, text=True).stdout.strip()
        return subprocess.run(["git", "rev-parse", br], cwd=self.remote, capture_output=True, text=True).stdout.strip()

    def test_local_config_created_with_autopush_off(self):
        paths = ProjectPaths(self.tmp)
        paths.ensure()
        self.assertFalse(json.loads(paths.local_config.read_text())["autoPush"])
        self.assertFalse(load_config(self.tmp)["autoPush"])
        paths.local_config.write_text('{"autoPush": true}')
        paths.ensure()                                              # never overwrites the user's choice
        self.assertTrue(load_config(self.tmp)["autoPush"])
        files = subprocess.run(["git", "status", "--porcelain"], cwd=self.tmp, capture_output=True, text=True).stdout
        self.assertNotIn(".aiteam", files)                          # machine-local, git-ignored

    def test_first_cycle_commits_locally_but_never_pushes(self):
        self.add_remote()
        before = self.remote_head()
        ProjectPaths(self.tmp).ensure()
        cfg = load_config(self.tmp)
        cfg.update({"parallelAnalysis": False, "waitForQuota": False, "startupProbe": False, "maxCycles": 1})
        def implement():
            (self.tmp / "feature.txt").write_text("feature\n")
            return {"complete": True, "commitMessage": "feat: add feature"}
        m = Manager(self.tmp, cfg, agents={"claude": MockAgent("claude"), "codex": MockAgent("codex", {"implement": implement})},
                    ui=UI(quiet=True), command_runner=lambda *a: (0, "ok", False, False), pg_globs=[])
        m.run()
        log = subprocess.run(["git", "log", "--oneline"], cwd=self.tmp, capture_output=True, text=True).stdout
        self.assertIn("feat: add feature", log)
        self.assertEqual(self.remote_head(), before)                # origin untouched
        self.assertTrue(any("not pushed: autoPush is OFF" in l for l in m.ui.lines))
        # explicit user order: preview first, then push
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            aiteam.main(["--project", str(self.tmp), "push"])
        self.assertEqual(self.remote_head(), before)
        self.assertIn("aiteam push --yes", out.getvalue())
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(aiteam.main(["--project", str(self.tmp), "push", "--yes"]), 0)
        self.assertNotEqual(self.remote_head(), before)

    def test_config_command_set_and_reject_secrets(self):
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(aiteam.main(["--project", str(self.tmp), "config", "set", "autoPush", "true"]), 0)
            self.assertEqual(aiteam.main(["--project", str(self.tmp), "config", "set", "validationEnv.PG_BIN",
                                          r"C:\Program Files\PostgreSQL\17\bin"]), 0)
            self.assertEqual(aiteam.main(["--project", str(self.tmp), "config", "set", "openaiApiKey", "x"]), 2)
        cfg = load_config(self.tmp)
        self.assertTrue(cfg["autoPush"])
        self.assertEqual(cfg["validationEnv"]["PG_BIN"], r"C:\Program Files\PostgreSQL\17\bin")
        self.assertNotIn("openaiApiKey", json.loads(ProjectPaths(self.tmp).local_config.read_text()))

    def test_claude_write_mode_cannot_push_or_deploy(self):
        c = ClaudeAgent(DEFAULTS["claude"])
        c._help = "--print --permission-mode --allowedTools --disallowedTools --output-format"
        argv, _ = c.build("write", Path("."), None)
        dis = argv[argv.index("--disallowedTools") + 1:]
        for rule in ("Bash(git push:*)", "Bash(git commit:*)", "Bash(supabase db push:*)"):
            self.assertIn(rule, dis)


# ============================================================ 4. human gate tuning
V2U_GOAL = """# Current Major Goal
VERIFY, COMPLETE AND HARDEN PHASE 72B. Do NOT redo the Firebase -> Supabase migration from scratch.
Target backend: Supabase Auth, Google OAuth, PostgreSQL, Row Level Security.
No obsolete competing Firebase backend remains active. No secrets are committed.
"""


class HumanGateTuningTests(RepoCase):
    FALSE_POSITIVES = [
        "Remove obsolete Firebase auth provider",
        "Remove obsolete Firebase auth provider code after verification",
        "Switch login system calls to Supabase Auth",
        "Switch remaining login system calls to Supabase Auth",
        "Ensure no secrets are committed",
        "Ensure no service-role key or secrets are committed; add a check",
        "Add test ensuring the service-role key never reaches the browser bundle",
        "Document Google OAuth setup that requires a client secret from the owner",
        "Harden first SUPER_ADMIN bootstrap",
        "Add RLS tests for self role escalation",
        "Verify production build passes",
        "Preserve learner progress during login",
        "Do not deploy to production",
        "Migrate admin CMS reads to Supabase PostgreSQL",
    ]
    TRUE_POSITIVES = [
        ("Deploy the app to production", "production deployment"),
        ("Run the migration against the production database", "production data/infrastructure change"),
        ("Run supabase db push to apply migrations", "production data/infrastructure change"),
        ("Write migration to DROP TABLE sessions", "destructive database migration"),
        ("Delete learner progress older than 30 days", "deleting user data"),
        ("Enable the paid Supabase Pro plan", "paid service activation"),
        ("Configure Google OAuth client secret in Supabase", "secrets/credentials required"),
        ("Requires a Stripe API key to be provided", "secrets/credentials required"),
        ("Disable RLS on profiles table", "irreversible security decision"),
        ("Replace Supabase Auth with Auth0", "authentication/backend direction change"),
        ("Move the backend away from Supabase", "authentication/backend direction change"),
        ("Change the primary navigation items", "major product direction change"),
        ("Rewrite the entire frontend in Svelte", "large architecture replacement"),
    ]

    def test_goal_aligned_local_changes_not_gated(self):
        for text in self.FALSE_POSITIVES:
            self.assertIsNone(human_gate_reason(text, goal_text=V2U_GOAL), text)

    def test_real_risks_still_gated(self):
        for text, why in self.TRUE_POSITIVES:
            self.assertEqual(human_gate_reason(text, goal_text=V2U_GOAL), why, text)

    def test_auth_target_must_match_goal(self):
        self.assertIsNone(human_gate_reason("Switch login to Supabase Auth", goal_text=V2U_GOAL))
        self.assertEqual(human_gate_reason("Switch login to Auth0", goal_text=V2U_GOAL), "authentication/backend direction change")
        self.assertIsNotNone(human_gate_reason("Switch login to Supabase Auth"))   # no goal context -> stay conservative

    def test_planned_goal_tasks_are_not_blocked(self):
        (self.tmp / "GOAL.md").write_text(GOAL + "\n" + V2U_GOAL, encoding="utf-8")
        git(self.tmp, "commit", "-qam", "goal")
        plan = {"tasks": [{"key": "a", "title": "Remove obsolete Firebase auth provider", "acceptanceCriteria": ["gone"]},
                          {"key": "b", "title": "Switch remaining login system calls to Supabase Auth", "acceptanceCriteria": ["ok"]},
                          {"key": "c", "title": "Ensure no secrets are committed", "acceptanceCriteria": ["ok"]},
                          {"key": "d", "title": "Deploy to production", "acceptanceCriteria": ["live"]}]}
        m = self.manager(claude=MockAgent("claude", {"plan": [plan]}), codex=MockAgent("codex", {"plan_merge": [plan]}))
        m.preflight()
        m.plan()
        status = {t["title"]: t["status"] for t in m.tasks}
        self.assertEqual(status["Remove obsolete Firebase auth provider"], T.READY)
        self.assertEqual(status["Switch remaining login system calls to Supabase Auth"], T.READY)
        self.assertEqual(status["Ensure no secrets are committed"], T.READY)
        self.assertEqual(status["Deploy to production"], T.NEEDS_HUMAN)

    def test_improvement_selection_uses_goal_context(self):
        cand = [{"title": "Switch remaining login system calls to Supabase Auth", "impact": "high", "risk": "low",
                 "effort": "low", "reason": "two auth paths", "evidence": "src/auth/firebase.ts"}]
        sel, _ = select_improvements(cand, [], DEFAULTS, V2U_GOAL)
        self.assertEqual(len(sel), 1)


if __name__ == "__main__":
    unittest.main()
