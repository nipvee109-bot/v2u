# Curriculum Expansion V1 — HTML · CSS · JavaScript · SQL · Networking

Status: **DESIGN ONLY — not implemented, not active.** (2026-10-06, base `07aa8a6`)

Nothing in this document is live. No lesson, skill, diagnostic item, route entry, knowledge record,
dependency, GameContent version or database change was added. The existing 15 lessons
(Math 6 · Python 5 · Physics 4) are untouched and were used only as the reference for conventions.

Companion: `docs/curriculum-expansion-interaction-map.md` (lesson → interaction → action → result → evidence).

---

## 0. Conventions this design follows (from the repository)

| Area | Current convention | How the expansion follows it |
|---|---|---|
| Lesson record | `CurriculumLesson` in `src/curriculum/types.ts`: id, subjectId, topicId, title, level, estimatedMinutes, prerequisites (lesson ids), learningOutcomes, skillIds, exerciseIds, quizIds, resourceIds, studyLessonTitle | every lesson below lists the same fields |
| Lesson id | `<subject-prefix>-<topic>-<name>` (`prog-ctrl-loops`, `phy-kin-1d`) | `web-html-*`, `web-css-*`, `web-js-*`, `db-sql-*`, `net-*` |
| Topic id | `<subject-prefix>-<topic>` (`prog-control-flow`) | `web-html`, `web-css`, `web-js`, `db-sql`, `net-basics`, `net-routing`, `net-services` |
| Skill id | `skill-<subject-prefix>-<name>` | `skill-web-*`, `skill-db-*`, `skill-net-*` |
| Studio subject | `buildStudioScript` keys on `lessonId.split('-')[0]` (`math` / `phy` / `prog`) | prefixes `web` / `db` / `net` → one new entry each |
| Knowledge layer | one `LessonKnowledge` per lesson: concepts, rules, workedExamples, guided (levels 1–2), independent (levels 1–3, six items), checks, mistakes (why + fix), allowed/notYet, provenance, audit; every answer has a machine `verify` | each lesson below defines its allowed/not-yet boundary, practice shape and mistakes; new `verify` kinds are listed in §8 |
| Diagnostic | `DiagnosticItem`: 2 per skill (basic + core), each maps to ONE skill and its first teaching lesson; multiple choice (+ optional code) | §9 designs items per skill; **not activated** |
| Route | one pathway (`pathway-computer-engineering`) whose requirements are admission exams + readiness % | §10 — new tracks must not enter admission readiness without owner approval |
| Evidence | Learning Core receives `UnderstandingSummary` (score, understood, confused skills) + `PracticeEvidence` (total / solved / revealed); mastery, review and Next Step are computed only by the core | §11 — labs map to the same shape, no new learner fields |

### Subject ids (owner decision — recommended option)

`CurriculumSubjectId` and `SubjectId` are closed unions with 12 exhaustive `Record<SubjectId, …>` maps.

| Option | Subjects | Trade-off |
|---|---|---|
| **A (recommended)** | 3 new subjects: `web` (HTML, CSS, JS as topics) · `database` · `networking` | matches how learners and programmes group them; 3 design identities; HTML→CSS→JS stays one track |
| B | 5 new subjects: `html`, `css`, `javascript`, `sql`, `networking` | finer progress display, but 5 identities and HTML/CSS/JS split apart although they are learned together |
| C | everything under existing `programming` | no type change, but mixes Python readiness (used by the pathway) with web/network skills |

All ids below assume **Option A**. Under B only `subjectId` changes; lesson and skill ids stay valid.

---

## 1. Subject overview

| Track | Subject | Lessons | Skills | One-line goal (Thai, learner-facing) |
|---|---|---|---|---|
| HTML | `web` | 5 | 7 | HTML คือ “โครง” และ “เนื้อหา” ของหน้าเว็บ |
| CSS | `web` | 5 | 6 | CSS เปลี่ยนว่าหน้าเว็บ “หน้าตา” และ “จัดวาง” อย่างไร |
| JavaScript | `web` | 5 | 5 | JavaScript ทำให้หน้าเว็บ “ตอบสนอง” |
| SQL | `database` | 6 | 6 | ฐานข้อมูลเก็บข้อมูลเป็นตาราง SQL คือวิธี “ถาม” ข้อมูล |
| Networking | `networking` | 6 | 7 | ทำให้สิ่งที่มองไม่เห็นในเครือข่าย “มองเห็นได้” |
| **Total** | | **27** | **31** | |

Session size: 30–60 minutes each (existing lessons are 30–75). One concept cluster per lesson.

---

## 2. ID registry (validated: unique, no collision with existing ids)

| Lesson id | Topic | Skills | Prerequisites |
|---|---|---|---|
| web-html-elements | web-html | skill-web-html-element | — |
| web-html-text | web-html | skill-web-html-text-structure, skill-web-html-nesting | web-html-elements |
| web-html-links-images | web-html | skill-web-html-attributes, skill-web-html-links-images | web-html-text |
| web-html-page-structure | web-html | skill-web-html-page-structure | web-html-links-images |
| web-html-project | web-html | skill-web-html-page-build | web-html-page-structure |
| web-css-rules | web-css | skill-web-css-rule, skill-web-css-selectors | web-html-links-images |
| web-css-color-text | web-css | skill-web-css-color-text | web-css-rules |
| web-css-box-model | web-css | skill-web-css-box-model | web-css-color-text |
| web-css-flex | web-css | skill-web-css-flex-layout | web-css-box-model, web-html-page-structure |
| web-css-responsive | web-css | skill-web-css-responsive | web-css-flex |
| web-js-events | web-js | skill-web-js-events | web-css-rules |
| web-js-state | web-js | skill-web-js-state | web-js-events |
| web-js-dom | web-js | skill-web-js-dom | web-js-state |
| web-js-conditions | web-js | skill-web-js-conditions | web-js-dom |
| web-js-project | web-js | skill-web-js-interactive-build | web-js-conditions |
| db-sql-tables | db-sql | skill-db-table-structure | — |
| db-sql-select | db-sql | skill-db-sql-select | db-sql-tables |
| db-sql-where | db-sql | skill-db-sql-where | db-sql-select |
| db-sql-order-limit | db-sql | skill-db-sql-order-limit | db-sql-where |
| db-sql-aggregate | db-sql | skill-db-sql-aggregate | db-sql-where |
| db-sql-challenge | db-sql | skill-db-sql-data-question | db-sql-order-limit, db-sql-aggregate |
| net-devices | net-basics | skill-net-devices, skill-net-topology | — |
| net-ip | net-basics | skill-net-ip-address | net-devices |
| net-subnet | net-routing | skill-net-same-network | net-ip |
| net-gateway | net-routing | skill-net-gateway | net-subnet |
| net-dns | net-services | skill-net-dns | net-gateway |
| net-troubleshoot | net-services | skill-net-troubleshoot | net-dns |

---

## 3. Prerequisite graph

```
HTML    web-html-elements → web-html-text → web-html-links-images → web-html-page-structure → web-html-project
                                                   │                        │
CSS                                                └→ web-css-rules → web-css-color-text → web-css-box-model → web-css-flex → web-css-responsive
                                                           │                                                   ↑
                                                           │                               web-html-page-structure
JS                                                         └→ web-js-events → web-js-state → web-js-dom → web-js-conditions → web-js-project

SQL     db-sql-tables → db-sql-select → db-sql-where ─┬→ db-sql-order-limit ─┐
                                                      └→ db-sql-aggregate ───┴→ db-sql-challenge

NET     net-devices → net-ip → net-subnet → net-gateway → net-dns → net-troubleshoot
```

Why each cross-link exists (and why others do not):
- **CSS needs `web-html-links-images`**: selectors target elements, and class selectors need the idea of an attribute, which HTML 3 teaches. CSS does *not* need the HTML project.
- **`web-css-flex` needs `web-html-page-structure`**: flex arranges children inside a container (`div`/`section`), which HTML 4 introduces.
- **JS needs `web-css-rules`** (not the whole CSS track): `document.querySelector('…')` uses CSS selectors, and `classList.toggle` (JS 3) switches a CSS class. Box model, flex and responsive are not needed for behaviour.
- **Python → JS conditions is NOT a prerequisite.** `prog-ctrl-conditions` helps conceptually, so JS 4 links to it as *related* (a tip, "เคยเรียน if ใน Python แล้วไหม? แนวคิดเดียวกัน แต่เขียนต่างกัน"). Making it required would block web learners who never chose Python. The schema has no "related" field, so this lives in the lesson's knowledge text only.
- **SQL has no cross-subject prerequisite.** Comparison operators (`>`, `=`) are taught in SQL 3 itself; requiring math lessons would be artificial.
- **Networking has no cross-subject prerequisite.** Binary/subnet arithmetic beyond `/24` is deliberately out of V1 (§7), so no math prerequisite is needed.
- Graph is acyclic; every prerequisite id exists (validated).

---

## 4. HTML (topic `web-html`, 5 lessons, 7 skills)

Skills
- `skill-web-html-element` — อ่านและเขียน element: แท็กเปิด + เนื้อหา + แท็กปิด
- `skill-web-html-text-structure` — ใช้ h1–h3, p, strong, em ให้ตรงหน้าที่
- `skill-web-html-nesting` — ปิดแท็กครบและซ้อนถูกลำดับ
- `skill-web-html-attributes` — เขียน attribute `name="value"` และรู้ว่ามันเปลี่ยนอะไร
- `skill-web-html-links-images` — a/href, img/src/alt
- `skill-web-html-page-structure` — โครงเอกสาร (html/head/body) และพื้นที่หน้า (header, main, section, footer, div)
- `skill-web-html-page-build` — สร้างหน้าเว็บจากข้อกำหนด (ไม่ใช่ลอกภาพ)

### HTML 1 · `web-html-elements` · เว็บเกิดขึ้นจาก HTML ได้อย่างไร
- Level foundation · ~30 min · prerequisites — · skills `skill-web-html-element`
- **เรียนอะไร:** element = แท็กเปิด + เนื้อหา + แท็กปิด; หน้าเว็บคือ element หลายตัวเรียงกัน
- **ทำไมต้องรู้:** ทุกหน้าเว็บที่เห็นมาจากโค้ดแบบนี้ — รู้แล้วจะอ่านและแก้หน้าเว็บได้
- **มองเห็นได้อย่างไร:** ซ้าย = บล็อก `<h1>Hello</h1>`, `<p>ข้อความ</p>`; ขวา = หน้าเว็บจริงที่แสดงทันที
- **ผู้เรียนทำอะไร (scaffold):** L1 ลากบล็อกที่เตรียมไว้วางในหน้า → เห็นผลทันที → *แล้ว* ค่อยบอกว่า `<h1>` = หัวข้อหลัก · L2 แก้ข้อความในบล็อก · L3 เลือกบล็อกให้ได้หน้าตามภาพตัวอย่าง (โครง ไม่ใช่พิกเซล)
- **ถูก/ผิดเห็นผลอย่างไร:** หน้าขวาเปลี่ยนทันทีทุกครั้ง; คำถามหลัก “โค้ดนี้สร้างอะไรบนหน้าเว็บ?” — ตอบผิด → ชี้ส่วนในหน้าที่โค้ดนั้นสร้างจริง
- **ท้ายบททำได้ (independent):** สร้างหน้าเล็ก ๆ ที่มี หัวข้อ 1 อัน + ย่อหน้า 1 อัน (ตรวจด้วยโครงสร้าง)
- **จุดพลาดที่พบบ่อย:** คิดว่าแท็กจะโผล่บนหน้า · พิมพ์ข้อความนอกแท็ก · สับสน `<h1>` กับ “ตัวใหญ่” (ความหมาย vs หน้าตา)
- **Boundary:** allowed = h1, p, แนวคิด element · not yet = attribute, โครงเอกสาร, CSS
- **Evidence:** โครงสร้างถูก (มี h1 และ p), ครั้งที่ลอง, คำใบ้ที่ใช้
- **Game:** NO_GAME_NEEDED — การลากแล้วเห็นหน้าเว็บก็เป็นรางวัลอยู่แล้ว
- **Future module:** HTML Live Web Builder (โหมดบล็อก)
- **เชื่อมบทถัดไป:** มี element แล้ว → บทต่อไปเลือก element ให้ตรงหน้าที่ของเนื้อหา

### HTML 2 · `web-html-text` · ข้อความและโครงสร้างเนื้อหา
- foundation · ~40 min · prereq `web-html-elements` · skills `skill-web-html-text-structure`, `skill-web-html-nesting`
- **เรียนอะไร:** h1–h3 (ลำดับหัวข้อ), p, strong, em; แท็กต้องปิดและซ้อนเป็นลำดับ
- **ทำไมต้องรู้:** ลำดับหัวข้อทำให้คน (และโปรแกรมอ่านหน้าจอ) เข้าใจหน้าเว็บ
- **มองเห็นได้อย่างไร:** แตะ `<h1>Hello</h1>` → แยกสี/ป้าย: `<h1>` แท็กเปิด · `Hello` เนื้อหา · `</h1>` แท็กปิด; คู่ที่ตรงกันไฮไลต์พร้อมกัน
- **Scaffold:** L1 แตะดูคู่แท็ก · L2 เปลี่ยน h1 → h2 แล้วดูขนาด/ลำดับเปลี่ยน · L3 เติมแท็กปิดที่หายไป · L4 เรียงบล็อกให้หัวข้อมาก่อนเนื้อหา
- **Feedback:** `<h1>Hello` ไม่มีคู่ → แท็กเปิดถูกทำเครื่องหมาย “ยังไม่มีคู่” และถามว่า “ส่วนไหนยังไม่ได้ปิด?” — เติม `</h1>` แล้วหน้าแก้ทันที; ไม่ใช้คำว่า “syntax error” อย่างเดียว
- **Independent:** เขียนส่วนแนะนำตัวสั้น ๆ: หัวข้อ, ย่อหน้า 2 ย่อหน้า, มีคำเน้นด้วย strong อย่างน้อย 1 ที่
- **Mistakes:** ลืมแท็กปิด · ปิดสลับลำดับ `<p><strong>…</p></strong>` · ใช้ h3 เพราะอยากได้ตัวเล็ก (ข้ามลำดับ)
- **Boundary:** allowed = h1–h3, p, strong, em · not yet = h4–h6, list, table, attribute
- **Evidence:** แท็กปิดครบ, การซ้อนถูก, ลำดับหัวข้อ, retries, hints
- **Game:** OPTIONAL_GAME — “จับคู่แท็ก” (ปิดแท็กให้ถูกคู่ก่อนหน้าพัง) การกระทำในเกม = การปิดแท็ก ตรงกับทักษะ nesting แต่บทเรียนหลักสอนได้ครบอยู่แล้ว
- **Future module:** HTML Live Web Builder (โหมดแก้โค้ด + ไฮไลต์คู่แท็ก)
- **เชื่อม:** element บางตัวต้องการข้อมูลเพิ่ม (ลิงก์ไปไหน? รูปอะไร?) → attribute

### HTML 3 · `web-html-links-images` · ลิงก์และรูปภาพ
- foundation · ~40 min · prereq `web-html-text` · skills `skill-web-html-attributes`, `skill-web-html-links-images`
- **เรียนอะไร:** attribute `name="value"`; `<a href>`, `<img src alt>` (img ไม่มีแท็กปิด)
- **ทำไมต้องรู้:** ลิงก์และรูปทำให้หน้าเว็บเชื่อมกันและสื่อสารได้; alt ทำให้คนที่มองไม่เห็นรูปยังเข้าใจ
- **มองเห็นได้อย่างไร:** แก้ `src` → รูปในหน้าขวาเปลี่ยน; แก้ `href` → ป้าย “ลิงก์นี้จะไปที่…” เปลี่ยน (ไม่เปิดเว็บจริง); ปิดรูป → เห็น alt แทน
- **Scaffold:** L1 เลือกรูปจากชุดรูปที่เตรียมไว้ · L2 แก้ค่า attribute ทีละตัว · L3 เติม attribute ที่หาย (`alt`) · L4 เขียน `<a>` เอง
- **Feedback:** ลืม `alt` → ป้ายแจ้ง “คนที่ใช้โปรแกรมอ่านหน้าจอจะไม่รู้ว่ารูปนี้คืออะไร”; ลืมเครื่องหมายคำพูด → attribute ไฮไลต์ตรงจุด
- **Independent:** สร้าง รูป + ข้อความ + ลิงก์ ในหน้าเดียว
- **Mistakes:** ใส่ `</img>` · ลืม `alt` · ใส่ข้อความลิงก์ไว้นอก `<a>` · ลืม `"`
- **Boundary:** allowed = a/href, img/src/alt, รูปและปลายทางจากชุดที่เตรียมไว้ · not yet = target, width/height, การอัปโหลดรูป
- **Evidence:** attribute ถูกต้อง, มี alt, ปลายทางลิงก์ตรงโจทย์
- **Game:** NO_GAME_NEEDED
- **Future module:** HTML Live Web Builder (แผงแก้ attribute)
- **เชื่อม:** attribute `class` จะถูกใช้ใน CSS 1; หน้ายาวขึ้น → ต้องจัดกลุ่ม (HTML 4)

### HTML 4 · `web-html-page-structure` · การจัดกลุ่มหน้าเว็บ
- core · ~45 min · prereq `web-html-links-images` · skill `skill-web-html-page-structure`
- **เรียนอะไร:** โครงเอกสาร `html/head/body` (สิ่งที่เห็นอยู่ใน body), พื้นที่ `header`, `main`, `section`, `footer`, และ `div` เป็นกล่องทั่วไป
- **ทำไมต้องรู้:** หน้าเว็บจริงแบ่งเป็นส่วน การแบ่งชัดทำให้จัดหน้าด้วย CSS และอ่านด้วยโปรแกรมอ่านหน้าจอง่าย
- **มองเห็นได้อย่างไร:** โหมดมองโครง — ทุกพื้นที่มีกรอบและป้ายชื่อ; ชี้/แตะโค้ด `<header>` → พื้นที่บนหน้าไฮไลต์ (และกลับกัน)
- **Scaffold:** L1 แตะสำรวจ · L2 ย้ายบล็อกเข้า/ออกพื้นที่ · L3 ห่อเนื้อหาที่ให้มาด้วย section ที่ถูกต้อง · L4 จัดหน้าโปรไฟล์จากชิ้นส่วนที่กระจัดกระจาย
- **Feedback:** วางเนื้อหาหลักใน footer → พื้นที่ footer ไฮไลต์ และถามว่า “ส่วนนี้คือเนื้อหาหลักหรือท้ายหน้า?”
- **Independent:** จัดโครงหน้าโปรไฟล์: header (ชื่อ), main ที่มี 2 section, footer
- **Mistakes:** สับสน `<head>` กับ `<header>` · ใช้ div ทุกที่แทนพื้นที่ที่มีความหมาย · ใส่เนื้อหาที่มองเห็นใน head
- **Boundary:** allowed = html, head, title, body, header, main, section, footer, div · not yet = nav, article, aside, form, meta อื่น ๆ
- **Evidence:** พื้นที่ครบและซ้อนถูก, ไม่มีเนื้อหาที่มองเห็นใน head
- **Game:** NO_GAME_NEEDED
- **Future module:** HTML Live Web Builder (โหมดมองโครง)
- **เชื่อม:** ใช้ทุกอย่างรวมกันในโปรเจกต์ (HTML 5); พื้นที่เหล่านี้คือสิ่งที่ CSS 4 จะจัดวาง

### HTML 5 · `web-html-project` · MINI PROJECT: หน้าเว็บแรกของฉัน
- core · ~60 min · prereq `web-html-page-structure` · skill `skill-web-html-page-build`
- **เรียนอะไร:** แปลง “ข้อกำหนด” เป็นโครงหน้าเว็บด้วยตัวเอง
- **ทำไมต้องรู้:** งานจริงคือทำตามความต้องการ ไม่ใช่ลอกภาพ
- **มองเห็นได้อย่างไร:** รายการข้อกำหนดเป็น checklist ที่ติ๊กเองอัตโนมัติเมื่อหน้าเว็บมีสิ่งนั้น (เช่น “มีหัวข้อหลัก 1 อัน ✓”)
- **Scaffold:** L4 เริ่มจากโครงเปล่า (html/body) + checklist + คำใบ้ตามขอ · L5 โหมดอิสระ: ตัวแก้โค้ดว่าง มีเพียงข้อกำหนด
- **Feedback:** ข้อที่ยังไม่ผ่านบอก “ขาดอะไร” ไม่บอกโค้ดคำตอบ; ไม่ตรวจสี/ขนาด/ถ้อยคำ
- **Independent (ข้อกำหนด):** หัวข้อหลัก 1, ย่อหน้าแนะนำตัว, รูปที่มี alt, ลิงก์, แบ่งเนื้อหาเป็น section อย่างน้อย 2 ส่วน
- **Mistakes:** h1 หลายอัน · รูปไม่มี alt · ทุกอย่างอยู่ใน div เดียว
- **Evidence:** ข้อกำหนดที่ผ่านต่อข้อ (ไม่ใช่คะแนนรวม), จำนวนรอบที่ตรวจ, คำใบ้
- **Game:** NO_GAME_NEEDED — โปรเจกต์สร้างสรรค์ ไม่ควรมีเวลาจำกัด/คะแนน
- **Future module:** HTML Live Web Builder (โหมดโปรเจกต์)
- **เชื่อม:** หน้านี้จะถูกตกแต่งต่อใน CSS

---

## 5. CSS (topic `web-css`, 5 lessons, 6 skills)

Skills
- `skill-web-css-rule` — อ่าน/เขียนกฎ `selector { property: value; }`
- `skill-web-css-selectors` — เลือกเป้าหมายด้วย type selector และ class selector
- `skill-web-css-color-text` — color, background-color, font-size, font-weight
- `skill-web-css-box-model` — content, padding, border, margin
- `skill-web-css-flex-layout` — display:flex, justify-content, align-items, gap
- `skill-web-css-responsive` — width/max-width, %, flex-wrap ให้อ่านได้ทั้งจอใหญ่และจอมือถือ

### CSS 1 · `web-css-rules` · CSS เปลี่ยนหน้าตาเว็บได้อย่างไร
- foundation · ~35 min · prereq `web-html-links-images` · skills `skill-web-css-rule`, `skill-web-css-selectors`
- **เรียนอะไร:** selector → เลือกเป้าหมาย; property → อะไรเปลี่ยน; value → เปลี่ยนเป็นอย่างไร; class
- **ทำไมต้องรู้:** HTML สร้างของ CSS แต่งของ — แยกกันทำให้เปลี่ยนหน้าตาทั้งเว็บได้จากที่เดียว
- **มองเห็นได้อย่างไร:** ชี้บรรทัด `h1 {` → element เป้าหมายบนหน้าไฮไลต์; แก้ `color: red` → หัวข้อเปลี่ยนสีทันที; ป้ายสามสี selector / property / value
- **Scaffold:** L1 ตัวควบคุม `color: [ red ▾ ]` → หน้าเปลี่ยน · L2 เผยโค้ดจริง `h1 { color: red; }` ที่ซิงก์กับตัวควบคุม · L3 แก้โค้ดเอง (ตัวควบคุมยังอยู่) · L4 เปลี่ยน selector จาก `p` เป็น `.note` แล้วดูเป้าหมายเปลี่ยน
- **Feedback:** selector ไม่ตรงอะไรเลย → “กฎนี้ไม่มีเป้าหมายในหน้า” + ไฮไลต์ว่าง; ลืม `;`/`}` → บรรทัดนั้นทำเครื่องหมาย และหน้าไม่เปลี่ยนตรงส่วนที่เสีย
- **Independent:** เปลี่ยนสีหัวข้อ และทำให้ย่อหน้าที่มี class `note` ต่างจากย่อหน้าอื่น
- **Mistakes:** ลืมจุดหน้า class (`note {`) · ลืม `;` · ใส่ class ใน HTML สะกดไม่ตรงกับ CSS
- **Boundary:** allowed = type/class selector, color · not yet = id, combinator, specificity, inline style
- **Evidence:** เป้าหมายถูก (computed style ของ element ที่ต้องการเปลี่ยน และ element อื่นไม่เปลี่ยน)
- **Game:** NO_GAME_NEEDED
- **Future module:** CSS Style Lab
- **เชื่อม:** รู้รูปแบบกฎแล้ว → ลอง property ที่ใช้บ่อย

### CSS 2 · `web-css-color-text` · สีและตัวอักษร
- foundation · ~35 min · prereq `web-css-rules` · skill `skill-web-css-color-text`
- **เรียนอะไร:** color, background-color, font-size (px, rem), font-weight; ความต่างของสีตัวอักษรกับพื้น
- **ทำไมต้องรู้:** อ่านง่ายมาก่อนสวย — สีที่ตัดกันน้อยทำให้หลายคนอ่านไม่ได้
- **มองเห็นได้อย่างไร:** แถบเลื่อน/ตัวเลือกค่าซิงก์กับโค้ด; ตัวบอกความต่างสี (contrast) เป็นตัวเลขและคำว่า “อ่านง่าย/อ่านยาก”
- **Scaffold:** L1 เลือกค่าจากตัวเลือก · L2 พิมพ์ค่าเอง · L3 แก้การ์ดที่อ่านยากให้อ่านง่าย · ไม่ต้องท่องรายชื่อค่า
- **Feedback:** contrast ต่ำ → ป้าย “อ่านยาก” พร้อมเหตุผล (ไม่ใช่แค่สีแดง)
- **Independent:** แต่งส่วนแนะนำตัวให้มีหัวข้อเด่น เนื้อหาอ่านง่าย และ contrast ผ่านเกณฑ์
- **Mistakes:** ใส่หน่วยไม่ได้ (`font-size: 20`) · พื้นกับตัวอักษรสีใกล้กัน · ใช้ font-size แทนการเลือก h1/h2
- **Boundary:** allowed = 4 property, ชื่อสี/hex, px/rem · not yet = font-family ภายนอก, gradient
- **Evidence:** ค่าที่ได้ตรงข้อกำหนด, contrast ratio ผ่าน
- **Game:** NO_GAME_NEEDED
- **Future module:** CSS Style Lab
- **เชื่อม:** ข้อความสวยแล้วแต่ “อึดอัด” → ระยะรอบกล่อง (box model)

### CSS 3 · `web-css-box-model` · Box Model
- core · ~45 min · prereq `web-css-color-text` · skill `skill-web-css-box-model`
- **เรียนอะไร:** ทุก element เป็นกล่อง: content → padding → border → margin
- **ทำไมต้องรู้:** ระยะห่างคือสิ่งที่ทำให้หน้าเว็บดู “โล่ง” หรือ “อึด” — และเป็นต้นเหตุอันดับหนึ่งที่ layout ไม่เป็นอย่างที่คิด
- **มองเห็นได้อย่างไร:** แผนภาพชั้นกล่องสี่ชั้นซ้อนบน element จริง; ลาก padding/margin แล้วระยะขยับจริง พร้อมตัวเลขแต่ละชั้น
- **Scaffold:** L1 แตะแต่ละชั้นดูชื่อ · L2 เลื่อน padding แล้วสังเกตว่าพื้นหลังขยายตาม (margin ไม่) · L3 ทาย: ต้องเปลี่ยน padding หรือ margin? แล้วลอง · L4 แก้การ์ดที่ชิดกันเกินไป
- **Feedback:** ใช้ margin เมื่อต้องการให้พื้นหลังกว้างขึ้น → แผนภาพชี้ว่าระยะเพิ่มอยู่ “นอก” กรอบ ซึ่งพื้นหลังไม่ครอบ
- **Independent:** แก้การ์ดที่ “อึด” ให้ข้อความไม่ชิดขอบ และการ์ดสองใบไม่ติดกัน
- **Mistakes:** สลับ padding กับ margin · ลืมว่า border เพิ่มขนาดกล่อง · ใส่ระยะด้วยช่องว่าง/บรรทัดว่างใน HTML
- **Boundary:** allowed = padding, border, margin (ค่าเดียวและแยกด้าน) · not yet = box-sizing, margin collapse, negative margin
- **Evidence:** ระยะผ่านข้อกำหนด (เช่น ข้อความห่างขอบ ≥ 12px), เลือกชั้นถูก
- **Game:** OPTIONAL_GAME — ปริศนา “จัดระยะให้ตรงเงา” ได้ แต่ภาพแผนภาพ+แถบเลื่อนสอนครบอยู่แล้ว
- **Future module:** CSS Style Lab (มุมมอง Box Model)
- **เชื่อม:** กล่องหลายใบ → จะเรียงแนวนอน/แนวตั้งอย่างไร (Flex)

### CSS 4 · `web-css-flex` · การจัดวางด้วย Flex
- core · ~50 min · prereq `web-css-box-model`, `web-html-page-structure` · skill `skill-web-css-flex-layout`
- **เรียนอะไร:** container กับ items; display:flex; justify-content (แกนหลัก); align-items (แกนขวาง); gap
- **ทำไมต้องรู้:** layout เกือบทุกแบบในการ์ด/แถบเมนูใช้ flex
- **มองเห็นได้อย่างไร:** กล่องของ items ขยับแบบมีแอนิเมชันเมื่อเปลี่ยนค่า; ลูกศรแกนหลัก/แกนขวางวาดทับ container
- **Scaffold:** L1 เปิด/ปิด `display:flex` เห็นบล็อกเรียงแนวนอน · L2 ลองค่า justify-content ทีละค่า · L3 ทายตำแหน่งก่อนกด · L4 จัดตามภาพเป้าหมาย (ตำแหน่ง ไม่ใช่พิกเซล)
- **Feedback:** ใส่ flex ที่ item แทน container → ป้าย “flex ต้องอยู่ที่กล่องแม่” พร้อมไฮไลต์กล่องแม่
- **Independent:** จัดรูป + ข้อความ + ปุ่ม ให้รูปอยู่ซ้าย ข้อความกับปุ่มอยู่ขวา กึ่งกลางแนวตั้ง มีช่องห่าง
- **Mistakes:** ใส่ display:flex ที่ลูก · สับสน justify กับ align · ใช้ margin ดันแทน gap
- **Boundary:** allowed = flex, flex-direction, justify-content, align-items, gap · not yet = grid, flex-grow/shrink/basis, order
- **Evidence:** ตำแหน่งสัมพัทธ์ของ items ผ่านข้อกำหนด, property ที่ใช้ถูก element
- **Game:** **GAME_HIGH_VALUE** — การเล่น = เขียน justify/align เพื่อพาวัตถุเข้าเป้า (แนวเดียวกับเกมฝึก flexbox) การกระทำที่สนุกคือการกระทำที่เรียนพอดี
- **Future module:** CSS Style Lab (มุมมอง Layout)
- **เชื่อม:** layout ทำงานบนจอใหญ่แล้ว → จอเล็กล่ะ?

### CSS 5 · `web-css-responsive` · RESPONSIVE / DESIGN CHALLENGE
- core · ~50 min · prereq `web-css-flex` · skill `skill-web-css-responsive`
- **เรียนอะไร:** width กับ max-width, หน่วย %, flex-wrap — การ์ดที่ไม่ล้นจอเล็ก
- **ทำไมต้องรู้:** ผู้ใช้ส่วนใหญ่เปิดเว็บจากมือถือ
- **มองเห็นได้อย่างไร:** พรีวิวสองขนาดพร้อมกัน (กว้าง/มือถือ) หรือแถบลากความกว้าง; ส่วนที่ล้นถูกทำเครื่องหมาย “ล้นจอ”
- **Scaffold:** L3 แก้การ์ดที่กว้างตายตัว 600px · L4 เพิ่ม flex-wrap ให้ปุ่มลงบรรทัดใหม่ · L5 ออกแบบการ์ดเองตามข้อกำหนด
- **Feedback:** มีการเลื่อนแนวนอนที่ 375px → แถบแดง + ข้อความว่ากล่องไหนกว้างเกิน
- **Independent:** การ์ดโปรไฟล์ที่อ่านได้ทั้ง 1280px และ 375px โดยไม่มีการเลื่อนแนวนอน ข้อความไม่เล็กกว่าเกณฑ์
- **Mistakes:** ตั้ง width เป็น px ตายตัว · รูปไม่จำกัดความกว้าง · ซ่อนเนื้อหาสำคัญบนมือถือ
- **Boundary:** allowed = width, max-width, %, flex-wrap · not yet = @media (V2), clamp, viewport units
- **Evidence:** ไม่มี overflow ทั้งสองความกว้าง, ข้อกำหนดการอ่านผ่าน
- **Game:** NO_GAME_NEEDED
- **Future module:** CSS Style Lab (มุมมองสองขนาดจอ)
- **เชื่อม:** หน้าเว็บสวยและอ่านได้แล้ว → ทำให้มัน “ตอบสนอง” (JS)

---

## 6. JavaScript (topic `web-js`, 5 lessons, 5 skills)

Skills
- `skill-web-js-events` — ผูกเหตุการณ์ click กับฟังก์ชันด้วย `addEventListener`
- `skill-web-js-state` — `let`/`const`, ค่าที่เปลี่ยนตามเวลา (`count = count + 1`)
- `skill-web-js-dom` — `querySelector`, `textContent`, `hidden`, `classList.toggle`
- `skill-web-js-conditions` — `if / else`, `===`, `>=` เพื่อเลือกผลบนหน้าเว็บ
- `skill-web-js-interactive-build` — ประกอบ event → state → condition → UI ให้หน้าเว็บทำงานจริง

Language decision: one way to bind events (`addEventListener('click', …)`), not `onclick` as well — fewer forms to learn; `onclick` goes to not-yet.

### JS 1 · `web-js-events` · ทำให้หน้าเว็บตอบสนอง
- foundation · ~35 min · prereq `web-css-rules` · skill `skill-web-js-events`
- **เรียนอะไร:** ผู้ใช้กด → เกิด event → ฟังก์ชันทำงาน → หน้าเปลี่ยน; `<button>` (element ที่รู้จักรูปแบบแล้ว)
- **ทำไมต้องรู้:** HTML = โครง, CSS = หน้าตา, JavaScript = พฤติกรรม
- **มองเห็นได้อย่างไร:** กดปุ่มก่อน แล้วเห็นเส้นทาง USER CLICK ↓ event ↓ บรรทัดโค้ดที่ทำงาน (ไฮไลต์) ↓ หน้าเปลี่ยน
- **Scaffold:** L1 กดปุ่มที่ทำงานแล้ว ดู trace · L2 แก้ข้อความที่ปุ่มจะเปลี่ยน · L3 เติมชื่อ event ที่หายไป · L4 ผูกปุ่มที่สองเอง
- **Feedback:** สะกด event ผิด (`'clik'`) → กดแล้ว trace หยุดที่ “ไม่มีโค้ดที่รอ event นี้”; selector ไม่เจอ → trace หยุดที่ “หาปุ่มไม่เจอ” (แทน error ภาษาอังกฤษดิบ)
- **Independent:** ปุ่มที่กดแล้วเปลี่ยนข้อความในหน้า
- **Mistakes:** เรียกฟังก์ชันทันที `addEventListener('click', show())` · สะกด event ผิด · selector ไม่ตรงกับ HTML
- **Boundary:** allowed = button, click, function ไม่มีพารามิเตอร์, textContent · not yet = event object, arrow function (ใช้ได้แต่ไม่สอนแยก), onclick
- **Evidence:** event ถูกยิงและฟังก์ชันที่ถูกทำงาน, ผลบนหน้าตรงข้อกำหนด
- **Game:** NO_GAME_NEEDED
- **Future module:** JS Event Playground
- **เชื่อม:** กดแล้วเปลี่ยนเป็นข้อความเดิมทุกครั้ง → อยากให้ “จำ” ได้ว่ากดไปกี่ครั้ง (state)

### JS 2 · `web-js-state` · ตัวแปรและสถานะ
- foundation · ~40 min · prereq `web-js-events` · skill `skill-web-js-state`
- **เรียนอะไร:** `let count = 0` ค่าที่เปลี่ยนเมื่อเกิด event; `const` สำหรับค่าที่ไม่เปลี่ยน
- **ทำไมต้องรู้:** แอปทุกตัวจำสถานะ (ตะกร้า, คะแนน, จำนวนไลก์)
- **มองเห็นได้อย่างไร:** กล่อง “หน่วยความจำ” แสดง `count = 0` → กด → `count = 1` (เก่าขีดฆ่า ใหม่ปรากฏ) ข้างหน้าเว็บ
- **Scaffold:** L1 กดดูค่าเปลี่ยน · L2 เปลี่ยน `+ 1` เป็น `+ 2` ทายก่อนกด · L3 เติมบรรทัดอัปเดตหน้าที่หายไป (ค่าเปลี่ยนแต่หน้าไม่เปลี่ยน) · L4 ปุ่มลดค่า
- **Feedback:** ค่าในหน่วยความจำเปลี่ยนแต่หน้าไม่เปลี่ยน → ชี้ว่า “ค่าเปลี่ยนแล้ว แต่ยังไม่ได้บอกหน้าเว็บ”; ใช้ `const` กับ count → trace หยุดที่บรรทัดนั้นพร้อมคำอธิบาย
- **Independent:** ตัวนับคลิกที่แสดงจำนวนครั้งบนหน้า
- **Mistakes:** ประกาศ `let count = 0` ไว้ในฟังก์ชัน (รีเซ็ตทุกครั้ง — เทียบได้กับจุดพลาดตัวสะสมใน Python loops) · ใช้ const · ลืมอัปเดตหน้า
- **Boundary:** allowed = let, const, number, `+ - =` · not yet = var, scope ลึก, string methods
- **Evidence:** ค่าหลังกด N ครั้งตรงที่คาด, หน้าแสดงค่าตรงกับ state
- **Game:** NO_GAME_NEEDED
- **Future module:** JS Event Playground (แผงหน่วยความจำ)
- **เชื่อม:** เปลี่ยนได้แค่ข้อความ → อยากซ่อน/แสดงและเปลี่ยนหน้าตา (DOM)

### JS 3 · `web-js-dom` · อ่าน/เปลี่ยนหน้าเว็บ
- core · ~45 min · prereq `web-js-state` · skill `skill-web-js-dom`
- **เรียนอะไร:** หา element (`querySelector` ใช้ selector แบบ CSS), เปลี่ยน `textContent`, `hidden`, `classList.toggle('…')`
- **ทำไมต้องรู้:** JS ไม่ได้ “วาด” ใหม่ทั้งหน้า — มันเปลี่ยน element ที่มีอยู่
- **มองเห็นได้อย่างไร:** ชี้ `querySelector('.panel')` → element ไฮไลต์ในหน้า; toggle class → เห็นกฎ CSS ที่เริ่ม/หยุดมีผล
- **Scaffold:** L1 กด toggle ดู class เข้า/ออก · L2 เปลี่ยน selector ไปยัง element อื่น · L3 เติมชื่อ class · L4 ปุ่มซ่อน/แสดงแผงเอง
- **Feedback:** querySelector ได้ `null` → trace “หา `.pannel` ไม่เจอ — ในหน้ามี `.panel`”
- **Independent:** ปุ่มที่ซ่อน/แสดงข้อความหรือแผง
- **Mistakes:** ลืมจุดใน selector · toggle ชื่อ class ที่ไม่มีใน CSS · ใช้ innerHTML กับข้อความผู้ใช้ (ไม่สอน; เตือนว่าไม่ปลอดภัย)
- **Boundary:** allowed = querySelector, textContent, hidden, classList.toggle/add/remove · not yet = createElement, innerHTML, querySelectorAll+loop
- **Evidence:** element ที่ถูกเปลี่ยนถูกตัว, สถานะหน้าหลังกดตรงข้อกำหนด
- **Game:** NO_GAME_NEEDED
- **Future module:** JS Event Playground
- **เชื่อม:** ทุกครั้งที่กดทำเหมือนเดิม → อยากให้ “ตัดสินใจ” ได้ (เงื่อนไข)

### JS 4 · `web-js-conditions` · เงื่อนไขกับการโต้ตอบ
- core · ~45 min · prereq `web-js-dom` · skill `skill-web-js-conditions` · related (not required): `prog-ctrl-conditions`
- **เรียนอะไร:** `if (…) { … } else { … }`, `===`, `>=` — เลือกผลบนหน้าตาม state
- **ทำไมต้องรู้:** UI จริงตอบต่างกันตามสถานการณ์ (ครบ 5 ครั้งแล้วปลดล็อก, ใส่ข้อมูลไม่ครบแล้วเตือน)
- **มองเห็นได้อย่างไร:** trace สี่ขั้น event → state (`count = 5`) → เงื่อนไข (`count >= 5` → `5 >= 5` → true) → ผลบนหน้า; เหมือนแผงสถานะของบท Python เพื่อให้เทียบกันได้
- **Scaffold:** L1 กดจนถึงเงื่อนไขดูมันเปลี่ยน · L2 เปลี่ยนเลข 5 เป็น 3 ทายก่อน · L3 เติมตัวดำเนินการเปรียบเทียบ · L4 เพิ่ม else
- **Feedback:** ใช้ `=` ในเงื่อนไข → trace แสดงว่าค่าถูก “กำหนด” แทน “เปรียบเทียบ” และผลผิด; แสดงความต่างจาก Python (วงเล็บ/ปีกกา vs `:`/ย่อหน้า) เมื่อผู้เรียนเคยเรียน Python
- **Independent:** หน้าเว็บที่ทำงานตามกฎ เช่น ปุ่ม “ส่ง” เปิดได้เมื่อกดยืนยันครบ 3 ข้อ
- **Mistakes:** `=` แทน `===` · ใช้ `==` แล้วเจอผลแปลกจากการแปลงชนิด · ลืมปีกกา/เขียนแบบ Python
- **Boundary:** allowed = if/else, else if, ===, !==, >, >=, <, <=, && · not yet = switch, ternary, truthy/falsy อย่างละเอียด
- **Evidence:** ผลบนหน้าในแต่ละกรณีทดสอบ (ต่ำกว่า/เท่ากับ/สูงกว่าเกณฑ์)
- **Game:** OPTIONAL_GAME — รูปแบบ Code Battle (ทายว่าเงื่อนไขไหนจริง) ใช้ได้ แต่ต้องการ GameContent ที่รองรับ JS (ดู §13)
- **Future module:** JS Event Playground
- **เชื่อม:** มีครบทุกชิ้น → สร้างของที่ใช้ได้จริง

### JS 5 · `web-js-project` · MINI INTERACTIVE PROJECT
- core · ~60 min · prereq `web-js-conditions` · skill `skill-web-js-interactive-build`
- **เรียนอะไร:** ประกอบ event + state + DOM + condition ให้ทำงานครบ
- **ทำไมต้องรู้:** ผลงานที่ใช้ได้จริงคือหลักฐานที่ดีที่สุด (และใส่พอร์ตได้)
- **มองเห็นได้อย่างไร:** ชุดกรณีทดสอบที่ “กดให้ดู” ได้: แต่ละกรณีเล่นการกดอัตโนมัติแล้วแสดงผลผ่าน/ไม่ผ่าน
- **Scaffold:** L4 เลือกโปรเจกต์ (ตัวนับที่มีเป้าหมาย · แบบทดสอบ 1 ข้อ · การ์ดโปรไฟล์ซ่อน/แสดง) + โครงเริ่ม · L5 โหมดอิสระ
- **Feedback:** กรณีที่ไม่ผ่านบอก “กดอะไร คาดว่าเห็นอะไร แต่เห็นอะไร”
- **Independent:** โปรเจกต์ที่เลือก ผ่านกรณีทดสอบของโปรเจกต์นั้นทั้งหมด
- **Evidence:** กรณีทดสอบที่ผ่านต่อข้อ, จำนวนรอบที่รัน, คำใบ้
- **Game:** NO_GAME_NEEDED — โปรเจกต์คือผลลัพธ์
- **Future module:** JS Event Playground (โหมดโปรเจกต์)
- **เชื่อม:** จบ track เว็บ V1; ต่อยอด V2 = รับข้อมูลจากฟอร์ม, ข้อมูลหลายชิ้น (list)

---

## 7. SQL / Database (subject `database`, topic `db-sql`, 6 lessons, 6 skills)

Skills
- `skill-db-table-structure` — อ่านตาราง: table, row (record), column (field), id
- `skill-db-sql-select` — `SELECT` คอลัมน์ `FROM` ตาราง
- `skill-db-sql-where` — `WHERE` ด้วย `= <> > >= < <=`, ข้อความใน `'…'`, `AND`
- `skill-db-sql-order-limit` — `ORDER BY … ASC/DESC`, `LIMIT`
- `skill-db-sql-aggregate` — `COUNT`, `AVG`, `MAX`, `MIN`
- `skill-db-sql-data-question` — แปลงคำถามภาษาคนเป็น query และตรวจว่าผลตอบคำถามจริง

V1 is **read-only** (SELECT only). Changing data (`INSERT/UPDATE/DELETE`), `GROUP BY`, `JOIN` → V2.
Dataset: small fictional tables written by V2U (e.g. `students(id, name, score, room)`), never real people.

### SQL 1 · `db-sql-tables` · ตารางข้อมูลคืออะไร
- foundation · ~30 min · prereq — · skill `skill-db-table-structure`
- **เรียนอะไร:** ตาราง = ข้อมูลเรื่องเดียว; แถว = หนึ่งรายการ; คอลัมน์ = หนึ่งคุณสมบัติ; id ไม่ซ้ำ
- **ทำไมต้องรู้:** ต้องเห็นรูปร่างข้อมูลก่อนจะถามมันได้
- **มองเห็นได้อย่างไร:** ตาราง `students` จริง แตะแถว → ไฮไลต์ทั้งแถว (“นักเรียน 1 คน”), แตะหัวคอลัมน์ → ไฮไลต์ทั้งคอลัมน์ (“คะแนนของทุกคน”)
- **Scaffold:** L1 แตะสำรวจ · L2 ตอบ “ข้อมูลนี้อยู่แถว/คอลัมน์ไหน” · L3 เลือกคอลัมน์ที่ต้องมีเพื่อเก็บข้อมูลใหม่
- **Feedback:** เลือกแถวเมื่อถามคอลัมน์ → ไฮไลต์ทั้งสองแบบให้เทียบ
- **Independent:** ออกแบบคอลัมน์สำหรับตารางง่าย ๆ (เช่น หนังสือในห้องสมุด) และชี้ว่าอะไรควรเป็น id
- **Mistakes:** สลับแถวกับคอลัมน์ · ใช้ชื่อเป็นตัวระบุ (ชื่อซ้ำได้) · ใส่หลายค่าในช่องเดียว
- **Boundary:** allowed = table, row, column, id · not yet = data type ละเอียด, foreign key
- **Evidence:** ระบุแถว/คอลัมน์ถูก, เลือก id ที่ไม่ซ้ำ
- **Game:** NO_GAME_NEEDED
- **Future module:** Data Query Lab (โหมดสำรวจตาราง)
- **เชื่อม:** รู้รูปร่างแล้ว → ขอข้อมูลด้วย SELECT

### SQL 2 · `db-sql-select` · SELECT
- foundation · ~35 min · prereq `db-sql-tables` · skill `skill-db-sql-select`
- **เรียนอะไร:** `SELECT * FROM students;` และ `SELECT name, score FROM students;`
- **ทำไมต้องรู้:** ทุกแอปที่แสดงข้อมูลกำลังถามฐานข้อมูลอยู่เบื้องหลัง
- **มองเห็นได้อย่างไร:** QUERY → (กด RUN) → ตารางผลลัพธ์; คอลัมน์ที่เลือกไฮไลต์ในตารางต้นทางพร้อมกัน
- **Scaffold:** L1 RUN query ที่ให้มา · L2 ลบคอลัมน์หนึ่งออกแล้วทาย · L3 เติมชื่อคอลัมน์ · L4 เขียน SELECT เอง
- **Feedback:** ชื่อคอลัมน์ผิด → ไม่ใช่แค่ error: แสดงรายชื่อคอลัมน์ที่มีจริงและไฮไลต์คำที่ไม่ตรง
- **Independent:** ขอเฉพาะชื่อและห้องของนักเรียนทุกคน
- **Mistakes:** สะกดคอลัมน์ผิด · ลืม `,` ระหว่างคอลัมน์ · ลืม FROM
- **Boundary:** allowed = SELECT, *, column list, FROM · not yet = AS, DISTINCT, expression
- **Evidence:** query รันได้, ชุดผลตรงกับคำตอบที่ตรวจแล้ว (ไม่ขึ้นกับตัวพิมพ์/ช่องว่าง)
- **Game:** NO_GAME_NEEDED
- **Future module:** Data Query Lab
- **เชื่อม:** ได้ข้อมูลทุกแถว → อยากได้เฉพาะแถวที่ตรงเงื่อนไข

### SQL 3 · `db-sql-where` · WHERE
- core · ~40 min · prereq `db-sql-select` · skill `skill-db-sql-where`
- **เรียนอะไร:** เงื่อนไขกรองแถว; ตัวเลขไม่มีเครื่องหมายคำพูด ข้อความใช้ `'…'`; `AND`
- **ทำไมต้องรู้:** คำถามจริงเกือบทุกข้อมี “เฉพาะ…”
- **มองเห็นได้อย่างไร:** `WHERE score > 80` → แต่ละแถวในตารางต้นทางแสดงผลเงื่อนไข (`85 > 80 → จริง ✓` / `72 > 80 → เท็จ ✗`) แล้วแถวที่เท็จจางหาย
- **Scaffold:** L1 RUN แล้วดูแถวกรอง · L2 เปลี่ยน 80 เป็น 70 ทายจำนวนแถว · L3 เติมตัวดำเนินการ · L4 รวมสองเงื่อนไขด้วย AND
- **Feedback:** `>` กับ `>=` ที่ขอบเขต → แถวที่คะแนนเท่ากับ 80 ถูกชี้ว่า “ตัวนี้แหละที่ทำให้ต่าง”
- **Independent:** หานักเรียนห้อง B ที่คะแนนตั้งแต่ 70 ขึ้นไป
- **Mistakes:** ลืม `'` รอบข้อความ · `>` vs `>=` · ใช้ `==`
- **Boundary:** allowed = comparisons, AND · not yet = OR (V2 เพราะต้องสอนวงเล็บ), LIKE, IN, NULL
- **Evidence:** ชุดแถวผลตรงคำตอบ, กรณีขอบเขตถูก
- **Game:** OPTIONAL_GAME — เป็นส่วนหนึ่งของ Data Detective (§13) ได้
- **Future module:** Data Query Lab (โหมดกรองทีละแถว)
- **เชื่อม:** ได้แถวที่ต้องการ → จัดเรียง/เอาแค่บางแถว (SQL 4) หรือสรุปเป็นตัวเลข (SQL 5)

### SQL 4 · `db-sql-order-limit` · ORDER BY / LIMIT
- core · ~35 min · prereq `db-sql-where` · skill `skill-db-sql-order-limit`
- **เรียนอะไร:** เรียงจากน้อยไปมาก/มากไปน้อย; จำกัดจำนวนแถว; “top N”
- **มองเห็นได้อย่างไร:** แถวผลลัพธ์สลับตำแหน่งแบบมีแอนิเมชันเมื่อเพิ่ม ORDER BY; เส้นตัดแสดงตรง LIMIT
- **Scaffold:** L1 RUN แล้วดูการเรียง · L2 สลับ ASC/DESC · L3 เติม LIMIT · L4 หา top 3 เอง
- **Feedback:** LIMIT โดยไม่ ORDER BY → แสดงว่า “3 แถวแรก” ไม่ได้แปลว่า “3 คนคะแนนสูงสุด”
- **Independent:** หานักเรียน 3 คนที่คะแนนสูงสุด
- **Mistakes:** ลืม DESC · LIMIT ก่อน ORDER BY · ใช้ LIMIT อย่างเดียวเพื่อหา “สูงสุด”
- **Boundary:** allowed = ORDER BY (1 คอลัมน์), ASC/DESC, LIMIT · not yet = OFFSET, หลายคอลัมน์
- **Evidence:** ลำดับแถวตรงคำตอบ (ตรวจลำดับด้วย ไม่ใช่แค่ชุด)
- **Game:** NO_GAME_NEEDED
- **Future module:** Data Query Lab
- **เชื่อม:** คำถาม “ทั้งหมดเฉลี่ยเท่าไร” ต้องสรุป ไม่ใช่เรียง

### SQL 5 · `db-sql-aggregate` · สรุปข้อมูล (COUNT / AVG / MAX / MIN)
- core · ~40 min · prereq `db-sql-where` · skill `skill-db-sql-aggregate`
- **เรียนอะไร:** ฟังก์ชันสรุปทำให้หลายแถวกลายเป็นค่าเดียว; ใช้ร่วมกับ WHERE
- **มองเห็นได้อย่างไร:** แถวที่ถูกนับ/เฉลี่ย “ไหล” เข้ากล่องผลลัพธ์ค่าเดียว; AVG แสดงผลรวม ÷ จำนวนให้เห็น
- **Scaffold:** L1 RUN COUNT(*) · L2 เปลี่ยนเป็น AVG(score) ทายก่อน · L3 เพิ่ม WHERE แล้วดูว่าแถวไหนเข้ากล่อง · L4 ตอบ “คะแนนเฉลี่ยของห้อง A เท่าไร?”
- **Feedback:** ใช้ COUNT(score) กับ COUNT(*) ต่างกันเมื่อมีค่าว่าง — ไม่สอนใน V1, ชุดข้อมูลไม่มี NULL (บันทึกเป็นข้อจำกัด)
- **Independent:** ตอบคำถามข้อมูล 2 ข้อด้วย query เดียวต่อข้อ (เฉลี่ย, สูงสุด)
- **Mistakes:** คาดว่า AVG ได้หลายแถว · เอาชื่อคอลัมน์ปกติมาใส่คู่กับ aggregate (ต้องใช้ GROUP BY — not yet)
- **Boundary:** allowed = COUNT, AVG, MAX, MIN + WHERE · not yet = GROUP BY, HAVING, SUM ที่ปัดเศษ
- **Evidence:** ค่าที่ได้ตรงคำตอบที่ตรวจแล้ว (tolerance สำหรับ AVG)
- **Game:** OPTIONAL_GAME — ใช้เป็นเครื่องมือหนึ่งใน Data Detective
- **Future module:** Data Query Lab
- **เชื่อม:** มีเครื่องมือครบ → ใช้แก้โจทย์ข้อมูลจริง

### SQL 6 · `db-sql-challenge` · DATA CHALLENGE
- core · ~50 min · prereq `db-sql-order-limit`, `db-sql-aggregate` · skill `skill-db-sql-data-question`
- **เรียนอะไร:** อ่านคำถาม → เลือก clause → ตรวจว่าผลตอบคำถามจริง
- **มองเห็นได้อย่างไร:** ชุดข้อมูลใหม่ (เช่น ร้านค้า/ห้องสมุดสมมติ) + คำถาม 4–5 ข้อ; แต่ละข้อมีช่อง “ผลของคุณ” เทียบกับ “สิ่งที่คำถามต้องการ”
- **Scaffold:** L4 คำใบ้ระดับ clause (“ข้อนี้ต้องกรองก่อนไหม?”) · L5 อิสระ
- **Feedback:** query รันได้แต่ตอบคำถามผิด → บอกว่าผลต่างตรงไหน (เกิน/ขาดแถว, ลำดับผิด) ไม่บอก query
- **Independent:** ตอบคำถามทุกข้อในชุด
- **Evidence:** ข้อที่ผ่าน, clause ที่ต้องใช้คำใบ้, retries
- **Game:** **GAME_HIGH_VALUE** — Data Detective: คลี่คลายปริศนาโดยการ query เท่านั้น การหาเบาะแส = การเขียน query
- **Future module:** Data Query Lab (โหมดชาเลนจ์)
- **เชื่อม:** V2: เปลี่ยนข้อมูล (INSERT/UPDATE), GROUP BY, JOIN

---

## 8. Networking (subject `networking`, 6 lessons, 7 skills)

Skills
- `skill-net-devices` — บอกหน้าที่ของ client, server, switch, router
- `skill-net-topology` — ต่ออุปกรณ์ให้ข้อมูลเดินทางได้
- `skill-net-ip-address` — รูปแบบ IPv4 และความไม่ซ้ำในเครือข่าย
- `skill-net-same-network` — ตัดสินว่าสองเครื่องอยู่เครือข่ายเดียวกันไหม (เฉพาะ /24 ใน V1)
- `skill-net-gateway` — default gateway และการส่งข้ามเครือข่ายผ่าน router
- `skill-net-dns` — ชื่อโดเมน → DNS → IP → เชื่อมต่อ
- `skill-net-troubleshoot` — หาจุดเสียทีละชั้น: สาย → IP → gateway → DNS

Simulation only: a deterministic TypeScript model. **No real network traffic, ping or DNS lookups.**
V1 scope: IPv4, `/24` (255.255.255.0) only. Binary subnetting, other masks, IPv6, DHCP, NAT → V2.

### NET 1 · `net-devices` · อุปกรณ์ในเครือข่ายทำอะไร
- foundation · ~35 min · prereq — · skills `skill-net-devices`, `skill-net-topology`
- **เรียนอะไร:** client ขอ, server ตอบ, switch ต่อเครื่องในวงเดียวกัน, router ต่อระหว่างวง
- **ทำไมต้องรู้:** ทุกครั้งที่เปิดเว็บ ข้อมูลเดินผ่านอุปกรณ์เหล่านี้
- **มองเห็นได้อย่างไร:** ลากอุปกรณ์ + ลากสายเชื่อม → กด SEND → packet วิ่งตามสายจริงบนจอ
- **Scaffold:** L1 กด SEND บนเครือข่ายที่ต่อไว้แล้ว · L2 ถอดสายหนึ่งเส้นแล้วส่งใหม่ · L3 ต่อสายที่หายไป · L4 ต่อเครือข่ายเล็กเองจากอุปกรณ์ที่ให้
- **Feedback:** packet หยุดตรงจุดที่ไม่มีสาย พร้อมข้อความ “ไม่มีทางไปต่อจากตรงนี้”
- **Independent:** ต่อ PC 2 เครื่อง + switch + server ให้ทั้งสองเครื่องส่งถึง server
- **Mistakes:** คิดว่า switch กับ router ทำหน้าที่เดียวกัน · ต่อ PC ตรงกับ PC แล้วคิดว่าถึงอินเทอร์เน็ต · คิดว่า server เป็นเครื่องพิเศษทางกายภาพ
- **Boundary:** allowed = 4 อุปกรณ์, สาย, ส่งข้อความ · not yet = wireless, MAC, OSI layers
- **Evidence:** topology เชื่อมถึงกัน, ผลการส่ง packet, ลองกี่ครั้ง
- **Game:** NO_GAME_NEEDED
- **Future module:** Packet Visualizer (โหมดต่อสาย)
- **เชื่อม:** packet รู้ได้อย่างไรว่าต้องไปเครื่องไหน → ที่อยู่ (IP)

### NET 2 · `net-ip` · IP Address
- foundation · ~35 min · prereq `net-devices` · skill `skill-net-ip-address`
- **เรียนอะไร:** IPv4 = 4 ตัวเลข 0–255 คั่นด้วยจุด; ต้องไม่ซ้ำในเครือข่าย
- **มองเห็นได้อย่างไร:** ป้าย IP บนทุกอุปกรณ์; packet มี “ซอง” ที่เขียนที่อยู่ผู้ส่ง/ผู้รับ
- **Scaffold:** L1 ส่งแล้วอ่านซอง · L2 แก้ IP ปลายทางแล้วดู packet ไปเครื่องอื่น · L3 หา IP ที่ใช้ไม่ได้ (`192.168.1.300`) · L4 ตั้ง IP ให้เครื่องใหม่
- **Feedback:** IP ซ้ำ → สองเครื่องกะพริบพร้อมคำอธิบาย “ที่อยู่ซ้ำ packet ไม่รู้จะไปบ้านไหน”; ค่าเกิน 255 → ช่องนั้นถูกชี้ตรงตำแหน่ง
- **Independent:** ตั้ง IP ให้ 3 เครื่องในเครือข่ายเดียว ไม่ซ้ำ และถูกรูปแบบ
- **Mistakes:** ตัวเลขเกิน 255 · IP ซ้ำ · ใส่ 3 หรือ 5 ส่วน
- **Boundary:** allowed = IPv4 รูปแบบ, ความไม่ซ้ำ · not yet = public/private ละเอียด, IPv6, DHCP
- **Evidence:** การตั้งค่าที่ใช้ได้, ผลการส่ง
- **Game:** NO_GAME_NEEDED
- **Future module:** Packet Visualizer
- **เชื่อม:** บางเครื่องส่งถึงกันตรง ๆ บางเครื่องไม่ได้ → “วงเดียวกัน” คืออะไร

### NET 3 · `net-subnet` · เครือข่ายเดียวกัน / ต่างเครือข่าย
- core · ~40 min · prereq `net-ip` · skill `skill-net-same-network`
- **เรียนอะไร:** ด้วย /24 (255.255.255.0) สามส่วนแรกเหมือนกัน = วงเดียวกัน ส่งตรงผ่าน switch ได้; ต่างกัน = ต้องผ่าน router
- **มองเห็นได้อย่างไร:** แต่ละเครือข่ายเป็น “พื้นที่สี” พร้อมป้ายชื่อ `192.168.1.x`; เปลี่ยน IP → เครื่องย้ายพื้นที่บนจอ
- **Scaffold:** L1 ส่งในวงเดียวกัน/ข้ามวง ดูความต่าง · L2 แก้ส่วนที่ 3 ของ IP แล้วดูเครื่องย้ายพื้นที่ · L3 จัดกลุ่มเครื่องลงพื้นที่ · L4 แก้เครื่องที่อยู่ผิดวง
- **Feedback:** ส่งข้ามวงโดยไม่มี router → packet หยุดที่ขอบพื้นที่ “ต้องมีคนพาข้ามวง”; พื้นที่มีป้ายข้อความ ไม่ใช้สีอย่างเดียว
- **Independent:** ตัดสินคู่ IP 5 คู่ว่าวงเดียวกันไหม และแก้เครื่องหนึ่งให้คุยกับเพื่อนในวงได้
- **Mistakes:** ดูแค่ส่วนแรก · คิดว่าเลขใกล้กันคือวงเดียวกัน (`192.168.1.250` กับ `192.168.2.1`)
- **Boundary:** allowed = /24 เท่านั้น · not yet = ฐานสอง, /16 /25 ฯลฯ, การคำนวณ subnet
- **Evidence:** การตัดสินแต่ละคู่, ผลการส่งหลังแก้
- **Game:** NO_GAME_NEEDED
- **Future module:** Packet Visualizer (มุมมองพื้นที่เครือข่าย)
- **เชื่อม:** ข้ามวงต้องผ่าน router — เครื่องรู้ได้อย่างไรว่าต้องส่งให้ใคร → gateway

### NET 4 · `net-gateway` · Default Gateway / Routing
- core · ~45 min · prereq `net-subnet` · skill `skill-net-gateway`
- **เรียนอะไร:** ปลายทางอยู่นอกวง → ส่งให้ default gateway (ขาของ router ในวงตัวเอง) → router ส่งต่อ
- **มองเห็นได้อย่างไร:** PC → gateway → router → ปลายทาง โดยแต่ละ hop แสดงการตัดสินใจ (“ปลายทางอยู่นอกวง → ส่งให้ 192.168.1.1”)
- **Scaffold:** L1 ส่งข้ามวงที่ตั้งค่าถูก · L2 เปลี่ยน gateway เป็นค่าผิดแล้วส่ง · L3 เลือก gateway ที่ถูกจากรายการ · L4 แก้เส้นทางที่เสียเอง
- **Feedback:** gateway ผิด → packet หยุดที่ PC พร้อมเหตุผลตรงจุด (“gateway 192.168.1.254 ไม่มีอยู่ในวงนี้” / “gateway อยู่นอกวง ส่งไม่ถึง”)
- **Independent:** แก้เครือข่ายที่ PC ส่งในวงได้แต่ส่งออกนอกวงไม่ได้
- **Mistakes:** ใส่ IP ของ server เป็น gateway · gateway อยู่ต่างวงกับ PC · คิดว่าส่งในวงก็ต้องผ่าน gateway
- **Boundary:** allowed = default gateway, router 2 ขา, routing แบบเส้นทางเดียว · not yet = routing table หลายเส้นทาง, protocol การหาเส้นทาง
- **Evidence:** ค่า gateway ที่ตั้ง, hop ที่ packet ไปถึง, การส่งสำเร็จ
- **Game:** OPTIONAL_GAME — ส่วนหนึ่งของ Network Rescue
- **Future module:** Packet Visualizer (มุมมอง hop)
- **เชื่อม:** คนจำตัวเลข IP ไม่ไหว → ใช้ชื่อแทน (DNS)

### NET 5 · `net-dns` · DNS
- core · ~40 min · prereq `net-gateway` · skill `skill-net-dns`
- **เรียนอะไร:** ผู้ใช้พิมพ์ `example.com` → ถาม DNS server → ได้ IP → เชื่อมต่อด้วย IP
- **มองเห็นได้อย่างไร:** ลำดับเห็นได้ 4 ขั้น: ชื่อ → คำถามไป DNS → คำตอบ IP → packet ไปปลายทาง; แสดงสองเส้นทาง (ไป DNS, ไป server)
- **Scaffold:** L1 พิมพ์ชื่อแล้วดูลำดับ · L2 ตั้ง DNS server ผิดแล้วดูว่าหยุดตรงไหน · L3 จับคู่ชื่อกับ IP จากคำตอบ · L4 แก้ DNS ที่ตั้งผิด
- **Feedback:** DNS ผิด → หยุดที่ขั้น “ถามชื่อ” (ยังไม่เคยออกไปหา server) แยกจากกรณี gateway ผิดชัดเจน; ใส่ IP ตรงแล้วเข้าได้ → แสดงว่าปัญหาคือ “การแปลงชื่อ” ไม่ใช่การเชื่อมต่อ
- **Independent:** อธิบาย/แก้กรณี “เข้าเว็บด้วยชื่อไม่ได้ แต่ด้วย IP ได้”
- **Mistakes:** คิดว่า DNS เก็บหน้าเว็บ · คิดว่าชื่อโดเมนส่งตรงถึง server ได้เลย
- **Boundary:** allowed = A record แนวคิด, DNS server หนึ่งตัว · not yet = ลำดับชั้น DNS, cache, record ชนิดอื่น
- **Evidence:** จุดหยุดที่ระบุ, ค่าที่แก้, ผลหลังแก้
- **Game:** NO_GAME_NEEDED
- **Future module:** Packet Visualizer (มุมมอง DNS)
- **เชื่อม:** รู้ครบทุกชั้น → วินิจฉัยเครือข่ายที่เสีย

### NET 6 · `net-troubleshoot` · NETWORK TROUBLESHOOTING CHALLENGE
- core · ~50 min · prereq `net-dns` · skill `skill-net-troubleshoot`
- **เรียนอะไร:** วินิจฉัยทีละชั้น: สาย → IP → วงเดียวกัน → gateway → DNS; เปลี่ยนทีละอย่างแล้วส่งซ้ำ
- **มองเห็นได้อย่างไร:** เครือข่ายเสีย 4–5 แบบ; ทุกครั้งที่ส่ง เห็นจุดที่ packet หยุด; บันทึก “ฉันเปลี่ยนอะไร → ผลเป็นอย่างไร”
- **Scaffold:** L4 คำใบ้เป็นคำถาม (“packet ออกจาก PC ได้ไหม?”) · L5 อิสระ
- **Feedback:** เปลี่ยนหลายอย่างพร้อมกัน → ระบบยังยอมให้ส่ง แต่บอกว่า “เปลี่ยน 3 อย่างพร้อมกัน — จะรู้ไหมว่าอันไหนแก้ปัญหา?”
- **Independent:** แก้ทุกกรณี (IP ผิด, gateway ผิด, DNS ผิด, สายหาย) และระบุสาเหตุ
- **Evidence:** สาเหตุที่ระบุถูกต่อกรณี, จำนวนการเปลี่ยนก่อนแก้ได้, การเปลี่ยนทีละอย่าง
- **Game:** **GAME_HIGH_VALUE** — Network Rescue: ช่วยเครือข่ายที่ล่มด้วยการส่ง packet สังเกต และแก้ทีละจุด การกู้ = การวินิจฉัย
- **Future module:** Packet Visualizer (โหมดชาเลนจ์)
- **เชื่อม:** V2: DHCP, NAT, subnet ละเอียด

---

## 9. Diagnostic design (NOT activated)

Follows `DiagnosticItem` exactly: 2 items per skill (`basic` = prerequisite idea, `core` = skill as taught),
multiple choice, optional `code`, each mapped to ONE skill and its first teaching lesson.
31 skills → **62 items** when authored. Items must not copy lesson practice (existing test rule).

| Skill | basic measures | core measures |
|---|---|---|
| skill-web-html-element | which part is the content | what a snippet shows on the page |
| skill-web-html-text-structure | heading vs paragraph purpose | choose correct heading level for an outline |
| skill-web-html-nesting | spot the unclosed tag | choose correctly nested snippet |
| skill-web-html-attributes | identify attribute name vs value | predict what changes when a value changes |
| skill-web-html-links-images | what `alt` is for | fix a broken `img`/`a` snippet |
| skill-web-html-page-structure | where visible content belongs | head vs header |
| skill-web-html-page-build | which requirement a page misses | pick the page that meets all requirements |
| skill-web-css-rule | label selector/property/value | predict the visual result of a rule |
| skill-web-css-selectors | `p` vs `.note` | which elements a selector matches |
| skill-web-css-color-text | which property changes text colour | pick the readable (high-contrast) pair |
| skill-web-css-box-model | order of layers | padding or margin for a described fix |
| skill-web-css-flex-layout | flex goes on container or item | predict position from justify/align |
| skill-web-css-responsive | px vs max-width | which rule removes horizontal scroll |
| skill-web-js-events | what triggers the function | spot `show()` vs `show` bug |
| skill-web-js-state | value after N clicks | why counter resets (declared inside) |
| skill-web-js-dom | what `querySelector` returns | predict the page after `classList.toggle` |
| skill-web-js-conditions | `=` vs `===` | which branch runs for a given state |
| skill-web-js-interactive-build | order event → state → condition → UI | find the missing step in a feature |
| skill-db-table-structure | row vs column | choose a valid id column |
| skill-db-sql-select | `*` meaning | result columns of a query |
| skill-db-sql-where | quoted text vs number | rows returned at a boundary (`>` vs `>=`) |
| skill-db-sql-order-limit | ASC vs DESC | query that returns the true top 3 |
| skill-db-sql-aggregate | many rows → one value | value of AVG on a small table |
| skill-db-sql-data-question | which clause a question needs | which query answers a question |
| skill-net-devices | switch vs router role | which device a packet needs next |
| skill-net-topology | is the path connected | which missing link breaks delivery |
| skill-net-ip-address | valid IPv4 format | duplicate address consequence |
| skill-net-same-network | same /24? | does this packet need the router |
| skill-net-gateway | what the gateway is | where a packet stops with a wrong gateway |
| skill-net-dns | name → IP | "works by IP, not by name" diagnosis |
| skill-net-troubleshoot | test one change at a time | first layer to check from a symptom |

Activation (later phase): items file per subject, answers machine-verified (§12), `SUBJECT_ORDER` picks
them up from the registry once status is `active`. Diagnostic scoring is unchanged.

---

## 10. Route design (NOT applied)

The current pathway (`pathway-computer-engineering`) lists **admission-exam** requirements with readiness targets.
Web, database and networking skills are not admission exams, so adding them as requirements would distort
honest readiness. Proposal:

| Track (Thai label) | Lessons | Shown where |
|---|---|---|
| เส้นทางพัฒนาเว็บ — Web Development | HTML 1–5 → CSS 1–5 → JS 1–5 (with the cross-links in §3) | เส้นทาง → “ทักษะสายอาชีพ / ปีหนึ่ง” section, separate from admission readiness |
| เส้นทางข้อมูล — Database | SQL 1–6 | same section |
| เส้นทางเครือข่าย — Networking | NET 1–6 | same section |

- Primary navigation stays the five items; tracks appear inside เส้นทาง and เรียน only.
- Next Step may suggest a track lesson only when the learner chose that track (owner decision; Next Step logic unchanged now).
- Portfolio link: `web-html-project`, `web-js-project`, `db-sql-challenge` produce artefacts suitable for the existing programming requirement's "แฟ้มสะสมผลงาน (Portfolio)" — **recommendation only**, needs owner approval before it affects readiness.

---

## 11. Evidence model

Labs report into the existing shapes only — no new learner-state fields, no store migration, no database change.

| Lab signal | Maps to | Notes |
|---|---|---|
| task checker passes on the learner's own work | `PracticeEvidence.solved` += 1 | per practice step |
| learner opened the solution | `PracticeEvidence.revealed` += 1 | practised, not proven |
| hints opened, retries, time | session-local; summarised in feedback | same as current practice items (not persisted separately) |
| final understanding check per skill | `UnderstandingSummary.understood / confused` | existing check flow, existing threshold |
| project checklist (HTML 5, JS 5, SQL 6, NET 6) | one practice step per requirement | partial credit = requirements met, never a single "mastery" |

Per-subject "correct" definitions (what the checker verifies):
- HTML: structure — required elements present, tags closed, nesting valid, required attributes (alt, href).
- CSS: computed style of target elements matches requirement; layout relations (left of / centred / gap ≥); no overflow at 375 px.
- JS: after scripted events (click ×N), DOM and state match the expected result for every test case.
- SQL: query parses; result set equals the verified answer (order-sensitive only when ORDER BY is asked).
- Networking: configuration values; packet delivered or stopped at the expected hop; diagnosis named correctly.

Mastery, review scheduling and Next Step are **not** decided by any lab (unchanged Learning Core).

---

## 12. Verification needed before content can be authored (knowledge-layer impact)

Every knowledge answer needs a machine `verify`. Current kinds: `holds`, `value`, `inequality`, `python`.
New kinds required (TypeScript type change in `src/content/knowledge/types.ts` — **not a database change**):

| Kind | Checked by (test suite) | Runtime in the app |
|---|---|---|
| `html` | parse the answer, assert required elements/attributes/nesting | sandboxed `<iframe srcdoc>` **without** `allow-scripts`; structure via `DOMParser` |
| `css` | computed styles of selectors in a rendered document | same sandboxed iframe |
| `js` | run in an isolated DOM with scripted events, compare DOM/state | `<iframe sandbox="allow-scripts">` **without** `allow-same-origin`, results via `postMessage` — never `eval` in the V2U origin (needs a security review before implementation) |
| `sql` | run against the fixture with real SQLite (Python `sqlite3`, already available in the test environment: SQLite 3.45.1) | recommended: small SELECT-subset interpreter in TypeScript cross-checked against SQLite in tests (same pattern as `branchRunner` vs python3) → **no new dependency**; alternative `sql.js` needs dependency approval |
| `network` | deterministic simulator output | same TypeScript simulator |

Test-side note: `js`/`css` checks need a DOM in Node (e.g. jsdom) or a headless browser — **dev-dependency decision required**.

Sources (to be OPENED and recorded in `src/content/knowledge/sources.ts` before writing content; none verified yet):
MDN Web Docs (HTML, CSS, JavaScript guides) · WHATWG HTML Living Standard · W3C CSS Box Model / Flexbox specs ·
ECMAScript spec (ECMA-262) · SQLite SQL language docs · RFC 791 (IPv4) · RFC 1918 (private addresses) ·
RFC 1122 (host requirements, gateways) · RFC 1034/1035 (DNS) · Thai vocational IT curriculum (สอศ.) — blocked earlier
(`docs/subject-expansion-audit.md` §5), still to be checked.

---

## 13. Game decisions and Codex handoff

| Decision | Lessons |
|---|---|
| **GAME_HIGH_VALUE** | `web-css-flex`, `db-sql-challenge`, `net-troubleshoot` |
| **OPTIONAL_GAME** | `web-html-text`, `web-css-box-model`, `web-js-conditions`, `db-sql-where`, `db-sql-aggregate`, `net-gateway` |
| **NO_GAME_NEEDED** | the other 18 lessons |

Rule applied: recommend a game only where the fun action **is** the learning action. Projects and
"first contact" lessons get no game: their reward is seeing your own result work.

Codex handoff (design only — Game Lab is not modified, no game is registered):

| Game | Lesson / skill | Concept | GameContent needs | Evidence needed |
|---|---|---|---|---|
| Flex Garden (working name) | `web-css-flex` / `skill-web-css-flex-layout` | each level: items + target positions; player types justify/align/direction/gap values to move items into targets | level list (container items, target layout), allowed properties = lesson boundary, verified solution per level, hint ladder from lesson rules | per level: attempts, correct, hints; skill evidence for `skill-web-css-flex-layout` |
| Data Detective | `db-sql-challenge` (+ `db-sql-where`, `db-sql-aggregate`) / `skill-db-sql-data-question` | a case file + fictional dataset; each clue is unlocked by a query whose result answers the clue question | fixture tables, clue questions, verified expected result sets, allowed SQL subset = V1 boundary, hint ladder per clause | per clue: query attempts, correct, hints; skill evidence per clause skill |
| Network Rescue | `net-troubleshoot` (+ `net-gateway`) / `skill-net-troubleshoot` | broken networks; player sends packets, observes the stop point and fixes one setting at a time | topology + fault list, expected stop hop per fault, verified fix, hint ladder by layer | per fault: sends, changes before fix, correct diagnosis, hints |

**GameContent impact: FUTURE_CHANGE_REQUIRED.** GameContent 1.1 is Python-shaped (`code`, `expectedOutput` verified
by python3, `narration` for branches). These games need a subject-neutral payload (levels/fixtures/topologies with
verified expected results). GameEvidence 1.1 (attempts, correct, hints, retries, skillEvidence, no mastery fields)
already fits all three without change. A GameContent 1.2 proposal is **not** created here.

---

## 14. Interactive module handoff (future Claude implementation)

All modules: one concept, one interaction, one immediate result; Thai-first UI; no horizontal scroll at 390 px;
keyboard + touch; visible focus; reduced motion = instant results; every visual result also has a text equivalent.

| Module | One-screen concept | Mobile (≤ 767 px) | Beginner scaffold | Independent mode | Failure feedback | Accessibility |
|---|---|---|---|---|---|---|
| **HTML Live Web Builder** | left blocks/code · right live page; tap code ↔ page region highlight | stacked: code on top, page below, toggle "โค้ด / หน้าเว็บ"; editor stays above the on-screen keyboard | blocks → edit text → fill closing tag → reorder → raw code | empty document + requirement checklist | unmatched tag marked "ยังไม่มีคู่" with the question "ส่วนไหนยังไม่ได้ปิด?" | drag has a keyboard/tap alternative ("วางที่…" menu); preview has an outline text view |
| **CSS Style Lab** | page + rule panel; selector highlights targets; controls ↔ code synced | stacked; controls collapse to one row per property | controls → code shown → edit code → controls removed | requirement list (contrast, spacing, layout, no overflow) | "กฎนี้ไม่มีเป้าหมาย", box-layer diagram, overflow marker | all controls are native inputs with labels; layout changes announced in text ("ปุ่มย้ายไปขวา") |
| **JS Event Playground** | page with button + code + trace strip (click → event → line → state → DOM) | stacked; trace becomes a vertical list | run prepared code → edit values → fill blank → write handler | feature with test cases that replay clicks | trace stops at the exact failing stage with a Thai reason | trace is a text list (not only animation); buttons reachable by keyboard |
| **Data Query Lab** | source table · query editor · result table, rows linked by highlight | stacked; tables scroll inside their own box (never the page) | run given query → change one value → fill clause → write query | question set with result comparison | unknown column → list of real columns; wrong result → "เกิน/ขาด N แถว" | tables use real `<table>` headers; filtered rows marked with text, not colour only |
| **Packet Visualizer** | topology canvas · settings panel · SEND; packet path with stop point | canvas fits width; settings in a bottom sheet; tap a device to edit | send on working net → break one setting → choose fix → configure | broken network set, change log | packet stops at the failing hop with reason; "เปลี่ยนทีละอย่าง" nudge | every send produces a text hop log; device editing via form fields; animation skippable |

---

## 15. Validation (performed for this design)

- 27 lesson ids, 31 skill ids, 7 topic ids — all unique; none collide with the 15 existing lessons, 23 skills or existing topics.
- Every prerequisite id exists in this design; the graph is acyclic.
- Existing curriculum untouched: still 15 lessons, subjects math / physics / programming.
- No concept was added to the existing subjects; the Python link from JS 4 is "related", not a prerequisite.

## 16. What implementation will need (later, after approval)

1. Owner decision: subject ids (§0, recommended A), Route placement (§10), JS/CSS test DOM dependency (§12), sql.js vs interpreter (§12).
2. Types: add subject ids to `SubjectId`/`CurriculumSubjectId` (12 exhaustive maps will flag), registry entry as `proposed` first, design tokens.
3. Knowledge records + opened sources + new `verify` kinds, then curriculum entries, store study lessons (`studyLessonTitle`), studio subject entries (`web`/`db`/`net`).
4. Labs in the order HTML Builder → Style Lab → Event Playground → Query Lab → Packet Visualizer.
5. Diagnostic items and Route tracks only in their own approved phases.
