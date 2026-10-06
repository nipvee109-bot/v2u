/* =========================================================================
   HTML engine for the Web track (HTML Live Web Builder).
   -------------------------------------------------------------------------
   · tokenize / matchTags — what the learner WROTE (tag pairs, unclosed tags,
     overlap). A browser parser silently repairs these, so structure feedback
     must come from the source tokens, not from the repaired DOM.
   · parseSafe — what the page SHOWS: parsed by a real DOM parser (DOMParser in
     the browser, jsdom in tests), then reduced to an allowlist of lesson tags
     and attributes. Nothing is ever inserted as raw HTML and no script runs.
   · checkHtml — answer checks run on the parsed DOM (structure, not strings).
   No learner input is ever evaluated or injected.
   ========================================================================= */

export interface DomParserLike {
  parseFromString(src: string, type: 'text/html'): Document;
}

/** Tags the web lessons teach (V1 boundary). Anything else is not rendered as markup. */
export const LESSON_TAGS = ['html', 'head', 'title', 'body', 'h1', 'h2', 'h3', 'p', 'strong', 'em', 'a', 'img', 'header', 'main', 'section', 'footer', 'div'] as const;
export type LessonTag = (typeof LESSON_TAGS)[number];
const LESSON_TAG_SET = new Set<string>(LESSON_TAGS);
/** Body-level tags drawn in the preview. */
const RENDER_TAGS = new Set<string>(['h1', 'h2', 'h3', 'p', 'strong', 'em', 'a', 'img', 'header', 'main', 'section', 'footer', 'div']);
/** Elements whose whole content is dropped (never shown, never run). */
const DROP_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'form', 'input', 'textarea', 'button', 'select', 'svg', 'math', 'template', 'noscript', 'video', 'audio', 'canvas', 'frame', 'frameset']);
/** Void elements (WHATWG): no end tag. Only img is taught; the rest are recognised so feedback stays correct. */
export const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const ALLOWED_ATTRS: Record<string, string[]> = { a: ['href'], img: ['src', 'alt'] };

/** Pictures available in the lesson sandbox (drawn locally, never fetched). */
export const SAFE_IMAGES: Record<string, { label: string }> = {
  'cat.png': { label: 'แมวสีส้มนั่งอยู่' },
  'mountain.png': { label: 'ภูเขากับดวงอาทิตย์' },
  'laptop.png': { label: 'โน้ตบุ๊กบนโต๊ะ' },
  'school.png': { label: 'อาคารโรงเรียน' },
};

/* ── 1. Tokens: what the learner wrote ─────────────────────────────── */

export interface TagAttr { name: string; value: string | null; quoted: boolean }
export interface TagToken {
  kind: 'open' | 'close' | 'void';
  name: string;
  /** Offsets in the source (end exclusive) */
  start: number;
  end: number;
  attrs: TagAttr[];
  /** An attribute value whose quote was never closed */
  brokenQuote?: boolean;
}

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^<>"']|"[^"<>]*"|'[^'<>]*')*?)(\/?)>/g;
const ATTR_RE = /([^\s"'=/<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function parseAttrs(s: string): { attrs: TagAttr[]; brokenQuote: boolean } {
  const brokenQuote = (s.match(/"/g)?.length ?? 0) % 2 === 1 || (s.match(/'/g)?.length ?? 0) % 2 === 1;
  const attrs: TagAttr[] = [];
  for (const m of s.matchAll(ATTR_RE)) {
    const value = m[2] ?? m[3] ?? m[4] ?? null;
    attrs.push({ name: m[1].toLowerCase(), value, quoted: m[2] !== undefined || m[3] !== undefined });
  }
  return { attrs, brokenQuote };
}

/** Tag tokens in source order (comments and doctype ignored). Regex only finds tokens; meaning comes from matchTags/DOM. */
export function tokenize(src: string): TagToken[] {
  const clean = src.replace(/<!--[\s\S]*?-->/g, (c) => ' '.repeat(c.length)).replace(/<!doctype[^>]*>/gi, (c) => ' '.repeat(c.length));
  const out: TagToken[] = [];
  for (const m of clean.matchAll(TAG_RE)) {
    const name = m[2].toLowerCase();
    const closing = m[1] === '/';
    const { attrs, brokenQuote } = closing ? { attrs: [], brokenQuote: false } : parseAttrs(m[3]);
    out.push({ kind: closing ? 'close' : VOID_TAGS.has(name) ? 'void' : 'open', name, start: m.index!, end: m.index! + m[0].length, attrs, ...(brokenQuote ? { brokenQuote } : {}) });
  }
  return out;
}

export type TagIssue =
  | { kind: 'unclosed'; open: TagToken; message: string }
  | { kind: 'stray'; close: TagToken; message: string }
  | { kind: 'misnested'; inner: TagToken; outer: TagToken; message: string }
  | { kind: 'void-close'; close: TagToken; message: string }
  | { kind: 'broken'; at: number; message: string }
  | { kind: 'quote'; token: TagToken; message: string };

export interface TagStructure {
  tokens: TagToken[];
  /** index of open token → index of its close token */
  pairs: Map<number, number>;
  issues: TagIssue[];
}

const t = (name: string, close = false) => `<${close ? '/' : ''}${name}>`;

export function matchTags(src: string): TagStructure {
  const tokens = tokenize(src);
  const pairs = new Map<number, number>();
  const issues: TagIssue[] = [];
  const stack: number[] = [];
  const closedEarly = new Set<number>();
  tokens.forEach((tok, i) => {
    if (tok.brokenQuote) issues.push({ kind: 'quote', token: tok, message: `ค่าใน ${t(tok.name)} มีเครื่องหมาย " ไม่ครบคู่ — ค่าของ attribute ต้องอยู่ระหว่าง " กับ "` });
    if (tok.kind === 'open') { stack.push(i); return; }
    if (tok.kind === 'void') return;
    if (VOID_TAGS.has(tok.name)) { issues.push({ kind: 'void-close', close: tok, message: `${t(tok.name)} ไม่มีแท็กปิด — ลบ ${t(tok.name, true)} ออกได้เลย` }); return; }
    const top = stack[stack.length - 1];
    if (top !== undefined && tokens[top].name === tok.name) { pairs.set(stack.pop()!, i); return; }
    const deeper = stack.map((s) => tokens[s].name).lastIndexOf(tok.name);
    if (deeper >= 0) {
      const outer = stack[deeper];
      for (const inner of stack.splice(deeper + 1)) {
        closedEarly.add(inner);
        issues.push({ kind: 'misnested', inner: tokens[inner], outer: tokens[outer], message: `${t(tokens[inner].name)} เปิดอยู่ข้างใน ${t(tok.name)} จึงต้องปิด ${t(tokens[inner].name, true)} ก่อน ${t(tok.name, true)}` });
      }
      pairs.set(stack.pop()!, i);
      return;
    }
    // A close tag for an element that was "closed early" by an overlap is part of that overlap, not a stray.
    const early = [...closedEarly].find((e) => tokens[e].name === tok.name && !pairs.has(e));
    if (early !== undefined) { pairs.set(early, i); closedEarly.delete(early); return; }
    issues.push({ kind: 'stray', close: tok, message: `มี ${t(tok.name, true)} ที่ไม่มี ${t(tok.name)} คู่ของมัน` });
  });
  for (const i of stack) issues.push({ kind: 'unclosed', open: tokens[i], message: `ตอนนี้มี ${t(tokens[i].name)} เปิดอยู่ แต่ยังไม่มี ${t(tokens[i].name, true)} ที่ปิดมัน` });
  // "<" that never became a tag: e.g. "<h1 Hello" or "</p"
  const covered = tokens.map((x) => [x.start, x.end] as const);
  for (const m of src.matchAll(/<\/?[a-zA-Z]/g)) {
    if (/^<!--/.test(src.slice(m.index!))) continue;
    if (covered.some(([s, e]) => m.index! >= s && m.index! < e)) continue;
    const rest = src.slice(m.index!);
    const gt = rest.indexOf('>');
    const lt = rest.indexOf('<', 1);
    const body = gt >= 0 && (lt < 0 || gt < lt) ? rest.slice(0, gt) : rest.slice(0, lt < 0 ? undefined : lt);
    const oddQuote = (body.match(/"/g)?.length ?? 0) % 2 === 1;
    const name = body.match(/^<\/?([a-zA-Z][a-zA-Z0-9]*)/)?.[1]?.toLowerCase() ?? '';
    issues.push({
      kind: 'broken',
      at: m.index!,
      message: oddQuote ? `ใน <${name}> มีเครื่องหมาย " ไม่ครบคู่ — ค่าของ attribute ต้องอยู่ระหว่าง " กับ "` : `แท็ก ${body.startsWith('</') ? '</' : '<'}${name} ยังเขียนไม่ครบ — แท็กต้องปิดท้ายด้วย >`,
    });
  }
  // A half-written tag explains the other problems, so it comes first.
  issues.sort((a, b) => Number(b.kind === 'broken' || b.kind === 'quote') - Number(a.kind === 'broken' || a.kind === 'quote'));
  return { tokens, pairs, issues };
}

/* ── 2. Safe tree: what the page shows ─────────────────────────────── */

export type SafeNode =
  | { type: 'text'; text: string }
  | { type: 'el'; tag: LessonTag; attrs: Record<string, string>; children: SafeNode[]; /** nth element of this tag in the document (maps to the nth source token) */ nth: number };

export interface SafePage {
  title: string;
  body: SafeNode[];
  /** Tags written but not part of the lessons (shown as plain text, never as markup) */
  unsupported: string[];
}

export function getParser(): DomParserLike | undefined {
  return typeof DOMParser !== 'undefined' ? new DOMParser() : undefined;
}

export function parseDoc(src: string, parser: DomParserLike | undefined = getParser()): Document | undefined {
  return parser?.parseFromString(src, 'text/html');
}

export function parseSafe(src: string, parser: DomParserLike | undefined = getParser()): SafePage {
  const doc = parseDoc(src, parser);
  const unsupported = new Set<string>();
  const counts = new Map<string, number>();
  if (!doc) return { title: '', body: [], unsupported: [] };
  const walk = (node: Node): SafeNode[] => {
    if (node.nodeType === 3) return node.textContent ? [{ type: 'text', text: node.textContent }] : [];
    if (node.nodeType !== 1) return [];
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (DROP_TAGS.has(tag)) { unsupported.add(tag); return []; }
    const kids = [...el.childNodes].flatMap(walk);
    if (!RENDER_TAGS.has(tag)) {
      if (!LESSON_TAG_SET.has(tag)) unsupported.add(tag);
      return kids; // unwrap: keep the text, not the markup
    }
    const attrs: Record<string, string> = {};
    for (const name of ALLOWED_ATTRS[tag] ?? []) {
      const v = el.getAttribute(name);
      if (v === null) continue;
      // Script URLs are never kept, even though the preview never navigates
      if (name === 'href' && /^s*(javascript|vbscript|data):/i.test(v)) { attrs[name] = ''; unsupported.add('javascript:'); continue; }
      attrs[name] = v;
    }
    const nth = counts.get(tag) ?? 0;
    counts.set(tag, nth + 1);
    return [{ type: 'el', tag: tag as LessonTag, attrs, children: kids, nth }];
  };
  return { title: doc.title, body: doc.body ? [...doc.body.childNodes].flatMap(walk) : [], unsupported: [...unsupported] };
}

/** Text equivalent of the preview ("สิ่งที่อยู่บนหน้าเว็บ"). */
const ROLE_TH: Record<string, string> = { h1: 'หัวข้อหลัก', h2: 'หัวข้อรอง', h3: 'หัวข้อย่อย', p: 'ย่อหน้า', a: 'ลิงก์', img: 'รูปภาพ', header: 'ส่วนหัว', main: 'เนื้อหาหลัก', section: 'ส่วนเนื้อหา', footer: 'ส่วนท้าย', div: 'กล่อง', strong: 'คำเน้นสำคัญ', em: 'คำเน้นเสียง' };
export function describePage(page: SafePage): string[] {
  const out: string[] = [];
  const text = (n: SafeNode): string => (n.type === 'text' ? n.text : n.children.map(text).join('')).replace(/\s+/g, ' ');
  const visit = (nodes: SafeNode[], depth: number) => {
    for (const n of nodes) {
      if (n.type !== 'el' || n.tag === 'strong' || n.tag === 'em') continue;
      const pad = '— '.repeat(depth);
      if (n.tag === 'img') out.push(`${pad}${ROLE_TH.img}: ${n.attrs.alt ? `“${n.attrs.alt}”` : 'ไม่มีคำอธิบาย (alt)'}`);
      else if (n.tag === 'a') out.push(`${pad}${ROLE_TH.a}: “${text(n).trim()}” → ${n.attrs.href || 'ยังไม่มีปลายทาง'}`);
      else if (['header', 'main', 'section', 'footer', 'div'].includes(n.tag)) { out.push(`${pad}${ROLE_TH[n.tag]}`); visit(n.children, depth + 1); }
      else {
        out.push(`${pad}${ROLE_TH[n.tag]}: “${text(n).trim()}”`);
        // links and pictures inside text are listed too (the visual page shows them)
        const inner = (nodes: SafeNode[]): SafeNode[] => nodes.flatMap((c) => (c.type !== 'el' ? [] : c.tag === 'a' || c.tag === 'img' ? [c] : inner(c.children)));
        visit(inner(n.children), depth + 1);
      }
    }
  };
  visit(page.body, 0);
  return out;
}

/* ── 3. Answer checks on the DOM ───────────────────────────────────── */

export type HtmlRequirement =
  /** At least `min` (and at most `max`) elements of a tag */
  | { kind: 'has'; tag: LessonTag; min?: number; max?: number }
  /** Every element of `tag` has a non-empty attribute (and at least one exists) */
  | { kind: 'attr'; tag: 'a' | 'img'; attr: 'href' | 'src' | 'alt' }
  /** Some element of `tag` has attribute = value */
  | { kind: 'attr-value'; tag: 'a' | 'img'; attr: 'href' | 'src'; value: string }
  /** Every element of `tag` sits inside `parent` (and at least one exists) */
  | { kind: 'inside'; tag: LessonTag; parent: LessonTag }
  /** The first `first` comes before the first `then` in the page */
  | { kind: 'before'; first: LessonTag; then: LessonTag }
  /** Every element of `tag` (or, with `some`, at least one) has visible text of at least `min` characters */
  | { kind: 'text'; tag: LessonTag; min: number; some?: boolean }
  /** Some element of `tag` has exactly this text (trimmed) */
  | { kind: 'text-is'; tag: LessonTag; text: string }
  /** Some element of `tag` has text that is not `text` (the learner changed it) */
  | { kind: 'text-not'; tag: LessonTag; text: string }
  /** Every element of `tag` contains a `child` element */
  | { kind: 'contains'; tag: LessonTag; child: LessonTag }
  /** Every `tag` the learner wrote sits between their own <parent> and </parent> in the code (for html/head/body, which a parser always creates) */
  | { kind: 'written-inside'; tag: LessonTag; parent: 'html' | 'head' | 'body' }
  /** Every tag that was opened is closed, in the right order */
  | { kind: 'closed' };

export interface RequirementResult { req: HtmlRequirement; ok: boolean; label: string; message?: string }
export interface HtmlCheck { passed: boolean; results: RequirementResult[]; issues: TagIssue[] }

const TAG_TH: Record<string, string> = { ...ROLE_TH, title: 'ชื่อแท็บ', body: 'ส่วนที่มองเห็น (body)', head: 'ส่วนข้อมูลของหน้า (head)', html: 'เอกสาร HTML' };
const ATTR_TH: Record<string, string> = { href: 'ปลายทาง (href)', src: 'ไฟล์รูป (src)', alt: 'คำอธิบายรูป (alt)' };

export function requirementLabel(r: HtmlRequirement): string {
  switch (r.kind) {
    case 'has': return r.max === 0 ? `ไม่มี <${r.tag}>` : r.max !== undefined && r.max === (r.min ?? 1) ? `มี <${r.tag}> ${r.max} อัน` : `มี <${r.tag}> อย่างน้อย ${r.min ?? 1} อัน`;
    case 'attr': return `ทุก <${r.tag}> มี${ATTR_TH[r.attr]}`;
    case 'attr-value': return `<${r.tag}> ใช้ ${r.attr}="${r.value}"`;
    case 'inside': return `<${r.tag}> อยู่ข้างใน <${r.parent}>`;
    case 'before': return `<${r.first}> มาก่อน <${r.then}>`;
    case 'text': return r.some ? `มี <${r.tag}> ที่มีข้อความอย่างน้อย ${r.min} ตัวอักษร` : `<${r.tag}> มีข้อความ`;
    case 'text-is': return `<${r.tag}> แสดงคำว่า “${r.text}”`;
    case 'text-not': return `แก้ข้อความใน <${r.tag}> ให้ไม่ใช่ “${r.text}”`;
    case 'contains': return `ทุก <${r.tag}> มี <${r.child}> อยู่ข้างใน`;
    case 'written-inside': return `<${r.tag}> เขียนอยู่ระหว่าง <${r.parent}> กับ </${r.parent}>`;
    case 'closed': return 'ทุกแท็กที่เปิดถูกปิดครบและถูกลำดับ';
  }
}

const IMPLIED = new Set(['html', 'head', 'body']);
const visibleText = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
const follows = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & 4); // b follows a

function evaluate(r: HtmlRequirement, doc: Document, structure: TagStructure): { ok: boolean; message?: string } {
  const all = (tag: string) => [...doc.getElementsByTagName(tag)];
  switch (r.kind) {
    case 'closed': {
      const first = structure.issues[0];
      return first ? { ok: false, message: first.message } : { ok: true };
    }
    case 'written-inside': {
      const { tokens, pairs } = structure;
      const ranges = tokens.flatMap((x, i) => (x.kind === 'open' && x.name === r.parent && pairs.has(i) ? [[x.end, tokens[pairs.get(i)!].start] as const] : []));
      const mine = tokens.filter((x) => x.kind !== 'close' && x.name === r.tag);
      if (!mine.length) return { ok: false, message: `ยังไม่มี <${r.tag}> ในโค้ด` };
      if (!ranges.length) return { ok: false, message: `ยังไม่มี <${r.parent}> … </${r.parent}> ที่ครบคู่` };
      return mine.every((x) => ranges.some(([s, e]) => x.start >= s && x.end <= e)) ? { ok: true } : { ok: false, message: `<${r.tag}> ยังอยู่นอก <${r.parent}> — ย้ายเข้าไประหว่าง <${r.parent}> กับ </${r.parent}>` };
    }
    case 'has': {
      // The parser always creates html/head/body — for those, count what the learner actually wrote.
      const n = IMPLIED.has(r.tag) ? structure.tokens.filter((x) => x.kind === 'open' && x.name === r.tag).length : all(r.tag).length;
      const min = r.min ?? 1;
      if (n < min) return { ok: false, message: n === 0 ? `หน้านี้ยังไม่มี <${r.tag}> (${TAG_TH[r.tag]})` : `ตอนนี้มี <${r.tag}> ${n} อัน ต้องมีอย่างน้อย ${min} อัน` };
      if (r.max !== undefined && n > r.max) return { ok: false, message: r.max === 1 ? `มี <${r.tag}> ${n} อัน — ${r.tag === 'h1' ? 'หน้าหนึ่งควรมีหัวข้อหลักแค่อันเดียว' : r.tag === 'main' ? 'หน้าหนึ่งมีเนื้อหาหลักได้ส่วนเดียว' : `ควรมีแค่ ${r.max} อัน`}` : `มี <${r.tag}> ${n} อัน มากกว่าที่ต้องการ (${r.max})` };
      return { ok: true };
    }
    case 'attr': {
      const els = all(r.tag);
      if (!els.length) return { ok: false, message: `ยังไม่มี <${r.tag}> ในหน้า` };
      const bad = els.find((e) => !(e.getAttribute(r.attr) ?? '').trim());
      if (!bad) return { ok: true };
      if (r.attr === 'alt') return { ok: false, message: 'รูปนี้ยังไม่มี alt ซึ่งช่วยอธิบายรูปเมื่อมองไม่เห็นภาพ' };
      if (r.attr === 'href') return { ok: false, message: `ลิงก์ “${visibleText(bad) || '…'}” ยังไม่มี href จึงยังไม่รู้ว่าจะพาไปที่ไหน` };
      return { ok: false, message: 'รูปนี้ยังไม่มี src จึงยังไม่รู้ว่าจะแสดงรูปไหน' };
    }
    case 'attr-value': {
      const els = all(r.tag);
      if (els.some((e) => (e.getAttribute(r.attr) ?? '').trim() === r.value)) return { ok: true };
      const now = els.map((e) => e.getAttribute(r.attr)).filter((v) => v !== null);
      return { ok: false, message: now.length ? `ตอนนี้ ${r.attr}="${now[0]}" — ลองเปลี่ยนเป็น "${r.value}"` : `ยังไม่มี <${r.tag}> ที่มี ${r.attr}` };
    }
    case 'inside': {
      const els = all(r.tag);
      if (!els.length) return { ok: false, message: `ยังไม่มี <${r.tag}> ในหน้า` };
      const out = els.find((e) => !e.parentElement?.closest(r.parent));
      return out ? { ok: false, message: `<${r.tag}>${visibleText(out) ? ` “${visibleText(out).slice(0, 24)}”` : ''} ยังอยู่นอก <${r.parent}> — ย้ายเข้าไประหว่าง <${r.parent}> กับ </${r.parent}>` } : { ok: true };
    }
    case 'before': {
      const a = all(r.first)[0];
      const b = all(r.then)[0];
      if (!a || !b) return { ok: false, message: `ต้องมีทั้ง <${r.first}> และ <${r.then}> ก่อน` };
      return follows(a, b) ? { ok: true } : { ok: false, message: `ตอนนี้ <${r.then}> มาก่อน <${r.first}> — ลองสลับลำดับ` };
    }
    case 'text': {
      const els = all(r.tag);
      if (!els.length) return { ok: false, message: `ยังไม่มี <${r.tag}> ในหน้า` };
      if (r.some) return els.some((e) => visibleText(e).length >= r.min) ? { ok: true } : { ok: false, message: `ข้อความใน <${r.tag}> ยังสั้นไป — เขียนแนะนำตัวอย่างน้อย ${r.min} ตัวอักษร` };
      return els.every((e) => visibleText(e).length >= r.min) ? { ok: true } : { ok: false, message: `<${r.tag}> ยังว่างอยู่ — ใส่ข้อความระหว่างแท็กเปิดกับแท็กปิด` };
    }
    case 'text-is': {
      const els = all(r.tag);
      if (els.some((e) => visibleText(e) === r.text)) return { ok: true };
      return { ok: false, message: els.length ? `ตอนนี้ <${r.tag}> แสดง “${visibleText(els[0])}” — ลองแก้ข้อความเป็น “${r.text}”` : `ยังไม่มี <${r.tag}> ในหน้า` };
    }
    case 'text-not': {
      const els = all(r.tag);
      if (!els.length) return { ok: false, message: `ยังไม่มี <${r.tag}> ในหน้า` };
      return els.some((e) => visibleText(e) && visibleText(e) !== r.text) ? { ok: true } : { ok: false, message: `ตอนนี้ <${r.tag}> ยังแสดง “${r.text}” — แก้ข้อความระหว่างแท็กเปิดกับแท็กปิด` };
    }
    case 'contains': {
      const els = all(r.tag);
      if (!els.length) return { ok: false, message: `ยังไม่มี <${r.tag}> ในหน้า` };
      return els.every((e) => e.getElementsByTagName(r.child).length > 0) ? { ok: true } : { ok: false, message: `มี <${r.tag}> ที่ยังไม่มี <${r.child}> อยู่ข้างใน${r.child.startsWith('h') ? ' — แต่ละส่วนควรเริ่มด้วยหัวข้อ' : ''}` };
    }
  }
}

export function checkHtml(src: string, reqs: HtmlRequirement[], parser: DomParserLike | undefined = getParser()): HtmlCheck {
  const structure = matchTags(src);
  const doc = parseDoc(src, parser);
  if (!doc) return { passed: false, results: reqs.map((req) => ({ req, ok: false, label: requirementLabel(req), message: 'ตรวจไม่ได้ในเบราว์เซอร์นี้' })), issues: structure.issues };
  const results = reqs.map((req) => ({ req, label: requirementLabel(req), ...evaluate(req, doc, structure) }));
  return { passed: results.every((r) => r.ok), results, issues: structure.issues };
}
