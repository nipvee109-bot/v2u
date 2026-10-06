import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { Check, Circle, Lightbulb, RotateCcw } from 'lucide-react';
import { Feedback } from '../Questions';
import type { HtmlBuildInteraction, StepResult } from '../../../interactive/types';
import { SAFE_IMAGES, checkHtml, describePage, matchTags, parseSafe } from '../../../web/html';
import type { SafeNode, SafePage, TagToken } from '../../../web/html';

/* HTML Live Web Builder (Web track).
   CODE → PAGE: the learner always sees the real HTML, and every change redraws the page at once.
   The page is drawn by React from an allowlisted tree (src/web/html.ts) — learner HTML is never
   injected, scripts never run, links never navigate and pictures come only from the lesson set. */

const BTN = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:opacity-50';
const PRIMARY = `${BTN} bg-[var(--brand)] text-white hover:bg-[var(--brand-hi)]`;
const GHOST = `${BTN} border border-[var(--line-2)] text-[var(--ink)] hover:bg-[var(--surface-3)]`;
const MONO = { fontVariantLigatures: 'none' } as const;
const REGIONS = new Set(['header', 'main', 'section', 'footer', 'div']);

/* ── Lesson pictures: drawn locally, never fetched ─────────────────── */

function Picture({ name }: { name: string }) {
  const common = { viewBox: '0 0 160 100', className: 'block h-auto w-full max-w-[220px] rounded-lg', 'aria-hidden': true } as const;
  switch (name) {
    case 'cat.png':
      return (
        <svg {...common}><rect width="160" height="100" fill="#fff4e0" /><ellipse cx="80" cy="72" rx="34" ry="22" fill="#f29a38" /><circle cx="80" cy="42" r="20" fill="#f29a38" /><polygon points="64,28 68,10 76,24" fill="#f29a38" /><polygon points="96,28 92,10 84,24" fill="#f29a38" /><circle cx="73" cy="40" r="3" fill="#2b2b2b" /><circle cx="87" cy="40" r="3" fill="#2b2b2b" /><path d="M76 49 q4 4 8 0" stroke="#2b2b2b" strokeWidth="2" fill="none" /><path d="M112 76 q20 -6 14 -26" stroke="#f29a38" strokeWidth="7" fill="none" strokeLinecap="round" /></svg>
      );
    case 'mountain.png':
      return (
        <svg {...common}><rect width="160" height="100" fill="#dff1ff" /><circle cx="122" cy="26" r="13" fill="#ffc94d" /><polygon points="0,100 52,34 100,100" fill="#5b8c5a" /><polygon points="54,100 104,46 160,100" fill="#3f6e46" /><polygon points="52,34 42,47 62,47" fill="#ffffff" /></svg>
      );
    case 'laptop.png':
      return (
        <svg {...common}><rect width="160" height="100" fill="#eef0f7" /><rect x="40" y="18" width="80" height="52" rx="4" fill="#26304f" /><rect x="46" y="24" width="68" height="40" fill="#7fb2ff" /><rect x="28" y="70" width="104" height="10" rx="3" fill="#8a93b2" /><rect x="52" y="32" width="36" height="5" fill="#ffffff" /><rect x="52" y="42" width="52" height="4" fill="#dbe7ff" /></svg>
      );
    case 'school.png':
      return (
        <svg {...common}><rect width="160" height="100" fill="#e9f7ef" /><rect x="34" y="40" width="92" height="50" fill="#f4d9a6" /><polygon points="28,42 80,14 132,42" fill="#c0563b" /><rect x="72" y="62" width="16" height="28" fill="#7a4b2a" /><rect x="44" y="52" width="14" height="12" fill="#7fb2ff" /><rect x="102" y="52" width="14" height="12" fill="#7fb2ff" /><rect x="79" y="2" width="2" height="16" fill="#555" /><polygon points="81,3 95,7 81,11" fill="#e04f5f" /></svg>
      );
    default:
      return null;
  }
}

/* ── Live page ─────────────────────────────────────────────────────── */

interface Sel { tag: string; nth: number }

const TEXT_STYLE: Record<string, string> = {
  h1: 'text-2xl font-bold leading-tight my-2',
  h2: 'text-xl font-bold leading-tight my-2',
  h3: 'text-lg font-bold leading-tight my-1.5',
  p: 'my-2 leading-relaxed',
  strong: 'font-bold',
  em: 'italic',
};

function PageNodes({ nodes, regions, sel, onPick, onLink }: { nodes: SafeNode[]; regions: boolean; sel: Sel | null; onPick: (s: Sel) => void; onLink: (href: string) => void }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.type === 'text') return <Fragment key={i}>{n.text}</Fragment>;
        const kids = <PageNodes nodes={n.children} regions={regions} sel={sel} onPick={onPick} onLink={onLink} />;
        const on = sel?.tag === n.tag && sel.nth === n.nth;
        const mark = on ? 'outline outline-2 outline-offset-2 outline-[var(--brand)] bg-[var(--brand-soft)]/60 rounded' : '';
        if (n.tag === 'img') {
          const known = SAFE_IMAGES[n.attrs.src ?? ''];
          const alt = n.attrs.alt;
          return (
            <span key={i} data-el={`img-${n.nth}`} className={`my-2 inline-block max-w-full align-top ${mark}`}>
              {known ? (
                <span role="img" aria-label={alt ?? ''} className="block">
                  <Picture name={n.attrs.src} />
                </span>
              ) : (
                // What a browser does when a picture cannot load: show the alt text instead
                <span className="flex min-h-[64px] w-[220px] max-w-full items-center gap-2 rounded-lg border border-dashed border-[var(--line-2)] px-3 py-2 text-sm text-[var(--ink-2)]">
                  <span aria-hidden="true">🖼️</span>
                  {alt ? <span>{alt}</span> : <span>รูปแสดงไม่ได้ และไม่มีคำอธิบาย</span>}
                </span>
              )}
              {alt === undefined && known && <span className="mt-1 block text-xs font-semibold text-[var(--err)]">⚠ รูปนี้ยังไม่มี alt</span>}
            </span>
          );
        }
        if (n.tag === 'a') {
          return (
            <a key={i} href="#" data-el={`a-${n.nth}`} className={`text-[#1a4fd6] underline underline-offset-2 ${mark}`} onClick={(e) => { e.preventDefault(); onLink(n.attrs.href ?? ''); }}>
              {kids}
            </a>
          );
        }
        if (REGIONS.has(n.tag)) {
          const Tag = n.tag as 'header';
          return (
            <Tag key={i} data-el={`${n.tag}-${n.nth}`} onClick={regions ? (e) => { e.stopPropagation(); onPick({ tag: n.tag, nth: n.nth }); } : undefined} className={regions ? `relative my-2 block rounded-lg border-2 border-dashed px-3 pb-2 pt-6 ${on ? 'border-[var(--brand)] bg-[var(--brand-soft)]/50' : 'border-[var(--line-2)]'}` : 'block'}>
              {regions && <span className={`absolute left-2 top-1 font-mono text-[11px] font-semibold ${on ? 'text-[var(--brand-ink)]' : 'text-[var(--ink-3)]'}`}>&lt;{n.tag}&gt;</span>}
              {kids}
            </Tag>
          );
        }
        const Tag = n.tag as 'p';
        return <Tag key={i} data-el={`${n.tag}-${n.nth}`} className={`${TEXT_STYLE[n.tag] ?? ''} ${mark}`}>{kids}</Tag>;
      })}
    </>
  );
}

function LivePage({ page, regions, sel, onPick, onDropBlock }: { page: SafePage; regions: boolean; sel: Sel | null; onPick: (s: Sel) => void; onDropBlock?: (html: string) => void }) {
  const [link, setLink] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const empty = page.body.every((n) => n.type === 'text' && !n.text.trim());
  const drop = onDropBlock
    ? {
        onDragOver: (e: DragEvent) => { if (e.dataTransfer.types.includes('text/plain')) { e.preventDefault(); setOver(true); } },
        onDragLeave: () => setOver(false),
        onDrop: (e: DragEvent) => { e.preventDefault(); setOver(false); const h = e.dataTransfer.getData('text/plain'); if (h) onDropBlock(h); },
      }
    : {};
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line-2)] bg-white text-[#14182b] shadow-sm" data-testid="html-preview">
      <div className="flex items-center gap-2 border-b border-[#e3e6ef] bg-[#f3f4f8] px-3 py-2" aria-hidden="true">
        <span className="flex gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#ff6159]" /><i className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" /><i className="h-2.5 w-2.5 rounded-full bg-[#28c941]" /></span>
        <span className="min-w-0 truncate rounded-md bg-white px-2 py-0.5 text-xs text-[#4a5072]">{page.title || 'หน้าเว็บของฉัน'}</span>
      </div>
      <div {...drop} role="region" aria-label="หน้าเว็บที่โค้ดสร้าง" className={`min-h-[140px] break-words px-4 py-3 text-[15px] ${over ? 'bg-[var(--brand-soft)]' : ''}`}>
        {empty ? <p className="py-6 text-center text-sm text-[#7a8099]">หน้าเว็บยังว่าง — {onDropBlock ? 'วางบล็อกลงมาที่นี่ หรือกดปุ่ม “วาง”' : 'เขียนโค้ดทางซ้ายแล้วดูผลที่นี่'}</p> : <PageNodes nodes={page.body} regions={regions} sel={sel} onPick={onPick} onLink={setLink} />}
      </div>
      {link !== null && (
        <p role="status" className="border-t border-[#e3e6ef] bg-[#f7f8fb] px-3 py-2 text-xs text-[#3a4366]">
          ลิงก์นี้จะพาไปที่ <b className="font-mono">{link || '(ยังไม่มี href)'}</b> — ในบทเรียนลิงก์จะไม่เปิดจริง
        </p>
      )}
      {page.unsupported.length > 0 && (
        <p className="border-t border-[#e3e6ef] bg-[#fff8e8] px-3 py-2 text-xs text-[#6b4a00]">บทนี้ยังไม่ใช้ {page.unsupported.map((x) => (x === 'javascript:' ? 'ลิงก์แบบ javascript:' : `<${x}>`)).join(' ')} — จึงแสดงเป็นข้อความธรรมดา (หรือไม่แสดง)</p>
      )}
    </div>
  );
}

/* ── Code map: tags as touchable pieces ────────────────────────────── */

function CodeMap({ code, mode, sel, onPick }: { code: string; mode: 'anatomy' | 'regions'; sel: number | null; onPick: (tokenIndex: number) => void }) {
  const { tokens, pairs, issues } = useMemo(() => matchTags(code), [code]);
  const unclosed = new Set(issues.filter((x) => x.kind === 'unclosed').map((x) => tokens.indexOf((x as { open: TagToken }).open)));
  const closeOf = sel !== null ? pairs.get(sel) : undefined;
  const parts: ReactNode[] = [];
  let at = 0;
  tokens.forEach((tok, i) => {
    if (tok.start > at) {
      const text = code.slice(at, tok.start);
      const inside = sel !== null && closeOf !== undefined && tok.start <= tokens[closeOf].start && at >= tokens[sel].end;
      parts.push(<span key={`t${i}`} className={inside && text.trim() ? 'rounded bg-[#fff1b8] text-[#14182b]' : ''}>{text}</span>);
    }
    const role = i === sel ? 'open' : i === closeOf ? 'close' : unclosed.has(i) ? 'alone' : null;
    const clickable = tok.kind === 'open' || (mode === 'regions' && tok.kind !== 'close');
    parts.push(
      <button
        key={`k${i}`}
        type="button"
        disabled={!clickable}
        onClick={() => onPick(i)}
        aria-pressed={i === sel}
        aria-label={`${code.slice(tok.start, tok.end)}${role === 'alone' ? ' ยังไม่มีแท็กปิดคู่กัน' : ''}`}
        className={`rounded px-0.5 text-left font-semibold enabled:cursor-pointer enabled:hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166] ${tok.kind === 'close' ? 'text-[#ff9db0]' : 'text-[#8fd3ff]'} ${role === 'open' || role === 'close' ? 'outline outline-2 outline-[#ffd166]' : ''} ${role === 'alone' ? 'outline outline-2 outline-dashed outline-[#ff6b6b]' : ''}`}
      >
        {code.slice(tok.start, tok.end)}
        {role === 'open' && <sup className="ml-0.5 rounded bg-[#ffd166] px-1 text-[10px] font-bold text-[#14182b]">เปิด</sup>}
        {role === 'close' && <sup className="ml-0.5 rounded bg-[#ffd166] px-1 text-[10px] font-bold text-[#14182b]">ปิด</sup>}
        {role === 'alone' && <sup className="ml-0.5 rounded bg-[#ff6b6b] px-1 text-[10px] font-bold text-white">ยังไม่มีคู่</sup>}
      </button>,
    );
    at = tok.end;
  });
  if (at < code.length) parts.push(<span key="end">{code.slice(at)}</span>);
  return (
    <div data-testid="code-map">
      <p className="mb-1 text-xs font-semibold text-[var(--ink-2)]">{mode === 'anatomy' ? 'แตะแท็กเปิดเพื่อดูคู่ของมัน' : 'แตะแท็กเพื่อดูว่าคือส่วนไหนของหน้า'}</p>
      <pre style={MONO} className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#0f172a] p-3 font-mono text-[13px] leading-7 text-slate-100">{parts.length ? parts : <span className="text-slate-400">(ยังไม่มีโค้ด)</span>}</pre>
    </div>
  );
}

/** Anatomy of one element: แท็กเปิด · เนื้อหา · แท็กปิด (labels in text, not colour only). */
function Anatomy({ code, open }: { code: string; open: number }) {
  const { tokens, pairs } = matchTags(code);
  const o = tokens[open];
  if (!o) return null;
  const c = pairs.get(open);
  const content = c !== undefined ? code.slice(o.end, tokens[c].start) : '';
  return (
    <div className="grid gap-2 @md:grid-cols-3" data-testid="tag-anatomy" aria-live="polite">
      <div className="rounded-xl border-2 border-[#d9a300] bg-[#fff8db] px-3 py-2"><p className="text-xs font-semibold text-[#6b4a00]">แท็กเปิด</p><p className="font-mono text-sm font-bold text-ink">{code.slice(o.start, o.end)}</p></div>
      <div className="rounded-xl border-2 border-dashed border-[var(--line-2)] px-3 py-2"><p className="text-xs font-semibold text-[var(--ink-2)]">เนื้อหา (สิ่งที่แสดงบนหน้า)</p><p className="break-words text-sm text-ink">{c !== undefined ? content.replace(/<[^>]*>/g, '').trim() || '(ว่าง)' : '—'}</p></div>
      <div className={`rounded-xl border-2 px-3 py-2 ${c !== undefined ? 'border-[#d9a300] bg-[#fff8db]' : 'border-dashed border-[var(--err)] bg-[var(--err-soft)]'}`}>
        <p className="text-xs font-semibold text-[#6b4a00]">แท็กปิด</p>
        <p className="font-mono text-sm font-bold text-ink">{c !== undefined ? code.slice(tokens[c].start, tokens[c].end) : `ยังไม่มี </${o.name}>`}</p>
      </div>
    </div>
  );
}

/* ── Attribute panel: name → what it changes ───────────────────────── */

const ATTR_MEANING: Record<string, string> = { src: 'รูปไหน', alt: 'คำอธิบายรูป', href: 'ลิงก์ไปไหน' };

function setAttr(code: string, tok: TagToken, name: string, value: string): string {
  const attrs = tok.attrs.some((a) => a.name === name) ? tok.attrs.map((a) => (a.name === name ? { ...a, value } : a)) : [...tok.attrs, { name, value, quoted: true }];
  const tag = `<${tok.name}${attrs.map((a) => (a.value === null ? ` ${a.name}` : ` ${a.name}="${a.value.replace(/"/g, '')}"`)).join('')}>`;
  return code.slice(0, tok.start) + tag + code.slice(tok.end);
}

function AttrPanel({ code, onChange }: { code: string; onChange: (c: string) => void }) {
  const tokens = matchTags(code).tokens.filter((t) => t.name === 'img' || (t.name === 'a' && t.kind === 'open'));
  if (!tokens.length) return <p className="text-sm text-[var(--ink-2)]">ยังไม่มี &lt;img&gt; หรือ &lt;a&gt; — วางบล็อกก่อน แล้ว attribute จะโผล่ที่นี่</p>;
  return (
    <div className="space-y-3" data-testid="attr-panel">
      {tokens.map((tok, k) => {
        const names = tok.name === 'img' ? ['src', 'alt'] : ['href'];
        return (
          <fieldset key={`${tok.name}-${k}`} className="min-w-0 rounded-xl border border-[var(--line)] p-3">
            <legend className="px-1 font-mono text-sm font-bold text-ink">&lt;{tok.name}&gt;</legend>
            <div className="grid gap-2">
              {names.map((name) => {
                const val = tok.attrs.find((a) => a.name === name)?.value ?? '';
                const id = `attr-${tok.name}-${k}-${name}`;
                return (
                  <label key={name} htmlFor={id} className="grid min-w-0 gap-1 text-sm @md:grid-cols-[150px_minmax(0,1fr)] @md:items-center">
                    <span><b className="font-mono">{name}</b> <span className="text-[var(--ink-2)]">→ {ATTR_MEANING[name]}</span></span>
                    {name === 'src' ? (
                      <select id={id} value={val} onChange={(e) => onChange(setAttr(code, tok, name, e.target.value))} className="min-h-[44px] w-full min-w-0 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3 font-mono">
                        {!SAFE_IMAGES[val] && <option value={val}>{val || '(ยังไม่เลือก)'}</option>}
                        {Object.entries(SAFE_IMAGES).map(([file, m]) => <option key={file} value={file}>{file} — {m.label}</option>)}
                      </select>
                    ) : (
                      <input id={id} value={val} onChange={(e) => onChange(setAttr(code, tok, name, e.target.value))} className="min-h-[44px] w-full min-w-0 rounded-xl border border-[var(--line-2)] bg-[var(--surface)] px-3 font-mono" />
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

/* ── The builder ───────────────────────────────────────────────────── */

interface Props {
  interaction: HtmlBuildInteraction;
  /** Stable id for saving the learner's code locally (per step) */
  saveKey: string;
  result: StepResult;
  onAnswer: (correct: boolean) => void;
  onHint: () => void;
  onReveal: () => void;
}

const loadCode = (key: string, fallback: string) => {
  try { return localStorage.getItem(`v2u-html:${key}`) ?? fallback; } catch { return fallback; }
};

export function HtmlBuilder({ interaction: it, saveKey, result, onAnswer, onHint, onReveal }: Props) {
  const [code, setCode] = useState(() => loadCode(saveKey, it.starter));
  const [message, setMessage] = useState<string | null>(null);
  const [selToken, setSelToken] = useState<number | null>(null);
  const caret = useRef<number | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { try { localStorage.setItem(`v2u-html:${saveKey}`, code); } catch { /* private mode */ } }, [code, saveKey]);

  const page = useMemo(() => parseSafe(code), [code]);
  const check = useMemo(() => checkHtml(code, it.requirements), [code, it.requirements]);
  const tokens = useMemo(() => matchTags(code).tokens, [code]);
  const done = result.solved || result.revealed;

  // All requirements met by the learner's own work → solved (a revealed answer never counts as solved)
  useEffect(() => {
    if (check.passed && !result.solved && !result.revealed) onAnswer(true);
  }, [check.passed, result.solved, result.revealed, onAnswer]);

  const sel: Sel | null = (() => {
    if (selToken === null || !tokens[selToken]) return null;
    const tok = tokens[selToken];
    return { tag: tok.name, nth: tokens.slice(0, selToken).filter((x) => x.name === tok.name && x.kind !== 'close').length };
  })();
  const pickFromPage = (s: Sel) => {
    let n = -1;
    const idx = tokens.findIndex((x) => x.name === s.tag && x.kind !== 'close' && ++n === s.nth);
    setSelToken(idx >= 0 ? idx : null);
  };

  const place = (html: string) => {
    const at = caret.current;
    const next = at === null ? `${code}${code && !code.endsWith('\n') ? '\n' : ''}${html}` : `${code.slice(0, at)}${html}${code.slice(at)}`;
    setCode(next);
    caret.current = at === null ? null : at + html.length;
  };
  const submit = () => {
    if (check.passed) { if (!result.solved && !result.revealed) onAnswer(true); return; }
    onAnswer(false);
    setMessage(check.results.find((r) => !r.ok)?.message ?? 'ยังไม่ครบตามข้อกำหนด');
  };
  const reveal = () => { setCode(it.solution); onReveal(); setMessage(null); };
  const showAnatomy = it.focus === 'anatomy' || it.focus === 'regions';
  const firstIssue = check.issues[0];

  return (
    <div className="space-y-4" data-testid="html-builder" data-focus={it.focus}>
      <p className="text-[15px] font-semibold leading-relaxed text-ink break-words">{it.prompt}</p>

      {it.blocks && it.blocks.length > 0 && (
        <div role="group" aria-label="บล็อก HTML ที่เตรียมไว้" className="flex flex-wrap gap-2" data-testid="html-blocks">
          {it.blocks.map((b) => (
            <button
              key={b.html}
              type="button"
              draggable
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', b.html); e.dataTransfer.effectAllowed = 'copy'; }}
              onClick={() => place(b.html)}
              className={`${GHOST} cursor-grab flex-col items-start gap-0 py-1.5 text-left active:cursor-grabbing`}
              aria-label={`วาง ${b.label}: ${b.html}`}
            >
              <span className="text-[11px] font-semibold text-[var(--ink-3)]">วาง · {b.label}</span>
              <code style={MONO} className="font-mono text-[13px] text-[var(--brand-ink)]">{b.html}</code>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 @xl:grid-cols-2">
        <section aria-label="โค้ด HTML" className="min-w-0 space-y-2">
          <label htmlFor={`code-${saveKey}`} className="flex items-center justify-between text-sm font-semibold text-ink">
            <span>โค้ด HTML</span>
            <span className="text-xs font-normal text-[var(--ink-3)]">แก้ได้ · หน้าเว็บเปลี่ยนทันที</span>
          </label>
          <textarea
            id={`code-${saveKey}`}
            ref={area}
            value={code}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            rows={Math.min(14, Math.max(4, code.split('\n').length + 1))}
            onChange={(e) => { setCode(e.target.value); caret.current = e.target.selectionStart; }}
            onSelect={(e) => { caret.current = e.currentTarget.selectionStart; }}
            style={MONO}
            className="block w-full resize-y rounded-xl border border-[var(--line-2)] bg-[#0f172a] p-3 font-mono text-[14px] leading-6 text-slate-100 caret-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
            data-testid="html-code"
          />
          {showAnatomy && <CodeMap code={code} mode={it.focus === 'regions' ? 'regions' : 'anatomy'} sel={selToken} onPick={setSelToken} />}
        </section>
        <section aria-label="หน้าเว็บ (ผลลัพธ์)" className="min-w-0 space-y-2">
          <p className="text-sm font-semibold text-ink">หน้าเว็บ</p>
          <LivePage page={page} regions={it.focus === 'regions'} sel={sel} onPick={pickFromPage} onDropBlock={it.blocks?.length ? place : undefined} />
          <details className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm">
            <summary className="min-h-[32px] cursor-pointer font-semibold text-[var(--ink-2)]">อ่านหน้าเว็บเป็นข้อความ</summary>
            <ul className="mt-1 space-y-0.5" data-testid="page-text">
              {describePage(page).map((l, i) => <li key={i} className="break-words">{l}</li>)}
              {describePage(page).length === 0 && <li className="text-[var(--ink-3)]">หน้าเว็บยังว่าง</li>}
            </ul>
          </details>
        </section>
      </div>

      {it.focus === 'anatomy' && selToken !== null && tokens[selToken]?.kind === 'open' && <Anatomy code={code} open={selToken} />}
      {it.focus === 'anatomy' && firstIssue?.kind === 'unclosed' && (
        <p className="rounded-xl border-2 border-dashed border-[var(--err)] bg-[var(--err-soft)] px-3 py-2 text-sm text-ink" data-testid="unclosed-question">
          <b>ส่วนไหนยังไม่ได้ปิด?</b> ดูแท็กที่มีป้าย “ยังไม่มีคู่” แล้วเติมแท็กปิดในโค้ด
        </p>
      )}
      {it.focus === 'attributes' && <AttrPanel code={code} onChange={setCode} />}

      <div>
        <p className="text-sm font-semibold text-ink">สิ่งที่ต้องทำให้ได้</p>
        <ul className="mt-1 space-y-1" data-testid="html-requirements">
          {check.results.map((r) => (
            <li key={r.label} className="flex items-start gap-2 text-sm">
              {r.ok ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ok)]" aria-hidden="true" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink-3)]" aria-hidden="true" />}
              <span className={r.ok ? 'text-ink' : 'text-[var(--ink-2)]'}><span className="sr-only">{r.ok ? 'ผ่านแล้ว: ' : 'ยังไม่ผ่าน: '}</span>{r.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Feedback always describes the code that is on screen NOW — never a past result */}
      {done && !check.passed && (
        <p className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink-2)]" data-testid="html-done-before">ข้อนี้คุณผ่านไปแล้ว — ตอนนี้โค้ดเปลี่ยนไป ลองแก้ให้ครบอีกครั้งได้ (ไม่มีผลกับผลการเรียน)</p>
      )}
      {!check.passed && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={PRIMARY} onClick={submit} data-testid="html-check">ตรวจงาน</button>
          {!result.hintShown && <button type="button" className={GHOST} onClick={onHint}><Lightbulb className="h-4 w-4" /> ขอคำใบ้</button>}
          {result.hintShown && !done && <button type="button" className={GHOST} onClick={reveal}>ดูตัวอย่างคำตอบ</button>}
          <button type="button" className={GHOST} onClick={() => { setCode(it.starter); setMessage(null); setSelToken(null); }}><RotateCcw className="h-4 w-4" /> เริ่มใหม่</button>
        </div>
      )}
      {!check.passed && result.hintShown && <p className="rounded-xl bg-[var(--rev-soft)] px-3 py-2 text-sm" data-testid="html-hint">คำใบ้: {it.hint}</p>}
      {!check.passed && message && <Feedback tone="try" title="ยังไม่ครบ — ลองดูตรงนี้">{message}</Feedback>}
      {check.passed && result.solved && <Feedback tone="good" title="หน้าเว็บทำงานแล้ว">{it.explanation}</Feedback>}
      {check.passed && result.revealed && !result.solved && <Feedback tone="try" title="นี่คือตัวอย่างคำตอบ">{it.explanation} ลองแก้ข้อความหรือลำดับในโค้ดดู แล้วสังเกตหน้าเว็บเปลี่ยนตาม</Feedback>}
    </div>
  );
}
