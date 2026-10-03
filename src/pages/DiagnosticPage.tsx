import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KIcon } from '../components/v2u/kit';
import { ST, stOf, subOf } from '../components/v2u/tokens';
import { useStore } from '../store/useStore';
import { diagnosticItemsFor } from '../diagnostic/items';
import { SUBJECT_LABEL, SUBJECT_ORDER, scoreAttempt } from '../diagnostic/engine';
import { PROFILE_STATUS_LABEL } from '../diagnostic/types';
import type { CurriculumSubjectId } from '../curriculum/types';
import { CURRICULUM } from '../curriculum/data';
import { usePathway } from '../hooks/usePathway';
import { CodeBlock } from '../components/learning/SubjectBlocks';
import { StatusPill, SubjectStatusCard } from '../components/pathway/PathwayBits';

type Stage =
  | { kind: 'intro' }
  | { kind: 'quiz'; queue: CurriculumSubjectId[] }
  | { kind: 'subject-done'; subject: CurriculumSubjectId; queue: CurriculumSubjectId[]; done: CurriculumSubjectId[] }
  | { kind: 'result'; done: CurriculumSubjectId[] };

const HERO = 'radial-gradient(420px 240px at 100% 0%,rgba(132,150,255,.55),transparent 70%),linear-gradient(135deg,#0b1135 0%,#16207a 60%,#2a3bd2 100%)';
const LEGEND = [
  { st: ST.ok, desc: 'ตอบถูกและมั่นใจ ใช้ต่อได้เลย' },
  { st: ST.dev, desc: 'เข้าใจบางส่วน ควรฝึกเพิ่ม' },
  { st: ST.rev, desc: 'เคยรู้แต่ยังพลาด ควรทบทวนก่อน' },
  { st: ST.none, desc: 'ข้ามหรือไม่แน่ใจ ยังไม่มีข้อมูล' },
];

/** "ก่อนเริ่มเรียน มารู้จักพื้นฐานของคุณกันก่อน" (design: V2U Diagnostic) — per subject, no penalty, skippable. */
export function DiagnosticPage() {
  const [params] = useSearchParams();
  const first = params.get('subject') as CurriculumSubjectId | null;
  const [stage, setStage] = useState<Stage>(() => (first && SUBJECT_ORDER.includes(first) ? { kind: 'quiz', queue: [first] } : { kind: 'intro' }));
  const [picked, setPicked] = useState<CurriculumSubjectId[]>([]);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [qi, setQi] = useState(0);
  const [finished, setFinished] = useState<CurriculumSubjectId[]>([]);
  const { recordDiagnosticAttempt, setDiagnosticSkipped } = useStore();
  const { subjects, recommendation } = usePathway();
  const navigate = useNavigate();
  const h1 = { fontSize: 'clamp(26px,2vw + 18px,38px)' } as const;

  if (stage.kind === 'intro') {
    const totalMin = SUBJECT_ORDER.reduce((n, s) => n + Math.ceil(diagnosticItemsFor(s).length * 0.5), 0);
    return (
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-[22px]" data-testid="diagnostic-intro">
        <Link to="/me" className="inline-flex min-h-[44px] items-center gap-1 self-start text-[13px] font-semibold" style={{ color: 'var(--brand-ink)' }}><KIcon name="chevL" size={16} /> ฉัน</Link>
        <section className="relative flex flex-col gap-4 overflow-hidden text-white" style={{ padding: 'clamp(22px,3vw,40px)', borderRadius: 28, background: HERO, boxShadow: 'var(--shadow-lg)' }}>
          <span aria-hidden="true" className="absolute -right-[70px] -top-[70px] h-[260px] w-[260px] rounded-full" style={{ border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 0 0 36px rgba(255,255,255,.025)' }} />
          <span className="relative text-xs font-semibold" style={{ letterSpacing: '.08em', color: '#c9d1ff' }}>ก่อนเริ่มเรียน มารู้จักพื้นฐานของคุณกันก่อน</span>
          <h1 className="relative font-display font-bold leading-tight" style={h1}>มาดูกันว่าตอนนี้คุณอยู่ตรงไหน</h1>
          <p className="relative max-w-[52ch]" style={{ color: '#d5dbff' }}>ตอบคำถามสั้น ๆ ทีละวิชา V2U จะรู้ว่าทักษะไหนพร้อมแล้ว และทักษะไหนควรเริ่มก่อน ไม่มีการหักคะแนน ไม่มีคะแนนรวม และไม่มีผ่านหรือไม่ผ่าน</p>
          <div className="relative flex flex-wrap gap-2">
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold" style={{ background: 'rgba(255,255,255,.12)' }}><KIcon name="clock" size={14} /> ทั้ง 3 วิชาประมาณ {totalMin} นาที</span>
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold" style={{ background: 'rgba(255,255,255,.12)' }}><KIcon name="skip" size={14} /> ข้ามวิชาได้ กลับมาวัดทีหลังได้</span>
          </div>
        </section>
        <section className="flex items-start gap-3.5 rounded-[20px] p-[18px]" style={{ background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px]" style={{ background: 'var(--none-soft)', color: 'var(--none)' }}><KIcon name="sNone" size={20} /></span>
          <div>
            <p className="font-display text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>ไม่แน่ใจข้อไหน ข้ามได้</p>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--ink-2)' }}>กด “ไม่แน่ใจ” ได้เลย ระบบจะนับเป็น “ยังไม่ได้วัด” ไม่ใช่ “ผิด” ตอบเฉพาะที่คิดออกจริงจะได้เส้นทางที่ตรงกว่า</p>
          </div>
        </section>
        <section className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr))]" aria-label="ความหมายของสถานะ">
          {LEGEND.map(({ st, desc }) => (
            <div key={st.label} className="flex flex-col gap-1.5 rounded-2xl p-3.5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: st.c }}><KIcon name={st.k} size={16} /> {st.label}</span>
              <span className="text-[13px]" style={{ color: 'var(--ink-3)' }}>{desc}</span>
            </div>
          ))}
        </section>
        <section aria-labelledby="pick-subjects" className="flex flex-col gap-3">
          <h2 id="pick-subjects" className="font-display text-xl font-bold" style={{ color: 'var(--ink)' }}>เลือกวิชาที่จะวัดตอนนี้</h2>
          {SUBJECT_ORDER.map((s) => {
            const on = picked.includes(s);
            const p = subjects.find((x) => x.subjectId === s)!;
            const sb = subOf(s);
            const n = diagnosticItemsFor(s).length;
            return (
              <button
                key={s}
                type="button"
                role="checkbox"
                aria-checked={on}
                data-subject={s}
                onClick={() => setPicked((x) => (on ? x.filter((y) => y !== s) : [...x, s]))}
                className="flex flex-wrap items-center gap-4 p-[18px] text-left transition-colors"
                style={{ borderRadius: 20, background: on ? 'var(--brand-soft)' : 'var(--surface)', border: on ? '2px solid var(--brand)' : '1px solid var(--line)', boxShadow: 'var(--shadow)' }}
              >
                <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl" style={{ background: sb.soft, color: sb.c }}><KIcon name={sb.k} size={26} /></span>
                <span className="flex min-w-0 flex-[1_1_180px] flex-col gap-1">
                  <span className="text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>{SUBJECT_LABEL[s]}</span>
                  <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: p.lastDiagnosticAt ? 'var(--ok)' : 'var(--ink-3)' }}>
                    <KIcon name={p.lastDiagnosticAt ? 'sOk' : 'clock'} size={14} />
                    {n} ข้อ · ประมาณ {Math.ceil(n * 0.5)} นาที · {p.lastDiagnosticAt ? `วัดล่าสุด ${new Date(p.lastDiagnosticAt).toLocaleDateString('th-TH')}` : 'ยังไม่เคยวัด'}
                  </span>
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ border: on ? 'none' : '2px solid var(--line-2)', background: on ? 'var(--brand)' : 'transparent', color: 'var(--on-brand)' }}>{on && <KIcon name="check" size={16} w={2.6} />}</span>
              </button>
            );
          })}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" onClick={() => setStage({ kind: 'quiz', queue: [...SUBJECT_ORDER] })} className="inline-flex h-[52px] items-center justify-center gap-2.5 rounded-[14px] px-6 font-bold" style={{ background: 'var(--brand)', color: 'var(--on-brand)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.2),0 10px 20px -10px var(--brand)' }}>
              ทำทุกวิชา <KIcon name="arrowR" size={18} />
            </button>
            <button type="button" disabled={picked.length === 0} onClick={() => setStage({ kind: 'quiz', queue: SUBJECT_ORDER.filter((s) => picked.includes(s)) })} className="h-[52px] rounded-[14px] px-6 font-bold disabled:cursor-not-allowed disabled:opacity-50" style={{ border: '1px solid var(--line-2)', color: 'var(--ink)', background: 'var(--surface)' }}>
              ทำเฉพาะที่เลือก ({picked.length})
            </button>
            <button type="button" onClick={() => { SUBJECT_ORDER.forEach((s) => setDiagnosticSkipped(s, true)); navigate('/'); }} className="inline-flex h-[52px] items-center justify-center gap-1.5 rounded-[14px] px-4 font-semibold" style={{ color: 'var(--ink-2)' }}>
              <KIcon name="skip" size={16} /> ข้ามไปก่อน
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (stage.kind === 'quiz') {
    const subject = stage.queue[0];
    const sb = subOf(subject);
    const items = diagnosticItemsFor(subject);
    const idx = Math.min(qi, items.length - 1);
    const it = items[idx];
    const answeredCount = items.filter((i) => i.id in answers).length;
    const lastQ = idx === items.length - 1;
    const next = (record: boolean) => {
      if (record) recordDiagnosticAttempt(subject, Object.fromEntries(items.map((i) => [i.id, answers[i.id] ?? null])));
      else setDiagnosticSkipped(subject, true);
      const done = record ? [...finished, subject] : finished;
      setFinished(done);
      setAnswers({});
      setQi(0);
      window.scrollTo?.(0, 0);
      if (record) setStage({ kind: 'subject-done', subject, queue: stage.queue.slice(1), done });
      else if (stage.queue.length > 1) setStage({ kind: 'quiz', queue: stage.queue.slice(1) });
      else setStage({ kind: 'result', done });
    };
    const advance = () => (lastQ ? next(true) : setQi(idx + 1));
    return (
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-[18px]" data-testid="diagnostic-quiz" data-subject={subject}>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2.5">
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full pl-2 pr-3 text-xs font-semibold" style={{ background: sb.soft, color: sb.c }}><KIcon name={sb.k} size={14} /> วัดพื้นฐาน{SUBJECT_LABEL[subject]}</span>
            <span className="font-mono text-[13px] font-semibold" style={{ color: 'var(--ink-3)' }}>{idx + 1} / {items.length}</span>
          </div>
          <div role="progressbar" aria-valuenow={answeredCount} aria-valuemin={0} aria-valuemax={items.length} aria-label={`ตอบแล้ว ${answeredCount}/${items.length}`} className="flex gap-1.5">
            {items.map((x, k) => <span key={x.id} className="h-1.5 flex-1 rounded-full transition-colors" style={{ background: k === idx ? 'var(--brand)' : x.id in answers ? (answers[x.id] === null ? 'var(--none)' : 'var(--ok)') : 'var(--line-2)' }} />)}
          </div>
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>ตอบแล้ว {answeredCount}/{items.length} · ไม่หักคะแนน · ไม่ใช่การเช็กความเข้าใจของบทเรียน{stage.queue.length > 1 ? ` · ต่อด้วย ${stage.queue.slice(1).map((q) => SUBJECT_LABEL[q]).join(', ')}` : ''}</p>
        </div>
        <fieldset key={it.id} className="flex flex-col gap-[18px]" style={{ padding: 'clamp(20px,2.4vw,32px)', borderRadius: 24, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow)', animation: 'v2uIn .35s ease both' }} data-item={it.id}>
          <legend className="sr-only">ข้อ {idx + 1}</legend>
          <span className="text-xs font-semibold" style={{ letterSpacing: '.06em', color: 'var(--ink-3)' }}>ข้อ {idx + 1} · ทักษะ: {CURRICULUM.skills.find((s) => s.id === it.skillId)?.title}</span>
          <p className="font-display font-semibold leading-snug break-words" style={{ fontSize: 'clamp(19px,1vw + 15px,24px)', color: 'var(--ink)' }}>{it.prompt}</p>
          {it.code && <CodeBlock code={it.code} />}
          <div role="radiogroup" aria-label={`คำตอบข้อ ${idx + 1}`} className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
            {it.choices.map((c, k) => {
              const sel = answers[it.id] === k;
              return (
                <button key={c} type="button" role="radio" aria-checked={sel} aria-pressed={sel} onClick={() => setAnswers((a) => ({ ...a, [it.id]: k }))}
                  className="flex min-h-[56px] items-center gap-3 rounded-[14px] py-2 pl-2.5 pr-3.5 text-left transition-colors hover:border-[var(--brand)]"
                  style={{ background: sel ? 'var(--brand-soft)' : 'var(--surface)', border: `1.5px solid ${sel ? 'var(--brand)' : 'var(--line-2)'}`, color: 'var(--ink)' }}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] font-mono text-[13px] font-semibold" style={{ background: sel ? 'var(--brand)' : 'var(--surface-3)', color: sel ? 'var(--on-brand)' : 'var(--ink-2)' }}>{'ABCDEF'[k]}</span>
                  <span className="text-[15px] font-medium leading-snug break-words">{c}</span>
                </button>
              );
            })}
          </div>
          <button type="button" role="radio" aria-checked={it.id in answers && answers[it.id] === null} aria-pressed={it.id in answers && answers[it.id] === null} onClick={() => setAnswers((a) => ({ ...a, [it.id]: null }))}
            className="flex min-h-[52px] items-center gap-3 rounded-[14px] py-2 pl-2.5 pr-3.5 text-left"
            style={{ border: `1.5px dashed ${it.id in answers && answers[it.id] === null ? 'var(--none)' : 'var(--line-2)'}`, background: it.id in answers && answers[it.id] === null ? 'var(--none-soft)' : 'transparent', color: 'var(--ink)' }}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]" style={{ color: 'var(--none)' }}><KIcon name="sNone" size={20} /></span>
            <span className="flex flex-col"><span className="text-[15px] font-semibold">ไม่แน่ใจ</span><span className="text-xs" style={{ color: 'var(--ink-3)' }}>นับเป็น “ยังไม่ได้วัด” ไม่ใช่ “ผิด”</span></span>
          </button>
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4">
          <div className="flex flex-wrap gap-1">
            {idx > 0 && (
              <button type="button" onClick={() => setQi(idx - 1)} className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-3 text-sm font-semibold" style={{ color: 'var(--ink-2)' }}><KIcon name="chevL" size={16} /> ข้อก่อนหน้า</button>
            )}
            <button type="button" onClick={() => next(false)} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
              <KIcon name="x" size={16} /> ข้ามวิชานี้ไปก่อน
            </button>
          </div>
          {lastQ ? (
            <button type="button" disabled={answeredCount === 0} onClick={() => next(true)} className="inline-flex h-[50px] items-center gap-2 rounded-[14px] px-6 font-bold disabled:cursor-not-allowed" style={{ background: answeredCount ? 'var(--brand)' : 'var(--surface-3)', color: answeredCount ? 'var(--on-brand)' : 'var(--ink-3)' }}>
              {stage.queue.length > 1 ? 'ส่งคำตอบ แล้วไปวิชาถัดไป' : 'ส่งคำตอบ ดูผล'} <KIcon name="arrowR" size={18} />
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              {!(it.id in answers) && (
                <button type="button" onClick={advance} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold" style={{ color: 'var(--ink-2)' }}><KIcon name="skip" size={16} /> ข้ามข้อนี้</button>
              )}
              <button type="button" disabled={!(it.id in answers)} onClick={advance} className="inline-flex h-[50px] items-center gap-2 rounded-[14px] px-6 font-bold disabled:cursor-not-allowed" style={{ background: it.id in answers ? 'var(--brand)' : 'var(--surface-3)', color: it.id in answers ? 'var(--on-brand)' : 'var(--ink-3)' }}>
                ข้อต่อไป <KIcon name="arrowR" size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (stage.kind === 'subject-done') {
    const sb = subOf(stage.subject);
    const last = useStore.getState().diagnostic.attempts.filter((a) => a.subjectId === stage.subject).slice(-1)[0];
    const scores = last ? scoreAttempt(last) : [];
    const cells = LEGEND.map(({ st }) => ({ st, n: scores.filter((x) => ST[stOf(x.status)] === st).length }));
    const goOn = () => (stage.queue.length ? setStage({ kind: 'quiz', queue: stage.queue }) : setStage({ kind: 'result', done: stage.done }));
    return (
      <section className="mx-auto flex w-full max-w-[760px] flex-col items-center gap-3.5 text-center" style={{ padding: 'clamp(28px,4vw,44px) 20px', borderRadius: 26, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-lg)', animation: 'v2uIn .28s ease both' }} data-testid="diagnostic-subject-done" data-subject={stage.subject}>
        <span aria-hidden="true" className="grid h-24 w-24 place-items-center rounded-full" style={{ border: '1px dashed var(--line-2)' }}>
          <span className="grid h-16 w-16 place-items-center rounded-full" style={{ background: sb.soft, color: sb.c, animation: 'v2uPop .5s ease both' }}><KIcon name={sb.k} size={30} /></span>
        </span>
        <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--ink)' }}>วัด{SUBJECT_LABEL[stage.subject]}เสร็จแล้ว</h1>
        <div className="flex flex-wrap justify-center gap-2">
          {cells.map(({ st, n }, i) => (
            <span key={st.label} className="inline-flex h-8 items-center gap-1.5 rounded-full pl-2 pr-3 text-[13px] font-semibold" style={{ background: st.soft, color: st.c, opacity: n ? 1 : 0.55, animation: `v2uRise .4s ${i * 0.08}s ease both` }}><KIcon name={st.k} size={14} /> {n} {st.label}</span>
          ))}
        </div>
        <p className="max-w-[44ch] text-sm" style={{ color: 'var(--ink-2)' }}>สถานะแต่ละทักษะคำนวณจากคำตอบของคุณ ข้อที่ข้ามหรือไม่แน่ใจนับเป็น “ยังไม่ได้วัด”</p>
        <div className="mt-1.5 flex flex-wrap justify-center gap-2.5">
          <button type="button" onClick={goOn} className="inline-flex h-12 items-center gap-2 rounded-[14px] px-5 font-bold" style={{ background: 'var(--brand)', color: 'var(--on-brand)' }}>
            {stage.queue.length ? `ไปวิชาถัดไป: ${SUBJECT_LABEL[stage.queue[0]]}` : 'ดูผลทั้งหมด'} <KIcon name="arrowR" size={16} />
          </button>
          {stage.queue.length > 0 && (
            <button type="button" onClick={() => setStage({ kind: 'result', done: stage.done })} className="inline-flex h-12 items-center rounded-[14px] px-[18px] font-semibold" style={{ border: '1px solid var(--line-2)', color: 'var(--ink)' }}>ดูผลตอนนี้</button>
          )}
        </div>
      </section>
    );
  }

  // Result — per subject, never one combined score
  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-6xl space-y-6" data-testid="diagnostic-result">
      <header className="flex flex-col gap-1">
        <span className="text-xs font-semibold" style={{ letterSpacing: '.08em', color: 'var(--brand-ink)' }}>ผลการวัดระดับ</span>
        <h1 className="font-display font-bold leading-tight" style={{ fontSize: 'clamp(24px,1.6vw + 18px,34px)', color: 'var(--ink)' }}>พื้นฐานของคุณตอนนี้</h1>
        <p className="text-sm" style={{ color: 'var(--ink-2)' }}>แยกตามวิชาและทักษะ ใช้จัดเส้นทาง ไม่ใช่คะแนนสอบ</p>
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
              <details key={s} className="rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] p-4">
                <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-bold text-ink"><span className="inline-flex items-center gap-2"><span style={{ color: subOf(s).c }}><KIcon name={subOf(s).k} size={16} /></span> ดูเฉลย{SUBJECT_LABEL[s]}</span></summary>
                <ul className="mt-2 divide-y divide-[var(--line)] text-sm">
                  {items.map((it) => {
                    const a = lastAnswers?.answers[it.id];
                    return (
                      <li key={it.id} className="py-2">
                        <p className="font-semibold text-ink break-words">{it.prompt}</p>
                        <p className={a === it.correctIndex ? 'text-[var(--ok)]' : a === null || a === undefined ? 'text-[var(--ink-3)]' : 'text-[var(--rev)]'}>
                          {a === it.correctIndex ? '✓ ' : a === null || a === undefined ? '– ไม่ได้ตอบ / ไม่แน่ใจ · ' : '△ '}คำตอบ: {it.choices[it.correctIndex]} — {it.explanation}
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
        <section className="relative overflow-hidden p-[clamp(18px,2.4vw,28px)] text-white" style={{ borderRadius: 24, background: 'radial-gradient(360px 220px at 100% 0%,rgba(132,150,255,.5),transparent 70%),linear-gradient(135deg,#0b1135,#1a2490)', boxShadow: 'var(--shadow-lg)' }} data-testid="diagnostic-recommendation">
          <p className="inline-flex items-center gap-2 text-xs font-semibold" style={{ letterSpacing: '.08em', color: '#c9d1ff' }}><KIcon name="nav" size={16} /> เราแนะนำให้เริ่มจาก</p>
          <p className="mt-1 font-display text-[22px] font-bold leading-tight break-words">{SUBJECT_LABEL[recommendation.subjectId]} — {recommendation.lesson.title}</p>
          <p className="mt-2 text-[13px] break-words" style={{ color: '#d5dbff' }}>{recommendation.reasons.join(' · ')}</p>
          <Link to={`/learn/curriculum/${recommendation.lesson.id}?from=next&min=${recommendation.minutes}`} className="mt-4 inline-flex h-[50px] items-center gap-2.5 rounded-[14px] bg-[var(--surface)] px-[22px] font-bold" style={{ color: '#16207a' }}>
            เริ่มเรียน <KIcon name="arrowR" size={18} />
          </Link>
        </section>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setPicked([]); setStage({ kind: 'intro' }); }} className="min-h-[48px] rounded-[14px] border border-[var(--line-2)] px-5 text-sm font-semibold text-[var(--ink)]">วัดวิชาอื่น / วัดใหม่</button>
        <Link to="/route" className="inline-flex min-h-[48px] items-center rounded-2xl px-4 text-sm font-semibold text-[var(--brand-ink)]">ดูเส้นทางของฉัน</Link>
      </div>
    </div>
  );
}
