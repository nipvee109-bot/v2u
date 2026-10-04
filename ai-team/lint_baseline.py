"""Baseline lint comparison: pre-existing lint debt is not a regression of the current task.

Findings are keyed by (file, rule, severity, message). Baseline line numbers are mapped through
`git diff -U0 <baselineCommit>` so code that merely shifted (lines inserted above it) still
matches; a finding inside lines the task edited that re-appears elsewhere counts as MOVED.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Callable

BASELINE_DEBT = "BASELINE_DEBT"
NEW_REGRESSION = "NEW_REGRESSION"
MOVED = "MOVED"          # existing finding changed location because the task edited its lines
FIXED = "FIXED"

WARN_ONLY = "warn"
FAIL_ON_WARNINGS = "fail"

_ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")


@dataclass(frozen=True)
class Finding:
    file: str
    line: int
    col: int
    severity: str   # error | warning
    rule: str
    message: str

    @property
    def key(self) -> tuple:
        return (self.file, self.rule, self.severity, self.message)

    def label(self) -> str:
        return f"{self.file}:{self.line}:{self.col} {self.severity} {self.rule}: {self.message}"


def _sev(text: str) -> str:
    t = text.lower()
    return "error" if t in ("error", "err", "e", "2", "×", "✗", "x", "fatal") else "warning"


def _norm_file(path: str, root: Path | None) -> str:
    p = path.strip().strip('"').replace("\\", "/")
    if root is not None:
        r = str(root).replace("\\", "/").rstrip("/") + "/"
        if p.lower().startswith(r.lower()):
            p = p[len(r):]
    while p.startswith("./"):
        p = p[2:]
    return p


def _norm_msg(msg: str) -> str:
    msg = re.split(r"\s+help:\s", msg, maxsplit=1)[0]
    return re.sub(r"\s+", " ", msg).strip()


# file:line:col: severity rule(name): message        (oxlint piped / "agent" style)
_UNIX_SEV = re.compile(r"^(?P<file>(?:[A-Za-z]:)?[^:\n]+?):(?P<line>\d+):(?P<col>\d+):\s+(?P<sev>error|warning|warn)\s+"
                       r"(?P<rule>[\w@/.\-]+(?:\([^)]*\))?):\s*(?P<msg>.*)$", re.I)
# file:line:col: message [Error/rule-id]              (eslint unix)
_UNIX_ESLINT = re.compile(r"^(?P<file>(?:[A-Za-z]:)?[^:\n]+?):(?P<line>\d+):(?P<col>\d+):\s+(?P<msg>.*?)\s+"
                          r"\[(?P<sev>Error|Warning)(?:/(?P<rule>[^\]]+))?\]\s*$")
#   12:5  error  message  rule-id                     (stylish, file on a header line)
_STYLISH = re.compile(r"^\s+(?P<line>\d+):(?P<col>\d+)\s+(?P<sev>error|warning)\s+(?P<msg>.+?)(?:\s{2,}(?P<rule>[\w@/.\-()]+))?\s*$")
# ⚠ rule(name): message   then   ╭─[file:line:col]  (oxlint default graphical)
_GRAPH_HEAD = re.compile(r"^\s*(?P<icon>[⚠×✗!])\s+(?P<rule>[\w@/.\-]+(?:\([^)]*\))?):\s*(?P<msg>.*)$")
_GRAPH_LOC = re.compile(r"[╭┌]─+\[(?P<file>.+?):(?P<line>\d+):(?P<col>\d+)\]")
_SUMMARY = re.compile(r"Found\s+(?P<w>\d+)\s+warnings?\s+and\s+(?P<e>\d+)\s+errors?", re.I)
_ESLINT_SUMMARY = re.compile(r"(?P<t>\d+)\s+problems?\s+\((?P<e>\d+)\s+errors?,\s+(?P<w>\d+)\s+warnings?\)", re.I)


def _parse_json(text: str, root: Path | None) -> list[Finding] | None:
    start = min([i for i in (text.find("["), text.find("{")) if i >= 0], default=-1)
    if start < 0:
        return None
    try:
        data = json.loads(text[start:])
    except json.JSONDecodeError:
        return None
    out: list[Finding] = []
    if isinstance(data, list):  # eslint json
        for f in data:
            if not isinstance(f, dict) or "messages" not in f:
                return None
            for m in f.get("messages", []):
                out.append(Finding(_norm_file(f.get("filePath", ""), root), int(m.get("line") or 0), int(m.get("column") or 0),
                                   "error" if m.get("severity") == 2 else "warning", str(m.get("ruleId") or "unknown"),
                                   _norm_msg(str(m.get("message", "")))))
        return out
    if isinstance(data, dict) and isinstance(data.get("diagnostics"), list):  # oxlint json
        for d in data["diagnostics"]:
            span = ((d.get("labels") or [{}])[0] or {}).get("span", {}) if d.get("labels") else {}
            out.append(Finding(_norm_file(d.get("filename", ""), root), int(span.get("line") or 0), int(span.get("column") or 0),
                               _sev(str(d.get("severity", "warning"))), str(d.get("code") or "unknown"),
                               _norm_msg(str(d.get("message", "")))))
        return out
    return None


def parse_lint_output(text: str, root: Path | None = None) -> tuple[list[Finding], dict | None]:
    """Returns (findings, reported_counts) where reported_counts is the linter's own summary if printed."""
    text = _ANSI.sub("", text or "")
    reported = None
    m = _SUMMARY.search(text) or _ESLINT_SUMMARY.search(text)
    if m:
        reported = {"errors": int(m.group("e")), "warnings": int(m.group("w"))}
    js = _parse_json(text, root) if text.lstrip().startswith(("[", "{")) else None
    if js is not None:
        return js, reported
    findings: list[Finding] = []
    current_file = None
    pending_head = None
    for raw in text.splitlines():
        line = raw.rstrip()
        if pending_head is not None:
            loc = _GRAPH_LOC.search(line)
            if loc:
                icon, rule, msg = pending_head
                findings.append(Finding(_norm_file(loc.group("file"), root), int(loc.group("line")), int(loc.group("col")),
                                        _sev(icon), rule, _norm_msg(msg)))
                pending_head = None
                continue
        m = _UNIX_SEV.match(line)
        if m:
            findings.append(Finding(_norm_file(m.group("file"), root), int(m.group("line")), int(m.group("col")),
                                    _sev(m.group("sev")), m.group("rule"), _norm_msg(m.group("msg"))))
            continue
        m = _UNIX_ESLINT.match(line)
        if m:
            findings.append(Finding(_norm_file(m.group("file"), root), int(m.group("line")), int(m.group("col")),
                                    _sev(m.group("sev")), m.group("rule") or "unknown", _norm_msg(m.group("msg"))))
            continue
        m = _GRAPH_HEAD.match(line)
        if m:
            pending_head = (m.group("icon"), m.group("rule"), m.group("msg"))
            continue
        m = _STYLISH.match(line)
        if m and current_file:
            findings.append(Finding(current_file, int(m.group("line")), int(m.group("col")), _sev(m.group("sev")),
                                    m.group("rule") or "unknown", _norm_msg(m.group("msg"))))
            continue
        if line and not line.startswith((" ", "\t", ">")) and re.search(r"\.\w{1,5}$", line) and ":" not in line[2:]:
            current_file = _norm_file(line, root)  # stylish file header
    return findings, reported


def counts(findings: list[Finding]) -> dict:
    return {"errors": sum(1 for f in findings if f.severity == "error"),
            "warnings": sum(1 for f in findings if f.severity == "warning")}


# ---------------------------------------------------------------- line mapping through git diff
_HUNK = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@", re.M)


def parse_hunks(diff_text: str) -> list[tuple[int, int, int, int]]:
    return [(int(a), int(b) if b != "" else 1, int(c), int(d) if d != "" else 1)
            for a, b, c, d in _HUNK.findall(diff_text)]


def map_line(line: int, hunks: list[tuple[int, int, int, int]]) -> int | None:
    """Map a baseline line number to the current file.

    Lines outside edited hunks just shift. A line inside an edited hunk maps to the same position in
    the replacement (an in-place edit keeps its location); None if that position no longer exists.
    """
    offset = 0
    for a, b, c, d in hunks:
        if b == 0:              # pure insertion after old line a
            if line <= a:
                break
            offset += d
        else:
            if line < a:
                break
            if line < a + b:
                pos = line - a
                return c + pos if pos < d else None
            offset += d - b
    return line + offset


Mapper = Callable[[str, int], "int | None"]


def identity_mapper(_file: str, line: int) -> int:
    return line


# ---------------------------------------------------------------- comparison
@dataclass
class LintComparison:
    status: str
    baseline: dict
    current: dict
    new: list
    moved: list
    fixed: list
    warnings_policy: str
    notes: list

    @property
    def new_errors(self) -> int:
        return sum(1 for f in self.new if f.severity == "error")

    @property
    def moved_errors(self) -> int:
        return sum(1 for f in self.moved if f.severity == "error")

    @property
    def new_warnings(self) -> int:
        return sum(1 for f in self.new if f.severity == "warning")

    @property
    def moved_warnings(self) -> int:
        return sum(1 for f in self.moved if f.severity == "warning")

    @property
    def fixed_errors(self) -> int:
        return sum(1 for f in self.fixed if f.severity == "error")

    @property
    def fixed_warnings(self) -> int:
        return sum(1 for f in self.fixed if f.severity == "warning")

    def details(self) -> dict:
        return {
            "baselineErrors": self.baseline["errors"], "currentErrors": self.current["errors"],
            "newErrors": self.new_errors, "movedErrors": self.moved_errors, "fixedErrors": self.fixed_errors,
            "baselineWarnings": self.baseline["warnings"], "currentWarnings": self.current["warnings"],
            "newWarnings": self.new_warnings, "movedWarnings": self.moved_warnings, "fixedWarnings": self.fixed_warnings,
            "warningsPolicy": self.warnings_policy,
            "newFindings": [f"{NEW_REGRESSION if f.severity == 'error' else 'NEW_WARNING'} {f.label()}" for f in self.new][:60],
            "movedFindings": [f"{MOVED} {f.label()}" for f in self.moved][:60],
            "notes": self.notes,
        }

    def report_lines(self) -> list[str]:
        out = [f"Baseline errors: {self.baseline['errors']}", f"Current errors: {self.current['errors']}",
               f"New errors: {self.new_errors}"]
        if self.moved_errors:
            out.append(f"Changed baseline errors (moved by this task): {self.moved_errors}")
        if self.fixed_errors:
            out.append(f"Removed baseline errors: {self.fixed_errors}")
        out.append(f"Warnings: baseline {self.baseline['warnings']}, current {self.current['warnings']}, "
                   f"new {self.new_warnings + self.moved_warnings}"
                   + (" (warning-only)" if self.warnings_policy == WARN_ONLY else " (fail on new warnings)"))
        for f in (self.new + self.moved)[:10]:
            tag = MOVED if f in self.moved else (NEW_REGRESSION if f.severity == "error" else "NEW_WARNING")
            out.append(f"  {tag}: {f.label()}")
        out.append(f"Status: {self.status}")
        return out


def compare(baseline: list[Finding], current: list[Finding], mapper: Mapper = identity_mapper,
            warnings_policy: str = WARN_ONLY) -> LintComparison:
    from validation import FAIL_REGRESSION, PASS, PASS_WITH_BASELINE_DEBT  # local import: avoid cycle
    base_groups: dict[tuple, list[Finding]] = defaultdict(list)
    cur_groups: dict[tuple, list[Finding]] = defaultdict(list)
    for f in baseline:
        base_groups[f.key].append(f)
    for f in current:
        cur_groups[f.key].append(f)
    new, moved, fixed = [], [], []
    for key in set(base_groups) | set(cur_groups):
        mapped = [(mapper(b.file, b.line), b) for b in base_groups.get(key, [])]
        remaining_base = list(mapped)
        unmatched_cur = []
        for cf in sorted(cur_groups.get(key, []), key=lambda f: f.line):
            hit = next((i for i, (ml, _) in enumerate(remaining_base) if ml is not None and ml == cf.line), None)
            if hit is None:
                unmatched_cur.append(cf)
            else:
                remaining_base.pop(hit)
        # Same finding, different place: prefer pairing with baseline entries in lines the task edited.
        remaining_base.sort(key=lambda x: x[0] is not None)
        for cf in unmatched_cur:
            if remaining_base:
                remaining_base.pop(0)
                moved.append(cf)
            else:
                new.append(cf)
        fixed.extend(b for _, b in remaining_base)
    comp = LintComparison("", counts(baseline), counts(current), sorted(new, key=lambda f: (f.file, f.line)),
                          sorted(moved, key=lambda f: (f.file, f.line)), fixed, warnings_policy, [])
    regress = comp.new_errors + comp.moved_errors
    if warnings_policy == FAIL_ON_WARNINGS:
        regress += comp.new_warnings + comp.moved_warnings
    if regress:
        comp.status = FAIL_REGRESSION
    elif comp.current["errors"]:
        comp.status = PASS_WITH_BASELINE_DEBT
    else:
        comp.status = PASS
    return comp


def warnings_policy_from(cfg_value: str | None, rules_text: str) -> str:
    """Explicit config wins; otherwise PROJECT_RULES.md may demand failing on new warnings; default warning-only."""
    if cfg_value in (WARN_ONLY, FAIL_ON_WARNINGS):
        return cfg_value
    text = re.sub(r"<!--.*?-->", "", rules_text or "", flags=re.S).lower()
    if re.search(r"(no new|do not (add|introduce) (any )?new|zero new)\s+(lint\s+)?warnings|lint warnings?:\s*(fail|error|block)", text):
        return FAIL_ON_WARNINGS
    return WARN_ONLY


# ---------------------------------------------------------------- persistence
def findings_to_json(findings: list[Finding]) -> list[dict]:
    return [asdict(f) for f in findings]


def findings_from_json(items: list[dict]) -> list[Finding]:
    return [Finding(**i) for i in items or []]
