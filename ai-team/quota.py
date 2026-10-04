"""Classify CLI results (exit code + structured output + stderr) and manage agent cooldowns."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from state import (AGENT_ERROR, AGENTS, AVAILABLE, BUSY, COOLDOWN, UNAVAILABLE, iso, parse_iso)

OK = "OK"
QUOTA = "QUOTA"            # usage / rate limit / capacity -> COOLDOWN
AUTH = "AUTH"              # logged out / expired -> UNAVAILABLE, human must log in
NOT_FOUND = "NOT_FOUND"    # CLI missing -> UNAVAILABLE
TRANSIENT = "TRANSIENT"    # timeout / interrupted / network blip
ERROR = "ERROR"            # crash or unknown failure

QUOTA_PATTERNS = [
    r"usage limit", r"rate[ _-]?limit", r"\bquota\b", r"limit (?:has been )?reached", r"usage cap",
    r"session limit", r"too many requests", r"\b429\b", r"try again (?:later|in|at|after)",
    r"limit (?:will )?resets?", r"\bresets? (?:at|in|on)\b", r"at capacity", r"over capacity",
    r"capacity (?:constraint|limit)", r"temporar\w* (?:usage )?restrict", r"hit your (?:usage )?limit",
    r"out of (?:credits|usage|messages)", r"weekly limit", r"5-hour limit", r"overloaded", r"\b529\b",
    r"usage_limit", r"rate_limit_error", r"insufficient_quota",
]
# Strong patterns are allowed to override a zero exit code on *short* output
# (some CLI versions print the limit banner and exit 0).
STRONG_QUOTA_PATTERNS = [r"usage limit reached", r"limit reached\|\d{9,}", r"hit your (?:usage )?limit",
                         r"you've reached your", r"usage limit has been reached", r"rate limit exceeded"]
AUTH_PATTERNS = [
    r"not logged in", r"please (?:run )?/?login", r"log ?in (?:again|required|expired)", r"\blogin required",
    r"invalid (?:api key|credentials|token)", r"unauthori[sz]ed", r"\b401\b", r"authentication (?:failed|required|error)",
    r"session (?:has )?expired", r"token (?:has )?expired", r"oauth token", r"sign in",
]
_Q = [re.compile(p, re.I) for p in QUOTA_PATTERNS]
_SQ = [re.compile(p, re.I) for p in STRONG_QUOTA_PATTERNS]
_A = [re.compile(p, re.I) for p in AUTH_PATTERNS]


@dataclass
class Classification:
    outcome: str
    detail: str = ""
    reset_at: datetime | None = None


def _match(patterns, text: str) -> str | None:
    for p in patterns:
        m = p.search(text)
        if m:
            return m.group(0)
    return None


def _structured_error(stdout: str) -> tuple[bool | None, str]:
    """Inspect machine-readable output: Claude `--output-format json` or Codex JSONL events."""
    text = stdout.strip()
    if not text:
        return None, ""
    candidates = []
    if text.startswith("{"):
        try:
            candidates.append(json.loads(text))
        except json.JSONDecodeError:
            pass
    if not candidates:
        for line in text.splitlines()[-50:]:
            line = line.strip()
            if line.startswith("{"):
                try:
                    candidates.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    if not candidates:
        return None, ""
    is_err = False
    msgs = []
    for obj in candidates:
        if not isinstance(obj, dict):
            continue
        if obj.get("is_error") is True or str(obj.get("subtype", "")).startswith("error") \
                or "error" in str(obj.get("type", "")).lower():
            is_err = True
            msgs.append(json.dumps(obj)[:1000])
        status = obj.get("api_error_status") or obj.get("status")
        if status in (429, 529, "429", "529"):
            is_err = True
            msgs.append(f"status {status}")
    return is_err, " ".join(msgs)


def _reset_time(text: str, now: datetime) -> datetime | None:
    m = re.search(r"\|(\d{10})\b", text) or re.search(r"reset[s_ a-z]*[:=]\s*(\d{10})\b", text, re.I)
    if m:
        ts = datetime.fromtimestamp(int(m.group(1)), tz=timezone.utc)
        if now < ts < now + timedelta(days=8):
            return ts
    m = re.search(r"(?:try again|resets?) in (\d+)\s*(second|minute|hour)s?", text, re.I)
    if m:
        unit = {"second": "seconds", "minute": "minutes", "hour": "hours"}[m.group(2).lower()]
        return now + timedelta(**{unit: int(m.group(1))})
    return None


def classify(exit_code: int | None, stdout: str, stderr: str, *, timed_out: bool = False,
             not_found: bool = False, now: datetime | None = None) -> Classification:
    now = now or datetime.now(timezone.utc)
    stdout = stdout or ""
    stderr = stderr or ""
    if not_found:
        return Classification(NOT_FOUND, "CLI executable not found")
    if timed_out:
        return Classification(TRANSIENT, "timed out")
    structured_err, structured_msg = _structured_error(stdout)
    failed = (exit_code not in (0, None)) or structured_err is True
    if not failed:
        # Success exit: only treat as quota if the *whole* output is a short limit banner.
        # (Long successful answers may legitimately talk about rate limiting code.)
        combined = (stdout + "\n" + stderr).strip()
        if len(combined) < 400 and _match(_SQ, combined):
            return Classification(QUOTA, combined[:300], _reset_time(combined, now))
        return Classification(OK)
    # Failure: look at stderr, structured message, then tail of stdout (not the whole agent transcript).
    evidence = "\n".join([stderr[-4000:], structured_msg, stdout[-2000:]])
    if q := _match(_Q, evidence):
        return Classification(QUOTA, q, _reset_time(evidence, now))
    if a := _match(_A, evidence):
        return Classification(AUTH, a)
    if exit_code in (130, -2, 3221225786):  # Ctrl+C / STATUS_CONTROL_C_EXIT on Windows
        return Classification(TRANSIENT, "interrupted")
    tail = (stderr.strip() or stdout.strip())[-300:]
    return Classification(ERROR, f"exit {exit_code}: {tail}")


class QuotaManager:
    """Owns the per-agent status fields inside the system state dict."""

    def __init__(self, state: dict, probe_minutes: float):
        self.state = state
        self.probe_minutes = probe_minutes

    def status(self, agent: str) -> str:
        return self.state.get(f"{agent}Status", AVAILABLE)

    def set_status(self, agent: str, status: str) -> None:
        self.state[f"{agent}Status"] = status

    def mark_cooldown(self, agent: str, detail: str, now: datetime, reset_at: datetime | None = None) -> datetime:
        nxt = now + timedelta(minutes=self.probe_minutes)
        if reset_at and reset_at > now:
            # Provider told us when it resets; probe shortly after that (never earlier than 1 min).
            nxt = max(reset_at + timedelta(minutes=1), now + timedelta(minutes=1))
        self.state[f"{agent}Status"] = COOLDOWN
        self.state[f"{agent}LastError"] = detail[:500]
        self.state[f"{agent}NextProbe"] = iso(nxt)
        return nxt

    def mark_unavailable(self, agent: str, detail: str) -> None:
        self.state[f"{agent}Status"] = UNAVAILABLE
        self.state[f"{agent}LastError"] = detail[:500]
        self.state[f"{agent}NextProbe"] = None

    def mark_error(self, agent: str, detail: str) -> None:
        self.state[f"{agent}Status"] = AGENT_ERROR
        self.state[f"{agent}LastError"] = detail[:500]
        self.state[f"{agent}ErrorCount"] = self.state.get(f"{agent}ErrorCount", 0) + 1

    def mark_available(self, agent: str) -> None:
        self.state[f"{agent}Status"] = AVAILABLE
        self.state[f"{agent}NextProbe"] = None
        self.state[f"{agent}ErrorCount"] = 0

    def usable(self, agent: str) -> bool:
        return self.status(agent) in (AVAILABLE, AGENT_ERROR, BUSY)

    def probe_due(self, agent: str, now: datetime) -> bool:
        if self.status(agent) != COOLDOWN:
            return False
        nxt = parse_iso(self.state.get(f"{agent}NextProbe"))
        return nxt is None or now >= nxt

    def next_probe_time(self) -> datetime | None:
        times = [parse_iso(self.state.get(f"{a}NextProbe")) for a in AGENTS if self.status(a) == COOLDOWN]
        times = [t for t in times if t]
        return min(times) if times else None

    def all_down(self) -> bool:
        return not any(self.usable(a) for a in AGENTS)

    def any_cooldown(self) -> bool:
        return any(self.status(a) == COOLDOWN for a in AGENTS)
