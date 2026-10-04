"""Thin, safe wrapper around git (list argv, no shell)."""
from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

from agents import subscription_env

AITEAM_ALLOWED_USER_FILES = {"GOAL.md", "PROJECT_RULES.md"}


@dataclass
class GitResult:
    code: int
    out: str
    err: str

    @property
    def ok(self) -> bool:
        return self.code == 0


class GitManager:
    def __init__(self, root: Path, dry_run: bool = False):
        self.root = Path(root)
        self.dry_run = dry_run

    def git(self, *args: str, timeout: float = 300) -> GitResult:
        try:
            p = subprocess.run(["git", *args], cwd=str(self.root), capture_output=True, text=True,
                               encoding="utf-8", errors="replace", timeout=timeout, env=subscription_env())
            return GitResult(p.returncode, p.stdout, p.stderr)
        except FileNotFoundError:
            return GitResult(127, "", "git not found")
        except subprocess.TimeoutExpired:
            return GitResult(124, "", "git timed out")

    def available(self) -> bool:
        return self.git("--version").ok

    def is_repo(self) -> bool:
        r = self.git("rev-parse", "--show-toplevel")
        if not r.ok:
            return False
        return Path(r.out.strip()).resolve() == self.root.resolve()

    def status_entries(self) -> list[tuple[str, str]]:
        """[(XY, path)] from porcelain v1 -z, untracked expanded, .aiteam excluded."""
        r = self.git("status", "--porcelain=v1", "-z", "-uall")
        if not r.ok:
            return []
        parts = r.out.split("\0")
        entries, i = [], 0
        while i < len(parts):
            item = parts[i]
            i += 1
            if len(item) < 4:
                continue
            xy, path = item[:2], item[3:]
            if xy[0] in "RC":  # rename/copy: next field is the source path
                i += 1
            if path.startswith(".aiteam/") or path == ".aiteam":
                continue
            entries.append((xy, path))
        return entries

    def changed_paths(self) -> set[str]:
        return {p for _, p in self.status_entries()}

    def has_conflicts(self) -> bool:
        return any(xy in ("DD", "AU", "UD", "UA", "DU", "AA", "UU") for xy, _ in self.status_entries())

    def user_changes(self, owned: set[str]) -> set[str]:
        """Dirty paths that AI-Team did not create (must never be overwritten or committed)."""
        return {p for p in self.changed_paths() if p not in owned and p not in AITEAM_ALLOWED_USER_FILES}

    def diff(self, max_chars: int = 60000) -> str:
        parts = [self.git("diff", "HEAD", "--stat").out, self.git("diff", "HEAD").out]
        untracked = [p for xy, p in self.status_entries() if xy == "??"]
        if untracked:
            parts.append("Untracked files:\n" + "\n".join(untracked[:200]))
        text = "\n".join(parts)
        if len(text) > max_chars:
            text = text[:max_chars] + f"\n... [diff truncated, {len(text) - max_chars} chars omitted]"
        return text

    def status_short(self) -> str:
        return self.git("status", "--short", "--branch").out.strip()

    def head_full(self) -> str | None:
        r = self.git("rev-parse", "HEAD")
        return r.out.strip() if r.ok else None

    def unpushed(self) -> tuple[str | None, str]:
        """(upstream ref or None, `git log --oneline` of commits not yet on it)."""
        up = self.git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}")
        ref = up.out.strip() if up.ok else None
        if ref is None:
            br = self.branch()
            if br and self.git("rev-parse", "--verify", "--quiet", f"refs/remotes/origin/{br}").ok:
                ref = f"origin/{br}"
        log = self.git("log", "--oneline", f"{ref}..HEAD") if ref else self.git("log", "--oneline", "-20")
        return ref, log.out.strip()

    def head(self) -> str | None:
        r = self.git("rev-parse", "--short", "HEAD")
        return r.out.strip() if r.ok else None

    def branch(self) -> str | None:
        r = self.git("rev-parse", "--abbrev-ref", "HEAD")
        return r.out.strip() if r.ok else None

    def has_origin(self) -> bool:
        return self.git("remote", "get-url", "origin").ok

    def commit(self, paths: set[str], message: str) -> GitResult:
        paths = sorted(paths)
        if not paths:
            return GitResult(1, "", "nothing to commit")
        if self.dry_run:
            return GitResult(0, f"[dry-run] would commit {len(paths)} file(s): {message}", "")
        add = self.git("add", "-A", "--", *paths)
        if not add.ok:
            return add
        if not self.git("diff", "--cached", "--quiet").code:
            return GitResult(1, "", "nothing staged")
        return self.git("commit", "-m", message, "--", *paths)

    def push(self) -> GitResult:
        if self.dry_run:
            return GitResult(0, "[dry-run] would push", "")
        br = self.branch()
        if not br or br == "HEAD":
            return GitResult(1, "", "detached HEAD; not pushing")
        upstream = self.git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}")
        if upstream.ok:
            return self.git("push", timeout=600)
        return self.git("push", "-u", "origin", br, timeout=600)

    def stash_paths(self, paths: set[str], message: str) -> GitResult:
        """Park failed work (recoverable with `git stash list`) instead of deleting it."""
        if self.dry_run or not paths:
            return GitResult(0, "", "")
        return self.git("stash", "push", "--include-untracked", "-m", message, "--", *sorted(paths))

    # Worktree support for future parallel implementation (main / worktree/claude / worktree/codex).
    def add_worktree(self, name: str, base: str = "HEAD") -> Path:
        path = self.root.parent / f"{self.root.name}-worktree-{name}"
        if not path.exists():
            self.git("worktree", "add", "-B", f"aiteam/{name}", str(path), base)
        return path


def sanitize_commit_message(msg: str | None, fallback: str) -> str:
    msg = (msg or "").strip().splitlines()[0] if (msg or "").strip() else ""
    msg = re.sub(r"[`\"]", "", msg)[:100]
    if not re.match(r"^(feat|fix|test|refactor|docs|chore|perf|style|build|ci)(\([\w\-./ ]+\))?!?: .+", msg):
        title = re.sub(r"\s+", " ", fallback).strip().rstrip(".")[:72]
        msg = f"feat: {title[:1].lower() + title[1:]}" if title else "chore: ai-team checkpoint"
    return msg
