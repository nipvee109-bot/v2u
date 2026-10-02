import { useState } from 'react';
import { Terminal, Lightbulb, HelpCircle, AlertTriangle, Sigma } from 'lucide-react';
import type { CodeExample, FormulaCard as Formula, OriginalTryIt } from '../../content/types';

/** Readable, scrollable code — never wider than the screen. */
export function CodeBlock({ code, label = 'Python' }: { code: string; label?: string }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950" data-testid="code-block">
      <figcaption className="flex items-center gap-1.5 border-b border-slate-800 px-4 py-1.5 text-[11px] font-semibold text-slate-400">
        <Terminal className="h-3.5 w-3.5" /> {label}
      </figcaption>
      <pre className="overflow-x-auto px-4 py-3 text-[13px] leading-relaxed text-slate-100 sm:text-sm" tabIndex={0}>
        <code>{code}</code>
      </pre>
    </figure>
  );
}

function Output({ text, stdin }: { text: string; stdin?: string }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5">
      <p className="text-[11px] font-semibold text-emerald-800">ผลลัพธ์ที่แสดง{stdin ? ` (เมื่อผู้ใช้พิมพ์ ${stdin.trim().split('\n').join(' แล้ว ')})` : ''}</p>
      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm text-emerald-950">{text}</pre>
    </div>
  );
}

/** Programming: the code, what it prints, what it does, why, and what happens if you change it. */
export function CodeExplained({ ex, n }: { ex: CodeExample; n: number }) {
  return (
    <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5" data-testid="code-example">
      <p className="text-xs font-semibold text-brand-700">ตัวอย่างโค้ด {n}</p>
      <CodeBlock code={ex.code} />
      <Output text={ex.output} stdin={ex.stdin} />
      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-3">
          <dt className="text-xs font-semibold text-slate-500">โค้ดนี้ทำอะไร</dt>
          <dd className="mt-0.5 text-slate-800 break-words">{ex.does}</dd>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <dt className="text-xs font-semibold text-slate-500">ทำไมต้องเขียนแบบนี้</dt>
          <dd className="mt-0.5 text-slate-800 break-words">{ex.why}</dd>
        </div>
        <div className="rounded-2xl bg-amber-50 p-3">
          <dt className="flex items-center gap-1 text-xs font-semibold text-amber-800"><HelpCircle className="h-3.5 w-3.5" /> ถ้าแก้ตรงนี้</dt>
          <dd className="mt-0.5 text-amber-950 break-words">{ex.whatIf}</dd>
        </div>
      </dl>
    </div>
  );
}

export function ErrorExample({ e }: { e: { code: string; error: string; fix: string } }) {
  return (
    <div className="space-y-2 rounded-3xl border border-rose-200 bg-rose-50/60 p-4 sm:p-5" data-testid="error-example">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-700"><AlertTriangle className="h-4 w-4" /> ข้อผิดพลาดที่พบบ่อย</p>
      <CodeBlock code={e.code} />
      <p className="text-sm text-rose-950">Python จะแจ้ง <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[13px]">{e.error}</code></p>
      <p className="text-sm text-slate-800 break-words"><b className="font-semibold">แก้:</b> {e.fix}</p>
    </div>
  );
}

/** Physics: formula, every variable with its meaning and unit, and how the variables affect each other. */
export function FormulaCardView({ f }: { f: Formula }) {
  return (
    <div className="space-y-3 rounded-3xl border border-sky-200 bg-sky-50/50 p-4 sm:p-5" data-testid="formula-card">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-sky-800"><Sigma className="h-4 w-4" /> สูตร</p>
      <p className="overflow-x-auto rounded-2xl bg-white px-4 py-3 text-center font-mono text-lg font-semibold text-ink sm:text-xl">{f.expr}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="py-1 pr-3 font-semibold">ตัวแปร</th>
              <th className="py-1 pr-3 font-semibold">ความหมาย</th>
              <th className="py-1 font-semibold">หน่วย</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100">
            {f.vars.map((v) => (
              <tr key={v.symbol}>
                <td className="py-1.5 pr-3 font-mono font-semibold text-ink">{v.symbol}</td>
                <td className="py-1.5 pr-3 text-slate-700">{v.meaning}</td>
                <td className="py-1.5 font-mono text-slate-700">{v.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex items-start gap-2 text-sm text-sky-950 break-words">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" /> {f.relation}
      </p>
    </div>
  );
}

/** Practice with a revealable answer (code practice: "what does this print?"). */
export function PracticeItem({ item, code }: { item: OriginalTryIt; code: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="space-y-2 py-3">
      {code ? <CodeBlock code={item.prompt} /> : <p className="font-mono text-sm text-ink break-words">{item.prompt}</p>}
      {code && <p className="text-xs text-slate-600">โค้ดนี้แสดงอะไร? คิดก่อนแล้วค่อยเปิดดู</p>}
      {open ? (
        code ? <Output text={item.answer} /> : <p className="font-mono text-sm text-emerald-700 break-words">{item.answer}</p>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="min-h-[44px] rounded-xl px-2 text-xs font-semibold text-brand-700 hover:bg-brand-50">
          {code ? 'ดูผลลัพธ์' : 'ดูเฉลย'}
        </button>
      )}
    </li>
  );
}
