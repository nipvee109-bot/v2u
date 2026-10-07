# Game Learning Handoff (for Codex)

Status: **DESIGN ONLY** (2026-10-07). No game is implemented, registered or changed by this document.
Game Lab is not modified. Only lessons marked **OPTIONAL_GAME** or **GAME_HIGH_VALUE** in
`per-lesson-learning-mechanics.md` appear here.

Rules that apply to every game:
- The core lesson must work fully without the game.
- **Fun action = learning action.** If the player could win without using the concept, the design is wrong.
- Games read **GameContent** and return **GameEvidence** only. Evidence carries attempts / correct / hints /
  retries / per-skill counts — **never** mastery, review, Diagnostic or Next Step (V2U's Learning Core decides those).
- Learning effects stay **off** until a real integration is proven and accepted by the user.
- Contract fit: GameContent **1.1** is Python-shaped (code + python3-verified expected output). Python lessons fit it
  today; every non-Python game below needs a **future, subject-neutral GameContent version** — a decision for
  the owner, not made here. GameEvidence 1.1 already fits all of them.

---

## Current lessons

### prog-ctrl-conditions — GAME_HIGH_VALUE (Pixel Code Battle)
- **Skills:** skill-prog-conditions
- **Learning mechanic:** decision path with substituted conditions (Truth Lights + Path Tracer).
- **Why a game helps:** each turn the branch that runs *is* the action in battle; repeated, varied conditions build fluency that a lesson's 3–4 items cannot.
- **Player does:** reads/edits an if/elif/else, predicts which branch fires for the current enemy state, runs it, sees the action happen.
- **Must stay educationally true:** first true condition wins; order matters; `==` vs `=`; outputs verified by python3.
- **GameContent:** existing 1.1 export (predictions, debugging cases, hint ladder, narration) — no change needed.
- **GameEvidence:** existing 1.1 (attempts, correct, hints, retries, skillEvidence for skill-prog-conditions).
- **Status:** registered as PREPARING. **USER_ACCEPTANCE: PENDING — not complete.**

### math-alg-linear-eq — OPTIONAL_GAME (Balance Puzzle)
- **Skills:** skill-math-solve-linear, skill-math-check-solution
- **Learning mechanic:** invariant manipulative (balance).
- **Why a game helps:** many short puzzles ("isolate x in the fewest legal moves") give practice volume with the same model the lesson taught.
- **Player does:** removes/divides on both pans; a one-sided move tilts the scale (no "game over", just visible imbalance); finishes by substituting back.
- **Must stay true:** only legal equality operations; every level's answer verified by substitution; fractions/brackets only after the lesson introduced them.
- **GameContent needs:** list of equations (from the knowledge layer's verified items), allowed operations per level, verified solution x, hint ladder (rule → focus → worked example of a *different* equation).
- **GameEvidence needs:** per equation attempts/correct, imbalance moves counted as retries, hints.

### math-fn-linear — OPTIONAL_GAME (Aim the Line)
- **Skills:** skill-math-slope, skill-math-graph-reading
- **Learning mechanic:** live parameter ↔ shape.
- **Why a game helps:** hitting target points by choosing m and c is the concept itself; levels add fractional slopes and context labels.
- **Player does:** sets m and c (not free drawing) so the line passes all targets; context levels ask for the meaning of c/m.
- **Must stay true:** targets on exact lines; slope = rise/run; no "snap" that hides the parameters.
- **GameContent needs:** target point sets with verified (m, c), context labels for graph-reading levels.
- **GameEvidence needs:** attempts per level, correct, hints.

### prog-ctrl-loops — OPTIONAL_GAME (Repeat Robot)
- **Skills:** skill-prog-loops, skill-prog-trace
- **Learning mechanic:** live memory trace / iteration ledger.
- **Why a game helps:** the number of repetitions becomes visible movement (robot steps, tiles placed).
- **Player does:** chooses `range(...)` bounds or a while condition to make the robot do exactly N actions; sees the iteration ledger.
- **Must stay true:** `range(a, b)` excludes b; all programs and outputs verified by python3; no infinite loops shipped (capped and shown as "never stops").
- **GameContent needs:** fits 1.1 shape (code + expected output) with loop-specific predictions; add level targets (N actions).
- **GameEvidence needs:** attempts, correct, hints, retries for skill-prog-loops / skill-prog-trace.

### phy-dyn-newton — OPTIONAL_GAME (Deliver the Crate)
- **Skills:** skill-phy-newton-second, skill-phy-free-body
- **Learning mechanic:** fair experiment + free-body builder.
- **Why a game helps:** choosing a force to make a crate reach a mark in a given time requires using ΣF = ma, not guessing.
- **Player does:** builds the free-body diagram (including friction), sets the pulling force, releases.
- **Must stay true:** constant forces only; friction model as in the lesson (μN); physics computed, never tuned for "fun".
- **GameContent needs:** scenarios (mass, μ, target distance/time) with verified required force; allowed force types incl. one decoy.
- **GameEvidence needs:** attempts, correct, decoy forces placed (as retries), hints.

### web-html-text — OPTIONAL_GAME (Tag Pairs)
- **Skills:** skill-web-html-nesting (and skill-web-html-text-structure)
- **Learning mechanic:** break → observe → repair on tag pairs.
- **Why a game helps:** fast repetition of "find the unclosed/overlapping tag" with immediate visible repair.
- **Player does:** closes or re-orders tags so the page stops "breaking".
- **Must stay true:** checks come from the same DOM/structure engine (`src/web/html.ts`); no regex-only grading.
- **GameContent needs:** broken snippets + expected structure requirements (same shape as `verify: html`).
- **GameEvidence needs:** attempts, correct, hints per snippet.

---

## Proposed lessons — PROPOSED / NOT ACTIVE

These depend on the proposed curriculum being approved **and** a subject-neutral GameContent version.

| Lesson | Decision | Game concept | Player does | Must stay true | GameContent needs | GameEvidence needs |
|---|---|---|---|---|---|---|
| web-css-flex | GAME_HIGH_VALUE | Layout Garden | Writes justify/align/direction/gap to move items onto target shadows | Real CSS semantics; only lesson-allowed properties | Levels (container, items, target layout), verified solutions, hint ladder | Attempts/correct/hints per level |
| db-sql-challenge | GAME_HIGH_VALUE | Data Detective | Unlocks clues only by queries whose results answer each clue | Real SQLite semantics (sql.js approved), fictional data, SELECT-only V1 | Fixture tables, clue questions, verified result sets | Per clue: query attempts, correct, clause hints |
| net-troubleshoot | GAME_HIGH_VALUE | Network Rescue | Sends packets, reads the stop point, changes one setting at a time | Deterministic simulator; /24 only in V1 | Topologies, fault lists, expected stop hops, verified fixes | Per fault: sends, changes before fix, correct diagnosis, hints |
| web-css-box-model | OPTIONAL_GAME | Spacing to the shadow | Adjusts padding/margin to match a target outline | padding vs margin semantics | Levels with target boxes | Attempts/correct |
| web-js-conditions | OPTIONAL_GAME | Code Battle (JS) | Same as Pixel Code Battle in JS | JS comparison semantics (`===`) | JS-capable payload | As above |
| db-sql-where | OPTIONAL_GAME | (part of Data Detective) | Filters suspects by condition | Boundary semantics | Fixture + conditions | Attempts/correct |
| db-sql-aggregate | OPTIONAL_GAME | (part of Data Detective) | Uses COUNT/AVG/MAX/MIN as tools | No GROUP BY in V1 | Fixture + questions | Attempts/correct |
| net-gateway | OPTIONAL_GAME | (part of Network Rescue) | Fixes gateway faults | Hop decisions as in the lesson | Gateway faults | Attempts/correct |
