import { useMemo, useState } from 'react';
import { Pencil, RotateCcw, Save } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { buildPersonalSummary, notesForLesson } from '../../notes/engine';
import type { SummaryInput } from '../../notes/engine';
import type { StudyNote } from '../../notes/types';

const NO_NOTES: StudyNote[] = [];

/** "สรุปของฉัน" — assembled from the learner's own notes + checked result; editable; notes stay untouched. */
export function PersonalSummaryCard({ lessonId, videoTitle, check }: Omit<SummaryInput, 'notes' | 'lessonId'> & { lessonId: string }) {
  const notes = useStore((s) => s.learningNotes?.notes) ?? NO_NOTES;
  const saved = useStore((s) => s.learningNotes?.summaries?.[lessonId]);
  const { savePersonalSummary } = useStore();
  const draft = useMemo(() => buildPersonalSummary({ lessonId, notes, videoTitle, check }), [lessonId, notes, videoTitle, check]);
  const shown = saved?.edited ? saved.text : draft;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(shown);
  const count = notesForLesson(notes, lessonId).length;

  return (
    <section aria-labelledby="my-summary" className="rounded-2xl border border-ink/[0.08] bg-white shadow-card p-5 sm:p-6" data-testid="personal-summary">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="my-summary" className="text-base font-bold text-ink">🧠 สรุปของฉัน</h3>
        <span className="text-xs text-slate-500">จากโน้ต {count} รายการของคุณ{saved?.edited ? ' · แก้ไขแล้ว' : ''}</span>
      </div>
      {editing ? (
        <>
          <label htmlFor={`summary-${lessonId}`} className="sr-only">แก้สรุปของฉัน</label>
          <textarea
            id={`summary-${lessonId}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            className="mt-3 w-full rounded-2xl border border-brand-300 bg-white p-3 font-sans text-sm leading-relaxed text-ink outline-none focus:ring-4 focus:ring-brand-100"
          />
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => { setText(draft); }} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              <RotateCcw className="h-4 w-4" /> เริ่มจากโน้ตใหม่
            </button>
            <button
              type="button"
              onClick={() => {
                savePersonalSummary(lessonId, text);
                setEditing(false);
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white hover:bg-brand-700"
            >
              <Save className="h-4 w-4" /> บันทึกสรุป
            </button>
          </div>
        </>
      ) : (
        <>
          <pre className="mt-3 whitespace-pre-wrap break-words rounded-2xl bg-slate-50 p-4 font-sans text-sm leading-relaxed text-slate-800">{shown}</pre>
          <button
            type="button"
            onClick={() => {
              setText(shown);
              setEditing(true);
            }}
            className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand-700"
          >
            <Pencil className="h-4 w-4" /> แก้สรุปเอง
          </button>
          <p className="text-[11px] text-slate-500">สรุปนี้รวมจากโน้ตและผลเช็กของคุณเท่านั้น — การแก้สรุปไม่เปลี่ยนโน้ตเดิม</p>
        </>
      )}
    </section>
  );
}
