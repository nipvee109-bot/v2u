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
- Pre-existing lint debt recorded in the baseline (BASELINE_DEBT) is not part of your task: do not fix or
  reformat it unless your task changes that code. Only NEW_REGRESSION findings must be fixed.
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


# ---- human decision gate ---------------------------------------------------------
# Judges the ACTION a task asks for, not bare keywords. Local, reversible (Git) source changes that the
# goal already asks for are fine. Stops only for production actions, destructive migrations, deleting
# user data, paid services, credentials the agent does not have, irreversible security decisions,
# major product-direction changes and backend/auth changes that go against GOAL.md.

_C = r"[^.;\n]"   # stay inside one clause
_NEGATION = re.compile(r"\b(no|not|never|nothing|without|avoid\w*|prevent\w*|ensure\s+no|don't|do\s+not|must\s+not|"
                       r"cannot|can't|forbid\w*|den(?:y|ies)|block\w*|reject\w*|refus\w*|detect\w*|guard\w*\s+against|"
                       r"protect\w*\s+against|disallow\w*|fail\w*\s+if|stop\w*)\b" + _C + r"{0,40}$", re.I)
_TESTISH = re.compile(r"\b(tests?|checks?|guards?|scans?|lint|assert\w*|detect\w*|verif\w*)\b", re.I)
_OBSOLETE = re.compile(r"\b(obsolete|legacy|unused|dead|old|stale|duplicate\w*|redundant|remnants?|leftover|competing|deprecated)\b", re.I)
_READ_ONLY_LEAD = re.compile(r"^\s*(?:\[[^\]]*\]\s*)?(document|describe|explain|verify|check|audit|inspect|review|test|ensure|"
                             r"detect|scan|reconcile|investigate|analy[sz]e|assess|report|list|identify|map|confirm|"
                             r"(?:add|write|create)\s+(?:an?\s+)?(?:\w+\s+){0,2}(?:tests?|checks?|guards?))\b", re.I)
_SECRET_WORDS = (r"(api[_ -]?keys?|client[_ -]secrets?|secret[_ -]keys?|service[_ -]role[_ -]keys?|credentials?|passwords?|"
                 r"access[_ -]tokens?|refresh[_ -]tokens?|private[_ -]keys?|oauth[_ -]secrets?|secrets)")

_RULES = [
    # (reason, pattern, kind)   kind: plain | secrets | removal | auth_target
    ("production deployment",
     rf"\b(deploy\w*|release\w*|publish\w*|promot\w*|ship\w*)\b{_C}{{0,40}}\b(production|prod|live site)\b(?!\s+builds?\b)", "plain"),
    ("production data/infrastructure change",
     rf"\b(production|prod)\s+(database|db|data|environment|server|infra\w*|project|instance|supabase|config\w*)\b"
     rf"|\b(run|apply|execute|push|seed|reset|modify|change|update|write|migrate)\w*\b{_C}{{0,40}}\b(against|on|to|in)\s+(the\s+)?(production|prod)\b(?!\s+builds?\b)"
     rf"|\bsupabase\s+(db\s+push|db\s+reset\s+--linked|link)\b", "plain"),
    ("destructive database migration",
     r"\bdrop\s+(table|database|column|schema)\b|\btruncate\s+(table\s+)?\w+|\bdestructive\s+migration|\breset\s+(the\s+)?(database|db)\b", "plain"),
    ("deleting user data",
     rf"\b(delet\w*|wip\w*|purg\w*|eras\w*|remov\w*|reset\w*|clear\w*|drop\w*)\b{_C}{{0,30}}\b(user|users'|user's|learner|learners'|"
     rf"learner's|student|customer|account)s?\b{_C}{{0,15}}\b(data|progress|records?|accounts?|history|state)\b", "plain"),
    ("paid service activation",
     rf"\b(enabl\w*|activat\w*|upgrad\w*|subscrib\w*|purchas\w*|buy\w*|start\w*|switch\w*)\b{_C}{{0,30}}\b(paid|billing|pro plan|"
     rf"team plan|enterprise plan|premium|pay-as-you-go|subscription)\b", "plain"),
    ("secrets/credentials required",
     rf"\b(configur\w*|set|sets|setting|add\w*|insert\w*|obtain\w*|request\w*|provid\w*|paste\w*|stor\w*|put|use|using|suppl\w*|"
     rf"enter\w*|fill\w*|rotat\w*|generat\w*|creat\w*)\b{_C}{{0,40}}\b{_SECRET_WORDS}\b"
     rf"|\b(requir\w*|need\w*)\b{_C}{{0,30}}\b{_SECRET_WORDS}\b"
     rf"|\b{_SECRET_WORDS}\b{_C}{{0,30}}\b(to be provided|must be provided|is required|are required|is needed|are needed|"
     rf"from the (owner|user|human|admin))\b", "secrets"),
    ("irreversible security decision",
     rf"\b(disabl\w*|turn\w*\s+off|bypass\w*|remov\w*|drop\w*)\b{_C}{{0,25}}\b(rls|row[- ]level security|authentication|"
     rf"auth(?:orization)?\s+checks?|authorization|security polic(?:y|ies)|rls polic(?:y|ies))\b"
     rf"|\bmak\w*\b{_C}{{0,30}}\b(bucket|storage|table|database)\b{_C}{{0,15}}\bpublic\b|\bforce[- ]push\w*|\brewrit\w*\s+(git\s+)?history|\birreversibl\w*",
     "removal"),
    ("authentication/backend direction change",
     rf"\b(switch\w*|migrat\w*|mov\w*|replac\w*|chang\w*|swap\w*|port\w*)\b{_C}{{0,40}}\b(auth\w*|log\s?in|sign[- ]?in|identity provider|"
     rf"security model|backend)\b{_C}{{0,40}}?\b(?:to|with|onto|for|away from)\s+(?P<target>[\w.\-]+(?:\s+[A-Z][\w.\-]*)?)", "auth_target"),
    ("authentication/security model change",
     r"\b(chang\w*|replac\w*|redesign\w*|overhaul\w*)\b\s+(the\s+)?(security|authentication|auth)\s+model\b", "plain"),
    ("large architecture replacement",
     rf"\b(rewrit\w*|replac\w*|re-?architect\w*|migrat\w*)\b{_C}{{0,30}}\b(entire|whole|all of the|complete)\b{_C}{{0,30}}\b(architecture|"
     rf"app|application|codebase|framework|backend|frontend)\b", "plain"),
    ("major product direction change",
     rf"\b(chang\w*|replac\w*|remov\w*|add\w*|renam\w*|reorder\w*)\b{_C}{{0,30}}\b(primary|main|bottom|learner)\s+nav(igation)?\b"
     rf"|\b(chang\w*|renam\w*|renumber\w*)\b{_C}{{0,20}}\b(lesson|skill)\s+ids?\b|\b(chang\w*|rewrit\w*|replac\w*)\b{_C}{{0,15}}\b(core|product)\s+goal\b",
     "plain"),
]
_HG = [(why, re.compile(p, re.I), kind) for why, p, kind in _RULES]


def _negated(text: str, start: int) -> bool:
    clause_start = max(text.rfind(c, 0, start) for c in ".;\n") + 1
    return bool(_NEGATION.search(text[clause_start:start]))


def human_gate_reason(text: str, allow_deploy: bool = False, goal_text: str | None = None) -> str | None:
    """Return why this task needs a human decision, or None if it is a normal local, reversible change."""
    text = text or ""
    title = text.splitlines()[0] if text else ""
    read_only = bool(_READ_ONLY_LEAD.match(title))
    goal_lower = (goal_text or "").lower()
    for why, pattern, kind in _HG:
        if why == "production deployment" and allow_deploy:
            continue
        for m in pattern.finditer(text):
            if _negated(text, m.start()):
                continue
            span = m.group(0)
            if kind == "secrets" and (read_only or _TESTISH.search(span)):
                continue  # documenting/testing that secrets are handled correctly needs no secret
            if kind == "removal" and _OBSOLETE.search(span) and not re.search(r"rls|row[- ]level|force|history|irreversibl|public", span, re.I):
                continue
            if kind == "auth_target":
                target = (m.group("target") or "").strip().lower()
                if "away from" not in span.lower() and goal_text is not None and target and target in goal_lower:
                    continue  # moving TO the backend/auth the goal already asks for
            return why
    return None
