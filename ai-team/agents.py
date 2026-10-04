"""Claude Code CLI / Codex CLI adapters. Subscription-only: direct CLI calls, API keys stripped."""
from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path

import quota

READ = "read"     # analysis / planning / review: must not edit files
WRITE = "write"   # implementation / fixes

# Removed from the child environment so the CLIs can only use the logged-in subscription session.
FORBIDDEN_ENV = ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL", "OPENAI_API_KEY",
                 "OPENAI_BASE_URL", "CODEX_API_KEY", "AZURE_OPENAI_API_KEY", "CLAUDE_CODE_USE_BEDROCK",
                 "CLAUDE_CODE_USE_VERTEX")

PROBE_PROMPT = "Reply with exactly AITEAM_OK and nothing else. Do not use any tools."


def subscription_env() -> dict:
    env = {k: v for k, v in os.environ.items() if k.upper() not in FORBIDDEN_ENV}
    env.setdefault("PYTHONIOENCODING", "utf-8")
    return env


@dataclass
class AgentResult:
    agent: str
    outcome: str
    text: str
    exit_code: int | None = None
    stderr: str = ""
    detail: str = ""
    duration: float = 0.0
    reset_at: object = None
    argv: list = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return self.outcome == quota.OK


def run_process(argv: list[str], *, cwd: Path, stdin_text: str | None, timeout: float,
                env: dict | None = None) -> tuple[int | None, str, str, bool, bool]:
    """Returns (exit_code, stdout, stderr, timed_out, not_found). Never uses shell=True."""
    exe = shutil.which(argv[0])
    if not exe:
        return None, "", f"{argv[0]} not found on PATH", False, True
    full = [exe] + argv[1:]
    kwargs = {}
    if os.name == "nt":  # own process group so Ctrl+C in our console doesn't kill a half-written agent turn abruptly
        kwargs["creationflags"] = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
    try:
        proc = subprocess.run(full, cwd=str(cwd), input=stdin_text, capture_output=True, text=True,
                              encoding="utf-8", errors="replace", timeout=timeout,
                              env=env if env is not None else subscription_env(), **kwargs)
        return proc.returncode, proc.stdout or "", proc.stderr or "", False, False
    except subprocess.TimeoutExpired as exc:
        out = exc.stdout.decode("utf-8", "replace") if isinstance(exc.stdout, bytes) else (exc.stdout or "")
        err = exc.stderr.decode("utf-8", "replace") if isinstance(exc.stderr, bytes) else (exc.stderr or "")
        return None, out, err, True, False
    except FileNotFoundError as exc:
        return None, "", str(exc), False, True
    except OSError as exc:
        return 1, "", f"OSError: {exc}", False, False


class BaseAgent:
    name = "agent"

    def __init__(self, cfg: dict, timeout_minutes: float = 45):
        self.cfg = cfg
        self.timeout = timeout_minutes * 60
        self._help: str | None = None
        self.version: str | None = None

    # -- capability detection (flags are never assumed blindly) --
    def help_text(self, cwd: Path) -> str:
        if self._help is None:
            texts = []
            for args in self.help_commands():
                code, out, err, _, nf = run_process(args, cwd=cwd, stdin_text=None, timeout=60)
                if nf:
                    break
                texts.append(out + "\n" + err)
            self._help = "\n".join(texts)
        return self._help

    def supports(self, flag: str, cwd: Path) -> bool:
        return flag in self.help_text(cwd)

    def help_commands(self) -> list[list[str]]:
        return [[self.cfg["command"], "--help"]]

    def check_installed(self, cwd: Path) -> tuple[bool, str]:
        code, out, err, _, nf = run_process([self.cfg["command"], "--version"], cwd=cwd, stdin_text=None, timeout=60)
        if nf:
            return False, f"'{self.cfg['command']}' not found on PATH"
        self.version = (out or err).strip().splitlines()[0] if (out or err).strip() else "unknown"
        return code == 0, self.version

    def build(self, mode: str, cwd: Path, out_file: Path | None) -> tuple[list[str], bool]:
        raise NotImplementedError

    def extract_text(self, stdout: str, out_file: Path | None) -> str:
        return stdout

    def invoke(self, prompt: str, mode: str, cwd: Path, timeout: float | None = None) -> AgentResult:
        out_file = Path(tempfile.mkstemp(prefix=f"aiteam-{self.name}-", suffix=".txt")[1])
        try:
            argv, via_stdin = self.build(mode, cwd, out_file)
            if not via_stdin:
                argv = argv + [prompt]
            start = time.monotonic()
            code, out, err, timed_out, nf = run_process(argv, cwd=cwd, stdin_text=prompt if via_stdin else None,
                                                        timeout=timeout or self.timeout)
            c = quota.classify(code, out, err, timed_out=timed_out, not_found=nf)
            text = self.extract_text(out, out_file)
            return AgentResult(self.name, c.outcome, text, code, err[-4000:], c.detail,
                               time.monotonic() - start, c.reset_at, argv[:-1] if not via_stdin else argv)
        finally:
            try:
                out_file.unlink()
            except OSError:
                pass

    def probe(self, cwd: Path) -> AgentResult:
        res = self.invoke(PROBE_PROMPT, READ, cwd, timeout=180)
        if res.ok and "AITEAM_OK" not in res.text:
            res.outcome, res.detail = quota.ERROR, "probe answered without AITEAM_OK"
        return res


class ClaudeAgent(BaseAgent):
    name = "claude"

    def build(self, mode, cwd, out_file):
        c = self.cfg
        argv = [c["command"], "-p"]
        if self.supports("--output-format", cwd):
            argv += ["--output-format", "json"]
        if c.get("model") and self.supports("--model", cwd):
            argv += ["--model", c["model"]]
        has_pm = self.supports("--permission-mode", cwd)
        if mode == READ:
            if has_pm:
                argv += ["--permission-mode", c.get("readPermissionMode", "plan")]
            if self.supports("--disallowedTools", cwd):
                argv += ["--disallowedTools", "Edit", "Write", "NotebookEdit", "MultiEdit"]
        else:
            if has_pm:
                argv += ["--permission-mode", c.get("writePermissionMode", "acceptEdits")]
            if self.supports("--allowedTools", cwd) and c.get("writeAllowedTools"):
                argv += ["--allowedTools", *c["writeAllowedTools"]]
        argv += list(c.get("extraArgs", []))
        return argv, True  # prompt via stdin: no Windows command-line length/quoting problems

    def extract_text(self, stdout, out_file):
        s = stdout.strip()
        if s.startswith("{"):
            import json
            try:
                obj = json.loads(s)
                if isinstance(obj, dict) and isinstance(obj.get("result"), str):
                    return obj["result"]
            except json.JSONDecodeError:
                pass
        return stdout


class CodexAgent(BaseAgent):
    name = "codex"

    def help_commands(self):
        return [[self.cfg["command"], "--help"], [self.cfg["command"], "exec", "--help"]]

    def build(self, mode, cwd, out_file):
        c = self.cfg
        argv = [c["command"], "exec"]
        if c.get("model") and self.supports("--model", cwd):
            argv += ["--model", c["model"]]
        if self.supports("--sandbox", cwd):
            argv += ["--sandbox", c.get("readSandbox", "read-only") if mode == READ else c.get("writeSandbox", "workspace-write")]
        elif mode == WRITE and self.supports("--full-auto", cwd):
            argv += ["--full-auto"]
        if self.supports("--skip-git-repo-check", cwd):
            argv += ["--skip-git-repo-check"]
        if self.supports("--cd", cwd):
            argv += ["--cd", str(cwd)]
        if out_file and self.supports("--output-last-message", cwd):
            argv += ["--output-last-message", str(out_file)]
        argv += list(c.get("extraArgs", []))
        help_ = self.help_text(cwd).lower()
        if "stdin" in help_ or "`-`" in help_ or " - " in help_:
            return argv + ["-"], True
        return argv, False

    def extract_text(self, stdout, out_file):
        try:
            if out_file and out_file.exists():
                txt = out_file.read_text(encoding="utf-8", errors="replace").strip()
                if txt:
                    return txt
        except OSError:
            pass
        return stdout


def make_agents(cfg: dict) -> dict[str, BaseAgent]:
    t = cfg.get("agentTimeoutMinutes", 45)
    return {"claude": ClaudeAgent(cfg["claude"], t), "codex": CodexAgent(cfg["codex"], t)}
