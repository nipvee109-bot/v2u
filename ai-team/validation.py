"""Run the project's own test/lint/typecheck/build commands (configured or auto-detected)."""
from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

from agents import subscription_env

ORDER = ["typecheck", "lint", "test", "build"]


@dataclass
class StepResult:
    name: str
    argv: list
    ok: bool
    output: str


def detect_commands(root: Path, configured: dict | None = None) -> dict[str, list[str]]:
    if configured:
        return {k: v for k, v in configured.items() if isinstance(v, list) and v}
    cmds: dict[str, list[str]] = {}
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
        for name in ORDER:
            if name in scripts and "no test specified" not in scripts[name]:
                cmds[name] = [runner, "run", name]
        if "typecheck" not in cmds and "type-check" in scripts:
            cmds["typecheck"] = [runner, "run", "type-check"]
    elif (root / "pyproject.toml").exists() or (root / "tests").is_dir() or (root / "setup.py").exists():
        import sys
        cmds["test"] = [sys.executable, "-m", "pytest", "-q"] if shutil.which("pytest") else \
            [sys.executable, "-m", "unittest", "discover", "-s", "tests" if (root / "tests").is_dir() else "."]
    elif (root / "Cargo.toml").exists():
        cmds = {"build": ["cargo", "build"], "test": ["cargo", "test"]}
    elif (root / "go.mod").exists():
        cmds = {"build": ["go", "build", "./..."], "test": ["go", "test", "./..."]}
    return cmds


def run_validation(root: Path, commands: dict[str, list[str]], timeout_minutes: float = 20) -> list[StepResult]:
    results = []
    for name in ORDER + [k for k in commands if k not in ORDER]:
        argv = commands.get(name)
        if not argv:
            continue
        exe = shutil.which(argv[0])
        if not exe:
            results.append(StepResult(name, argv, False, f"{argv[0]} not found on PATH"))
            continue
        try:
            p = subprocess.run([exe, *argv[1:]], cwd=str(root), capture_output=True, text=True, encoding="utf-8",
                               errors="replace", timeout=timeout_minutes * 60, env=subscription_env())
            results.append(StepResult(name, argv, p.returncode == 0, (p.stdout + "\n" + p.stderr)[-6000:]))
        except subprocess.TimeoutExpired:
            results.append(StepResult(name, argv, False, "timed out"))
    return results


def summarize(results: list[StepResult]) -> dict:
    return {r.name: ("PASS" if r.ok else "FAIL") for r in results}
