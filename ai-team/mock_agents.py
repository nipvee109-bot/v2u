"""Fake agents for --dry-run and unit tests. They never call a real CLI or spend any quota."""
from __future__ import annotations

import json
from typing import Callable

import quota
from agents import AgentResult, BaseAgent

ROLE_MARKERS = [
    ("plan_merge", "ROLE: Lead Engineer second opinion"),
    ("plan", "ROLE: Product Architect / Planner"),
    ("analyze", "ROLE: Architect."),
    ("implement", "ROLE: Lead Engineer. Implement"),
    ("review", "ROLE: Reviewer. Review the current"),
    ("fix", "ROLE: Engineer. Verify"),
    ("evaluate", "ROLE: Independent Goal evaluator"),
    ("discover", "IMPROVEMENT MODE"),
    ("review_project", "ROLE: Reviewer. Assess the whole project"),
    ("probe", "AITEAM_OK"),
]


def role_of(prompt: str) -> str:
    for role, marker in ROLE_MARKERS:
        if marker in prompt:
            return role
    return "unknown"


def wrap(obj: dict) -> str:
    return "Done.\nAITEAM_JSON_BEGIN\n" + json.dumps(obj) + "\nAITEAM_JSON_END\n"


DEFAULT_RESPONSES = {
    "plan": {"tasks": [
        {"key": "a", "title": "Set up project skeleton", "description": "dry-run task", "priority": "high",
         "impact": "high", "risk": "low", "effort": "low", "dependsOn": [], "acceptanceCriteria": ["skeleton exists"]},
        {"key": "b", "title": "Implement core feature", "description": "dry-run task", "priority": "high",
         "impact": "high", "risk": "medium", "effort": "medium", "dependsOn": ["a"],
         "acceptanceCriteria": ["feature works", "feature tested"]},
    ], "needsHuman": None},
    "analyze": {"summary": "dry-run analysis", "risks": [], "advice": [], "needsHuman": None},
    "implement": {"summary": "dry-run: no files changed", "filesChanged": [], "complete": True,
                  "commitMessage": "feat: dry-run", "needsHuman": None},
    "review": {"approve": True, "findings": [], "needsHuman": None},
    "fix": {"fixed": [], "rejected": [], "needsHuman": None},
    "evaluate": {"complete": True, "unmet": [], "critical": [], "needsHuman": None},
    "discover": {"candidates": [], "needsHuman": None},
    "review_project": {"summary": "dry-run review", "issues": [], "suggestedTasks": [], "needsHuman": None},
}
DEFAULT_RESPONSES["plan_merge"] = DEFAULT_RESPONSES["plan"]


class MockAgent(BaseAgent):
    """`script` maps role -> list of outcomes consumed in order (last one repeats) or a callable.

    An outcome is either a dict (successful JSON answer), a str quota outcome (e.g. quota.QUOTA),
    or an AgentResult.
    """

    def __init__(self, name: str, script: dict | None = None, *, installed: bool = True,
                 on_call: Callable[[str, str, str], None] | None = None):
        super().__init__({"command": name}, 1)
        self.name = name
        self.script = script or {}
        self.installed = installed
        self.calls: list[tuple[str, str]] = []
        self.on_call = on_call

    def check_installed(self, cwd):
        return (True, "mock 1.0") if self.installed else (False, f"'{self.name}' not found on PATH")

    def _next(self, role: str):
        entry = self.script.get(role, self.script.get("*"))
        if entry is None:
            if role == "probe":
                return "AITEAM_OK"
            return DEFAULT_RESPONSES.get(role, {})
        if callable(entry):
            return entry()
        if isinstance(entry, list):
            return entry.pop(0) if len(entry) > 1 else entry[0]
        return entry

    def invoke(self, prompt, mode, cwd, timeout=None):
        role = role_of(prompt)
        self.calls.append((role, mode))
        if self.on_call:
            self.on_call(self.name, role, prompt)
        out = self._next(role)
        if isinstance(out, AgentResult):
            return out
        if out == "AITEAM_OK":
            return AgentResult(self.name, quota.OK, "AITEAM_OK", 0)
        if out == quota.QUOTA:
            return AgentResult(self.name, quota.QUOTA, "partial work before limit", 1, "Usage limit reached", "usage limit")
        if out == quota.AUTH:
            return AgentResult(self.name, quota.AUTH, "", 1, "Not logged in", "not logged in")
        if out == quota.ERROR:
            return AgentResult(self.name, quota.ERROR, "", 1, "crash", "exit 1: crash")
        return AgentResult(self.name, quota.OK, wrap(out), 0)
