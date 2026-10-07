# Per-Lesson Learning Gap Map

Status: **DESIGN ONLY** (2026-10-07, base `eae44a7`). Source of each "current" cell: the live studio script,
widgets and steps in the repository (read from code, not from earlier reports). Target cells summarise
`per-lesson-learning-mechanics.md`.

Complexity: **S** = adjust an existing widget · **M** = new widget on existing data · **L** = new mechanic + new verified data (e.g. new python3 traces).

## Current lessons (20)

| Lesson | Current experience | Target experience | Keep | Change | Missing | Status | Priority | Complexity | Game? |
|---|---|---|---|---|---|---|---|---|---|
| math-alg-linear-eq | Balance widget on one equation (4 buttons), then typed/choice/order steps | Balance is the workspace for the whole lesson: drag weights/x-tiles off both pans, unpack brackets, "substitute back" check | Balance + tilt feedback; authored steps | Typed steps become balance actions; equation line written live | x on both sides, brackets, fractions on the balance; check-by-substitution action | KEEP_BUT_IMPROVE | P1 | M | OPTIONAL_GAME |
| math-alg-linear-system | Pair-check steppers, missing-step, 5 self-rated reveal steps | Truth-lights table → substitution machine (drag `x = y + 2` over every x) → story-to-table translator | Pair-check truth lights | Self-rated steps → checked attempts | **Any mechanic for the word-problem skill**; substitution as visible replacement | REDESIGN | **P0** | L | NO_GAME_NEEDED |
| math-alg-linear-ineq | Predict → multiply-by-c number line (good), missing-step, self-rated steps | Same + test-point probe and solution-set shading with open/closed endpoints | Number-line prediction | Self-rated steps → probe tests | Solution set / interval notation as something drawn | KEEP_BUT_IMPROVE | P1 | M | NO_GAME_NEEDED |
| math-alg-exponents | Countable factor blocks (×, ÷), order-steps, self-rated steps | Blocks + halving staircase (2³→2⁰→2⁻¹) + equal-group roots | Factor blocks | Self-rated steps → staircase predictions | Zero / negative / fractional exponents as visible pattern | KEEP_BUT_IMPROVE | P1 | M | NO_GAME_NEEDED |
| math-fn-linear | Fit-the-line m/c sliders with slope triangle (good), missing-step | Same + context graph (fare = 8x + 35) with draggable x probe | Line-graph widget | — | Graph-reading in context (2nd skill) | KEEP_BUT_IMPROVE | P2 | S | OPTIONAL_GAME |
| math-trig-ratios | Label sides of a fixed triangle (θ always bottom-left), missing-step | Movable θ + stretchable triangle with constant ratio | Side labelling | θ position no longer fixed | Test of the #1 mistake (labels from position); ratio invariance | KEEP_BUT_IMPROVE | P1 | M | NO_GAME_NEEDED |
| prog-py-variables | Real python3 memory trace, debug case, practice | Same + predict type/value before each key line + what-if operator swap | Memory trace | — | Type prediction; what-if (needs extra traces) | KEEP_BUT_IMPROVE | P2 | S | NO_GAME_NEEDED |
| prog-py-io | python3 io trace with fixed input | Simulated console where the learner IS the user (types/chooses input; str → TypeError → fix with int()) | io trace data | Fixed input → learner-provided input | Learner input step; pre-traced input sets | KEEP_BUT_IMPROVE | **P0** | L | NO_GAME_NEEDED |
| prog-ctrl-conditions | Run with values, condition chain state panel, robot doors, debug by reordering | Same + editable threshold (pre-verified set) | Everything | — | Editable condition constant | GOOD_AS_IS | P2 | S | GAME_HIGH_VALUE (Pixel Code Battle — acceptance pending) |
| prog-ctrl-loops | Loop trace with i/total per round; buggy-trace | Iteration ledger + what-if range end + move accumulator in/out | Loop trace | — | What-if bounds; manual accumulator move; while-stop row | KEEP_BUT_IMPROVE | P1 | M | OPTIONAL_GAME |
| prog-fn-functions | Call trace + dict trace | Return value flies back into the call site; print vs return side-by-side; index ruler on lists | Call/dict traces | — | Return-vs-print contrast at the call site (#1 mistake) | KEEP_BUT_IMPROVE | P1 | M | NO_GAME_NEEDED |
| phy-vec-units | Predict bigger/smaller, then click "next step" through pre-written conversion | Unit-cancellation tiles the learner places and flips; units strike out; wrong flip leaves km²/m | Prediction question | Passive reveal → learner builds the factor chain | The learner choosing factor orientation (×/÷ 3.6 mistake) | REDESIGN | **P0** | M | NO_GAME_NEEDED |
| phy-vec-vectors | Type Fₓ first; explorer unlocks after | Walk-with-arrows (head-to-tail, path vs displacement) + explore-before-guess components | Explorer drawing | Unlock order: explore first | Head-to-tail sum; distance vs displacement | KEEP_BUT_IMPROVE | P1 | M | NO_GAME_NEEDED |
| phy-kin-1d | Type v first; then u/a/t sliders with v–t graph (no moving object) | Track with a car leaving one footprint per second + live v–t graph + variable-card equation chooser | v–t graph math | Gate removed; motion added | **Visible motion over time**; braking; equation choice by known variables | REDESIGN | **P0** | L | NO_GAME_NEEDED |
| phy-dyn-newton | Fair-test cart lab (predict, vary one, measure table) — reference quality; FBD is an illustration only | Cart lab + free-body builder (drag forces onto a box, decoy force, resultant moves box) | Cart lab | — | Learner-built free-body diagram (skill-phy-free-body) | KEEP_BUT_IMPROVE | P1 | M | OPTIONAL_GAME |
| web-html-elements | Place blocks → page; anatomy; own page | Same | Everything | — | — (awaiting user playtest) | GOOD_AS_IS | P2 | — | NO_GAME_NEEDED |
| web-html-text | Heading blocks; unclosed-tag fix; nesting fix; own section | Same + live heading outline (h1 > h2 > h3) | Everything | — | Hierarchy made visible (outline) | KEEP_BUT_IMPROVE | P2 | S | OPTIONAL_GAME |
| web-html-links-images | Attribute knobs (src/alt/href), broken-image alt, link destination | Same | Everything | — | — (awaiting user playtest) | GOOD_AS_IS | P2 | — | NO_GAME_NEEDED |
| web-html-page-structure | Region mapping (code ↔ page), skeleton wrap, arrange | Same with editor/map as a toggle on phones; drag a line into a page region | Region mapping | Long double view at 390 px; typing-heavy skeleton step | Drag-into-region alternative | KEEP_BUT_IMPROVE | P2 | S | NO_GAME_NEEDED |
| web-html-project | Requirement-checked free build | Same | Everything | — | — (awaiting user playtest) | GOOD_AS_IS | P2 | — | NO_GAME_NEEDED |

### Counts (current)
- GOOD_AS_IS **4**: prog-ctrl-conditions, web-html-elements, web-html-links-images, web-html-project
- KEEP_BUT_IMPROVE **13**: math-alg-linear-eq, math-alg-linear-ineq, math-alg-exponents, math-fn-linear, math-trig-ratios, prog-py-variables, prog-py-io, prog-ctrl-loops, prog-fn-functions, phy-vec-vectors, phy-dyn-newton, web-html-text, web-html-page-structure
- REDESIGN **3**: math-alg-linear-system, phy-vec-units, phy-kin-1d
- MISSING **0** among current lessons

### Cross-cutting gap (12 generated lessons)
Generated math/physics lessons end with 4–6 `self` steps (worked steps revealed, learner self-rates).
They create *reading*, not *evidence*. Verified answers already exist in the knowledge layer, so the fix is to
replace them with checked attempts inside each lesson's own mechanic. Complexity per lesson: S–M.
Affected: all math lessons except math-alg-linear-eq, and phy-vec-units, phy-vec-vectors, phy-kin-1d.

## Proposed lessons (22) — PROPOSED / NOT ACTIVE

All **MISSING by design** (not approved for build). Target experience per lesson is in the blueprint Part B.

| Track | Lessons | Target mechanic families | Game |
|---|---|---|---|
| CSS | web-css-rules, web-css-color-text, web-css-box-model, web-css-flex, web-css-responsive | Selector Spotlight · Readability Meter · Box Layers · Layout Garden · Width Scrubber | box-model OPTIONAL · flex HIGH |
| JavaScript | web-js-events, web-js-state, web-js-dom, web-js-conditions, web-js-project | Event Trace · Live State · Selector Spotlight + Class Switch · Decision Path · Replayable Test Cases | conditions OPTIONAL |
| SQL | db-sql-tables, db-sql-select, db-sql-where, db-sql-order-limit, db-sql-aggregate, db-sql-challenge | Table Explorer · Query→Result · Row-by-row Filter · Sort & Cut · Collapse to One · Data Detective | where/aggregate OPTIONAL · challenge HIGH |
| Networking | net-devices, net-ip, net-subnet, net-gateway, net-dns, net-troubleshoot | Wire & Send · Addressed Envelope · Neighbourhoods · Hop Decisions · Lookup Relay · Network Rescue | gateway OPTIONAL · troubleshoot HIGH |

## Implementation sequence (by educational impact, not by subject)

Each step is one reviewable change; nothing here is started. Order inside a tier = expected impact on understanding.

**P0 — current design lets a core idea stay invisible or memorised**
1. **phy-kin-1d — Motion Over Time.** No object ever moves; kinematics is taught as three formulas. Track + footprints + live v–t graph + variable-card equation chooser. (L)
2. **phy-vec-units — Cancellation Tiles.** The learner never chooses factor orientation, which *is* the ×3.6 vs ÷3.6 mistake. (M)
3. **math-alg-linear-system — word problems + substitution.** One of two skills (word-problem) has no mechanic; ends in self-rated reading. (L)
4. **prog-py-io — Be-the-User console.** "input() gives a str" is the lesson, but the learner never provides input. Needs new python3 traces for the offered inputs. (L)
5. **Cross-cutting:** replace self-rated `self` steps with checked attempts in the 12 generated lessons, using already-verified answers. (S–M each; do alongside the lesson's other work)

**P1 — good interaction exists; a key misconception or second skill is untouched**
6. math-trig-ratios — movable θ + stretchable triangle (tests the #1 mistake). (M)
7. prog-fn-functions — return value flies back into the call site; print vs return contrast. (M)
8. phy-dyn-newton — free-body builder for skill-phy-free-body. (M)
9. math-alg-linear-eq — balance as the whole-lesson workspace. (M)
10. phy-vec-vectors — explore-before-guess; head-to-tail walk; distance vs displacement. (M)
11. math-alg-exponents — halving staircase for zero/negative exponents. (M)
12. math-alg-linear-ineq — probe point + drawn solution set. (M)
13. prog-ctrl-loops — what-if range bounds; accumulator move. (M)

**P2 — polish; the experience already teaches**
14. math-fn-linear — context graph probe. (S)
15. prog-py-variables — type prediction + what-if operator. (S)
16. prog-ctrl-conditions — editable threshold. (S)
17. web-html-text — live heading outline. (S)
18. web-html-page-structure — code/structure toggle on phones; drag-into-region. (S)
19. web-html-elements, web-html-links-images, web-html-project — only changes that come out of the **user playtest** (no acceptance granted yet).

**Not in sequence:** proposed CSS / JavaScript / SQL / Networking lessons (not approved for build); games (see `game-learning-handoff.md`; Pixel Code Battle acceptance pending).
