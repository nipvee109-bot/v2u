"""Task backlog: schema, status transitions, prioritisation and progress."""
from __future__ import annotations

import re
from typing import Any

from state import ProjectPaths, atomic_write_json, iso, read_json, utcnow

BACKLOG = "BACKLOG"
READY = "READY"
IN_PROGRESS = "IN_PROGRESS"
REVIEW = "REVIEW"
BLOCKED = "BLOCKED"
DONE = "DONE"
FAILED = "FAILED"
NEEDS_HUMAN = "NEEDS_HUMAN"

TRANSITIONS: dict[str, set[str]] = {
    BACKLOG: {READY, BLOCKED, NEEDS_HUMAN, IN_PROGRESS, FAILED},
    READY: {IN_PROGRESS, BLOCKED, NEEDS_HUMAN, BACKLOG, FAILED},
    IN_PROGRESS: {REVIEW, BLOCKED, FAILED, NEEDS_HUMAN, READY, DONE},
    REVIEW: {IN_PROGRESS, DONE, FAILED, NEEDS_HUMAN, BLOCKED},
    BLOCKED: {READY, BACKLOG, NEEDS_HUMAN, FAILED},
    NEEDS_HUMAN: {READY, BACKLOG, FAILED},
    FAILED: {READY},
    DONE: set(),
}

# Pipeline phases inside a task; persisted so any agent can continue mid-task.
PHASES = ["analyze", "implement", "review", "fix", "validate", "checkpoint"]

LEVELS = {"low": 1, "medium": 2, "high": 3}


class InvalidTransition(ValueError):
    pass


def level(value: Any, default: int = 2) -> int:
    if isinstance(value, (int, float)):
        return max(1, min(3, int(value)))
    if isinstance(value, str):
        return LEVELS.get(value.strip().lower(), default)
    return default


def new_task(task_id: str, title: str, description: str = "", *, priority: Any = "medium",
             impact: Any = "medium", risk: Any = "medium", effort: Any = "medium",
             role: str = "implement", dependencies: list[str] | None = None,
             acceptance: list[str] | None = None, kind: str = "goal", source: str = "") -> dict:
    return {
        "id": task_id,
        "title": title.strip()[:200],
        "description": description.strip(),
        "priority": level(priority),
        "impact": level(impact),
        "risk": level(risk),
        "effort": level(effort),
        "status": BACKLOG,
        "assignedRole": role,
        "kind": kind,                     # goal | improvement | verification
        "source": source,
        "dependencies": list(dependencies or []),
        "acceptanceCriteria": [{"text": a, "done": False} for a in (acceptance or []) if str(a).strip()],
        "phase": "analyze",
        "phaseOutputs": {},
        "partial": {},
        "reviewFindings": [],
        "validation": None,
        "humanQuestion": None,
        "humanAnswer": None,
        "createdAt": iso(utcnow()),
        "startedAt": None,
        "completedAt": None,
        "attempts": 0,
        "reports": [],
        "commitMessage": None,
    }


class TaskStore:
    def __init__(self, paths: ProjectPaths):
        self.paths = paths

    def load(self) -> list[dict]:
        data = read_json(self.paths.tasks, {"tasks": []})
        return data.get("tasks", []) if isinstance(data, dict) else []

    def save(self, tasks: list[dict]) -> None:
        atomic_write_json(self.paths.tasks, {"tasks": tasks})


def find(tasks: list[dict], task_id: str | None) -> dict | None:
    return next((t for t in tasks if t["id"] == task_id), None)


def transition(task: dict, new_status: str) -> None:
    old = task["status"]
    if old == new_status:
        return
    if new_status not in TRANSITIONS.get(old, set()):
        raise InvalidTransition(f"{task['id']}: {old} -> {new_status} not allowed")
    task["status"] = new_status
    if new_status == IN_PROGRESS and not task.get("startedAt"):
        task["startedAt"] = iso(utcnow())
    if new_status == DONE:
        task["completedAt"] = iso(utcnow())
        for c in task["acceptanceCriteria"]:
            c["done"] = True


def next_id(tasks: list[dict], prefix: str = "T") -> str:
    nums = [int(m.group(1)) for t in tasks if (m := re.match(rf"^{prefix}(\d+)$", t["id"]))]
    return f"{prefix}{(max(nums) if nums else 0) + 1:03d}"


def deps_done(task: dict, tasks: list[dict]) -> bool:
    for dep in task.get("dependencies", []):
        d = find(tasks, dep)
        if d is not None and d["status"] != DONE:
            return False
    return True


def score(task: dict) -> float:
    """Higher = do sooner. Goal impact and priority dominate; risk and effort slow things down."""
    return task["priority"] * 3 + task["impact"] * 3 - task["effort"] * 1.0 - task["risk"] * 0.5


def select_next(tasks: list[dict]) -> dict | None:
    # Resume an in-flight task first: never abandon partially done work.
    for t in tasks:
        if t["status"] in (IN_PROGRESS, REVIEW):
            return t
    candidates = [t for t in tasks if t["status"] in (READY, BACKLOG) and deps_done(t, tasks)]
    if not candidates:
        return None
    candidates.sort(key=lambda t: (-score(t), t["createdAt"], t["id"]))
    return candidates[0]


def refresh_blocked(tasks: list[dict]) -> None:
    ids = {t["id"] for t in tasks}
    for t in tasks:
        if t["status"] in (BACKLOG, READY):
            bad = [d for d in t["dependencies"] if d in ids and find(tasks, d)["status"] in (FAILED, NEEDS_HUMAN)]
            if bad:
                transition(t, BLOCKED)
        elif t["status"] == BLOCKED and deps_done(t, tasks):
            transition(t, READY)


def progress(tasks: list[dict], kind: str = "goal") -> dict:
    scoped = [t for t in tasks if t.get("kind", "goal") == kind]
    crit_total = sum(len(t["acceptanceCriteria"]) for t in scoped)
    crit_done = sum(1 for t in scoped for c in t["acceptanceCriteria"] if c["done"])
    done = sum(1 for t in scoped if t["status"] == DONE)
    counts: dict[str, int] = {}
    for t in scoped:
        counts[t["status"]] = counts.get(t["status"], 0) + 1
    pct = None
    if crit_total:
        pct = round(100 * crit_done / crit_total)
    elif scoped:
        pct = round(100 * done / len(scoped))
    return {"criteriaDone": crit_done, "criteriaTotal": crit_total, "tasksDone": done,
            "tasksTotal": len(scoped), "percent": pct, "byStatus": counts}


def open_work(tasks: list[dict]) -> list[dict]:
    return [t for t in tasks if t["status"] not in (DONE, FAILED, NEEDS_HUMAN)]
