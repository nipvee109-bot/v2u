"""Run the project's own checks with honest result states (no fake PASS).

States: PASS, FAIL, SKIPPED, NOT_RUN, BLOCKED, plus lint-specific PASS_WITH_BASELINE_DEBT / FAIL_REGRESSION.
A command that exits 0 but says it skipped (missing prerequisites) is SKIPPED, never PASS.
For security-critical checks (e.g. RLS) SKIPPED becomes BLOCKED and blocks Goal completion.
"""
from __future__ import annotations

import glob
import json
import os
import re
import shutil
import subprocess
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Callable

from agents import subscription_env

PASS = "PASS"
FAIL = "FAIL"
SKIPPED = "SKIPPED"
NOT_RUN = "NOT_RUN"
BLOCKED = "BLOCKED"
PASS_WITH_BASELINE_DEBT = "PASS_WITH_BASELINE_DEBT"
FAIL_REGRESSION = "FAIL_REGRESSION"

OK_STATES = {PASS, PASS_WITH_BASELINE_DEBT}
FAIL_STATES = {FAIL, FAIL_REGRESSION}

ORDER = ["typecheck", "lint", "test", "security", "build"]
SECURITY_NAME = re.compile(r"(^|[:_\-])(rls|security|policies|policy)([:_\-]|$)", re.I)

# Output that means "this check did not actually run".
SKIP_PATTERNS = [re.compile(p, re.I | re.M) for p in (
    r"^\s*SKIPPED\b", r"\bSKIPPED:", r"\bskipp(?:ed|ing)\b[^\n]{0,60}\b(?:not found|missing|unavailable|not installed)",
    r"prerequisites?\s+(?:missing|not\s+(?:found|met|available|installed))", r"binar(?:y|ies)\s+not\s+found",
    r"\(set\s+[A-Z][A-Z0-9_]+\)", r"runtime\s+(?:is\s+)?unavailable", r"no tests? (?:were )?(?:run|found|executed)",
)]
# Evidence that at least one test really executed and passed.
RAN_PATTERNS = [re.compile(p, re.I) for p in (
    r"\bPassed:\s*[1-9]\d*", r"\b[1-9]\d*\s+(?:tests?\s+)?pass(?:ed|ing)\b", r"^#\s*pass\s+[1-9]\d*",
    r"\bTests:\s+[1-9]\d*\s+passed", r"\b(?:ok|PASS)\b\s+\d+\s+tests?",
)]
POSTGRES_HINT = re.compile(r"postgres|initdb|pg_ctl|PG_BIN", re.I)


@dataclass
class Step:
    name: str
    argv: list
    kind: str = "test"         # typecheck | lint | test | security | build
    critical: bool = False
    env: dict = field(default_factory=dict)
    fmt: str = "text"          # lint output format requested: json | text


@dataclass
class StepResult:
    name: str
    argv: list
    status: str
    kind: str = "test"
    critical: bool = False
    output: str = ""
    reason: str = ""
    required_action: str = ""
    notes: list = field(default_factory=list)
    details: dict = field(default_factory=dict)
    exit_code: int | None = None
    env_missing: bool = False

    @property
    def ok(self) -> bool:
        """Task gate: only real failures fail a task (BLOCKED/SKIPPED are reported, never PASS)."""
        return self.status not in FAIL_STATES

    def to_dict(self) -> dict:
        d = asdict(self)
        d["ok"] = self.ok
        d["output"] = self.output[-3000:]
        return d


# ---------------------------------------------------------------- step detection
def _kind_for(name: str) -> tuple[str, bool]:
    n = name.lower()
    if SECURITY_NAME.search(n):
        return "security", True
    if n in ("lint", "eslint", "oxlint") or n.startswith("lint"):
        return "lint", False
    if "type" in n and "check" in n:
        return "typecheck", False
    if n.startswith("build"):
        return "build", False
    return "test", False


def _from_config(configured: dict) -> list[Step]:
    steps = []
    for name, spec in configured.items():
        if isinstance(spec, list) and spec:
            kind, critical = _kind_for(name)
            steps.append(Step(name, list(spec), kind, critical))
        elif isinstance(spec, dict) and spec.get("command"):
            kind, critical = _kind_for(name)
            kind = spec.get("kind", kind)
            critical = bool(spec.get("critical", critical or kind == "security"))
            steps.append(Step(name, list(spec["command"]), kind, critical, dict(spec.get("env") or {})))
    return _ordered(steps)


def _ordered(steps: list[Step]) -> list[Step]:
    return sorted(steps, key=lambda s: ORDER.index(s.kind) if s.kind in ORDER else len(ORDER))


def detect_steps(root: Path, configured: dict | None = None) -> list[Step]:
    if configured:
        return _from_config(configured)
    steps: list[Step] = []
    pkg = root / "package.json"
    if pkg.exists():
        try:
            scripts = json.loads(pkg.read_text(encoding="utf-8")).get("scripts", {})
        except (json.JSONDecodeError, OSError):
            scripts = {}
        runner = "npm"
        if (root / "pnpm-lock.yaml").exists():
            runner = "pnpm"
        elif (root / "yarn.lock").exists():
            runner = "yarn"
        for name in ("typecheck", "type-check", "lint", "test", "build"):
            if name in scripts and "no test specified" not in scripts[name]:
                kind, critical = _kind_for(name)
                argv, fmt = [runner, "run", name], "text"
                if kind == "lint":
                    argv, fmt = lint_argv(runner, name, scripts[name])
                steps.append(Step(name, argv, kind, critical, fmt=fmt))
        for name in scripts:
            if SECURITY_NAME.search(name) and name.split(":")[0] in ("test", "rls", "security", "check", "verify"):
                steps.append(Step(name, [runner, "run", name], "security", True))
    elif (root / "pyproject.toml").exists() or (root / "tests").is_dir() or (root / "setup.py").exists():
        import sys
        argv = [sys.executable, "-m", "pytest", "-q"] if shutil.which("pytest") else \
            [sys.executable, "-m", "unittest", "discover", "-s", "tests" if (root / "tests").is_dir() else "."]
        steps.append(Step("test", argv, "test"))
    elif (root / "Cargo.toml").exists():
        steps = [Step("test", ["cargo", "test"]), Step("build", ["cargo", "build"], "build")]
    elif (root / "go.mod").exists():
        steps = [Step("test", ["go", "test", "./..."]), Step("build", ["go", "build", "./..."], "build")]
    return _ordered(steps)


# Linters whose machine-readable output is stable across OS, terminal and agent detection
# (oxlint picks a different text layout on a plain Windows console than inside an AI agent).
_JSON_LINTERS = {"oxlint": ["--format", "json"], "eslint": ["--format", "json"]}


def lint_argv(runner: str, name: str, script: str) -> tuple[list[str], str]:
    """Run the project's own lint script, asking a known linter for JSON when the script is a single plain call."""
    m = re.match(r"^\s*(?:npx\s+)?(oxlint|eslint)(\s|$)", script or "")
    if not m or re.search(r"&&|\|\||[;|<>]|\s(-f|--format)(\s|=)", script):
        return [runner, "run", name], "text"
    extra = _JSON_LINTERS[m.group(1)]
    if runner == "npm":
        return ["npm", "run", name, "--"] + extra, "json"
    return [runner, "run", name] + extra, "json"   # pnpm / yarn pass trailing args to the script


def detect_commands(root: Path, configured: dict | None = None) -> dict[str, list[str]]:
    """Backward-compatible view: {name: argv}."""
    return {s.name: s.argv for s in detect_steps(root, configured)}


# ---------------------------------------------------------------- PostgreSQL (PG_BIN) discovery
def default_pg_globs() -> list[str]:
    if os.name == "nt":
        bases = [os.environ.get(k) for k in ("ProgramW6432", "ProgramFiles", "ProgramFiles(x86)")]
        globs = [os.path.join(b, "PostgreSQL", "*", "bin") for b in bases if b]
        local = os.environ.get("LOCALAPPDATA")
        if local:
            globs.append(os.path.join(local, "Programs", "PostgreSQL", "*", "bin"))
        home = os.environ.get("USERPROFILE")
        if home:
            globs.append(os.path.join(home, "scoop", "apps", "postgresql*", "current", "bin"))
        return globs
    return ["/usr/lib/postgresql/*/bin", "/usr/local/pgsql/bin", "/opt/homebrew/opt/postgresql@*/bin",
            "/usr/local/opt/postgresql@*/bin", "/Applications/Postgres.app/Contents/Versions/*/bin"]


def _has_initdb(d: str) -> bool:
    return os.path.isfile(os.path.join(d, "initdb.exe")) or os.path.isfile(os.path.join(d, "initdb"))


def _version_key(path: str) -> tuple:
    nums = re.findall(r"\d+", path)
    return tuple(int(n) for n in nums) or (0,)


def find_pg_bin(env: dict, globs: list[str] | None = None) -> tuple[str | None, str]:
    """PG_BIN from env/config first; otherwise look in known install locations (no version hard-coded)."""
    if env.get("PG_BIN"):
        return env["PG_BIN"], "PG_BIN (environment/config)"
    found = []
    for pattern in globs if globs is not None else default_pg_globs():
        for d in glob.glob(pattern):
            if _has_initdb(d):
                found.append(d)
    if not found:
        return None, "not found"
    return sorted(found, key=_version_key)[-1], "auto-detected"


# ---------------------------------------------------------------- running
Runner = Callable[[list, Path, dict, float], tuple]


def run_command(argv: list, cwd: Path, env: dict, timeout: float) -> tuple[int | None, str, bool, bool]:
    """(exit_code, combined_output, not_found, timed_out). No shell."""
    exe = shutil.which(argv[0])
    if not exe:
        return None, f"{argv[0]} not found on PATH", True, False
    try:
        p = subprocess.run([exe, *argv[1:]], cwd=str(cwd), capture_output=True, text=True, encoding="utf-8",
                           errors="replace", timeout=timeout, env=env)
        return p.returncode, (p.stdout or "") + "\n" + (p.stderr or ""), False, False
    except subprocess.TimeoutExpired:
        return None, "timed out", False, True


def _skip_lines(output: str) -> list[str]:
    lines = []
    for line in output.splitlines():
        if any(p.search(line) for p in SKIP_PATTERNS):
            lines.append(line.strip())
    return lines


def classify(step: Step, code: int | None, output: str, not_found: bool = False, timed_out: bool = False,
             env: dict | None = None) -> StepResult:
    r = StepResult(step.name, step.argv, PASS, step.kind, step.critical, output[-6000:], exit_code=code)
    if not_found:
        r.status, r.env_missing = BLOCKED, True
        r.reason = f"'{step.argv[0]}' is not installed or not on PATH"
        r.required_action = f"install {step.argv[0]} / add it to PATH"
        return r
    if timed_out:
        r.status, r.reason = FAIL, "timed out"
        return r
    skips = _skip_lines(output)
    ran = any(p.search(output) for p in RAN_PATTERNS)
    if code not in (0, None):
        blocked = [ln.strip() for ln in output.splitlines() if re.match(r"^\s*BLOCKED\b", ln)]
        if blocked and not ran and not re.search(r"\bFailed:\s*[1-9]|\bfailing\b|\u274c", output):
            r.status, r.reason = BLOCKED, blocked[0][:300]
            if POSTGRES_HINT.search(output):
                r.required_action = ("install/configure PostgreSQL or set PG_BIN "
                                     "(aiteam config set validationEnv.PG_BIN \"<PostgreSQL bin folder>\")")
            return r
        r.status, r.reason = FAIL, f"exit code {code}"
        if skips:
            r.notes.append("output also mentions skipped parts: " + "; ".join(skips[:3]))
        return r
    if skips and not ran:
        r.status = SKIPPED
        r.reason = skips[0][:300]
        if step.critical:
            r.status = BLOCKED
            if POSTGRES_HINT.search(output):
                r.reason = "PostgreSQL test runtime unavailable (" + skips[0][:200] + ")"
                r.required_action = ("install/configure PostgreSQL or set PG_BIN "
                                     "(aiteam config set validationEnv.PG_BIN \"<PostgreSQL bin folder>\")")
                pg = (env or {}).get("PG_BIN")
                if pg and os.path.isfile(os.path.join(pg, "initdb.exe")) and not os.path.isfile(os.path.join(pg, "initdb")):
                    r.notes.append(f"PG_BIN={pg} contains initdb.exe, but the project's test script still reports "
                                   "PostgreSQL as missing: the script probably does not support native Windows "
                                   "(e.g. it looks for 'initdb' without '.exe' or needs Unix sockets). Run this check "
                                   "under WSL/Linux via .aiteam/config.json, or approve a change to the test script.")
            else:
                r.required_action = "provide the missing prerequisite so the security check actually runs"
        return r
    if skips:
        r.notes.append("partial: " + "; ".join(skips[:3]))
    return r


def run_validation(root: Path, steps: list[Step], *, timeout_minutes: float = 20, runner: Runner | None = None,
                   extra_env: dict | None = None, lint_evaluator: Callable | None = None,
                   pg_globs: list[str] | None = None) -> list[StepResult]:
    runner = runner or run_command
    results = []
    for step in steps:
        env = subscription_env()
        env.update({k: str(v) for k, v in (extra_env or {}).items() if v not in (None, "")})
        env.update({k: str(v) for k, v in step.env.items() if v not in (None, "")})
        pg_note = None
        if step.kind == "security":
            pg, source = find_pg_bin(env, pg_globs)
            if pg:
                env["PG_BIN"] = pg
                pg_note = f"PG_BIN={pg} ({source})"
            else:
                pg_note = "PG_BIN not set and no PostgreSQL install found in known locations"
        code, output, not_found, timed_out = runner(step.argv, root, env, timeout_minutes * 60)
        if step.kind == "lint" and lint_evaluator is not None and not not_found and not timed_out:
            res = lint_evaluator(step, code, output)
        else:
            res = classify(step, code, output, not_found, timed_out, env)
        if pg_note:
            res.notes.insert(0, pg_note)
        results.append(res)
    return results


# ---------------------------------------------------------------- gates
def task_verdict(results: list[StepResult]) -> tuple[str, list[str]]:
    """'fail' -> fix loop; 'human' -> environment problem the agents cannot fix; else 'pass'."""
    fails = [f"{r.name}: {r.status} {r.reason}".strip() for r in results if r.status in FAIL_STATES]
    if fails:
        return "fail", fails
    env = [f"{r.name}: {r.reason}. Required action: {r.required_action}" for r in results
           if r.status == BLOCKED and (r.env_missing or not r.critical)]
    if env:
        return "human", env
    return "pass", []


def goal_blockers(results: list[StepResult], require_security: bool) -> list[str]:
    """Reasons the Goal must NOT be declared complete, even if every agent says it is."""
    blockers = []
    for r in results:
        if r.status in FAIL_STATES:
            blockers.append(f"{r.name}: {r.status}")
        elif r.status == BLOCKED or (r.critical and r.status not in OK_STATES):
            msg = f"{r.name}: {r.status}"
            if r.reason:
                msg += f" - {r.reason}"
            if r.required_action:
                msg += f". Required action: {r.required_action}"
            blockers.append(msg)
    if require_security and not any(r.kind == "security" for r in results):
        blockers.append("Definition of Done requires RLS/security verification, but no security validation command "
                        "is configured (add e.g. {\"test:rls\": {\"command\": [\"npm\",\"run\",\"test:rls\"], "
                        "\"critical\": true}} to .aiteam/config.json \"validation\")")
    return blockers


def requires_security(goal_text: str, dod_text: str = "") -> bool:
    text = dod_text or goal_text or ""
    return bool(re.search(r"\bRLS\b|row[- ]level security|security(?:/rls)? tests?", text, re.I))


def summarize(results: list[StepResult]) -> dict:
    return {r.name: r.status for r in results}
