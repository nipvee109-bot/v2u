"""Configuration: defaults <- <install>/config.json <- <project>/.aiteam/config.json."""
from __future__ import annotations

import copy
import json
import re
import sys
from pathlib import Path

INSTALL_DIR = Path(__file__).resolve().parent

DEFAULTS: dict = {
    "quotaProbeMinutes": 30,
    "autoPush": True,
    "allowDeploy": False,
    "improvementMode": True,
    "parallelAnalysis": True,
    "maxTaskRetries": 3,
    "preferredPlanner": "claude",
    "preferredImplementer": "codex",
    "preferredReviewer": "claude",
    "agentTimeoutMinutes": 45,
    "waitForQuota": True,
    "startupProbe": True,
    "maxCycles": 500,
    "maxImprovementRounds": 10,
    "maxImprovementsPerRound": 3,
    "minImprovementImpact": 2,
    "stableRoundsRequired": 1,
    "maxDiffChars": 60000,
    "maxContextChars": 20000,
    "validationTimeoutMinutes": 20,
    "validation": {},
    "validationEnv": {},
    "requireSecurityValidation": "auto",
    "lint": {"warnings": None},
    "useWorktrees": False,
    "claude": {
        "command": "claude",
        "model": None,
        "readPermissionMode": "plan",
        "writePermissionMode": "acceptEdits",
        "writeAllowedTools": ["Read", "Edit", "Write", "Glob", "Grep", "Bash", "TodoWrite"],
        "writeDisallowedTools": ["Bash(git push:*)", "Bash(git commit:*)", "Bash(git reset:*)", "Bash(git rebase:*)",
                                 "Bash(git merge:*)", "Bash(git stash:*)", "Bash(npm publish:*)",
                                 "Bash(supabase db push:*)", "Bash(npx supabase db push:*)", "Bash(supabase link:*)"],
        "extraArgs": [],
    },
    "codex": {
        "command": "codex",
        "model": None,
        "readSandbox": "read-only",
        "writeSandbox": "workspace-write",
        "extraArgs": [],
    },
}

# Written to <project>/.aiteam/config.json the first time AI-Team touches a project (never overwritten).
# autoPush starts OFF so the first real cycles can be reviewed before anything reaches origin.
LOCAL_CONFIG_DEFAULT: dict = {
    "_comment": "Machine-local AI-Team settings for this project (git-ignored). autoPush is OFF so you can review "
                "local commits first: 'aiteam push --yes' pushes on demand, 'aiteam config set autoPush true' re-enables.",
    "autoPush": False,
}

# Never allow credentials into config; the system is subscription-only.
_FORBIDDEN_KEY = re.compile(r"(?i)(api[_-]?key|token|secret|password|base[_-]?url)")


def is_forbidden_key(key: str) -> bool:
    return bool(_FORBIDDEN_KEY.search(key))


def _merge(base: dict, override: dict) -> dict:
    out = copy.deepcopy(base)
    for key, value in override.items():
        if _FORBIDDEN_KEY.search(key):
            print(f"[config] ignoring forbidden key '{key}' (no API keys/credentials allowed)", file=sys.stderr)
            continue
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = _merge(out[key], value)
        else:
            out[key] = value
    return out


def _read(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError) as exc:
        print(f"[config] could not read {path}: {exc}", file=sys.stderr)
        return {}


def load_config(project_root: Path | None = None, install_dir: Path = INSTALL_DIR) -> dict:
    cfg = _merge(DEFAULTS, _read(install_dir / "config.json"))
    if project_root is not None:
        cfg = _merge(cfg, _read(Path(project_root) / ".aiteam" / "config.json"))
    return cfg
