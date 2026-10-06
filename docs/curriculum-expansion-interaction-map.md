# Curriculum Expansion V1 — Interaction Map

Status: **DESIGN ONLY.** Companion to `docs/curriculum-expansion-v1.md` (ids, skills, prerequisites, boundaries).
Each row: the ONE core interaction of the lesson. Evidence uses only the existing shapes
(`PracticeEvidence` solved / revealed + understanding check per skill). No lab decides mastery.

Scaffold column: L1 observe/choose · L2 change one thing · L3 complete part · L4 reduced support · L5 independent.

## HTML — HTML Live Web Builder

| Lesson | Interaction | Learner action | Visible result | Evidence |
|---|---|---|---|---|
| web-html-elements | drag prepared block onto page (L1→L3) | drag `<h1>Hello</h1>`, edit its text | heading appears on the live page instantly; tag never shows on the page | h1 + p present; attempts; hints |
| web-html-text | tag anatomy + pair highlight (L1→L4) | tap a tag, add the missing `</h1>`, reorder blocks | opening/content/closing labelled; unmatched tag marked "ยังไม่มีคู่"; page fixes when closed | all tags closed; nesting valid; heading order; retries |
| web-html-links-images | attribute panel (L1→L4) | change `src`, `href`, `alt` | image swaps; link destination label changes; alt shown when image is off | attributes valid; alt present; link target matches task |
| web-html-page-structure | region outline mode (L1→L4) | hover/tap code region, move blocks between regions | page region highlighted with its name; misplaced content flagged by region | required regions present and nested; nothing visible in head |
| web-html-project | requirement checklist (L4→L5) | build a profile page from requirements | checklist items tick as structure appears | requirements met per item; checks run; hints |

## CSS — Style Lab

| Lesson | Interaction | Learner action | Visible result | Evidence |
|---|---|---|---|---|
| web-css-rules | control ↔ code sync, selector targeting (L1→L4) | pick `color`, then edit `h1 { color: red; }`, change selector to `.note` | target elements highlight; colour changes instantly; "กฎนี้ไม่มีเป้าหมาย" when nothing matches | right elements changed, others unchanged |
| web-css-color-text | value controls + contrast meter (L1→L3) | adjust colour, background, size, weight | text restyles live; contrast shown as number + "อ่านง่าย/อ่านยาก" | values meet task; contrast passes |
| web-css-box-model | layered box diagram (L1→L4) | drag padding / margin | layers resize with numbers; background grows with padding, not margin | spacing requirement met; correct layer chosen |
| web-css-flex | animated layout + axis arrows (L1→L4) | toggle `display:flex`, try justify/align values, predict first | items move to new positions; main/cross axis drawn | relative positions meet target; property on container |
| web-css-responsive | dual-width preview (L3→L5) | fix fixed widths, add max-width / flex-wrap | overflow marked at 375 px disappears | no overflow at 1280 and 375; readability rules pass |

## JavaScript — Event Playground

| Lesson | Interaction | Learner action | Visible result | Evidence |
|---|---|---|---|---|
| web-js-events | click → trace strip (L1→L4) | click button, edit handler text, fill event name | trace: USER CLICK → event → highlighted line → page change; stops with Thai reason on bugs | event fired; handler ran; page text matches |
| web-js-state | memory panel (L1→L4) | click, change `+ 1` to `+ 2` after predicting | `count = 0` → `count = 1` beside the page; mismatch flagged when page isn't updated | value after N clicks; page shows state |
| web-js-dom | selector highlight + class toggle (L1→L4) | change selector, toggle class, hide/show panel | element found is highlighted; CSS rule switching on/off is shown | correct element changed; final page state |
| web-js-conditions | event → state → condition → UI trace (L1→L4) | click until threshold, change threshold after predicting | `count >= 5` → `5 >= 5` → true → panel unlocks | each test case (below / at / above) correct |
| web-js-project | replayable test cases (L4→L5) | build counter / quiz / toggle card | each case replays clicks and shows pass / fail with expected vs actual | test cases passed per case; runs; hints |

## SQL — Data Query Lab

| Lesson | Interaction | Learner action | Visible result | Evidence |
|---|---|---|---|---|
| db-sql-tables | table explorer (L1→L3) | tap rows, columns, choose an id column | whole row / column highlighted with meaning | row/column identification; valid id |
| db-sql-select | query → RUN → result (L1→L4) | run `SELECT *`, then choose columns | result table; chosen columns highlighted in the source | query valid; result set matches |
| db-sql-where | per-row condition marks (L1→L4) | run `WHERE score > 80`, change the bound after predicting | each row shows `85 > 80 → จริง ✓` / `เท็จ ✗`; false rows fade | result rows match; boundary case right |
| db-sql-order-limit | animated reorder + LIMIT cut line (L1→L4) | switch ASC/DESC, add LIMIT | rows rearrange; cut line at LIMIT; warning when LIMIT has no ORDER BY | order-sensitive result matches |
| db-sql-aggregate | rows flow into one value (L1→L4) | run COUNT/AVG/MAX/MIN, add WHERE | contributing rows highlighted; AVG shown as sum ÷ count | value matches (tolerance for AVG) |
| db-sql-challenge | question set vs result comparison (L4→L5) | write queries to answer data questions | per question: your result vs what's needed ("เกิน/ขาด N แถว") | questions answered; clause hints used; retries |

## Networking — Packet Visualizer

| Lesson | Interaction | Learner action | Visible result | Evidence |
|---|---|---|---|---|
| net-devices | connect topology + SEND (L1→L4) | drag devices, draw links, send | packet travels the links; stops where no link exists | path connected; send outcome |
| net-ip | address labels + packet envelope (L1→L4) | edit destination / device IPs | packet goes to the addressed device; invalid or duplicate IP marked at the exact octet/device | valid unique config; send outcome |
| net-subnet | network areas (L1→L4) | change the third octet, group devices | device moves between labelled areas; cross-area send stops at the edge without a router | same-network judgements; send after fix |
| net-gateway | hop-by-hop decisions (L1→L4) | set gateway, send across networks | each hop explains its decision; wrong gateway stops at the PC with the reason | gateway value; hop reached; delivered |
| net-dns | 4-step lookup sequence (L1→L4) | type a name, change DNS server | name → DNS → IP → connection; wrong DNS stops at the lookup step (distinct from gateway failure) | stop point identified; fix applied; delivered |
| net-troubleshoot | broken networks + change log (L4→L5) | send, observe stop point, change one thing, resend | stop point moves as faults are fixed; nudge when many changes at once | cause named per fault; changes before fix; one-change-at-a-time |
