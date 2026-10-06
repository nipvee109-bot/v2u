/** Phase 76: Web track — HTML reference track (HTML Live Web Builder).
 *  - 5 lessons / 7 skills with the designed ids, prerequisites and skill mapping
 *  - HTML answers checked on a real DOM (jsdom), never by exact string; specific structural feedback
 *  - every builder step: starter fails, model solution passes; mini project accepts different pages
 *  - safe preview: allowlisted tags/attributes only, no script, no navigation, no raw HTML injection
 *  - evidence uses the existing shapes only; existing 15 lessons, Diagnostic and admission readiness unchanged */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';
import { JSDOM } from 'jsdom';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf-8');
globalThis.React = React; // jiti compiles JSX with the classic runtime
globalThis.DOMParser = new JSDOM('').window.DOMParser; // the browser's parser, in Node
const jiti = createJiti(import.meta.url, { jsx: true });
const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i], get length() { return mem.size; } };
globalThis.window = globalThis.window ?? { localStorage: globalThis.localStorage, addEventListener() {}, removeEventListener() {} };

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (err) { console.log(`  ❌ ${name}\n     ${err.message}`); failed++; }
}

console.log('=== Phase 76: HTML reference track ===\n');
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const CE = await jiti.import(path.join(root, 'src/curriculum/engine.ts'));
const H = await jiti.import(path.join(root, 'src/web/html.ts'));
const K = await jiti.import(path.join(root, 'src/content/knowledge/index.ts'));
const IR = await jiti.import(path.join(root, 'src/interactive/registry.ts'));
const IE = await jiti.import(path.join(root, 'src/interactive/engine.ts'));
const S = await jiti.import(path.join(root, 'src/interactive/studio/scripts.ts'));
const PC = await jiti.import(path.join(root, 'src/interactive/studio/practiceCheck.ts'));
const W = await jiti.import(path.join(root, 'src/interactive/studio/wrongAnswer.ts'));
const SR = await jiti.import(path.join(root, 'src/subjects/registry.ts'));
const D = await jiti.import(path.join(root, 'src/diagnostic/engine.ts'));
const { DIAGNOSTIC_ITEMS } = await jiti.import(path.join(root, 'src/diagnostic/items.ts'));
const { initialLessons } = await jiti.import(path.join(root, 'src/data/initialData.ts'));
const { getNextStep } = await jiti.import(path.join(root, 'src/utils/nextStep.ts'));
const { useStore } = await jiti.import(path.join(root, 'src/store/useStore.ts'));
const HB = await jiti.import(path.join(root, 'src/components/learning/studio/HtmlBuilder.tsx'));

const DESIGN = [
  ['web-html-elements', ['skill-web-html-element'], []],
  ['web-html-text', ['skill-web-html-text-structure', 'skill-web-html-nesting'], ['web-html-elements']],
  ['web-html-links-images', ['skill-web-html-attributes', 'skill-web-html-links-images'], ['web-html-text']],
  ['web-html-page-structure', ['skill-web-html-page-structure'], ['web-html-links-images']],
  ['web-html-project', ['skill-web-html-page-build'], ['web-html-page-structure']],
];
const WEB = C.lessons.filter((l) => l.subjectId === 'web');
const check = (html, ...req) => H.checkHtml(html, req);
const msgOf = (html, ...req) => check(html, ...req).results.find((r) => !r.ok)?.message ?? '';

console.log('1. Curriculum: subject web, module html, designed ids');
await test('all 5 HTML lessons exist in order, with the ids, skills and prerequisites from docs/curriculum-expansion-v1.md', () => {
  assert.deepStrictEqual(C.topics.find((t) => t.id === 'web-html').lessonIds, DESIGN.map((d) => d[0]));
  for (const [id, skills, pre] of DESIGN) {
    const l = C.lessons.find((x) => x.id === id);
    assert(l && l.subjectId === 'web' && l.topicId === 'web-html', id);
    assert.deepStrictEqual(l.skillIds, skills, `${id} skills`);
    assert.deepStrictEqual(l.prerequisites, pre, `${id} prerequisites`);
    for (const s of skills) assert(read('docs/curriculum-expansion-v1.md').includes(s), `${s} is a designed id`);
  }
  assert.deepStrictEqual(C.skills.filter((s) => s.subjectId === 'web').map((s) => s.id).sort(), DESIGN.flatMap((d) => d[1]).sort());
  assert.deepStrictEqual(CE.validateCurriculum(), []);
});
await test('web is an optional track: not in the Diagnostic, not an admission requirement', () => {
  assert.strictEqual(SR.getSubject('web').status, 'track');
  assert(SR.isTrackSubject('web') && !SR.isTrackSubject('math'));
  assert.deepStrictEqual(D.SUBJECT_ORDER, ['math', 'physics', 'programming']);
  assert(!DIAGNOSTIC_ITEMS.some((i) => i.subjectId === 'web'));
  assert(!C.pathway.requirements.some((r) => r.subjectId === 'web'));
});
await test('existing 15 admission lessons, their skills and the pathway are byte-for-byte unchanged', () => {
  const adm = C.lessons.filter((l) => l.subjectId !== 'web');
  assert.strictEqual(adm.length, 15);
  const hash = crypto.createHash('sha256').update(JSON.stringify({ lessons: adm, skills: C.skills.filter((s) => s.subjectId !== 'web'), pathway: C.pathway })).digest('hex');
  assert.strictEqual(hash, '4334744055ec6803b803cee81473c8ba4ea2a90dc19b385870b739a2681f2e6e'); // computed from 07aa8a6/bbdf270
});
await test('no other new subject: CSS / JavaScript / SQL / Networking not implemented', () => {
  assert.deepStrictEqual(C.subjects.map((s) => s.id), ['math', 'programming', 'physics', 'web']);
  assert.deepStrictEqual(C.subjects.find((s) => s.id === 'web').topicIds, ['web-html']);
});

console.log('\n2. HTML verification is structural (DOM), not string equality');
await test('heading / paragraph requirements; formatting, attributes, case and whitespace do not matter', () => {
  const req = [{ kind: 'has', tag: 'h1' }, { kind: 'has', tag: 'p' }, { kind: 'closed' }];
  for (const ok of ['<h1>Hi</h1><p>Hello</p>', '<h1 class="title">Hi</h1>\n\n   <p>Hello</p>', '<H1>Hi</H1><P>Hello</P>', "<h1 id='x'>Hi</h1><p>x</p>"]) assert(check(ok, ...req).passed, ok);
  assert(!check('<p>Hello</p>', ...req).passed);
  assert.match(msgOf('<p>Hello</p>', ...req), /ยังไม่มี <h1>/);
  assert.match(msgOf('<h1>Hi</h1>', ...req), /ยังไม่มี <p>/);
});
await test('missing closing structure → the exact unclosed tag is named (not a generic syntax error)', () => {
  assert.strictEqual(msgOf('<h1>Hello', { kind: 'closed' }), 'ตอนนี้มี <h1> เปิดอยู่ แต่ยังไม่มี </h1> ที่ปิดมัน');
  assert.strictEqual(msgOf('<p>ฉันชอบ <strong>ดนตรี</p></strong>', { kind: 'closed' }), '<strong> เปิดอยู่ข้างใน <p> จึงต้องปิด </strong> ก่อน </p>');
  assert.match(msgOf('<img src="cat.png" alt="x"></img>', { kind: 'closed' }), /<img> ไม่มีแท็กปิด/);
  assert.match(msgOf('<p>a</p></p>', { kind: 'closed' }), /ไม่มี <p> คู่ของมัน/);
  assert.match(msgOf('<h1 Hello</h1>', { kind: 'closed' }), /<h1 ยังเขียนไม่ครบ/);
  assert.match(msgOf('<img src="cat.png alt="x">', { kind: 'closed' }), /" ไม่ครบคู่/);
  // the browser would silently "fix" these — the source tokens still show the learner what is wrong
  const doc = H.parseDoc('<h1>Hello\n<p>x</p>');
  assert.strictEqual(doc.querySelector('h1 p')?.textContent, 'x', 'unclosed h1 swallows the paragraph in a real parser');
  const t = H.matchTags('<h1>Hello</h1>');
  assert.strictEqual(t.pairs.get(0), 1);
});
await test('img alt / src and link href checks with specific, actionable messages', () => {
  assert.strictEqual(msgOf('<img src="cat.png">', { kind: 'attr', tag: 'img', attr: 'alt' }), 'รูปนี้ยังไม่มี alt ซึ่งช่วยอธิบายรูปเมื่อมองไม่เห็นภาพ');
  assert(check('<img alt="แมว" src="cat.png">', { kind: 'attr', tag: 'img', attr: 'alt' }).passed, 'attribute order is free');
  assert(!check('<img src="cat.png" alt="  ">', { kind: 'attr', tag: 'img', attr: 'alt' }).passed, 'blank alt is not a description');
  assert.match(msgOf('<a>ข่าว</a>', { kind: 'attr', tag: 'a', attr: 'href' }), /ลิงก์ “ข่าว” ยังไม่มี href/);
  assert(check('<a href="school.html">โรงเรียน</a>', { kind: 'attr-value', tag: 'a', attr: 'href', value: 'school.html' }).passed);
  assert.match(msgOf('<a href="home.html">x</a>', { kind: 'attr-value', tag: 'a', attr: 'href', value: 'school.html' }), /ตอนนี้ href="home.html"/);
});
await test('structural section checks: inside / contains / written-inside / one main / order', () => {
  assert(check('<main><section><h2>a</h2></section></main>', { kind: 'inside', tag: 'section', parent: 'main' }, { kind: 'contains', tag: 'section', child: 'h2' }).passed);
  assert.match(msgOf('<section><h2>a</h2></section><main></main>', { kind: 'inside', tag: 'section', parent: 'main' }), /ยังอยู่นอก <main>/);
  assert.match(msgOf('<main><section><p>a</p></section></main>', { kind: 'contains', tag: 'section', child: 'h2' }), /ยังไม่มี <h2>/);
  assert.match(msgOf('<main></main><main></main>', { kind: 'has', tag: 'main', max: 1 }), /เนื้อหาหลักได้ส่วนเดียว/);
  // html/head/body: the parser always creates them, so these checks read what the learner WROTE
  assert(!check('<h1>x</h1>', { kind: 'has', tag: 'body' }).passed);
  assert(check('<body><h1>x</h1></body>', { kind: 'has', tag: 'body' }).passed);
  assert(!check('<h1>x</h1><html><body></body></html>', { kind: 'written-inside', tag: 'h1', parent: 'body' }).passed);
  assert(check('<html><body><h1>x</h1></body></html>', { kind: 'written-inside', tag: 'h1', parent: 'body' }).passed);
  assert.match(msgOf('<p>a</p><h1>b</h1>', { kind: 'before', first: 'h1', then: 'p' }), /ลองสลับลำดับ/);
});
await test('every knowledge answer for the web lessons is verified on the DOM; practice accepts any valid HTML', () => {
  let n = 0;
  for (const id of DESIGN.map((d) => d[0])) {
    const k = K.getLessonKnowledge(id);
    const items = [...k.workedExamples, ...k.guided, ...k.independent, ...k.checks];
    for (const it of items) {
      if (!it.verify) continue;
      assert.strictEqual(it.verify.kind, 'html', `${id}/${it.id}`);
      const r = H.checkHtml(it.verify.html, it.verify.require);
      assert(r.passed, `${id}/${it.id}: ${r.results.filter((x) => !x.ok).map((x) => x.message).join(' | ')}`);
      if ('code' in it && it.code && !('choices' in it)) assert.strictEqual(it.verify.html, it.code, `${id}/${it.id} shown code = verified code`);
      // when the correct choice IS html, the verified snippet must be exactly that choice
      if ('choices' in it && it.choices[it.correctIndex].startsWith('<') && !it.code) assert.strictEqual(it.choices[it.correctIndex], it.verify.html, `${id}/${it.id}: verify matches the correct choice`);
      n++;
    }
    for (const p of [...k.guided, ...k.independent]) {
      assert(p.verify, `${id}/${p.id} must be machine-checked`);
      assert.strictEqual(PC.checkPractice(p, { html: p.verify.html }), 'correct', `${id}/${p.id}`);
      assert.strictEqual(PC.checkPractice(p, { html: '<div></div>' }), 'wrong', `${id}/${p.id} wrong`);
      assert(W.diagnoseWrong(p, { html: '<div></div>' }), `${id}/${p.id} explains what is missing`);
    }
    assert(items.filter((x) => x.verify).length / items.length >= 0.8, `${id}: verified coverage`);
  }
  assert(n >= 60, `${n} verified HTML answers`);
});

console.log('\n3. HTML Live Web Builder steps (scaffolding)');
const steps = (id) => IR.getInteractiveLesson(id).steps.filter((s) => s.interaction?.kind === 'html');
await test('every builder step: starter does NOT pass, model solution DOES pass, blocks are real HTML', () => {
  for (const [id] of DESIGN) {
    for (const s of steps(id)) {
      const i = s.interaction;
      assert(!check(i.starter, ...i.requirements).passed, `${id}/${s.id}: starter already passes`);
      const sol = check(i.solution, ...i.requirements);
      assert(sol.passed, `${id}/${s.id}: ${sol.results.filter((x) => !x.ok).map((x) => x.message).join(' | ')}`);
      for (const b of i.blocks ?? []) assert(H.tokenize(b.html).length > 0 && b.label, `${id}/${s.id}: block ${b.html}`);
    }
  }
  assert.deepStrictEqual(IR.validateInteractiveLessons(), []);
});
await test('scaffolding shrinks: L1 prepared blocks → L2 fix pieces → L3 attributes → L4 regions → L5 free building', () => {
  assert.deepStrictEqual(steps('web-html-elements').map((s) => s.interaction.focus), ['blocks', 'blocks', 'anatomy', 'blocks']);
  assert(steps('web-html-elements')[0].interaction.blocks[0].html === '<h1>Hi</h1>' && steps('web-html-elements')[0].interaction.starter === '');
  assert.deepStrictEqual(steps('web-html-text').map((s) => s.interaction.focus), ['blocks', 'anatomy', 'anatomy', 'free']);
  assert.strictEqual(steps('web-html-text')[1].interaction.starter.startsWith('<h1>Hello'), true, 'HTML 2 shows <h1>Hello without its closing tag');
  assert(steps('web-html-links-images').filter((s) => s.interaction.focus === 'attributes').length === 3);
  assert(steps('web-html-page-structure').every((s) => s.interaction.focus === 'regions'));
  const proj = steps('web-html-project');
  assert.strictEqual(proj.length, 1);
  assert.strictEqual(proj[0].interaction.focus, 'free');
  // every studio script uses every authored step, explanations come after the first hands-on widget
  for (const [id] of DESIGN) {
    const sc = S.getStudioScript(id);
    assert.strictEqual(sc.subject, 'web');
    const used = new Set(sc.chunks.flatMap((c) => (c.kind === 'step' ? [c.stepId] : c.kind === 'widget' && 'stepId' in c.widget ? [c.widget.stepId] : [])));
    for (const st of IR.getInteractiveLesson(id).steps) assert(used.has(st.id), `${id}: ${st.id}`);
    if (id !== 'web-html-project') assert.strictEqual(sc.chunks[1].kind, 'widget', `${id}: learner acts before reading`);
  }
});
await test('mini project: different creative pages pass; structure problems fail with a specific reason', () => {
  const req = steps('web-html-project')[0].interaction.requirements;
  const mine = '<header><h1>เจน</h1></header><main><section><h2>ฉันคือใคร</h2><p>เรียนการตลาด ชอบทำคลิปสั้นและถ่ายภาพ</p></section><section><h2>ติดต่อ</h2><img src="school.png" alt="วิทยาลัยของฉัน"><a href="contact.html">ติดต่อฉัน</a></section></main><footer></footer>';
  const other = '<header><h1>Kim</h1></header>\n<main>\n<section><h2>Links</h2><p><a href="cv.html">My CV page and portfolio</a></p></section>\n<section><h2>Photo</h2><img alt="mountain trip" src="mountain.png"></section>\n</main>';
  assert(check(mine, ...req).passed && check(other, ...req).passed, 'different text, order and images all pass');
  assert.strictEqual(msgOf(mine.replace(' alt="วิทยาลัยของฉัน"', ''), ...req), 'รูปนี้ยังไม่มี alt ซึ่งช่วยอธิบายรูปเมื่อมองไม่เห็นภาพ');
  assert.match(msgOf(mine.replace('<h2>ติดต่อ</h2>', '<h1>ติดต่อ</h1>'), ...req), /หัวข้อหลักแค่อันเดียว/);
  assert.match(msgOf(mine.replace('href="contact.html"', ''), ...req), /ยังไม่มี href/);
});

console.log('\n4. Safe preview');
await test('preview keeps only lesson tags/attributes: no script, no event handlers, no iframe, no style', () => {
  const p = H.parseSafe('<script>alert(1)</script><h1 onclick="steal()" style="color:red">Hi</h1><iframe src="x"></iframe><img src=x onerror=alert(1) alt="cat"><a href="javascript:alert(1)">go</a><form><input></form><ul><li>item</li></ul>');
  const json = JSON.stringify(p);
  assert(!/script|onclick|onerror|steal|iframe|style|form|input/.test(json.replace(/"unsupported":\[[^\]]*\]/, '')), json);
  assert.deepStrictEqual(p.body.map((n) => n.tag ?? 'text'), ['h1', 'img', 'a', 'text']);
  assert(p.unsupported.includes('iframe') && p.unsupported.includes('ul'));
  assert.deepStrictEqual(p.body[1].attrs, { src: 'x', alt: 'cat' });
  assert.strictEqual(p.body[2].attrs.href, '', 'javascript: links are dropped');
  assert(p.unsupported.includes('javascript:'));
});
await test('builder never injects raw HTML, never navigates, and only draws pictures from the lesson set', () => {
  const src = read('src/components/learning/studio/HtmlBuilder.tsx') + read('src/web/html.ts');
  assert(!/dangerouslySetInnerHTML|innerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function/.test(src));
  assert(read('src/components/learning/studio/HtmlBuilder.tsx').includes('href="#"') && read('src/components/learning/studio/HtmlBuilder.tsx').includes('e.preventDefault(); onLink('));
  assert(!/https?:\/\//.test(read('src/components/learning/studio/HtmlBuilder.tsx')), 'no external image or link');
  assert.deepStrictEqual(Object.keys(H.SAFE_IMAGES).sort(), ['cat.png', 'laptop.png', 'mountain.png', 'school.png']);
});
await test('server render: code stays visible beside the page; unclosed tag labelled in text; text equivalent present', () => {
  const fix = steps('web-html-text').find((s) => s.id === 'fix-close');
  const out = renderToStaticMarkup(React.createElement(HB.HtmlBuilder, { interaction: fix.interaction, saveKey: 't/fix', result: IE.EMPTY_RESULT, onAnswer() {}, onHint() {}, onReveal() {} }));
  assert.match(out, /<textarea[^>]*data-testid="html-code"[^>]*>&lt;h1&gt;Hello/);
  assert.match(out, /data-testid="html-preview"/);
  assert.match(out, /<h1[^>]*data-el="h1-0"[^>]*>Hello/);
  assert.match(out, /ยังไม่มีคู่/, 'unclosed tag marked in words, not colour only');
  assert.match(out, /ส่วนไหนยังไม่ได้ปิด\?/);
  assert.match(out, /อ่านหน้าเว็บเป็นข้อความ/);
  assert.match(out, /ยังไม่ผ่าน: /);
  const first = steps('web-html-elements')[0];
  const o1 = renderToStaticMarkup(React.createElement(HB.HtmlBuilder, { interaction: first.interaction, saveKey: 't/first', result: IE.EMPTY_RESULT, onAnswer() {}, onHint() {}, onReveal() {} }));
  assert.match(o1, /draggable="true"/);
  assert.match(o1, /aria-label="วาง หัวข้อหลัก: &lt;h1&gt;Hi&lt;\/h1&gt;"/, 'keyboard / tap alternative to drag, exposing the real HTML');
});

await test('feedback always describes the code on screen: a past "solved" never shows success for code that fails now', () => {
  const fix = steps('web-html-text').find((s) => s.id === 'fix-close').interaction;
  const solvedBefore = { ...IE.EMPTY_RESULT, attempts: 1, solved: true };
  const stale = renderToStaticMarkup(React.createElement(HB.HtmlBuilder, { interaction: fix, saveKey: 't/stale', result: solvedBefore, onAnswer() {}, onHint() {}, onReveal() {} }));
  assert(!stale.includes('หน้าเว็บทำงานแล้ว'), 'no success message for failing code');
  assert.match(stale, /data-testid="html-done-before"/);
  assert.match(stale, /data-testid="html-check"/, 'learner can still check / retry');
  const proj = steps('web-html-project')[0].interaction;
  const ok = renderToStaticMarkup(React.createElement(HB.HtmlBuilder, { interaction: { ...proj, starter: proj.solution }, saveKey: 't/ok', result: solvedBefore, onAnswer() {}, onHint() {}, onReveal() {} }));
  assert.match(ok, /หน้าเว็บทำงานแล้ว/);
  assert(!ok.includes('data-testid="html-check"'));
});
await test('text equivalent lists links and pictures inside text, with their destination / description', () => {
  const lines = H.describePage(H.parseSafe('<p>ดูที่ <a href="school.html">โรงเรียน</a></p><img src="cat.png">'));
  assert.deepStrictEqual(lines, ['ย่อหน้า: “ดูที่ โรงเรียน”', '— ลิงก์: “โรงเรียน” → school.html', 'รูปภาพ: ไม่มีคำอธิบาย (alt)']);
});
await test('studio practice / robot widgets never update the parent inside a state updater (no React render warnings)', () => {
  const ts = read('src/components/learning/studio/TeachingStudio.tsx');
  const body = ts.slice(ts.indexOf('function PracticeBody'), ts.indexOf('function PracticeItem'));
  assert(body.includes('settledRef') && !/setSettled\(\(s\) =>/.test(body));
});

console.log('\n5. Evidence — existing shapes only; no mastery / review / next step decided here');
await test('builder steps count as practice: solved by own work, reveal is never "solved"', () => {
  const l = IR.getInteractiveLesson('web-html-elements');
  let st = IE.initialPlayerState();
  st = IE.playerReducer(st, { type: 'answer', stepId: 'place-h1', correct: false });
  st = IE.playerReducer(st, { type: 'answer', stepId: 'place-h1', correct: true });
  st = IE.playerReducer(st, { type: 'reveal', stepId: 'place-p' });
  assert.deepStrictEqual(st.results['place-h1'], { attempts: 2, solved: true, hintShown: true, revealed: false });
  assert.strictEqual(st.results['place-p'].solved, false);
  const sum = IE.summarize(l, st);
  assert.deepStrictEqual(sum.practice, { total: 5, solved: 1, revealed: 1 });
  for (const f of ['mastery', 'masteryScore', 'nextReview', 'nextStep']) assert(!(f in sum), f);
  const b = read('src/components/learning/studio/HtmlBuilder.tsx');
  assert(!/\buseStore\b|\bmastery\b|\breview\b|\bnextStep\b/i.test(b), 'the builder never touches learner state directly');
});
await test('optional-track study lesson is added only on demand: additive, idempotent, existing lessons untouched', () => {
  const before = structuredClone(useStore.getState().lessons);
  const spec = { title: 'HTML พื้นฐาน', subjectId: 'web' };
  const a = useStore.getState().ensureStudyLesson(spec);
  const b = useStore.getState().ensureStudyLesson(spec);
  const after = useStore.getState().lessons;
  assert.strictEqual(a, b);
  assert.strictEqual(after.length, before.length + 1);
  assert.deepStrictEqual(after.slice(0, before.length), before);
  assert.strictEqual(CE.findStudyLesson(WEB[0], after)?.id, a, 'curriculum lesson links to it');
  // per-lesson progress from day one: finishing HTML 1 never marks HTML 2–5 as done
  assert.deepStrictEqual(after.at(-1).completedCurriculumLessonIds, []);
  const done1 = after.map((l) => (l.id === a ? { ...l, status: 'COMPLETED', completedCurriculumLessonIds: ['web-html-elements'] } : l));
  assert(CE.isCurriculumLessonCompleted(WEB[0], done1) && !CE.isCurriculumLessonCompleted(WEB[1], done1));
  assert(!initialLessons.some((l) => l.subjectId === 'web'), 'not seeded for new learners');
});
await test('admission readiness and the next step are unchanged by web progress', () => {
  const base = initialLessons.map((l) => ({ ...l, status: 'NOT STARTED' }));
  const withWeb = [...base, { ...base[0], id: 'web-study', title: 'HTML พื้นฐาน', subjectId: 'web', status: 'COMPLETED', masteryScore: 95 }];
  const r0 = CE.getPathwayReadiness(base);
  const r1 = CE.getPathwayReadiness(withWeb);
  assert.deepStrictEqual(r1, r0);
  assert(!JSON.stringify(r1).includes('"web"'));
  const n0 = getNextStep({ lessons: base });
  const n1 = getNextStep({ lessons: withWeb });
  assert.strictEqual(n1.todayAction, n0.todayAction);
  assert(!String(n1.curriculumLessonId ?? '').startsWith('web-'));
});

console.log('\n6. Sources + boundaries');
await test('sources doc covers every lesson; web sources were fetched (2026-10-06) and are not over-claimed', () => {
  const doc = read('docs/sources/html-curriculum-sources.md');
  for (const [id] of DESIGN) assert(doc.includes(id), id);
  for (const s of K.SOURCES.filter((x) => x.verification === 'fetched-web')) {
    assert(/^https:\/\/(developer\.mozilla\.org|html\.spec\.whatwg\.org)\//.test(s.foundUrl), s.id);
    assert(doc.includes(s.id), `${s.id} documented`);
  }
  for (const [id] of DESIGN) {
    const k = K.getLessonKnowledge(id);
    assert(k.provenance.every((p) => p.crossChecked === false), `${id}: no stored quotes → not cross-checked`);
    assert.strictEqual(k.audit.readiness, 'READY_WITH_LIMITATIONS');
  }
});
await test('primary navigation and Game Lab untouched; no GameContent 1.2', () => {
  assert(!read('src/components/navigation/primaryNav.ts').includes('web'));
  const g = read('src/learning/games/contracts.ts');
  assert(!/1\.2/.test(g));
  const reg = read('src/learning/games/registry.ts');
  assert(!reg.includes('web-html'));
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed) process.exitCode = 1;
