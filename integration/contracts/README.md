# V2U ⇄ Game contracts — version 1.1 (V2U side)

Snapshot of the contracts V2U Main implements, for comparison with the Game Lab
(`v2u-game-lab`, target commit `6ba7a91b6eb3f79311b02da118e423384f1e1bef` as stated by the
product owner — V2U did not open or modify the Game Lab).

| What | File |
|---|---|
| TypeScript source of truth | `src/learning/games/contracts.ts` |
| GameContent 1.1 JSON Schema | `integration/contracts/gamecontent-1.1.schema.json` |
| GameEvidence 1.1 JSON Schema | `integration/contracts/gameevidence-1.1.schema.json` |
| First real payload | `integration/game-content/prog-ctrl-conditions.gamecontent.json` |
| Export manifest (sha256, registry state) | `integration/game-content/manifest.json` |
| Example evidence (testing only) | `integration/game-evidence/prog-ctrl-conditions.example.gameevidence.json` |

Regenerate the payload with `npm run export:game-content` (never edit it by hand).
`scripts/test-phase-71.js` fails if the committed JSON differs from a fresh export.

Both schemas are JSON Schema draft-07 with `additionalProperties: false` on every object:
unknown fields are rejected. In 1.1 **every field is required**; the only nullable value is
`teaching.predictions[].hints.focus`.

---

## GameContent 1.1 (V2U → game)

Top level:

| Field | Type | Rule |
|---|---|---|
| `contract` | `"v2u.game-content"` | const |
| `version` | `"1.1"` | const |
| `gameId` | string | `^[a-z0-9-]+$`; must be registered in V2U's game registry |
| `lessonId` | string | real V2U curriculum lesson id |
| `subjectId`, `topicId`, `title` | string | from the curriculum |
| `language` | `"th"` | learner-facing explanations are Thai; **code stays Python** |
| `skills` | `{ id, title }[]` (≥1) | `id` matches `^skill-…`; the lesson's own skills |
| `objectives` | string[] (≥1) | the lesson's learning outcomes |
| `prerequisites` | `{ lessonId, title }[]` | from the curriculum |
| `readiness` | enum `READY` \| `READY_WITH_LIMITATIONS` \| `NOT_READY` | the lesson's research readiness |
| `boundary` | `{ allowedKnowledge: string[] (≥1), notYetAllowed: string[] }` | the game must stay inside `allowedKnowledge` and never use `notYetAllowed` |
| `teaching` | object | see below |
| `narration` | object | Thai trace phrases, keys below |
| `missing` | string[] | data the lesson does **not** provide — the game must not invent it |

`teaching`:

| Field | Shape |
|---|---|
| `missionObjective` | string — first learning outcome |
| `whyItMatters` | string |
| `concepts` | `{ id, term, meaning, skillId }[]` |
| `rules` | `{ id, name, statement, skillId }[]` |
| `starterCode` | `{ sourceId, skillId, problem, code, expectedOutput, steps: string[] (≥1) }[]` — the lesson's worked examples, usable as editable starting programs |
| `predictions` | `Prediction[]` (below) |
| `debugging` | `DebugCase[]` (below) |
| `commonMistakes` | `{ mistake, why, fix }[]` |
| `summary` | string[] (≥1) |

**Prediction** (predict-before-Run item):

| Field | Type | Meaning |
|---|---|---|
| `sourceId` | string | V2U practice item id (`g-*` guided, `i-*` independent) |
| `skillId` | string | one of `skills[].id` |
| `level` | 1 \| 2 \| 3 | difficulty |
| `prompt` | string | Thai question |
| `code` | string | Python exactly as in the lesson |
| `expectedOutput` | string | stdout, verified with real python3 in V2U tests |
| `explanation` | string | why — show after the learner answers |
| `hints` | HintLadder | below |

**HintLadder** (progressive hints):

| Level | Field | Content |
|---|---|---|
| 1 — concept | `concept: string` | one lesson rule, `"<name>: <statement>"` |
| 2 — focus | `focus: string \| null` | the item's own hint; `null` when the lesson has none |
| 3 — stronger | `guided: { exampleId, steps: string[] (≥1) }` | how a worked example on the same idea was solved — never this item's answer |

**DebugCase**:

| Field | Meaning |
|---|---|
| `sourceId`, `skillId` | V2U debugging id and skill |
| `brokenCode` | code with the bug (really fails in Python — tested) |
| `symptom` | what Python reports / what goes wrong |
| `fixedCode` | corrected code |
| `expectedOutput` | output of `fixedCode` (expected behaviour) |
| `explanation` | error reason + the concept that fixes it |

`narration` keys (all required, Thai, Python words untranslated):
`conditionTrue`, `conditionFalse`, `skipped`, `elseTaken`, `printed`.

Extra validation (in `validateGameContent`, beyond the schema):

- every `skillId` in predictions / debugging / starter code is one of `skills[].id`;
- predictions need non-empty `code`, `expectedOutput`, `explanation`, `hints.concept` and ≥1 hint-3 step;
- hint 3 may not contain the item's answer (a bare `True`/`False` answer is exempt);
- `sourceId`s are unique across predictions, debugging and starter code.

---

## GameEvidence 1.1 (game → V2U)

| Field | Type | Rule |
|---|---|---|
| `contract` | `"v2u.game-evidence"` | const |
| `version` | `"1.1"` | const |
| `gameId` | string | must be registered for `lessonId` |
| `lessonId` | string | real lesson id |
| `sessionId` | string | non-empty |
| `duration` | number ≥ 0 | seconds |
| `completed` | boolean | |
| `attempts`, `correct`, `hintsUsed`, `retries` | integer ≥ 0 | `correct ≤ attempts` |
| `skillEvidence` | `{ skillId, attempts, correct, hintsUsed }[]` | integers ≥ 0, `correct ≤ attempts`, `skillId` must belong to the lesson |

**Forbidden** anywhere in the evidence (rejected): `mastery`, `masteryScore`, `skillStatus`,
`status`, `review`, `reviewSchedule`, `nextReview`, `nextStep`, `diagnostic`,
`diagnosticResult`, `score`. V2U alone decides these.

### How V2U uses evidence (1.1)

`interpretGameEvidence()` (`src/learning/games/evidenceAdapter.ts`) is a pure, read-only
function. It returns `accepted`, `problems`, a per-skill practice summary and
`effects: { mastery: false, skillStatus: false, review: false, nextStep: false, diagnostic: false }`
with `learningEffectsActive: false`. **No V2U state is changed in 1.1.** Learning effects are
switched on only after the revised game passes a real integration test.

## Registry state

`pixel-code-battle` → `prog-ctrl-conditions`: **PREPARING** (not playable by learners).
Every other lesson: **NOT_AVAILABLE**.

Slot states V2U understands: `NOT_AVAILABLE`, `PREPARING`, `AVAILABLE`, `LOADING`,
`PLAYING`, `COMPLETED`, `ERROR`.
