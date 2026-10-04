"""Windows validation: oxlint's real output formats (ASCII console theme, JSON through npm, agent one-line),
Windows paths/CRLF, unreadable output stays BLOCKED, and script-reported BLOCKED for RLS."""
import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import lint_baseline as LB  # noqa: E402
import tasks as T  # noqa: E402
import validation as V  # noqa: E402
from test_preflight_fixes import LintRepoCase, Runner  # noqa: E402

ROOT = Path("C:/Users/com/.gemini/antigravity/scratch/engineering-study-hub")

# What `npm run lint` (oxlint 1.x) prints on a plain Windows console / piped process: miette ASCII theme.
ASCII_WINDOWS = (
    "\r\n> nextstep@0.0.0 lint\r\n> oxlint\r\n\r\n"
    "  ! eslint(no-unused-vars): Identifier 'assert' is imported but never used.\r\n"
    "   ,-[scripts\\test-e2e-journey.js:2:8]\r\n"
    " 1 | // Automated QA Test\r\n"
    " 2 | import assert from 'node:assert';\r\n"
    "   :        ^^^|^^\r\n"
    "   :           `-- 'assert' is imported here\r\n"
    " 3 | useEffect(() => { run([]) }, []);\r\n"
    "   `----\r\n"
    "  help: Consider removing this import.\r\n"
    "\r\n"
    "  x react-hooks(rules-of-hooks): React Hook \"useActionableRegistry\" cannot be called at the top level.\r\n"
    "    ,-[scripts\\test-phase-57.js:17:7]\r\n"
    " 16 | const reg = {};\r\n"
    " 17 | const r = useActionableRegistry();\r\n"
    "    :           ^^^^^^^^^^^^^^^^^^^^^^^\r\n"
    "    `----\r\n"
    "\r\n"
    "  ! react(exhaustive-deps): React Hook useEffect has a missing dependency: 'load'\r\n"
    "     ,-[src\\pages\\LessonDetail.tsx:108:7]\r\n"
    " 108 |   }, []);\r\n"
    "     `----\r\n"
    "  help: Either include it or remove the dependency array.\r\n"
    "\r\n"
    "Found 2 warnings and 1 error.\r\n"
    "Finished in 497ms on 302 files with 116 rules using 4 threads.\r\n"
    "npm error Lifecycle script `lint` failed with error:\r\nnpm error code 1\r\n"
)
UNICODE_THEME = ASCII_WINDOWS.replace("  ! ", "  \u26a0 ").replace("  x ", "  \u00d7 ").replace(",-[", "\u256d\u2500[")
AGENT_ONE_LINE = (
    "scripts/test-e2e-journey.js:2:8: warning eslint(no-unused-vars): Identifier 'assert' is imported but never used. help: Consider removing this import.\n"
    "scripts/test-phase-57.js:17:7: error react-hooks(rules-of-hooks): React Hook \"useActionableRegistry\" cannot be called at the top level.\n"
    "src/pages/LessonDetail.tsx:108:7: warning react(exhaustive-deps): React Hook useEffect has a missing dependency: 'load' help: Either include it.\n"
)
JSON_WINDOWS = (
    "\r\n> nextstep@0.0.0 lint\r\n> oxlint --format json\r\n\r\n"
    + json.dumps({"diagnostics": [
        {"message": "Identifier 'assert' is imported but never used.", "code": "eslint(no-unused-vars)", "severity": "warning",
         "filename": "scripts\\test-e2e-journey.js", "labels": [{"span": {"offset": 1, "length": 6, "line": 2, "column": 8}}]},
        {"message": "React Hook \"useActionableRegistry\" cannot be called at the top level.", "code": "react-hooks(rules-of-hooks)",
         "severity": "error", "filename": "scripts\\test-phase-57.js", "labels": [{"span": {"line": 17, "column": 7}}]},
        {"message": "React Hook useEffect has a missing dependency: 'load'", "code": "react(exhaustive-deps)", "severity": "warning",
         "help": "Either include it or remove the dependency array.", "filename": "src\\pages\\LessonDetail.tsx",
         "labels": [{"span": {"line": 108, "column": 7}}]}],
        "number_of_files": 302, "number_of_rules": 116}, indent=2).replace("\n", "\r\n")
    + "\r\nnpm error code 1\r\nnpm error path C:\\Users\\com\\.gemini\\antigravity\\scratch\\engineering-study-hub\r\n"
)
ESLINT_JSON_ABS = json.dumps([{"filePath": "C:\\Users\\com\\.gemini\\antigravity\\scratch\\engineering-study-hub\\src\\a.ts",
                               "messages": [{"ruleId": "no-unused-vars", "severity": 2, "message": "'x' is unused", "line": 3, "column": 7}]}])


class OxlintWindowsFormatTests(unittest.TestCase):
    def test_every_real_format_gives_identical_findings(self):
        results = {name: LB.parse_lint(text, ROOT) for name, text in
                   [("ascii", ASCII_WINDOWS), ("unicode", UNICODE_THEME), ("agent", AGENT_ONE_LINE), ("json", JSON_WINDOWS)]}
        keys = {n: sorted(f.key for f in r.findings) for n, r in results.items()}
        for n, r in results.items():
            self.assertEqual(LB.counts(r.findings), {"errors": 1, "warnings": 2}, n)
            self.assertTrue(r.recognized and r.consistent, n)
            self.assertEqual(keys[n], keys["json"], n)
        self.assertEqual(results["json"].fmt, "json")
        self.assertEqual(results["ascii"].reported, {"errors": 1, "warnings": 2})
        files = sorted({f.file for f in results["ascii"].findings})
        self.assertEqual(files, ["scripts/test-e2e-journey.js", "scripts/test-phase-57.js", "src/pages/LessonDetail.tsx"])

    def test_code_snippet_brackets_are_not_json(self):
        r = LB.parse_lint(ASCII_WINDOWS, ROOT)
        self.assertEqual(r.fmt, "text")         # `useEffect(..., [])` in a snippet must not look like an empty JSON report

    def test_absolute_windows_paths_made_relative(self):
        r = LB.parse_lint(ESLINT_JSON_ABS, Path("C:\\Users\\com\\.gemini\\antigravity\\scratch\\engineering-study-hub"))
        self.assertEqual([(f.file, f.severity) for f in r.findings], [("src/a.ts", "error")])

    def test_summary_mismatch_is_detected(self):
        truncated = ASCII_WINDOWS.replace("    ,-[scripts\\test-phase-57.js:17:7]\r\n", "")
        r = LB.parse_lint(truncated, ROOT)
        self.assertFalse(r.consistent)          # parsed 0 errors but oxlint said 1 -> must not be trusted

    def test_linter_not_installed_is_recognized(self):
        out = "\r\n> nextstep@0.0.0 lint\r\n> oxlint\r\n\r\n'oxlint' is not recognized as an internal or external command,\r\noperable program or batch file.\r\n"
        r = LB.parse_lint(out, ROOT)
        self.assertTrue(r.linter_missing)
        self.assertEqual(r.findings, [])


class LintCommandDetectionTests(unittest.TestCase):
    def test_json_requested_only_for_plain_known_linters(self):
        self.assertEqual(V.lint_argv("npm", "lint", "oxlint"), (["npm", "run", "lint", "--", "--format", "json"], "json"))
        self.assertEqual(V.lint_argv("npm", "lint", "eslint src"), (["npm", "run", "lint", "--", "--format", "json"], "json"))
        self.assertEqual(V.lint_argv("pnpm", "lint", "oxlint"), (["pnpm", "run", "lint", "--format", "json"], "json"))
        for script in ("oxlint && eslint .", "oxlint -f unix", "eslint --format=stylish .", "next lint", "biome lint"):
            self.assertEqual(V.lint_argv("npm", "lint", script), (["npm", "run", "lint"], "text"), script)

    def test_v2u_package_json(self):
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            Path(d, "package.json").write_text(json.dumps({"scripts": {"lint": "oxlint", "test": "node x", "test:rls": "node y", "build": "vite build"}}))
            lint = next(s for s in V.detect_steps(Path(d)) if s.kind == "lint")
            self.assertEqual((lint.argv, lint.fmt), (["npm", "run", "lint", "--", "--format", "json"], "json"))


def ascii_lint(root: Path) -> tuple[int, str]:
    """Fake oxlint in the Windows console ASCII theme (backslash paths, CRLF) for the LintRepoCase files."""
    blocks, errors, warnings = [], 0, 0
    for f in sorted(root.rglob("*.js")):
        if ".git" in f.parts or ".aiteam" in f.parts:
            continue
        rel = f.relative_to(root).as_posix().replace("/", "\\")
        for i, text in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
            if "BAD" in text:
                errors += 1
                blocks.append(f"  x custom(no-bad): Unexpected BAD token\r\n   ,-[{rel}:{i}:1]\r\n {i} | {text}\r\n   `----\r\n  help: remove it\r\n")
            if "WARN" in text:
                warnings += 1
                blocks.append(f"  ! custom(no-warn): Avoid WARN\r\n   ,-[{rel}:{i}:1]\r\n   `----\r\n")
    out = "\r\n> app lint\r\n> oxlint\r\n\r\n" + "\r\n".join(blocks) + f"\r\nFound {warnings} warnings and {errors} errors.\r\n"
    return (1 if errors else 0), out


class AsciiRunner(Runner):
    def __call__(self, argv, cwd, env, timeout):
        self.calls.append((list(argv), dict(env)))
        if "lint" in argv:
            code, out = ascii_lint(self.root)
            return code, out, False, False
        return super().__call__(argv, cwd, env, timeout)


class WindowsLintBaselineTests(LintRepoCase):
    def lint_manager(self, implement=None, fix=None, on_call=None, **cfg):
        m = super().lint_manager(implement, fix, on_call, **cfg)
        m.runner = AsciiRunner(self.tmp)
        return m

    def test_baseline_debt_with_windows_ascii_output(self):
        def implement():
            (self.tmp / "src" / "clean.js").write_text("export const ok = 1;\n")
            return {"complete": True}
        m = self.lint_manager(implement)
        task = self.one_task(m)
        self.assertEqual(m.load_lint_baseline()["counts"], {"errors": 10, "warnings": 2})
        lint = next(s for s in task["validation"]["steps"] if s["kind"] == "lint")
        self.assertEqual(lint["status"], V.PASS_WITH_BASELINE_DEBT)
        self.assertEqual(task["status"], T.DONE)

    def test_new_regression_with_windows_ascii_output(self):
        def implement():
            (self.tmp / "src" / "new.js").write_text("const y = BAD;\n")
            return {"complete": True}
        m = self.lint_manager(implement, maxTaskRetries=1)
        task = self.one_task(m)
        lint = next(s for s in task["validation"]["steps"] if s["kind"] == "lint")
        self.assertEqual((lint["status"], lint["details"]["newErrors"]), (V.FAIL_REGRESSION, 1))
        self.assertTrue(any("src/new.js:1" in x for x in lint["details"]["newFindings"]))

    def test_unreadable_output_blocks_and_keeps_raw(self):
        m = self.lint_manager()
        m.preflight()
        m.ensure_lint_baseline()
        step = V.Step("lint", ["npm", "run", "lint"], "lint")
        res = m.lint_evaluator()(step, 1, "Unexpected internal error in linter\r\n")
        self.assertEqual(res.status, V.BLOCKED)
        raws = list(m.paths.reports.glob("*lint-unreadable-lint.txt"))
        self.assertTrue(raws and "Unexpected internal error" in raws[0].read_text(encoding="utf-8"))

    def test_linter_missing_is_blocked_with_install_hint(self):
        m = self.lint_manager()
        m.preflight()
        step = V.Step("lint", ["npm", "run", "lint"], "lint")
        res = m.lint_evaluator()(step, 1, "'oxlint' is not recognized as an internal or external command,\r\n")
        self.assertEqual(res.status, V.BLOCKED)
        self.assertIn("npm ci", res.reason)

    def test_summary_mismatch_blocks_instead_of_guessing(self):
        m = self.lint_manager()
        m.preflight()
        m.ensure_lint_baseline()
        step = V.Step("lint", ["npm", "run", "lint"], "lint")
        code, out = ascii_lint(self.tmp)
        res = m.lint_evaluator()(step, code, out.replace("Found 2 warnings and 10 errors.", "Found 2 warnings and 11 errors."))
        self.assertEqual(res.status, V.BLOCKED)

    def test_baseline_retaken_when_lint_command_or_parser_changes(self):
        m = self.lint_manager()
        m.preflight()
        m.ensure_lint_baseline()
        first = m.load_lint_baseline()
        self.assertEqual((first["parser"], first["format"], first["parseable"]), (LB.PARSER_VERSION, "text", True))
        data = dict(first, command=["npm", "run", "lint", "--", "--format", "json"])
        (m.paths.aidir / "lint-baseline.json").write_text(json.dumps(data), encoding="utf-8")
        m.ensure_lint_baseline()        # same commit, but the stored command differs -> fresh baseline
        self.assertEqual(m.load_lint_baseline()["command"], first["command"])


class ScriptReportedBlockedTests(unittest.TestCase):
    rls = V.Step("test:rls", ["npm", "run", "test:rls"], "security", True)

    def test_required_rls_without_postgres_is_blocked_not_fail(self):
        out = "BLOCKED: PostgreSQL server binaries not found (set PG_BIN to the folder containing initdb.exe and pg_ctl.exe)\n"
        r = V.classify(self.rls, 2, out)
        self.assertEqual(r.status, V.BLOCKED)
        self.assertIn("PG_BIN", r.required_action)
        self.assertTrue(V.goal_blockers([r], True))

    def test_real_failures_stay_fail(self):
        out = "  \u274c self role escalation\n\nTotal: 16 | Passed: 15 | Failed: 1\nBLOCKED: something\n"
        self.assertEqual(V.classify(self.rls, 1, out).status, V.FAIL)


if __name__ == "__main__":
    unittest.main()
