# AI DEV TEAM V3

A local orchestrator that makes **Claude Code CLI** and **OpenAI Codex CLI** work together on your project until the goal in `GOAL.md` is done. After that it keeps improving the project and stops when nothing meaningful is left (`PROJECT_STABLE`).

You plan the product with ChatGPT, save the result as `GOAL.md`, and run `aiteam start`.

**No API key required.** AI-Team only runs the `claude` and `codex` commands you are already logged in to. Before starting each agent process it removes `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` and similar variables from that process's environment, so it can't fall back to paid API billing. `config.json` also ignores any key named like `apiKey`, `token` or `secret`.

## Requirements

- Windows 10/11 (Linux and macOS work too)
- Python 3.10+ (standard library only, nothing to `pip install`)
- Git
- Claude Code, logged in: run `claude` once and sign in with your Claude account
- Codex CLI, logged in: run `codex` once and choose **Sign in with ChatGPT**

The team still works if only one of the two CLIs is available.

## Setup (Windows)

```powershell
# 1. put the files in C:\AI-Team (copy this ai-team folder there)
# 2. add it to PATH for your user (one time), then open a new terminal
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\AI-Team", "User")
# 3. check that the CLIs are found and see the exact flags AI-Team will use (uses no quota)
aiteam doctor
```

`aiteam.cmd` is the launcher. It calls `py -3 aiteam.py`, or `python aiteam.py` if `py` isn't installed. If an old `aiteam.ps1` prototype sits in the same folder, PowerShell runs it instead of `aiteam.cmd`. Once V3 works for you, rename the prototype (for example to `aiteam-legacy.ps1`).

## Usage

```powershell
cd C:\Users\me\Projects\NextStep
aiteam init                 # creates GOAL.md, PROJECT_RULES.md, .aiteam\
notepad GOAL.md             # paste the goal from ChatGPT; delete the AITEAM_TEMPLATE line
git add GOAL.md PROJECT_RULES.md; git commit -m "docs: add product goal"
aiteam start --dry-run      # rehearsal with fake agents (no quota, no commits)
aiteam start                # real autonomous run
```

| Command | What it does |
|---|---|
| `aiteam init` | Creates `GOAL.md` and `PROJECT_RULES.md` templates and the `.aiteam\` folder |
| `aiteam start` | Starts a new run or resumes from saved state. `--dry-run`, `--no-wait`, `--max-cycles N` |
| `aiteam status [-v]` | Shows project, goal, status, cycle, current task, both agents, cooldowns, progress and last commit |
| `aiteam pause` | Stops after the current step, once state is saved |
| `aiteam resume` | Clears the pause and continues |
| `aiteam review` | Both agents assess the project without changing anything |
| `aiteam improve` | Goes straight to improvement mode |
| `aiteam answer T004 "use Supabase auth"` | Answers a `NEEDS_HUMAN` question. Use `skip` to drop the task or `retry` to retry a failed one |
| `aiteam doctor` | Shows detected CLI versions and flags. Sends no prompts |

## How GOAL.md works

`GOAL.md` is the source of truth. It is read on every `start` and `resume`. Recognised sections are `# Product Goal`, `# Requirements`, `# Principles`, `# Definition of Done` and `# Never Do`, and the whole file goes to both agents. If `GOAL.md` changes, AI-Team re-plans: finished tasks stay done, and pending tasks are rebuilt against the new goal.

`PROJECT_RULES.md` holds permanent rules. The template does **not** guess production or data rules, so add your own. To stop pushes, write `Push after validated checkpoints: no`.

## The loop

1. **Plan.** Claude proposes a backlog. Codex checks it against the repository and returns the final backlog (tasks with priority, impact, risk, effort, dependencies and acceptance criteria).
2. **For each task**, picked by priority, goal impact and dependencies:
   1. Claude analyses it (read-only).
   2. Codex implements it and runs the tests.
   3. Claude reviews the git diff.
   4. Codex checks the review findings, fixes the valid ones and rejects the invalid ones.
   5. The manager runs the project's own typecheck, lint, test and build.
   6. The manager makes a git commit and pushes it.
3. **Goal check.** When all tasks are done, Claude and Codex each judge independently whether the goal is complete. It counts as complete only if both agree, validation passes and git is clean. If they disagree, there is one extra verification round. Anything still unmet becomes a new task.
4. **Improvement mode.** Claude looks for UX, flow, accessibility and simplification issues; Codex looks for bugs, performance, debt and tests. Every candidate needs impact, risk, effort, a reason and evidence. Candidates that are cosmetic, low-impact, high-risk without clear value, or need a human decision are rejected. The reasons are written to `.aiteam\reports\improvement-round-NNN.md`.
5. **Stop.** When a discovery round finds nothing meaningful (`stableRoundsRequired`), the status becomes `PROJECT_STABLE`.

Neither agent is the other's boss. Each treats the other's output as advice and checks it against the real repository. The prompts are in `prompts.py`.

Goal progress is computed from acceptance criteria (`12 / 17 acceptance criteria complete`). If tasks have no criteria, it shows task counts instead. It is never a number the AI made up.

## How fallback works

Every CLI result is classified from **exit code + structured output + stderr**:

- Claude: `--output-format json` gives `is_error` and the status.
- Codex: the exit code and stderr.

Quota phrases are only checked when the command failed. The exception is a short usage-limit banner on exit 0, which some versions print. So an answer that merely talks about "rate limiting" code is not mistaken for a quota error.

| Result | Agent becomes | Effect |
|---|---|---|
| usage/rate limit, quota, 429/529, capacity | `COOLDOWN` | The other agent takes over the same role: planning, review or implementation |
| not logged in / auth expired, CLI missing | `UNAVAILABLE` | You are told to log in again; the other agent continues |
| crash / timeout | `ERROR` | The other agent retries; the task fails only after `maxTaskRetries` |

The fallback agent **continues** the same step. It gets the goal, rules, state, task, earlier phase reports, git status and diff, and the interrupted agent's partial output, and is told to carry on rather than start over. A task's current phase is saved after every step.

## How quota cooldown works

- An agent in `COOLDOWN` is not used for work.
- At the next probe time it gets one tiny prompt (`Reply with exactly AITEAM_OK`).
  - Success makes it `AVAILABLE` again.
  - Another limit error puts it back in cooldown for a full interval. Probes are never repeated rapidly.
- The probe interval is `quotaProbeMinutes` (default 30). If the CLI reports a reset time, the probe happens just after that time. No reset schedule is hard-coded.
- **If both agents are out:** state, the current task, reports, a git status/diff snapshot and a checkpoint are saved; work is never discarded or rolled back. The status becomes `WAITING_FOR_QUOTA` and the screen says **Safe to close terminal**. If you leave it open, it waits, probes and then continues by itself (set `"waitForQuota": false` or use `--no-wait` to exit instead).

## How resume works

State lives in `.aiteam\state.json` and `tasks.json`:

- Every write goes to a temp file, then fsync, then an atomic replace.
- The previous version is kept as `.bak`.
- Every event is appended to `history.jsonl`.

After a closed terminal, a Windows restart, a crash or a quota pause, just run `aiteam start`. An unfinished task resumes at the phase it reached, such as review.

## Git safety

- At start, AI-Team runs the equivalent of `git status`. If there are uncommitted changes it didn't make, it **stops with `NEEDS_HUMAN`** and never touches them. Commit or stash them first.
- It commits only files AI-Team changed, with conventional messages (`feat(timer): ...`).
- It pushes after validated checkpoints if `origin` exists, `autoPush` is true and the rules allow it. Pushing never deploys.
- A task that keeps failing has its changes parked in `git stash` (`aiteam-failed-T003`), not deleted.
- `.aiteam\` stays local and git-ignored.
- The agents are told not to commit, push, reset or stash. Git belongs to the manager.

## Human decision gate

Work stops for you (`NEEDS_HUMAN`) when it involves any of these:

- production deploy
- destructive migrations or deleting user data
- secrets or credentials
- paid services
- irreversible actions
- large rewrites or replacements
- changing auth or the security model
- an agent explicitly asks a question

Questions are listed by `aiteam status` and saved in `.aiteam\reports\NEEDS_HUMAN.md`. Answer with `aiteam answer`. Other tasks keep going when that is safe.

## How to stop safely

- `aiteam pause` from a second terminal: stops after the current step.
- Ctrl+C: the state saved so far is kept.
- Closing the window while in `WAITING_FOR_QUOTA`: always safe.

## Config (`config.json`)

| Key | Meaning |
|---|---|
| `quotaProbeMinutes` | Cooldown probe interval |
| `autoPush` | Push after validated checkpoints |
| `allowDeploy` | Must stay `false` unless you really mean it |
| `improvementMode` | Continue into improvement mode after the goal is met |
| `parallelAnalysis` | Run read-only evaluation and discovery in parallel |
| `maxTaskRetries` | Retries before a task is marked failed |
| `preferredPlanner`, `preferredImplementer`, `preferredReviewer` | Which agent normally takes each role |
| `validation` | Explicit commands, e.g. `{"test": ["npm","test"], "build": ["npm","run","build"]}`; otherwise auto-detected from `package.json`, pytest, cargo or go |
| `claude.writeAllowedTools` | Tools Claude may use when implementing |
| `codex.writeSandbox` | Codex sandbox mode when implementing |
| `maxCycles`, `maxImprovementRounds` | Safety limits |

Per-project overrides go in `<project>\.aiteam\config.json`.

## Worktrees and parallel work

V3 implements tasks **one at a time** in the main working tree, so the two agents never edit the same files at once. Only read-only analysis (goal evaluation and improvement discovery) runs in parallel. The pieces for parallel implementation in separate worktrees are already there (`GitManager.add_worktree`, a `cwd` on every agent call, `useWorktrees` config), but it is not switched on yet.

## Tests

```powershell
cd C:\AI-Team
python -m unittest discover -s tests -v
```

All CLI calls in the tests are mocked, so running them uses no Claude or Codex quota.
