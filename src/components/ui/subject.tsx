/* Subject identity (V2U design reference): one colour + one icon per subject.
   Visual only — subjects themselves come from the existing curriculum/SUBJECTS data. */
import { subjectStyle } from './subjectStyle';

/** Square icon tile in the subject colour. */
export function SubjectMark({ subjectId, size = 'md' }: { subjectId: string; size?: 'sm' | 'md' | 'lg' }) {
  const st = subjectStyle(subjectId);
  const I = st.icon;
  const box = size === 'sm' ? 'h-7 w-7 rounded-lg' : size === 'lg' ? 'h-12 w-12 rounded-2xl' : 'h-10 w-10 rounded-xl';
  const ic = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  return (
    <span className={`flex shrink-0 items-center justify-center ${box} ${st.soft} ${st.text}`} aria-hidden="true" data-subject-mark={subjectId}>
      <I className={ic} />
    </span>
  );
}

/** Inline subject tag: icon + name, in the subject colour. */
export function SubjectTag({ subjectId, label, onDark = false }: { subjectId: string; label: string; onDark?: boolean }) {
  const st = subjectStyle(subjectId);
  const I = st.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${onDark ? 'border-white/15 bg-white/10 text-white' : `${st.ring} ${st.soft} ${st.text}`}`}
      data-subject-tag={subjectId}
    >
      <I className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
