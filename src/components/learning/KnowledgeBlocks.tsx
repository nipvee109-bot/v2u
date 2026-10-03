/* Reading-mode blocks for the researched lesson knowledge (Phase 62).
   Rendered from src/content/knowledge — the same data the check (and later games) use. */
import { useState } from 'react';
import type { KnowledgeDebug, KnowledgeExample, KnowledgePractice, LessonKnowledge } from '../../content/knowledge';
import { getSource } from '../../content/knowledge';
import { KIcon } from '../v2u/kit';
import { CodeBlock } from './SubjectBlocks';
import { DiagramView } from './Diagrams';

const box = 'rounded-2xl p-4';

/** Why it matters + what this lesson covers and what it deliberately leaves for later. */
export function KnowledgeBoundary({ k }: { k: LessonKnowledge }) {
  return (
    <div className="mt-4 space-y-3" data-testid="knowledge-boundary">
      <p className={`${box} text-sm text-[var(--ink)]`} style={{ background: 'var(--brand-soft)' }}>
        <b className="font-semibold text-[var(--brand-ink)]">ทำไมบทนี้สำคัญ: </b>
        {k.whyItMatters}
      </p>
      <details className={`${box} group`} style={{ background: 'var(--surface-2)' }}>
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-[var(--ink)]">
          ขอบเขตของบทนี้ — เรียนอะไร และอะไรยังไม่ต้องรู้
          <KIcon name="chevD" size={16} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-[var(--ok)]">ในบทนี้</p>
            <ul className="mt-1 space-y-1 text-sm text-[var(--ink-2)]">
              {k.allowedKnowledge.map((a) => (
                <li key={a} className="flex gap-2 break-words"><span className="mt-0.5 text-[var(--ok)]"><KIcon name="check" size={14} w={2.4} /></span>{a}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--ink-3)]">ยังไม่ต้องรู้ (เรียนทีหลัง)</p>
            <ul className="mt-1 space-y-1 text-sm text-[var(--ink-3)]">
              {k.notYetAllowed.map((a) => (
                <li key={a} className="flex gap-2 break-words"><span className="mt-0.5"><KIcon name="lock" size={14} /></span>{a}</li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
}

/** Rules / formulas / syntax, each with what its symbols mean. */
export function KnowledgeRules({ k }: { k: LessonKnowledge }) {
  return (
    <div className="mt-4" data-testid="knowledge-rules">
      <p className="text-xs font-semibold text-[var(--ink-3)]">กฎ สูตร และรูปแบบที่ใช้ในบทนี้</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {k.rules.map((r) => (
          <li key={r.id} className="rounded-xl p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
            <p className="text-xs font-semibold text-[var(--brand-ink)]">{r.name}</p>
            <p className="mt-1 whitespace-pre-wrap font-mono text-sm text-[var(--ink)] break-words">{r.statement}</p>
            {r.notation && <p className="mt-1 text-xs text-[var(--ink-3)] break-words">{r.notation}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The detailed explanation, after the simple one. */
export function KnowledgeDetailed({ k }: { k: LessonKnowledge }) {
  return (
    <div className="mt-4 space-y-3" data-testid="knowledge-detailed">
      {k.analogy && (
        <p className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm text-[var(--ink)]" style={{ background: 'var(--surface-2)' }}>
          <span className="mt-0.5 text-[var(--rev)]"><KIcon name="bulb" size={16} /></span>
          <span className="break-words"><b className="font-semibold">นึกภาพแบบนี้: </b>{k.analogy}</span>
        </p>
      )}
      <p className="text-xs font-semibold text-[var(--ink-3)]">อธิบายละเอียด</p>
      {k.detailed.map((p) => (
        <p key={p} className="text-[15px] leading-relaxed text-[var(--ink)] break-words">{p}</p>
      ))}
    </div>
  );
}

function ExampleCard({ e, n }: { e: KnowledgeExample; n: number }) {
  return (
    <details className="group rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]" data-testid="knowledge-example">
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-3">
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-[var(--brand-ink)]">ตัวอย่างเพิ่มเติม {n}</span>
          <span className="block text-[15px] font-semibold text-[var(--ink)] break-words">{e.problem}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--brand-ink)]">
          วิธีทำ <KIcon name="chevD" size={16} className="transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="space-y-3 border-t border-[var(--line)] px-5 py-4">
        {e.code && <CodeBlock code={e.code} />}
        <ol className="space-y-1 text-sm text-[var(--ink-2)]">
          {e.steps.map((s, i) => (
            <li key={s} className="flex gap-3"><span className="w-5 shrink-0 text-right font-mono text-[var(--ink-3)]">{i + 1}</span><span className="break-words">{s}</span></li>
          ))}
        </ol>
        <p className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--ink)]" style={{ background: 'var(--ok-soft)' }}>
          คำตอบ: <span className="whitespace-pre-wrap font-mono">{e.answer}</span>
        </p>
      </div>
    </details>
  );
}

export function KnowledgeExamples({ k }: { k: LessonKnowledge }) {
  return (
    <>
      {k.workedExamples.map((e, i) => (
        <ExampleCard key={e.id} e={e} n={i + 1} />
      ))}
    </>
  );
}

/** Mistakes with why they happen and how to fix them. */
export function KnowledgeMistakes({ k }: { k: LessonKnowledge }) {
  return (
    <ul className="mt-3 space-y-2" data-testid="knowledge-mistakes">
      {k.mistakes.map((m) => (
        <li key={m.mistake} className="rounded-xl bg-[var(--surface)] p-3 text-sm">
          <p className="font-semibold text-[var(--ink)] break-words">✕ {m.mistake}</p>
          <p className="mt-1 text-[var(--ink-2)] break-words"><b className="font-semibold">ทำไมถึงพลาด: </b>{m.why}</p>
          <p className="mt-1 text-[var(--ink)] break-words"><b className="font-semibold text-[var(--ok)]">แก้อย่างไร: </b>{m.fix}</p>
        </li>
      ))}
    </ul>
  );
}

function PracticeRow({ p, code }: { p: KnowledgePractice; code: boolean }) {
  const [hint, setHint] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <li className="space-y-2 py-3" data-testid="knowledge-practice" data-level={p.level}>
      <p className="text-sm font-semibold text-[var(--ink)] break-words">{p.prompt}</p>
      {p.code && <CodeBlock code={p.code} />}
      <div className="flex flex-wrap gap-2">
        {p.hint && !hint && !open && (
          <button type="button" onClick={() => setHint(true)} className="min-h-[44px] rounded-xl px-3 text-xs font-semibold text-[var(--ink-2)] hover:bg-[var(--surface-2)]">
            ขอคำใบ้
          </button>
        )}
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="min-h-[44px] rounded-xl px-3 text-xs font-semibold text-[var(--brand-ink)] hover:bg-[var(--brand-soft)]">
            {code ? 'ดูผลลัพธ์และเหตุผล' : 'ดูเฉลยและเหตุผล'}
          </button>
        )}
      </div>
      {hint && !open && <p className="rounded-xl px-3 py-2 text-sm text-[var(--ink-2)]" style={{ background: 'var(--surface-2)' }}>คำใบ้: {p.hint}</p>}
      {open && (
        <div className="space-y-1 rounded-xl px-3 py-2.5 text-sm" style={{ background: 'var(--ok-soft)' }}>
          <p className="whitespace-pre-wrap font-mono font-semibold text-[var(--ink)] break-words">{p.answer}</p>
          <p className="text-[var(--ink-2)] break-words">{p.explanation}</p>
        </div>
      )}
    </li>
  );
}

function DebugRow({ d }: { d: KnowledgeDebug }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="space-y-2 py-3" data-testid="knowledge-debug">
      <p className="text-sm font-semibold text-[var(--ink)]">หาบั๊ก: โค้ดนี้มีปัญหาอะไร</p>
      <CodeBlock code={d.buggy} />
      <p className="text-xs text-[var(--err)] break-words">อาการ: {d.symptom}</p>
      {open ? (
        <div className="space-y-2">
          <CodeBlock code={d.fixed} label="แก้แล้ว" />
          <p className="rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--ok-soft)' }}>
            ผลลัพธ์: <span className="whitespace-pre-wrap font-mono font-semibold">{d.output}</span> — {d.explanation}
          </p>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="min-h-[44px] rounded-xl px-3 text-xs font-semibold text-[var(--brand-ink)] hover:bg-[var(--brand-soft)]">
          ดูวิธีแก้
        </button>
      )}
    </li>
  );
}

const LEVEL = { 1: 'ระดับ 1 · พื้นฐาน', 2: 'ระดับ 2 · ใช้หลายขั้น', 3: 'ระดับ 3 · ท้าทาย' } as const;

/** Guided practice (with hints) → independent practice by level → debugging. */
export function KnowledgePracticeList({ k, code }: { k: LessonKnowledge; code: boolean }) {
  return (
    <div className="mt-4 space-y-4 border-t border-[var(--line)] pt-4" data-testid="knowledge-practice-list">
      <div>
        <p className="text-sm font-bold text-[var(--ink)]">ฝึกแบบมีคำใบ้</p>
        <p className="text-xs text-[var(--ink-3)]">ลองเองก่อน ติดตรงไหนขอคำใบ้ได้</p>
        <ul className="divide-y divide-[var(--line)]">{k.guided.map((p) => <PracticeRow key={p.id} p={p} code={code} />)}</ul>
      </div>
      {([1, 2, 3] as const).map((lvl) => {
        const items = k.independent.filter((p) => p.level === lvl);
        if (!items.length) return null;
        return (
          <div key={lvl}>
            <p className="text-sm font-bold text-[var(--ink)]">ฝึกเอง — {LEVEL[lvl]}</p>
            <ul className="divide-y divide-[var(--line)]">{items.map((p) => <PracticeRow key={p.id} p={p} code={code} />)}</ul>
          </div>
        );
      })}
      {k.debugging && k.debugging.length > 0 && (
        <div>
          <p className="text-sm font-bold text-[var(--ink)]">ฝึกหาบั๊ก</p>
          <ul className="divide-y divide-[var(--line)]">{k.debugging.map((d) => <DebugRow key={d.id} d={d} />)}</ul>
        </div>
      )}
    </div>
  );
}

export function KnowledgeSummary({ k }: { k: LessonKnowledge }) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="knowledge-summary">
      <div className={box} style={{ background: 'var(--surface-2)' }}>
        <p className="text-xs font-semibold text-[var(--ink-3)]">สรุปสั้น ๆ</p>
        <ul className="mt-1 space-y-1 text-sm text-[var(--ink)]">{k.summary.map((s) => <li key={s} className="break-words">• {s}</li>)}</ul>
      </div>
      <div className={box} style={{ background: 'var(--ok-soft)' }}>
        <p className="text-xs font-semibold text-[var(--ok)]">เรียนจบแล้วคุณควรทำได้</p>
        <ul className="mt-1 space-y-1 text-sm text-[var(--ink)]">{k.afterLesson.map((s) => <li key={s} className="break-words">✓ {s}</li>)}</ul>
      </div>
    </div>
  );
}

const VERIFY_LABEL = { 'opened-local': 'เปิดอ่านเอกสารทางการแล้ว', 'search-indexed': 'พบจากการค้นหา ยังไม่ได้เปิดตรวจหน้า', 'locator-only': 'ระบุตำแหน่งในเอกสาร' } as const;

/** Where the content comes from — names and locations only (no unchecked links). */
export function KnowledgeSources({ k }: { k: LessonKnowledge }) {
  return (
    <details className="group mt-4 rounded-2xl border border-[var(--line)] p-4" data-testid="knowledge-sources">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-[var(--ink-3)]">
        ที่มาของเนื้อหา — V2U เขียนเอง โดยตรวจกับแหล่งเหล่านี้
        <KIcon name="chevD" size={14} className="transition-transform group-open:rotate-180" />
      </summary>
      <ul className="mt-2 space-y-2 text-xs text-[var(--ink-2)]">
        {k.provenance.map((p) => {
          const s = getSource(p.sourceId);
          if (!s) return null;
          return (
            <li key={p.sourceId} className="break-words">
              <b className="font-semibold text-[var(--ink)]">{s.title}</b> — {s.publisher}
              <br />
              <span className="text-[var(--ink-3)]">ใช้สำหรับ: {p.usedFor} · {s.locator} · ตรวจเมื่อ {s.checkedAt} · {VERIFY_LABEL[s.verification]}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-[var(--ink-3)]">คำตอบตัวเลขทุกข้อตรวจด้วยการคำนวณ และโค้ดทุกตัวอย่างตรวจด้วยการรันจริง</p>
    </details>
  );
}

/** Diagrams for graphs, triangles, vectors and forces — drawn from the lesson's own numbers. */
export function KnowledgeDiagrams({ k }: { k: LessonKnowledge }) {
  if (!k.diagrams?.length) return null;
  return (
    <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]" data-testid="knowledge-diagrams">
      {k.diagrams.map((d) => <DiagramView key={d.id} d={d} />)}
    </div>
  );
}
