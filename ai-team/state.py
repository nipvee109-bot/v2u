"""Project paths, atomic JSON persistence, system state and history log."""
from __future__ import annotations

import json
import os
import re
import tempfile
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ---- system / agent status constants -------------------------------------
INITIALIZING = "INITIALIZING"
PLANNING = "PLANNING"
IMPLEMENTING = "IMPLEMENTING"
REVIEWING = "REVIEWING"
VALIDATING = "VALIDATING"
GOAL_COMPLETE = "GOAL_COMPLETE"
IMPROVING = "IMPROVING"
WAITING_FOR_QUOTA = "WAITING_FOR_QUOTA"
NEEDS_HUMAN = "NEEDS_HUMAN"
PROJECT_STABLE = "PROJECT_STABLE"
PAUSED = "PAUSED"
ERROR = "ERROR"
SYSTEM_STATUSES = {INITIALIZING, PLANNING, IMPLEMENTING, REVIEWING, VALIDATING, GOAL_COMPLETE,
                   IMPROVING, WAITING_FOR_QUOTA, NEEDS_HUMAN, PROJECT_STABLE, PAUSED, ERROR}

AVAILABLE = "AVAILABLE"
BUSY = "BUSY"
COOLDOWN = "COOLDOWN"
UNAVAILABLE = "UNAVAILABLE"
AGENT_ERROR = "ERROR"

AGENTS = ("claude", "codex")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime | None) -> str | None:
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds") if dt else None


def parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


# ---- paths ----------------------------------------------------------------
class ProjectPaths:
    def __init__(self, root: str | os.PathLike, subdir: str | None = None):
        self.root = Path(root).resolve()
        self.goal = self.root / "GOAL.md"
        self.rules = self.root / "PROJECT_RULES.md"
        self.aidir = self.root / ".aiteam" / subdir if subdir else self.root / ".aiteam"
        self.state = self.aidir / "state.json"
        self.tasks = self.aidir / "tasks.json"
        self.history = self.aidir / "history.jsonl"
        self.reports = self.aidir / "reports"
        self.checkpoints = self.aidir / "checkpoints"
        self.pause_flag = self.aidir / "PAUSE"
        self.lock = self.aidir / "run.lock"
        self.local_config = self.root / ".aiteam" / "config.json"

    def ensure(self) -> None:
        for d in (self.aidir, self.reports, self.checkpoints):
            d.mkdir(parents=True, exist_ok=True)
        gi = self.root / ".aiteam" / ".gitignore"
        if not gi.exists():
            # AI-Team runtime data is machine-local; never commit it.
            gi.write_text("*\n", encoding="utf-8")
        if not self.local_config.exists():
            from config import LOCAL_CONFIG_DEFAULT  # first-cycle safety: autoPush OFF for this project
            atomic_write_json(self.local_config, LOCAL_CONFIG_DEFAULT)


# ---- atomic persistence ---------------------------------------------------
def atomic_write_text(path: Path, text: str) -> None:
    """Write via temp file + fsync + os.replace so a crash never leaves a torn file.

    The previous good version is kept as <name>.bak for recovery.
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text)
            fh.flush()
            os.fsync(fh.fileno())
        if path.exists():
            try:
                bak = path.with_name(path.name + ".bak")
                _replace(path, bak, copy=True)
            except OSError:
                pass
        _replace(Path(tmp), path)
    finally:
        if os.path.exists(tmp):
            try:
                os.remove(tmp)
            except OSError:
                pass


def _replace(src: Path, dst: Path, copy: bool = False) -> None:
    # Windows can briefly lock files (antivirus, indexer); retry a few times.
    last: Exception | None = None
    for attempt in range(6):
        try:
            if copy:
                data = src.read_bytes()
                fd, tmp = tempfile.mkstemp(dir=str(dst.parent), suffix=".tmp")
                with os.fdopen(fd, "wb") as fh:
                    fh.write(data)
                os.replace(tmp, dst)
            else:
                os.replace(src, dst)
            return
        except PermissionError as exc:  # pragma: no cover - Windows only
            last = exc
            time.sleep(0.1 * (attempt + 1))
    raise last  # type: ignore[misc]


def atomic_write_json(path: Path, data: Any) -> None:
    atomic_write_text(path, json.dumps(data, indent=2, ensure_ascii=False, sort_keys=False) + "\n")


def read_json(path: Path, default: Any) -> Any:
    """Read JSON; fall back to the .bak copy if the main file is corrupt."""
    path = Path(path)
    for candidate in (path, path.with_name(path.name + ".bak")):
        if candidate.exists():
            try:
                return json.loads(candidate.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError, OSError):
                continue
    return default


# ---- secret redaction -----------------------------------------------------
_SECRET_PATTERNS = [
    re.compile(r"sk-(?:ant-)?[A-Za-z0-9_\-]{16,}"),
    re.compile(r"(?i)\b(api[_-]?key|token|secret|password|passwd|authorization)\b(\s*[:=]\s*)(\S+)"),
    re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}"),
    re.compile(r"eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}"),
]


def redact(text: str) -> str:
    if not isinstance(text, str):
        return text
    out = _SECRET_PATTERNS[0].sub("[REDACTED]", text)
    out = _SECRET_PATTERNS[1].sub(lambda m: f"{m.group(1)}{m.group(2)}[REDACTED]", out)
    out = _SECRET_PATTERNS[2].sub("[REDACTED]", out)
    out = _SECRET_PATTERNS[3].sub("[REDACTED]", out)
    return out


def _redact_obj(obj: Any) -> Any:
    if isinstance(obj, str):
        return redact(obj)
    if isinstance(obj, dict):
        return {k: _redact_obj(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_redact_obj(v) for v in obj]
    return obj


# ---- state store ----------------------------------------------------------
def default_state(project: str) -> dict:
    now = iso(utcnow())
    return {
        "project": project,
        "goalHash": None,
        "goalVersion": 0,
        "mode": "GOAL",            # GOAL | IMPROVEMENT
        "status": INITIALIZING,
        "statusReason": "",
        "cycle": 0,
        "currentTaskId": None,
        "lastCompletedTask": None,
        "claudeStatus": AVAILABLE,
        "codexStatus": AVAILABLE,
        "claudeLastError": None,
        "codexLastError": None,
        "claudeNextProbe": None,
        "codexNextProbe": None,
        "claudeErrorCount": 0,
        "codexErrorCount": 0,
        "lastCheckpoint": None,
        "lastCommit": None,
        "ownedPaths": [],
        "improvementRound": 0,
        "stableRounds": 0,
        "humanQuestions": [],
        "goalEvaluation": None,
        "startedAt": now,
        "updatedAt": now,
    }


class StateStore:
    def __init__(self, paths: ProjectPaths):
        self.paths = paths
        self._lock = threading.RLock()

    def load(self) -> dict:
        state = default_state(self.paths.root.name)
        state.update(read_json(self.paths.state, {}))
        return state

    def save(self, state: dict) -> None:
        with self._lock:
            state["updatedAt"] = iso(utcnow())
            atomic_write_json(self.paths.state, state)

    def log(self, event: str, **fields: Any) -> None:
        record = {"ts": iso(utcnow()), "event": event}
        record.update(_redact_obj(fields))
        line = json.dumps(record, ensure_ascii=False)
        with self._lock:
            self.paths.aidir.mkdir(parents=True, exist_ok=True)
            with open(self.paths.history, "a", encoding="utf-8") as fh:
                fh.write(line + "\n")
                fh.flush()

    def set_status(self, state: dict, status: str, reason: str = "") -> None:
        assert status in SYSTEM_STATUSES, status
        old = state.get("status")
        state["status"] = status
        state["statusReason"] = reason
        self.save(state)
        if old != status:
            self.log("state_transition", old=old, new=status, reason=reason)

    def write_report(self, name: str, text: str) -> Path:
        safe = re.sub(r"[^A-Za-z0-9._-]+", "_", name)[:120]
        path = self.paths.reports / safe
        atomic_write_text(path, redact(text))
        return path
