import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { KIcon } from '../v2u/kit';
import type { IconName } from '../v2u/kit';
import { ST, stOf, subOf } from '../v2u/tokens';
import { usePathway } from '../../hooks/usePathway';
import { MODE_META, READING_SECTION_IDS } from './meta';
import { CURRICULUM } from '../../curriculum/data';
import { CRITERION_LABEL, getLessonContentStatus } from '../../content/audit';
import { getOriginalLesson } from '../../content/originals';
import { getInteractiveLesson } from '../../interactive/registry';
import type { LearningMode, UnderstandingSummary } from '../../interactive/types';
import { summarize } from '../../interactive/engine';
import { useLearningStage, useLessonPlayer, useReadingProgress, useSelectedVideo, useVideoStage } from '../../interactive/usePlayer';
import { useStore } from '../../store/useStore';
import type { Resource } from '../../types';
import { SUBJECTS } from '../../types';
import { getLessonVideoSequence } from '../../video/engine';
import { notesForLesson } from '../../notes/engine';
import { VideoLearning } from '../video/VideoLearning';
import { PersonalSummaryCard } from '../video/PersonalSummaryCard';
import { suggestAlternativeModes } from '../../interactive/adapt';
import { InteractivePlayer } from './InteractivePlayer';
import { TeachingStudio } from './studio/TeachingStudio';
import { getStudioScript } from '../../interactive/studio/scripts';
import { LessonCompletion, UnderstandingCheck } from './UnderstandingCheck';
import { ReadingExperience } from './ReadingExperience';

const ORDER: LearningMode[] = ['read', 'video', 'v2u'];
const MODE_ICON: Record<LearningMode, IconName> = { read: 'book', video: 'video', v2u: 'sparkle' };
const LOOP = ['เรียน', 'ฝึก', 'เช็กความเข้าใจ', 'ผลลัพธ์'];

interface Props {
  curriculumLessonId: string;
  mode?: LearningMode;
  onModeChange: (m: LearningMode) => void;
  /** The learner's own resources for this lesson (their YouTube links appear as videos). */
  ownResources?: Resource[];
  /** Today's study minutes (used to suggest a clip that fits). */
  availableMinutes?: number;
  /** Weak curriculum skills right now (from the existing skill engine). */
  weakSkillIds?: string[];
  onAddResource?: () => void;
  onCheckSubmitted?: (s: UnderstandingSummary) => void;
  /** Receives the check result (also after a reload, from the saved state). */
  onNext: (summary?: UnderstandingSummary) => void;
  nextLabel: string;
  /** Phase 61: what the check changed (skills, mastery, review, next step) — shown on completion */
  result?: React.ReactNode;
  /** Where the top bar's back button goes */
  backTo?: string;
  /** Page notices shown under the top bar (prerequisites, next-step context) */
  notice?: ReactNode;
}

/** Lesson → "วันนี้คุณอยากเรียนแบบไหน?" → mode → check → completion → next step. */
export function LessonLearning({ curriculumLessonId, mode, onModeChange, ownResources = [], availableMinutes, weakSkillIds = [], onAddResource, onCheckSubmitted, onNext, nextLabel, result, backTo = '/learn', notice }: Props) {
  const lesson = CURRICULUM.lessons.find((l) => l.id === curriculumLessonId);
  const contentStatus = getLessonContentStatus(curriculumLessonId);
  const original = getOriginalLesson(curriculumLessonId);
  const interactive = getInteractiveLesson(curriculumLessonId);
  const [state, dispatch] = useLessonPlayer(curriculumLessonId);
  const [stage, setStage] = useLearningStage(curriculumLessonId);
  const [seen] = useReadingProgress(curriculumLessonId);
  const [videoKey] = useSelectedVideo(curriculumLessonId);
  const [, setVideoStage] = useVideoStage(curriculumLessonId);
  const notes = useStore((st) => st.learningNotes?.notes) ?? [];
  const { setVideoProgress } = useStore();
  const subjectProfile = usePathway(lesson?.subjectId).subjects.find((p) => p.subjectId === lesson?.subjectId);
  const skills = subjectProfile?.skills.filter((sk) => lesson?.skillIds.includes(sk.skillId)) ?? [];
  if (!lesson || !original || !interactive) return null;

  const videos = getLessonVideoSequence(curriculumLessonId, ownResources);
  const lessonNotes = notesForLesson(notes, curriculumLessonId);
  const readPct = Math.round((seen.length / READING_SECTION_IDS.length) * 100);
  const answered = interactive.steps.filter((s) => s.interaction && (state.results[s.id]?.solved || state.results[s.id]?.revealed)).length;
  const interactiveTotal = interactive.steps.filter((s) => s.interaction).length;

  const reviewWeak = () => {
    const s = state;
    const weak = interactive.finalCheck.filter((f) => s.finalAnswers[f.id] !== f.correctIndex).map((f) => f.skillId);
    const first = interactive.steps.findIndex((st) => st.skillId && weak.includes(st.skillId));
    dispatch({ type: 'recheck' });
    dispatch({ type: 'go', index: Math.max(0, first) });
    setStage('learn');
    onModeChange('v2u');
  };

  const subjectLessons = CURRICULUM.lessons.filter((l) => l.subjectId === lesson.subjectId);
  const lessonNo = String(Math.max(0, subjectLessons.findIndex((l) => l.id === lesson.id)) + 1).padStart(2, '0');
  const sub = subOf(lesson.subjectId);
  const phase = !mode || stage === 'learn' ? 0 : stage === 'check' ? 2 : 3;
  // Design top bar: back · subject · lesson · the loop (เรียน → ฝึก → เช็ก → ผลลัพธ์)
  const topBar = (
    <div className="flex flex-col gap-2" data-testid="lesson-topbar">
      <div className="flex min-h-[62px] items-center gap-3">
        <Link to={backTo} aria-label="กลับ" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-2)' }}>
          <KIcon name="chevL" size={20} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: sub.c }} data-subject-tag={lesson.subjectId}>
            <KIcon name={sub.k} size={14} /> {SUBJECTS[lesson.subjectId]?.name ?? lesson.subjectId} · บทที่ {lessonNo}
          </span>
          <span className="truncate text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{lesson.title}</span>
        </div>
        <ol aria-label="ขั้นของบทเรียน" className="hidden items-center gap-1 lg:flex">
          {LOOP.map((label, i) => (
            <li key={label} className="flex items-center gap-1">
              <span className="inline-flex h-[30px] items-center gap-1.5 whitespace-nowrap rounded-full pl-1.5 pr-2.5 text-xs font-semibold" style={{ background: i < phase ? 'var(--ok-soft)' : i === phase ? 'var(--brand)' : 'transparent', color: i < phase ? 'var(--ok)' : i === phase ? 'var(--on-brand)' : 'var(--ink-3)' }} aria-current={i === phase ? 'step' : undefined}>
                <KIcon name={i < phase ? 'check' : i === phase ? 'sDev' : 'sNone'} size={13} w={2.2} /> {label}
              </span>
              {i < 3 && <span className="h-0.5 w-3.5" style={{ background: i < phase ? 'var(--ok)' : 'var(--line-2)' }} />}
            </li>
          ))}
        </ol>
        <span className="whitespace-nowrap text-xs font-semibold lg:hidden" style={{ color: 'var(--ink-3)' }}>{phase + 1}/4 · {LOOP[phase]}</span>
      </div>
      <div className="flex gap-[3px]" aria-hidden="true">
        {LOOP.map((l, i) => <span key={l} className="h-[3px] flex-1 rounded-full" style={{ background: i < phase ? 'var(--ok)' : i === phase ? 'var(--brand)' : 'var(--line-2)' }} />)}
      </div>
    </div>
  );

  /* ── Mode picker (nothing external is loaded here) ─────────────────── */
  if (!mode) {
    const meta: Record<LearningMode, { time: string; does: string[]; progress?: string }> = {
      read: {
        time: `ประมาณ ${original.readingMinutes} นาที`,
        does: [`อ่าน ${READING_SECTION_IDS.length} ส่วนสั้น ๆ ตั้งแต่หลักคิดถึงจุดที่มักพลาด`, ...lesson.learningOutcomes.slice(0, 1), 'จบด้วยเช็กความเข้าใจ'],
        progress: readPct ? `อ่านแล้ว ${readPct}%` : undefined,
      },
      video: {
        time: videos.length ? `${videos.length} คลิป · ${videos[0].durationKnown ? '' : 'ประมาณ '}${videos[0].minutes ?? '?'} นาที/คลิป` : 'ยังไม่มีคลิป',
        does: videos.length ? ['V2U ช่วยเลือกคลิปที่เหมาะกับคุณ หรือเลือกเองก็ได้ · แหล่งภายนอก', 'จดโน้ตผูกกับเวลาในคลิป', 'สรุปและสะท้อนคิดก่อนเช็ก'] : ['บทนี้ยังไม่มีคลิปที่ V2U คัดไว้', 'เพิ่มคลิปของคุณเองได้'],
        progress: lessonNotes.length ? `จดโน้ตแล้ว ${lessonNotes.length}` : undefined,
      },
      v2u: {
        time: `${interactive.steps.length} ขั้น + เช็ก ${interactive.finalCheck.length} ข้อ`,
        does: [interactive.mission.goal, 'ตอบก่อนไปต่อ มีคำใบ้เมื่อติด', 'ผิดได้ ระบบพาแก้ทันที'],
        progress: answered ? `ทำแล้ว ${answered}/${interactiveTotal}` : undefined,
      },
    };
    const resumeMode = ORDER.find((m) => meta[m].progress);
    return (
      <div className="flex flex-col gap-6">
        {topBar}
        {notice}
        <section className="relative flex flex-col gap-3.5 overflow-hidden" style={{ padding: 'clamp(20px,2.4vw,32px)', borderRadius: 24, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
          <span aria-hidden="true" className="absolute -right-[60px] -top-[60px] h-60 w-60 rounded-full" style={{ background: `radial-gradient(circle,${sub.soft} 0%,transparent 70%)` }} />
          <span className="relative text-xs font-semibold" style={{ letterSpacing: '.08em', color: 'var(--brand-ink)' }}>เลือกวิธีที่เหมาะกับคุณ</span>
          <h1 className="relative font-display font-bold leading-tight" style={{ fontSize: 'clamp(24px,1.6vw + 18px,34px)', color: 'var(--ink)' }}>{lesson.title}</h1>
          <p className="relative max-w-[62ch]" style={{ color: 'var(--ink-2)' }}>{lesson.description}</p>
          <p className="relative text-[13px]" style={{ color: 'var(--ink-3)' }}>{SUBJECTS[lesson.subjectId]?.name} · ประมาณ {lesson.estimatedMinutes} นาที · เรียน ฝึก เช็กความเข้าใจ</p>
          {skills.length > 0 && (
            <div className="relative flex flex-wrap gap-2">
              {skills.map((sk) => {
                const st = ST[stOf(sk.status)];
                return (
                  <span key={sk.skillId} className="inline-flex min-h-[30px] items-center gap-1.5 rounded-[10px] pl-2 pr-3 text-[13px] font-medium" style={{ border: '1px solid var(--line)', background: 'var(--surface-2)', color: 'var(--ink)' }} title={st.label}>
                    <span style={{ color: st.c }}><KIcon name={st.k} size={16} /></span>{sk.title}<span className="sr-only"> · {st.label}</span>
                  </span>
                );
              })}
            </div>
          )}
        </section>

        {resumeMode && (
          <div className="flex flex-wrap items-center gap-3 rounded-[18px] px-4 py-3.5" style={{ background: 'var(--brand-soft)' }} data-testid="resume-banner">
            <span style={{ color: 'var(--brand-ink)' }}><KIcon name="sDev" size={20} /></span>
            <div className="min-w-0 flex-[1_1_220px]">
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>{MODE_META[resumeMode].title}: {meta[resumeMode].progress}</p>
              <p className="text-[13px]" style={{ color: 'var(--ink-2)' }}>ทำต่อจากเดิม หรือเลือกวิธีอื่นก็ได้ ความคืบหน้าไม่หาย</p>
            </div>
          </div>
        )}

        <section aria-labelledby="pick-mode" data-testid="mode-picker" className="flex flex-col gap-3.5">
          <div>
            <h2 id="pick-mode" className="font-display text-xl font-bold" style={{ color: 'var(--ink)' }}>คุณอยากเรียนเรื่องนี้แบบไหน?</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-3)' }}>ทุกแบบจบด้วยการเช็กความเข้าใจ แล้ว V2U จะบอกขั้นต่อไปให้ — ถ้าวิธีหนึ่งไม่เวิร์ก ลองอีกวิธีได้เสมอ</p>
          </div>
          {contentStatus && contentStatus.status !== 'ready' ? (
            <p className="flex items-start gap-2 rounded-2xl px-4 py-3 text-sm" style={{ background: 'var(--rev-soft)', color: 'var(--ink)' }} data-testid="content-status" data-status="needs-content">
              <span style={{ color: 'var(--rev)', marginTop: 2 }}><KIcon name="info" size={16} /></span>
              <span><b className="font-semibold">กำลังเตรียมเนื้อหา</b> — บทนี้ยังขาด: {contentStatus.missing.map((m) => CRITERION_LABEL[m]).join(', ')}</span>
            </p>
          ) : contentStatus ? (
            <p className="flex items-start gap-2 text-xs" style={{ color: 'var(--ink-3)' }} data-testid="content-status" data-status="ready">
              <span style={{ color: 'var(--ok)' }}><KIcon name="sOk" size={14} /></span>
              <span>เนื้อหาพร้อมเรียน: อธิบาย ตัวอย่าง แบบฝึก {contentStatus.practiceCount} ข้อ และเช็กความเข้าใจ {contentStatus.checkCount} ข้อ
              {contentStatus.resources.playableInV2U === 0 && ' · บทนี้ยังไม่มีคลิปที่เล่นใน V2U ได้ เริ่มจากอ่านกับ V2U ได้เลย'}</span>
            </p>
          ) : null}
          <div className="grid gap-3.5 md:grid-cols-3">
            {ORDER.map((m) => {
              const M = MODE_META[m];
              // Resume = the learner already has progress in this method (real state, not a guess)
              const resume = !!meta[m].progress;
              const noClip = m === 'video' && videos.length === 0;
              return (
                <button
                  key={m}
                  type="button"
                  data-mode={m}
                  onClick={() => {
                    if (stage !== 'learn') setStage('learn');
                    onModeChange(m);
                  }}
                  data-resume={resume || undefined}
                  className="group relative flex flex-col gap-3.5 p-5 text-left transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)]"
                  style={{ borderRadius: 22, background: 'var(--surface)', border: resume ? '2px solid var(--brand)' : '1px solid var(--line)', boxShadow: resume ? '0 0 0 5px var(--brand-soft),var(--shadow)' : 'var(--shadow)', color: 'var(--ink)' }}
                >
                  <span className="flex items-center justify-between gap-2.5">
                    <span className="grid h-[46px] w-[46px] place-items-center rounded-[14px]" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}><KIcon name={MODE_ICON[m]} size={22} /></span>
                    {resume && <span className="inline-flex h-[26px] items-center gap-1 rounded-full pl-[7px] pr-2.5 text-xs font-bold" style={{ background: '#f5c04d', color: '#2b1d00' }}><KIcon name="sparkle" size={13} /> ทำต่อจากเดิม</span>}
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="font-display text-xl font-bold">{M.title}</span>
                    <span className="text-sm" style={{ color: 'var(--ink-2)' }}>{M.description}</span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    <span className="inline-flex min-h-[26px] items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold" style={{ background: 'var(--surface-2)' }}><KIcon name="clock" size={14} /> {meta[m].time}</span>
                    {meta[m].progress && <span className="inline-flex min-h-[26px] items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}><KIcon name="sDev" size={14} /> {meta[m].progress}</span>}
                  </span>
                  <span className="flex flex-col gap-1.5 text-[13px]">
                    {meta[m].does.map((d) => <span key={d} className="flex items-start gap-2 break-words"><span style={{ color: 'var(--ok)', marginTop: 3 }}><KIcon name="check" size={13} w={2.2} /></span>{d}</span>)}
                  </span>
                  {noClip && <span role="note" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold" style={{ background: 'var(--err-soft)', color: 'var(--err)' }}><KIcon name="video" size={16} /> ยังไม่มีคลิปที่เหมาะกับบทนี้ ลองอ่านหรือเรียนกับ V2U</span>}
                  <span className="mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-[14px] font-bold" style={{ background: 'var(--brand)', color: 'var(--on-brand)' }}>
                    {resume ? 'ทำต่อ' : M.cta} <KIcon name="arrowR" size={16} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  /* ── Explicit mode switch (progress is kept) ───────────────────────── */
  const switcher = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div role="tablist" aria-label="วิธีเรียน" className="flex max-w-full gap-1.5 overflow-x-auto rounded-[14px] p-1" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        {ORDER.map((m) => {
          const a = mode === m;
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={a}
              data-mode={m}
              onClick={() => {
                if (stage !== 'learn') setStage('learn');
                onModeChange(m);
              }}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] px-3.5 text-sm font-semibold transition-colors"
              style={{ background: a ? 'var(--brand)' : 'transparent', color: a ? 'var(--on-brand)' : 'var(--ink-2)' }}
            >
              <KIcon name={MODE_ICON[m]} size={16} />
              <span>{MODE_META[m].title}</span>
            </button>
          );
        })}
      </div>
      <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ink-3)' }}><KIcon name="refresh" size={14} /> สลับวิธีเรียนได้ ความคืบหน้าไม่หาย</p>
    </div>
  );

  let body: ReactNode;
  if (stage === 'check') {
    body = (
      <UnderstandingCheck
        lesson={interactive}
        state={state}
        dispatch={dispatch}
        onBack={() => setStage('learn')}
        onSubmit={(s) => {
          setStage('done');
          // the check — not watching — decides whether the clip counts as learned
          if (mode === 'video' && videoKey) {
            setVideoProgress(videoKey.startsWith('curated:') || videoKey.startsWith('own:') ? curriculumLessonId : curriculumLessonId, videoKey, {
              state: s.score >= 70 && s.confused.length === 0 ? 'done' : 'checked',
            });
          }
          // the round is over: next time "ดูคลิป" starts from V2U's suggestion again
          setVideoStage('entry');
          onCheckSubmitted?.(s);
        }}
      />
    );
  } else if (stage === 'done') {
    const sum = state.finished ? summarize(interactive, state) : undefined;
    const unclear = lessonNotes.filter((n) => n.type === 'unclear').map((n) => n.text);
    const recap = {
      done: [
        mode === 'video' ? 'ดูคลิป' : mode === 'read' ? 'อ่านบทเรียน' : 'เรียนกับ V2U ทีละขั้น',
        ...(lessonNotes.length ? [`จดโน้ต ${lessonNotes.length} รายการ`] : []),
        ...(state.finished ? ['เช็กความเข้าใจ'] : []),
      ],
      weak: [...(sum?.confused ?? []), ...unclear],
    };
    body = (
      <div className="space-y-5">
        {result}
        <LessonCompletion
          lesson={interactive}
          state={state}
          recap={recap}
          alternatives={mode ? suggestAlternativeModes(mode, sum, { hasVideos: videos.length > 0 }) : []}
          onTryMode={(m) => {
            dispatch({ type: 'recheck' });
            setStage('learn');
            onModeChange(m);
          }}
          onReviewWeak={reviewWeak}
          onNext={() => onNext(sum)}
          nextLabel={nextLabel}
        />
        {(mode === 'video' || lessonNotes.length > 0) && (
          <PersonalSummaryCard lessonId={curriculumLessonId} videoTitle={videos.find((v) => v.key === videoKey)?.title} check={sum ? { score: sum.score, understood: sum.understood, confused: sum.confused } : undefined} />
        )}
      </div>
    );
  } else if (mode === 'read') {
    body = <ReadingExperience content={original} outcomes={lesson.learningOutcomes} subjectId={lesson.subjectId} prerequisites={lesson.prerequisites.map((p) => CURRICULUM.lessons.find((x) => x.id === p)?.title ?? p)} onDone={() => setStage('check')} />;
  } else if (mode === 'v2u') {
    const script = getStudioScript(curriculumLessonId);
    body = script ? (
      <TeachingStudio script={script} lesson={interactive} state={state} dispatch={dispatch} onToCheck={() => setStage('check')} onModeChange={onModeChange} />
    ) : (
      <InteractivePlayer lesson={interactive} state={state} dispatch={dispatch} onToCheck={() => setStage('check')} />
    );
  } else {
    // ดูคลิป: V2U's video workflow — choose → watch + notes → reflect → check
    body = (
      <div data-testid="video-mode">
        <VideoLearning
          lessonId={curriculumLessonId}
          ownResources={ownResources}
          availableMinutes={availableMinutes}
          weakSkillIds={weakSkillIds}
          onAddResource={onAddResource}
          onToCheck={() => setStage('check')}
          onSwitchToV2U={() => onModeChange('v2u')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5" data-learning-mode={mode}>
      {topBar}
      {notice}
      {switcher}
      {body}
    </div>
  );
}
