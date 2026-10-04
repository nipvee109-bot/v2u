"""GOAL.md / PROJECT_RULES.md parsing and templates."""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from pathlib import Path

TEMPLATE_MARKER = "<!-- AITEAM_TEMPLATE: replace this file with your real goal, then delete this line -->"
RULES_TEMPLATE_MARKER = "<!-- AITEAM_RULES_TEMPLATE -->"

GOAL_TEMPLATE = f"""{TEMPLATE_MARKER}
# Product Goal

Describe the product and the outcome you want (paste the GOAL.md you designed with ChatGPT).

# Requirements

- requirement 1
- requirement 2

# Principles

- simple
- preserve user data

# Definition of Done

- [ ] all requirements implemented
- [ ] tests pass
- [ ] build passes

# Never Do

- no production deploy
- no destructive migration
- no deleting user data
"""

RULES_TEMPLATE = f"""{RULES_TEMPLATE_MARKER}
# Project Rules

Permanent rules for the AI Dev Team. Edit to fit this project.
AI-Team did NOT guess project-specific production/data rules; add them here.

## Always

- Keep changes inside this repository.
- Run tests before declaring work done.

## Never

- No production deployment.
- No destructive database migration.
- No deleting user data.
- No committing secrets or credentials.
- No disabling or skipping tests to make them pass.

## Git

- Push after validated checkpoints: yes
<!-- To forbid pushing, change the line above to: Push after validated checkpoints: no -->

## Validation commands (optional, otherwise auto-detected)

<!-- Configure in .aiteam/config.json, e.g.
{{ "validation": {{ "test": ["npm", "test"], "build": ["npm", "run", "build"] }} }} -->
"""


@dataclass
class Goal:
    raw: str
    sections: dict[str, str] = field(default_factory=dict)
    is_template: bool = False

    @property
    def hash(self) -> str:
        return hashlib.sha256(self.raw.encode("utf-8")).hexdigest()[:16]

    def section(self, *names: str) -> str:
        for name in names:
            for key, value in self.sections.items():
                if name in key:
                    return value
        return ""

    @property
    def title(self) -> str:
        body = self.section("product goal", "goal")
        for line in body.splitlines():
            line = line.strip()
            if line:
                return line[:100]
        return "(untitled goal)"

    @property
    def requirements(self) -> list[str]:
        return _bullets(self.section("requirement"))

    @property
    def definition_of_done(self) -> list[str]:
        return _bullets(self.section("definition of done", "done"))

    @property
    def never_do(self) -> list[str]:
        return _bullets(self.section("never do", "never"))


def _bullets(text: str) -> list[str]:
    items = []
    for line in text.splitlines():
        m = re.match(r"^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s*)?(.+)$", line)
        if m:
            items.append(m.group(1).strip())
    return items


def parse_goal(text: str) -> Goal:
    sections: dict[str, str] = {}
    current = "_preamble"
    buf: list[str] = []
    for line in text.splitlines():
        m = re.match(r"^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$", line)
        if m:
            sections[current] = "\n".join(buf).strip()
            current = m.group(1).strip().lower()
            buf = []
        else:
            buf.append(line)
    sections[current] = "\n".join(buf).strip()
    return Goal(raw=text, sections=sections, is_template=TEMPLATE_MARKER in text)


def load_goal(path: Path) -> Goal | None:
    if not path.exists():
        return None
    return parse_goal(path.read_text(encoding="utf-8"))


def load_rules(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""


def rules_forbid_push(rules_text: str) -> bool:
    text = re.sub(r"<!--.*?-->", "", rules_text, flags=re.S).lower()
    if re.search(r"push after validated checkpoints:\s*(no|false)", text):
        return True
    return bool(re.search(r"\b(do not|don't|never|no)\s+(git\s+)?push\b|ห้าม\s*push", text))
