# Learning Interaction Matrix — all current lessons

Status: **audit complete** (2026-10-06). Derived from the repository, not from earlier reports:
`src/curriculum/data.ts` (lessons, skills), `src/content/knowledge/*` (concepts, mistakes, practice levels),
`src/interactive/studio/depth.ts` + `scripts.ts` (teaching widgets per lesson), `src/interactive/registry.ts`
(authored vs generated steps), `src/learning/games/registry.ts` (game slots).

No curriculum was invented. Nothing below adds a lesson, skill, practice item or answer.

## 1. What the curriculum actually contains

| Subject | Lessons | In curriculum? |
|---|---|---|
| Math | 6 | yes |
| Programming (Python) | 5 | yes |
| Physics | 4 | yes |
| HTML · CSS · JavaScript · SQL · Networking | 0 | **no** — design/spec only (section 5) |

`CurriculumSubjectId` is `'math' | 'programming' | 'physics'`. English and Reasoning exist only as `proposed`
registry entries (see `docs/subject-expansion-audit.md`).

## 2. Shared loop and scaffold levels (how the existing studio maps to the brief)

The Teaching Studio (`TeachingStudio.tsx`) already runs every lesson as
**hook → show (widget) → why (rules) → try (steps) → practice (guided → independent) → mistakes → summary → existing check**.

| Level | Brief | Existing mechanism |
|---|---|---|
| L1 observe / small piece | drag, choose | studio widget (balance, cart-lab, robot-run, graph, trace…) |
| L2 modify one parameter | slider / value | widget controls (m/c, F/m, u/a/t, magnitude/angle, robot value) |
| L3 complete part | fill missing piece | `missing-step`, `order-steps`, `code` blank, `order` steps |
| L4 reduced support | hints on demand | knowledge `guided` items (levels 1–2) with hint + targeted wrong-answer feedback |
| L5 independent | no scaffold | knowledge `independent` items, level 3 |

Every lesson has guided levels 1–2 and independent levels 1→3 (6 items). Evidence boundary: widgets and practice
report only *done / attempts / correct / hints*; mastery, review and Next Step stay in the Learning Core (unchanged).

## 3. Per-lesson matrix

Legend — **Optional game**: *no* = core interaction already shows the idea; a game would only repeat it.

### Math

**math-alg-linear-eq** · สมการเชิงเส้นตัวแปรเดียว · skills `skill-math-solve-linear`, `skill-math-check-solution` · authored
- Concept: solve ax + b = c with the equality property; check by substitution.
- Hard/abstract: "do the same to both sides"; order of operations when undoing; sign errors when "moving terms".
- Representation: balance scale (`balance` widget) + symbolic line written as the learner acts.
- Interaction: pick an operation (both sides / one side only); scale tilts if one side only.
- Learner action → feedback: tap "ลบ 3 ทั้งสองฝั่ง" → scale stays level, equation line appears; one side only → scale tilts + why.
- Scaffold: L1 balance → L3 order-brackets → L4 guided i-1..3 → L5.
- Independent: i-5 `x/2 − (x − 1)/3 = 2`, i-6 `(x + 2)/4 = (x − 1)/3` and check.
- Optional game: no. Codex hook: none.

**math-alg-linear-system** · ระบบสมการเชิงเส้นสองตัวแปร · `skill-math-linear-system`, `skill-math-word-problem` · generated
- Hard: an answer must make *both* equations true; substituting into every term.
- Representation: (x, y) pair checker — each equation shows true/false live (`pair-check`). Graphing deliberately not used (not in lesson).
- Action → feedback: step x, y → each equation re-evaluates with ✓/✗.
- Scaffold: L1 pair-check → L3 missing-step (we-1, step 2) → L4 → L5.
- Independent: i-5 `2x + 3y = 12, 3x + 2y = 13`; i-6 sum 50 / difference 14.
- Optional game: no.

**math-alg-linear-ineq** · อสมการเชิงเส้น · `skill-math-solve-inequality` · generated
- Hard: why multiplying by a negative flips the sign; open vs closed interval brackets.
- Representation: number line, multiply a < b by c (`number-line`) — predict, observe order swap.
- Scaffold: L1 predict/observe → L3 missing-step → L4 → L5.
- Independent: i-5 `(x + 1)/2 > x − 3`; i-6 `3(2 − x) ≥ 2x − 9`.
- Optional game: no.

**math-alg-exponents** · เลขยกกำลังและราก · `skill-math-exponent-laws` · generated
- Hard: same base multiply → add exponents; meaning of a⁰ and a⁻ⁿ.
- Representation: factors as countable blocks (`exponent-blocks`), change m, n.
- Scaffold: L1 blocks → L3 order-steps (we-1) → L4 → L5.
- Independent: i-5 `8^(−2/3)`; i-6 `(x³)² · x⁻⁴`.
- Optional game: no.

**math-fn-linear** · ฟังก์ชันเชิงเส้นและกราฟ · `skill-math-slope`, `skill-math-graph-reading` · generated
- Hard: meaning of m and c; slope from two points (order of subtraction).
- Representation: graph explorer — move m and c, equation and line update together until the line passes (1,3),(4,9) (`line-graph`).
- Scaffold: L2 parameter change → L3 missing-step → L4 → L5.
- Independent: i-5 line through (−2, 1) with slope 1/2; i-6 tank 50 L draining 2 L/min.
- Optional game: no.

**math-trig-ratios** · อัตราส่วนตรีโกณมิติ · `skill-math-trig-ratio`, `skill-math-special-angles` · generated
- Hard: opposite/adjacent depend on the chosen angle; choosing sin/cos/tan from known sides.
- Representation: label the sides of a 3-4-5 triangle for θ (`triangle-sides`).
- Scaffold: L1 labelling → L3 missing-step (we-2) → L4 → L5.
- Independent: i-5 opposite 9, adjacent 9√3 → θ; i-6 45°, adjacent 5 → hypotenuse.
- Optional game: no.

### Programming (Python)

**prog-py-variables** · ตัวแปร ชนิดข้อมูล และนิพจน์ · `skill-prog-variables`, `skill-prog-operators` · generated
- Hard: `/` gives float, `//` int; `+` between str and int.
- Representation: real python3 trace with memory panel (`code-trace`, mode memory, `var-we-1`).
- Action → feedback: predict output, then step line by line; variables and output appear per line.
- Scaffold: L1 trace → L3 debug case → L4 → L5.
- Independent: i-5, i-6 "โค้ดนี้แสดงอะไร" (verified by python3).
- Optional game: possible (predict-output). Codex hook: GameContent 1.1 from this lesson's predictions/debugging — **not registered**; needs owner approval.

**prog-py-io** · รับค่าและแสดงผล · `skill-prog-io` · generated
- Hard: `input()` always returns str; f-string.
- Representation: io trace — prompt shown, waits, stores a string (`code-trace`, mode io).
- Independent: i-5 user types 7 → output; i-6.
- Optional game: possible; same note as above.

**prog-ctrl-conditions** · เงื่อนไข if / elif / else · `skill-prog-conditions` · authored · **reference lesson**
- Hard: first true condition wins (order of if/elif); `=` vs `==`.
- Representation: code → evaluation → robot walks to the door the branch prints (`robot-run`), then `robot-debug` (reorder wrong branches).
- **This change:** a state panel under the code now shows *memory* (`score = 95`) and the current line's chain
  `score >= 80 → 95 >= 80 → True ✓ ทำทางนี้` (or `False ✗ ข้ามทางนี้`) — the brief's variable → comparison → branch → output sequence, with text marks (not colour only).
- Scaffold: L1 run with 3 values → L3 `code` blank + order-branches → L4 debug → L5.
- Independent: i-5, i-6 (leap year 2024).
- Optional game: **yes — Pixel Code Battle (registered, PREPARING)**. Codex owns the game; V2U already exports GameContent 1.1.

**prog-ctrl-loops** · การวนซ้ำ for / while · `skill-prog-loops`, `skill-prog-trace` · generated
- Hard: `range` excludes the end; where the accumulator is initialised.
- Representation: loop trace with i/total each iteration; second trace of the buggy version (`loop-d-1`).
- Independent: i-5, i-6 (python3-verified).
- Optional game: possible (trace/predict). Hook needs approval.

**prog-fn-functions** · ฟังก์ชัน list และ dict · `skill-prog-functions`, `skill-prog-collections` · generated
- Hard: `return` vs `print`; collections changing state.
- Representation: call trace (jump into function, params, return value) + dict memory trace.
- Independent: i-5, i-6.
- Optional game: possible. Hook needs approval.

### Physics

**phy-vec-units** · หน่วย SI และการแปลงหน่วย · `skill-phy-units` · generated
- Hard: multiply or divide by 3.6; units cancelling.
- Representation: predict bigger/smaller, then convert factor by factor (`unit-ladder`, 72 km/h).
- Independent: i-5 1.2 km/min → m/s; i-6 900 m/min → km/h.
- Optional game: no.

**phy-vec-vectors** · เวกเตอร์และการรวมเวกเตอร์ · `skill-phy-vector-components` · generated
- Hard: components via cos/sin; perpendicular vectors don't add by magnitude.
- Representation: arrow with live x/y components; change magnitude and angle (`vector-explorer`).
- Independent: i-5 4 and 3 units → magnitude, tan θ; i-6 100 N at 60°.
- Optional game: no.

**phy-kin-1d** · การเคลื่อนที่แนวตรงด้วยความเร่งคงตัว · `skill-phy-kinematics-equations`, `skill-math-graph-reading` · generated
- Hard: choosing the equation from known variables; v–t slope/area; negative a when braking.
- Representation: motion + v–t graph from u, a, t (`motion-explorer`), predict v first.
- Independent: i-5 v–t (0,0)→(4,8); i-6 from rest, a = 2, s = 64 → t.
- Optional game: no. Limitation (already recorded): "area = displacement" verified by calculation only.

**phy-dyn-newton** · กฎการเคลื่อนที่ของนิวตัน · `skill-phy-free-body`, `skill-phy-newton-second` · authored · **reference lesson**
- Hard: net force (not any single force); a inversely proportional to m.
- Representation: cart lab — **predict → change F (or m) → run → watch → measurement table → answer from table** (`cart-lab`, two experiments). Unfair test (changing both) is flagged.
- Scaffold: L1 predict → L2 parameter → L3 calc steps → L4 friction step → L5.
- Independent: i-5 4 kg, μ = 0.25, 20 N; i-6 1,200 kg at 2.5 m/s².
- Optional game: no.

## 4. Subject approaches (what is implemented)

| Subject | Approach | Status |
|---|---|---|
| Python | code → real python3 trace → memory/output; conditions: code → evaluation chain → robot branch → output | implemented (Phases 64/69); **state panel added in this change** |
| Math | manipulable representation per lesson (balance, pair checker, number line, blocks, graph, triangle) | implemented for all 6 lessons; no gap found that justifies new work |
| Physics | predict → change parameter → run → measure (cart, unit ladder, vector, motion/v–t) | implemented for all 4 lessons; no gap found |
| HTML / CSS / JS / SQL / Networking | — | **not in curriculum → spec only** (section 5) |

## 5. Spec for subjects not yet in the curriculum (architecture only)

These are designs, not lessons. Building any of them first requires an approved curriculum entry
(lesson + skills + verified sources in the knowledge layer — `docs/subject-expansion-audit.md` §4).

**How a lab plugs in (all subjects):** add a `StudioWidget` kind in `src/interactive/studio/types.ts` whose props
point at knowledge ids (never inline lesson text); render it in `TeachingStudio.tsx`; report only `onDone` /
attempts / hints. Content lives once, in `src/content/knowledge/<subject>.ts`.

| Lab | Representation | Learner flow (scaffold L1→L5) | Sandbox / evaluation |
|---|---|---|---|
| **HTML Live Web Builder** | left: blocks/code · right: live page | drag `<h1>` → see heading → edit text → add missing `</h1>` (unpaired tag highlighted, "ส่วนไหนยังไม่ได้ปิด?") → reorder → raw HTML → own "หน้าแนะนำตัว" | `<iframe sandbox srcdoc>` with **no** `allow-scripts`; check structure via `DOMParser` (counts of h1/p/img/a|button), never pixel diffs |
| **CSS Style Lab** | page + control `color: [red]` ↔ real rule | control → rule revealed → edit rule → selector/property/value highlighted on target → profile-card task by constraints | same sandboxed iframe; evaluate computed styles of required selectors |
| **JS Event Playground** | button + code; trace USER CLICK → event → line → state → DOM | click first, then read handler, then change it | `sandbox="allow-scripts"` without `allow-same-origin`, `postMessage` trace; no `eval` in V2U origin |
| **SQL Data Query Lab** | small table → query → result set (filtered rows fade) | run `SELECT *` → add `WHERE score > 80` → write own | in-browser engine (e.g. sql.js) = **new dependency → needs approval**; read-only seeded DB per run |
| **Networking Packet Visualizer** | PC → Switch → Router → Server | change IP/subnet/gateway/DNS → SEND PACKET → packet stops at exact failure hop with reason | pure TS simulator (no network access); deterministic per-hop checks |

Mobile: code + preview stack vertically below 768 px with a preview toggle so the on-screen keyboard leaves the editor usable.

## 6. Game handoffs (Codex)

| Lesson | Status | Note |
|---|---|---|
| prog-ctrl-conditions | registered, `PREPARING` (Pixel Code Battle) | GameContent 1.1 export exists (`npm run export:game-content`) |
| prog-py-variables, prog-py-io, prog-ctrl-loops, prog-fn-functions | candidates | have python3-verified predictions + debugging cases → fit GameContent 1.1 without contract change; **registering is an owner decision** |
| Math / Physics lessons | not suitable now | GameContent 1.1 is Python-shaped (`code`, `expectedOutput`); a non-code payload would need contract 1.2 → **decision required, not applied** |

## 7. Boundaries respected

No Game Lab changes, no Pixel Code Battle work, no schema/database change, no change to mastery, review,
diagnostic or Next Step, no deploy, no push.
