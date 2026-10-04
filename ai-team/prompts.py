"""Role prompts. Every prompt carries the full shared context so any agent can take over any role."""
from __future__ import annotations

import json
import re

HEADER = """You are part of AI DEV TEAM, an autonomous local team of two peers: Claude Code and Codex.
Neither agent is the other's boss; the Manager (a Python orchestrator) coordinates.
Treat the other agent's output as ADVISORY. Always verify claims against the real repository.
GOAL.md is the source of truth. PROJECT_RULES.md are permanent rules you must obey.

Hard safety rules (never violate):
- No production deploy. No destructive migrations. No deleting user data.
- No secrets/credentials in code, logs or commits. Do not read or print auth/session files.
- Never disable, skip or weaken tests to make them pass. Never fake a PASS. Never hide errors.
- Only modify files inside this repository. Do not run git commit/push/reset/checkout/stash: the Manager owns Git.
- Do not call paid APIs or create API keys.
If a step needs a human decision (unclear direction, conflicting requirements, destructive migration,
deleting data, production deploy, secrets, paid services, irreversible actions, changing the core goal,
major auth/security changes), STOP and set "needsHuman" to a concrete question in your JSON.
"""

JSON_RULE = """
Finish your answer with exactly one JSON object between these markers:
AITEAM_JSON_BEGIN
{json_shape}
AITEAM_JSON_END
"""

ROLE_TEXT = {
    "plan": "ROLE: Product Architect / Planner. Analyse GOAL.md and the repository and produce an ordered task backlog.",
    "plan_merge": "ROLE: Lead Engineer second opinion. Another agent proposed the backlog below. Inspect the repository yourself, "
                  "then return the FINAL backlog (fix wrong assumptions, missing tasks, bad ordering, oversized tasks).",
    "analyze": "ROLE: Architect. Analyse this task before implementation: architecture, UX, edge cases, regression risk, "
               "and concrete implementation advice. Do NOT edit files.",
    "implement": "ROLE: Lead Engineer. Implement this task in the repository. Inspect the code yourself, use your own judgement, "
                 "write/update tests, run the relevant tests/typecheck/build and fix what you break.",
    "review": "ROLE: Reviewer. Review the current uncommitted changes (git diff) for this task: requirement coverage, UX, "
              "regressions, security, edge cases, missing tests. Do NOT edit files.",
    "fix": "ROLE: Engineer. Verify each review finding / validation failure against the code. Fix the valid ones, reject the "
           "invalid ones with a reason, then re-run tests/typecheck/lint/build.",
    "evaluate": "ROLE: Independent Goal evaluator. Decide whether GOAL.md is fully achieved in the repository as it is NOW. "
                "Check every requirement and Definition of Done item against real code and tests. Do NOT edit files. Be strict.",
    "discover_product": "ROLE: Product Architect in IMPROVEMENT MODE. The goal is complete. Look for UX friction, user-flow problems, "
                        "accessibility, edge cases, simplification and maintainability problems. Do NOT edit files.",
    "discover_engineering": "ROLE: Lead Engineer in IMPROVEMENT MODE. The goal is complete. Look for bugs, performance, technical debt, "
                            "test gaps, duplication, reliability and developer-experience problems. Do NOT edit files.",
    "review_project": "ROLE: Reviewer. Assess the whole project against GOAL.md without implementing anything. Do NOT edit files.",
}

SHAPES = {
    "plan": '{"tasks": [{"key": "short-unique-key", "title": "...", "description": "...", "priority": "high|medium|low", '
            '"impact": "high|medium|low", "risk": "high|medium|low", "effort": "high|medium|low", '
            '"dependsOn": ["other-key"], "acceptanceCriteria": ["verifiable criterion"]}], "needsHuman": null}',
    "analyze": '{"summary": "...", "risks": ["..."], "advice": ["..."], "needsHuman": null}',
    "implement": '{"summary": "what changed", "filesChanged": ["..."], "testsRun": "commands and results", '
                 '"complete": true, "commitMessage": "feat(scope): meaningful message", "needsHuman": null}',
    "review": '{"approve": true, "findings": [{"severity": "critical|major|minor", "file": "...", "issue": "...", '
              '"suggestion": "..."}], "needsHuman": null}',
    "fix": '{"fixed": ["..."], "rejected": [{"finding": "...", "reason": "..."}], "testsRun": "...", '
           '"commitMessage": "fix(scope): ...", "needsHuman": null}',
    "evaluate": '{"complete": false, "unmet": [{"requirement": "...", "evidence": "...", "suggestedTask": "..."}], '
                '"critical": ["known critical regressions"], "needsHuman": null}',
    "discover": '{"candidates": [{"title": "...", "description": "...", "impact": "high|medium|low", '
                '"risk": "high|medium|low", "effort": "high|medium|low", "reason": "why it matters for GOAL", '
                '"evidence": "file/line or observed behaviour", "cosmetic": false}], "needsHuman": null}',
    "review_project": '{"summary": "...", "issues": ["..."], "suggestedTasks": ["..."], "needsHuman": null}',
}
SHAPES["plan_merge"] = SHAPES["plan"]
SHAPES["discover_product"] = SHAPES["discover"]
SHAPES["discover_engineering"] = SHAPES["discover"]


def _clip(text: str, n: int) -> str:
    text = text or ""
    return text if len(text) <= n else text[:n] + f"\n...[truncated {len(text) - n} chars]"


def build_prompt(role: str, ctx: dict, max_chars: int = 20000) -> str:
    parts = [HEADER, ROLE_TEXT[role], ""]
    parts.append("=== GOAL.md ===\n" + _clip(ctx.get("goal", ""), max_chars))
    parts.append("=== PROJECT_RULES.md ===\n" + _clip(ctx.get("rules", "") or "(none)", max_chars // 2))
    if ctx.get("state_summary"):
        parts.append("=== TEAM STATE ===\n" + ctx["state_summary"])
    if ctx.get("tasks_summary"):
        parts.append("=== TASK BACKLOG ===\n" + _clip(ctx["tasks_summary"], max_chars // 2))
    if ctx.get("task"):
        t = ctx["task"]
        crit = "\n".join(f"- [{'x' if c['done'] else ' '}] {c['text']}" for c in t.get("acceptanceCriteria", []))
        parts.append(f"=== CURRENT TASK {t['id']} ===\nTitle: {t['title']}\nDescription: {t['description']}\n"
                     f"Acceptance criteria:\n{crit or '(none given)'}")
        if t.get("humanAnswer"):
            parts.append("=== HUMAN DECISION FOR THIS TASK ===\n" + t["humanAnswer"])
    for label, key in (("PREVIOUS PHASE REPORTS (advisory)", "reports"), ("REVIEW FINDINGS", "findings"),
                       ("VALIDATION RESULTS", "validation"), ("OTHER AGENT PROPOSAL (advisory)", "proposal"),
                       ("OTHER AGENT EVALUATION (advisory)", "other_eval")):
        if ctx.get(key):
            parts.append(f"=== {label} ===\n" + _clip(ctx[key], max_chars // 2))
    if ctx.get("partial"):
        parts.append("=== CONTINUATION ===\nA previous agent was interrupted (usage limit / crash) in the middle of this "
                     "exact step. CONTINUE its work; do not restart the task or the project from zero. Check git status/diff "
                     "to see what it already changed. Its partial output:\n" + _clip(ctx["partial"], max_chars // 2))
    if ctx.get("git_status") is not None:
        parts.append("=== GIT STATUS ===\n" + (ctx["git_status"] or "(clean)"))
    if ctx.get("git_diff"):
        parts.append("=== GIT DIFF (uncommitted) ===\n" + ctx["git_diff"])
    parts.append(JSON_RULE.format(json_shape=SHAPES[role]))
    return "\n\n".join(parts)


def extract_json(text: str) -> dict | None:
    """Pull the AITEAM JSON block (or the last ```json fence / bare object) out of an agent answer."""
    if not text:
        return None
    candidates = re.findall(r"AITEAM_JSON_BEGIN\s*(.*?)\s*AITEAM_JSON_END", text, re.S)
    candidates += re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.S)
    for raw in reversed(candidates):
        try:
            obj = json.loads(raw)
            if isinstance(obj, dict):
                return obj
        except json.JSONDecodeError:
            continue
    # last resort: last balanced {...} in the text
    end = text.rfind("}")
    while end != -1:
        depth = 0
        for i in range(end, -1, -1):
            if text[i] == "}":
                depth += 1
            elif text[i] == "{":
                depth -= 1
                if depth == 0:
                    try:
                        obj = json.loads(text[i:end + 1])
                        if isinstance(obj, dict):
                            return obj
                    except json.JSONDecodeError:
                        pass
                    break
        end = text.rfind("}", 0, end)
    return None


# ---- human decision gate (static check on top of agents' own needsHuman flag) ----
HUMAN_GATE_PATTERNS = [
    (r"\b(deploy|release|publish)\w*\b.{0,30}\bproduction\b|\bproduction\b.{0,20}\b(deploy|release)", "production deployment"),
    (r"\bdrop\s+(table|database|column|schema)\b|\btruncate\s+table\b|\bdestructive\s+migration", "destructive database migration"),
    (r"\b(delete|wipe|purge|erase|remove)\b.{0,25}\buser(s'|'s)?\s*(data|accounts?|records?)", "deleting user data"),
    (r"\b(api[_ -]?key|secret|credential|private key|access token)s?\b.{0,40}\b(require|need|add|create|provide|obtain)", "secrets/credentials required"),
    (r"\b(require|need|add|create|provide|obtain)\w*\b.{0,40}\b(api[_ -]?key|secret|credential|private key|access token)s?\b", "secrets/credentials required"),
    (r"\b(paid|billing|subscription plan|purchase|credit card)\b.{0,30}\b(service|plan|tier|account|activation|activate|enable)", "paid service activation"),
    (r"\b(rewrite|replace|migrate)\b.{0,30}\b(entire|whole|all of the)\b.{0,30}\b(architecture|app|codebase|framework)", "large architecture replacement"),
    (r"\b(replace|change|switch|remove)\w*\b.{0,30}\b(authentication|auth provider|login system|security model)", "authentication/security model change"),
    (r"\bforce[- ]push\b|\brewrite (git )?history\b|\birreversibl", "irreversible action"),
]
_HG = [(re.compile(p, re.I | re.S), why) for p, why in HUMAN_GATE_PATTERNS]


def human_gate_reason(text: str, allow_deploy: bool = False) -> str | None:
    for pattern, why in _HG:
        if why == "production deployment" and allow_deploy:
            continue
        if pattern.search(text or ""):
            return why
    return None
