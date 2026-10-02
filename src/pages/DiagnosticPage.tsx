import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ShieldCheck, SkipForward, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { diagnosticItemsFor } from '../diagnostic/items';
import { SUBJECT_EMOJI, SUBJECT_LABEL, SUBJECT_ORDER, scoreAttempt } from '../diagnostic/engine';
import { PROFILE_STATUS_LABEL } from '../diagnostic/types';
import type { CurriculumSubjectId } from '../curriculum/types';
import { CURRICULUM } from '../curriculum/data';
import { usePathway } from '../hooks/usePathway';
import { CodeBlock } from '../components/learning/SubjectBlocks';
import { StatusPill, SubjectStatusCard } from '../components/pathway/PathwayBits';

type Stage = { kind: 'intro' } | { kind: 'quiz'; queue: CurriculumSubjectId[] } | { kind: 'result'; done: CurriculumSubjectId[] };

/** "ก่อนเริ่มเรียน มารู้จักพื้นฐานของคุณกันก่อน" — per subject, no penalty, skippable. */
export function DiagnosticPage() {
  const [params] = useSearchParams();
  const first = params.get('subject') as CurriculumSubjectId | null;
  const [stage, setStage] = useState<Stage>(() => (first && SUBJECT_ORDER.includes(first) ? { kind: 'quiz', queue: [first] } : { kind: 'intro' }));
  const [picked, setPicked] = useState<CurriculumSubjectId[]>([]);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [finished, setFinished] = useState<CurriculumSubjectId[]>([]);
  const { recordDiagnosticAttempt, setDiagnosticSkipped } = useStore();
  const { subjects, recommendation } = usePathway();
  const navigate = useNavigate();

  if (stage.kind === 'intro') {
    return (
      <div className="mx-auto w-full max-w-3xl lg:max-w-5xl space-y-6" data-testid="diagnostic-intro">
        <Link to="/me" className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" /> ฉัน</Link>
        <header className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white sm:p-8">
          <p className="text-xs font-semibold text-brand-100">การวัดระดับของฉัน</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">ก่อนเริ่มเรียน มารู้จักพื้นฐานของคุณกันก่อน</h1>
          <ul className="mt-4 space-y-1.5 text-sm text-white/90">
            <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0" /> ไม่มีการหักคะแนน ตอบไม่ได้กด “ไม่แน่ใจ” ได้เลย</li>
            <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0" /> ใช้จัดเส้นทางให้ตรงกับคุณ แยกผลทีละวิชา ไม่รวมเป็นคะแนนเดียว</li>
            <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0" /> ข้ามวิชาที่ยังไม่อยากทำได้ แล้วกลับมาวัดทีหลังเมื่อไรก็ได้</li>
          </ul>
        </header>
        <section aria-labelledby="pick-subjects" className="space-y-3">
          <h2 id="pick-subjects" className="text-base font-bold text-ink">เลือกวิชาที่จะวัดตอนนี้</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {SUBJECT_ORDER.map((s) => {
              const on = picked.includes(s);
              const p = subjects.find((x) => x.subjectId === s)!;
              return (
                <button
                  key={s}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  data-subject={s}
                  onClick={() => setPicked((x) => (on ? x.filter((y) => y !== s) : [...x, s]))}
                  className={`min-h-[96px] rounded-3xl border-2 p-4 text-left transition-colors ${on ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300'}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-base font-bold text-ink">{SUBJECT_EMOJI[s]} {SUBJECT_LABEL[s]}</span>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300'}`}>{on && <Check className="h-4 w-4" />}</span>
                  </span>
                  <span className="mt-1 block text-xs text-slate-600">{diagnosticItemsFor(s).length} ข้อ · ประมาณ {Math.ceil(diagnosticItemsFor(s).length * 0.5)} นาที</span>
                  <span className="mt-1 block text-xs text-slate-500">{p.lastDiagnosticAt ? `วัดล่าสุด ${new Date(p.lastDiagnosticAt).toLocaleDateString('th-TH')}` : 'ยังไม่เคยวัด'}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => setStage({ kind: 'quiz', queue: [...SUBJECT_ORDER] })} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 text-sm font-bold text-white hover:bg-brand-700">
              ทำทุกวิชา <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" disabled={picked.length === 0} onClick={() => setStage({ kind: 'quiz', queue: SUBJECT_ORDER.filter((s) => picked.includes(s)) })} className="min-h-[52px] rounded-2xl border-2 border-brand-200 bg-white px-6 text-sm font-bold text-brand-700 hover:bg-brand-50 disabled:border-slate-200 disabled:text-slate-400">
              ทำเฉพาะที่เลือก ({picked.length})
            </button>
            <button type="button" onClick={() => { SUBJECT_ORDER.forEach((s) => setDiagnosticSkipped(s, true)); navigate('/'); }} className="inline-flex min-h-[52px] items-center justify-center gap-1.5 rounded-2xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              <SkipForward className="h-4 w-4" /> ข้ามไปก่อน
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (stage.kind === 'quiz') {
    const subject = stage.queue[0];
    const items = diagnosticItemsFor(subject);
    const answeredCount = items.filter((i) => i.id in answers).length;
    const next = (record: boolean) => {
      if (record) recordDiagnosticAttempt(subject, Object.fromEntries(items.map((i) => [i.id, answers[i.id] ?? null])));
      else setDiagnosticSkipped(subject, true);
      const done = record ? [...finished, subject] : finished;
      setFinished(done);
      setAnswers({});
      window.scrollTo?.(0, 0);
      if (stage.queue.length > 1) setStage({ kind: 'quiz', queue: stage.queue.slice(1) });
      else setStage({ kind: 'result', done });
    };
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4" data-testid="diagnostic-quiz" data-subject={subject}>
        <div className="sticky top-0 z-10 -mx-1 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur">
          <p className="text-sm font-bold text-ink">{SUBJECT_EMOJI[subject]} วัดพื้นฐาน{SUBJECT_LABEL[subject]}</p>
          <p className="text-xs text-slate-500">ตอบแล้ว {answeredCount}/{items.length} · ไม่หักคะแนน · ไม่ใช่การเช็กความเข้าใจของบทเรียน</p>
        </div>
        {items.map((it, n) => (
          <fieldset key={it.id} className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5" data-item={it.id}>
            <legend className="sr-only">ข้อ {n + 1}</legend>
            <p className="text-xs font-semibold text-slate-500">ข้อ {n + 1} · {CURRICULUM.skills.find((s) => s.id === it.skillId)?.title}</p>
            {it.code && <div className="mt-2"><CodeBlock code={it.code} /></div>}
            <p className="mt-1 text-[15px] font-semibold text-ink break-words">{it.prompt}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {it.choices.map((c, k) => (
                <button key={c} type="button" aria-pressed={answers[it.id] === k} onClick={() => setAnswers((a) => ({ ...a, [it.id]: k }))}
                  className={`min-h-[48px] rounded-2xl border-2 px-4 text-left text-sm font-medium ${answers[it.id] === k ? 'border-brand-500 bg-brand-50 text-brand-900' : 'border-slate-200 bg-white text-ink hover:border-brand-300'}`}>
                  <span className="break-words">{c}</span>
                </button>
              ))}
              <button type="button" aria-pressed={it.id in answers && answers[it.id] === null} onClick={() => setAnswers((a) => ({ ...a, [it.id]: null }))}
                className={`min-h-[48px] rounded-2xl border-2 border-dashed px-4 text-left text-sm ${it.id in answers && answers[it.id] === null ? 'border-slate-500 bg-slate-100 text-ink' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                ไม่แน่ใจ
              </button>
            </div>
          </fieldset>
        ))}
        <div className="flex flex-col-reverse gap-2 pb-4 sm:flex-row sm:justify-between">
          <button type="button" onClick={() => next(false)} className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            <X className="h-4 w-4" /> ข้ามวิชานี้ไปก่อน
          </button>
          <button type="button" disabled={answeredCount === 0} onClick={() => next(true)} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 text-sm font-bold text-white hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-500">
            {stage.queue.length > 1 ? `ส่งคำตอบ แล้วไปวิชาถัดไป` : 'ส่งคำตอบ ดูผล'} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Result — per subject, never one combined score
  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-6xl space-y-6" data-testid="diagnostic-result">
      <header>
        <p className="text-xs font-semibold text-brand-700">ผลการวัดระดับ</p>
        <h1 className="mt-0.5 text-2xl font-bold text-ink">พื้นฐานของคุณตอนนี้</h1>
        <p className="mt-1 text-sm text-slate-600">แยกตามวิชาและทักษะ ใช้จัดเส้นทาง ไม่ใช่คะแนนสอบ</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-3">
        {subjects.map((p) => (
          <SubjectStatusCard key={p.subjectId} p={p} detailed highlight={stage.done.includes(p.subjectId)} />
        ))}
      </div>
      {stage.done.length > 0 && (
        <section aria-label="รายละเอียดคำตอบ" className="space-y-2">
          {stage.done.map((s) => {
            const items = diagnosticItemsFor(s);
            const lastAnswers = useStore.getState().diagnostic.attempts.filter((a) => a.subjectId === s).slice(-1)[0];
            const scores = lastAnswers ? scoreAttempt(lastAnswers) : [];
            return (
              <details key={s} className="rounded-3xl border border-slate-200/80 bg-white p-4">
                <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-bold text-ink">{SUBJECT_EMOJI[s]} ดูเฉลย{SUBJECT_LABEL[s]}</summary>
                <ul className="mt-2 divide-y divide-slate-100 text-sm">
                  {items.map((it) => {
                    const a = lastAnswers?.answers[it.id];
                    return (
                      <li key={it.id} className="py-2">
                        <p className="font-semibold text-ink break-words">{it.prompt}</p>
                        <p className={a === it.correctIndex ? 'text-emerald-700' : a === null || a === undefined ? 'text-slate-500' : 'text-amber-800'}>
                          {a === it.correctIndex ? '✓ ' : a === null || a === undefined ? '– ไม่ได้ตอบ · ' : '△ '}คำตอบ: {it.choices[it.correctIndex]} — {it.explanation}
                        </p>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 flex flex-wrap gap-1.5">{scores.map((x) => <StatusPill key={x.skillId} status={x.status} label={`${CURRICULUM.skills.find((k) => k.id === x.skillId)?.title} · ${PROFILE_STATUS_LABEL[x.status]}`} />)}</p>
              </details>
            );
          })}
        </section>
      )}
      {recommendation && (
        <section className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-white sm:p-6" data-testid="diagnostic-recommendation">
          <p className="text-xs font-semibold text-brand-100">เราแนะนำให้เริ่มจาก</p>
          <p className="mt-1 text-xl font-bold">{SUBJECT_EMOJI[recommendation.subjectId]} {SUBJECT_LABEL[recommendation.subjectId]} — {recommendation.lesson.title}</p>
          <p className="mt-2 text-sm text-white/90 break-words">{recommendation.reasons.join(' · ')}</p>
          <Link to={`/learn/curriculum/${recommendation.lesson.id}?from=next&min=${recommendation.minutes}`} className="mt-4 inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-white px-6 text-sm font-bold text-brand-800">
            เริ่มเรียน <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setPicked([]); setStage({ kind: 'intro' }); }} className="min-h-[48px] rounded-2xl border-2 border-slate-200 px-5 text-sm font-semibold text-slate-700">วัดวิชาอื่น / วัดใหม่</button>
        <Link to="/route" className="inline-flex min-h-[48px] items-center rounded-2xl px-4 text-sm font-semibold text-brand-700">ดูเส้นทางของฉัน</Link>
      </div>
    </div>
  );
}
