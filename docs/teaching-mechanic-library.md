# Teaching Mechanic Library

Status: **DESIGN ONLY** (2026-10-07). These families were **derived after** designing each lesson in
`per-lesson-learning-mechanics.md` — they are not categories the lessons were forced into. A family exists
only where two or more lessons turned out to need the same underlying action; single-lesson mechanics are
listed at the end.

Each mechanic produces only: attempts · solved · hints · reveals · responses (predictions/choices) · time ·
per-skill evidence. None of them decides mastery, review, Diagnostic level or Next Step.

Common baseline for every family:
- **Keyboard:** every drag has a button/arrow-key equivalent; every control reachable by Tab with a visible focus ring.
- **Touch:** targets ≥ 44 px; tap-to-place is always offered alongside drag.
- **Non-colour:** ✓/✗ and words ("จริง/เท็จ", "ยังไม่มีคู่", "เอียง") accompany every colour state.
- **Reduced motion:** results appear instantly; nothing important exists only as animation.
- **Text equivalent:** the current state can be read as text (aria-live where it changes).

---

## 1. Invariant Manipulative
**What:** a physical model whose invariant *is* the rule. The learner acts on the model and the model shows whether the invariant still holds.
**Lessons:** math-alg-linear-eq (balance), math-alg-linear-system (balance for the reduced equation).
**Works when:** the rule is "keep X equal / unchanged" and every legal step has a physical meaning.
**Does not work when:** steps have no physical analogue (e.g. negative quantities beyond simple cases need care — show as "balloons" or switch to symbols).
**A11y:** the invariant state ("สมดุล/เอียง") is text; tilt has no meaning by colour alone.
**Mobile:** 390 model full width, actions as a bottom bar · 768 model + symbolic line side by side · 1440 + step history column.
**Evidence:** actions that broke the invariant (responses), attempts/solved per item, hints, reveals.

## 2. Truth Lights (candidate vs rule)
**What:** the learner proposes a candidate value; each rule shows, live, the rule with values substituted and *true/false*.
**Lessons:** math-alg-linear-system (x, y vs two equations), math-alg-linear-ineq (probe point), prog-ctrl-conditions (`score >= 80 → 72 >= 80 → False`), *proposed* web-js-conditions, db-sql-where (row by row).
**Works when:** the concept is "which values satisfy which conditions" and evaluation is cheap to show.
**Does not work when:** evaluation is long (many steps) — then use a Trace (family 6).
**Why the same family across subjects (deliberate):** "substitute the value, then decide" is the same thinking in algebra, Python, JS and SQL; reusing it lets learners transfer.
**A11y:** each rule is a list item with "จริง/เท็จ" text; substituted expression is readable.
**Mobile:** rules stacked vertically at 390; side panel at 1440.
**Evidence:** candidates tried (responses), solved when all rules true, hints.

## 3. Predict → Run → Compare
**What:** the learner commits to a prediction (pin, choice, number) **before** the result; the result is shown next to the prediction.
**Lessons:** math-alg-linear-ineq (sign flip), math-alg-exponents (staircase), phy-vec-units (bigger/smaller), phy-kin-1d (footprint pin), phy-dyn-newton (cart), prog-py-variables (type), prog-ctrl-loops (round count), prog-fn-functions (value in the call slot), prog-py-io (output for typed input).
**Works when:** the outcome is surprising or commonly mispredicted — the gap between prediction and result is the lesson.
**Does not work when:** the learner has no basis to predict (first contact) — then show first, predict on the next item.
**Rule:** never punish a wrong prediction; show "you predicted / it happened" side by side and ask why.
**A11y:** prediction controls are native inputs; the comparison is stated in text.
**Mobile:** prediction control above the result area; result scrolls into view.
**Evidence:** prediction correctness (responses) separately from final solved — a lesson can be solved after a wrong prediction (that is learning).

## 4. Live Parameter ↔ Shape
**What:** sliders/handles change a parameter; a shape (line, triangle, arrow, graph, layout) and its formula update together.
**Lessons:** math-fn-linear (m, c), math-trig-ratios (stretch triangle, move θ), phy-vec-vectors (magnitude/angle → components), phy-kin-1d (u, a → v–t graph), *proposed* web-css-box-model, web-css-flex, web-css-responsive (width scrubber).
**Works when:** the concept is a relationship between a number and a form.
**Does not work when:** too many parameters at once — introduce one control at a time.
**A11y:** `<input type=range>` with labels and units; the formula line is the text equivalent.
**Mobile:** controls above the shape at 390; beside it from 768.
**Evidence:** target reached (solved), attempts, hints; optional "explored without target" time.

## 5. Countable Model
**What:** an abstract operation becomes objects you can count, group or cancel.
**Lessons:** math-alg-exponents (factor blocks, equal groups for roots), *proposed* db-sql-aggregate (rows collapsing into one value), db-sql-tables (rows/columns as units).
**Works when:** the rule is a counting fact in disguise.
**Does not work when:** numbers get large — switch to symbols once the pattern is seen.
**A11y:** "2 คูณกัน 5 ตัว" text for each group.
**Evidence:** answers after counting, responses.

## 6. Live Memory Trace
**What:** code runs line by line (real python3 traces, never in-browser execution); variables, types, rounds and return values are visible state.
**Lessons:** prog-py-variables (memory + types), prog-ctrl-loops (iteration ledger), prog-fn-functions (return value flies back to the call site), prog-py-io (with family 7), *proposed* web-js-state.
**Works when:** the concept is "what the computer holds and when it changes".
**Does not work when:** the program is long — keep traces under ~12 steps; ask for predictions at key lines only.
**Constraint:** every value/what-if shown must exist as a trace generated by python3 in the test suite.
**A11y:** state as a text table; step button keyboard-operable; no auto-play under reduced motion.
**Mobile:** code above, state below and sticky while stepping at 390.
**Evidence:** predictions at key lines (responses), debug cases opened, practice solved.

## 7. Be-the-User
**What:** the learner plays the program's user (types input, clicks the button) and watches the program react.
**Lessons:** prog-py-io (simulated console), *proposed* web-js-events (click first, read code second).
**Works when:** the concept is about interaction timing ("the program waits", "the event fires").
**Does not work when:** the input space is unbounded and cannot be pre-verified — offer a chosen set of inputs.
**A11y:** input field labelled "โปรแกรมรอให้คุณพิมพ์"; waiting state announced.
**Mobile:** the input scrolls into view and is not hidden by the on-screen keyboard.
**Evidence:** inputs tried, predictions of output, solved fixes.

## 8. Break → Observe → Repair
**What:** the learner meets a broken artefact whose failure is *visible* (tilt, swallowed paragraph, wrong door, TypeError at a line, packet stopping), finds the cause and repairs it.
**Lessons:** web-html-text (unclosed tag), prog-ctrl-conditions (wrong branch order), prog-ctrl-loops (accumulator inside loop), prog-fn-functions (print instead of return → None), prog-py-io (str + int), phy-dyn-newton (decoy force), *proposed* web-js-events/dom, net-troubleshoot.
**Works when:** the common mistake produces a distinctive, observable symptom.
**Does not work when:** the symptom is silent — then it must first be made visible (that is the design work).
**Rule:** the message names the structure ("`<h1>` เปิดอยู่แต่ยังไม่มี `</h1>`"), never just "ผิด".
**Evidence:** cause located (response), repair solved, hints.

## 9. Code → Live Result
**What:** an editor (blocks first, then text) and a live result that redraws on every change; results come from a safe allowlisted renderer.
**Lessons:** web-html-elements, web-html-text, web-html-links-images, web-html-page-structure, web-html-project, *proposed* all CSS and JavaScript lessons.
**Works when:** the output of code is visual and immediate.
**Does not work when:** output is not visual (use family 6) or execution is unsafe in the browser.
**A11y:** keyboard alternative to drag; preview readable as a text outline.
**Mobile:** stacked at 390 (code above, page below; consider a code/structure toggle to avoid long double views), side by side from 768.
**Evidence:** requirement checks per step, attempts, hints, reveals (reveal ≠ solved).

## 10. Structure ↔ Region Mapping
**What:** selecting a part of a description (tag, selector, row/column) highlights the matching part of the result, and the reverse.
**Lessons:** web-html-page-structure, web-html-text (tag pairs), *proposed* web-css-rules / web-js-dom (selector spotlight), db-sql-tables, db-sql-select.
**Works when:** the hard part is "which bit of the description controls which bit of the result".
**A11y:** both directions available by keyboard; selection announced in text.
**Evidence:** correct mappings, attempts.

## 11. Annotate the Figure
**What:** the learner places labels or arrows onto a figure; the figure reacts to what was placed.
**Lessons:** math-trig-ratios (opposite/adjacent/hypotenuse relative to θ), phy-dyn-newton (free-body builder: placed forces move the box), phy-vec-vectors (head-to-tail arrows).
**Works when:** the concept is relative to a reference (an angle, an object) and placing is the act of reasoning.
**Does not work when:** labels are purely memorised names with no reaction.
**A11y:** "add label/force … at … direction" buttons; placed items listed as text.
**Evidence:** placements correct/incorrect (responses), decoys chosen, solved.

## 12. Motion Over Time
**What:** an object moves while time is marked (footprints every second) and a graph draws in sync.
**Lessons:** phy-kin-1d; phy-dyn-newton cart reuses the track.
**Works when:** the concept is about change over time.
**A11y:** a time table (t, position, v) is the text equivalent; reduced motion shows all footprints at once.
**Mobile:** horizontal track full width at 390, graph below.
**Evidence:** predicted pin vs actual (responses), solved targets.

## 13. Cancellation Tiles
**What:** tiles carrying units (or factors) are placed and flipped; matching labels cancel visibly.
**Lessons:** phy-vec-units. (Candidate later: chemistry/stoichiometry if ever approved.)
**Why its own family:** the learner's decision is *orientation*, which no other family captures.
**A11y:** "วาง/พลิก" buttons; "km ตัดกันแล้ว" text.
**Evidence:** wrong flips (responses), solved conversions.

## 14. Story → Model Translator
**What:** quantities from a story are dragged into a table whose rows become equations/queries.
**Lessons:** math-alg-linear-system (word problems), *proposed* db-sql-challenge (question → clauses).
**Works when:** the hard part is translation, not calculation.
**A11y:** table cells as form fields; story quantities as selectable buttons.
**Evidence:** correct placements, built model correct, solved.

## 15. Requirement-Checked Creative Build
**What:** an open task with a live checklist that ticks itself on structure, never on visual sameness.
**Lessons:** web-html-project, *proposed* web-js-project, web-css-responsive, db-sql-challenge.
**Works when:** many correct answers exist.
**Rule:** requirements describe structure/behaviour; text, images and order belong to the learner.
**Evidence:** requirements met per item (partial progress, not a single score), checks run.

## 16. Path Tracer
**What:** something travels a path (packet, decision, event) and stops exactly where it fails, with the reason.
**Lessons:** prog-ctrl-conditions (robot path through branches), *proposed* web-js-events (event trace), net-devices … net-troubleshoot.
**Works when:** failure location is the key diagnostic information.
**A11y:** hop/step log as text; animation skippable.
**Evidence:** stop point predicted (response), cause identified, fixes.

---

## Single-lesson mechanics (no family yet)
- **Halving staircase** (math-alg-exponents) — part of family 3/5; kept separate in design because the pattern is unique to exponents.
- **Readability meter** (proposed web-css-color-text).
- **Sort & Cut** (proposed db-sql-order-limit).

## Lesson → family index (current lessons)
| Lesson | Families |
|---|---|
| math-alg-linear-eq | 1, 3 |
| math-alg-linear-system | 2, 1, 14 |
| math-alg-linear-ineq | 3, 2 |
| math-alg-exponents | 5, 3 |
| math-fn-linear | 4 |
| math-trig-ratios | 11, 4 |
| prog-py-variables | 6, 3 |
| prog-py-io | 7, 6, 8 |
| prog-ctrl-conditions | 2, 16, 8 |
| prog-ctrl-loops | 6, 3, 8 |
| prog-fn-functions | 6, 8 |
| phy-vec-units | 13, 3 |
| phy-vec-vectors | 11, 4 |
| phy-kin-1d | 12, 3, 4 |
| phy-dyn-newton | 3, 11, 8 |
| web-html-elements | 9 |
| web-html-text | 9, 10, 8 |
| web-html-links-images | 9 |
| web-html-page-structure | 10, 9 |
| web-html-project | 15, 9 |
