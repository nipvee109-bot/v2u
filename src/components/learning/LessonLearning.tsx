import type { ReactNode } from 'react';
import { ArrowRight, Clock } from 'lucide-react';
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
import { SubjectTag } from '../ui/subject';
import { getLessonVideoSequence } from '../../video/engine';
import { notesForLesson } from '../../notes/engine';
import { VideoLearning } from '../video/VideoLearning';
import { PersonalSummaryCard } from '../video/PersonalSummaryCard';
import { suggestAlternativeModes } from '../../interactive/adapt';
import { InteractivePlayer } from './InteractivePlayer';
import { LessonCompletion, UnderstandingCheck } from './UnderstandingCheck';
import { ReadingExperience } from './ReadingExperience';

const ORDER: LearningMode[] = ['read', 'video', 'v2u'];

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
}

/** Lesson → "วันนี้คุณอยากเรียนแบบไหน?" → mode → check → completion → next step. */
export function LessonLearning({ curriculumLessonId, mode, onModeChange, ownResources = [], availableMinutes, weakSkillIds = [], onAddResource, onCheckSubmitted, onNext, nextLabel, result }: Props) {
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

  /* ── Mode picker (nothing external is loaded here) ─────────────────── */
  if (!mode) {
    const meta: Record<LearningMode, { time: string; detail: string; progress?: string }> = {
      read: { time: `${original.readingMinutes} นาที`, detail: lesson.learningOutcomes.slice(0, 2).join(' · '), progress: readPct ? `อ่านแล้ว ${readPct}%` : undefined },
      video: {
        time: videos.length ? `${videos.length} คลิป · ${videos[0].durationKnown ? '' : 'ประมาณ '}${videos[0].minutes ?? '?'} นาที/คลิป` : 'ยังไม่มีคลิป',
        detail: videos.length ? `V2U ช่วยเลือกคลิปที่เหมาะกับคุณ หรือเลือกเองก็ได้ · แหล่งภายนอก` : 'บทนี้ยังไม่มีคลิปที่ V2U คัดไว้',
        progress: lessonNotes.length ? `จดโน้ตแล้ว ${lessonNotes.length}` : undefined,
      },
      v2u: {
        time: `${interactive.steps.length} ขั้น + เช็ก ${interactive.finalCheck.length} ข้อ`,
        detail: interactive.mission.goal,
        progress: answered ? `ทำแล้ว ${answered}/${interactiveTotal}` : undefined,
      },
    };
    return (
      <section aria-labelledby="pick-mode" data-testid="mode-picker">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-brand-700">
          <SubjectTag subjectId={lesson.subjectId} label={SUBJECTS[lesson.subjectId]?.name ?? lesson.subjectId} />
          <span className="break-words">🎯 {lesson.title}</span>
        </p>
        <h2 id="pick-mode" className="mt-1.5 font-display text-xl font-bold text-ink sm:text-2xl">
          คุณอยากเรียนเรื่องนี้แบบไหน?
        </h2>
        <p className="mt-1 text-sm text-ink-3">ทุกแบบจบด้วยการเช็กความเข้าใจ แล้ว V2U จะบอกขั้นต่อไปให้ — ถ้าวิธีหนึ่งไม่เวิร์ก ลองอีกวิธีได้เสมอ</p>
        {contentStatus && contentStatus.status !== 'ready' ? (
          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" data-testid="content-status" data-status="needs-content">
            <b className="font-semibold">กำลังเตรียมเนื้อหา</b> — บทนี้ยังขาด: {contentStatus.missing.map((m) => CRITERION_LABEL[m]).join(', ')}
          </p>
        ) : contentStatus ? (
          <p className="mt-3 text-xs text-slate-500" data-testid="content-status" data-status="ready">
            ✓ เนื้อหาพร้อมเรียน: อธิบาย ตัวอย่าง แบบฝึก {contentStatus.practiceCount} ข้อ และเช็กความเข้าใจ {contentStatus.checkCount} ข้อ
            {contentStatus.resources.playableInV2U === 0 && ' · บทนี้ยังไม่มีคลิปที่เล่นใน V2U ได้ เริ่มจาก 📖 อ่านกับ V2U ได้เลย'}
          </p>
        ) : null}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {ORDER.map((m) => {
            const M = MODE_META[m];
            const Icon = M.icon;
            // Resume = the learner already has progress in this method (real state, not a guess)
            const resume = !!meta[m].progress;
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
                className={`group relative flex min-h-[132px] md:min-h-[230px] flex-col rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 ${
                  resume ? 'v2u-hero border-transparent bg-gradient-to-br from-navy via-navy-2 to-brand-800 text-white' : 'border-ink/[0.08] bg-white shadow-card hover:border-brand-300 hover:shadow-lift'
                }`}
              >
                {resume && (
                  <span className="absolute right-4 top-4 rounded-full bg-dest px-2.5 py-0.5 text-[11px] font-bold text-navy">ทำต่อจากเดิม</span>
                )}
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${resume ? 'bg-white/10 text-dest' : 'bg-brand-50 text-brand-700'}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className={`mt-3 font-display text-lg font-bold ${resume ? 'text-white' : 'text-ink'}`}>{M.title}</span>
                <span className={`mt-0.5 text-sm ${resume ? 'text-white/80' : 'text-ink-3'}`}>{M.description}</span>
                <span className={`mt-3 line-clamp-2 text-xs break-words ${resume ? 'text-white/70' : 'text-ink-3'}`}>{meta[m].detail}</span>
                <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-3 text-xs font-semibold">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 ${resume ? 'border-white/15 bg-white/10 text-white' : 'border-ink/[0.08] bg-surface-2 text-ink-2'}`}>
                    <Clock className="h-3.5 w-3.5" /> {meta[m].time}
                  </span>
                  {meta[m].progress && <span className={`inline-flex rounded-full px-2.5 py-0.5 ${resume ? 'bg-white/10 text-white' : 'bg-brand-50 text-brand-700'}`}>{meta[m].progress}</span>}
                </span>
                <span className={`mt-3 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-4 font-display text-sm font-bold ${resume ? 'bg-white text-navy' : 'bg-brand-600 text-white shadow-md shadow-brand-600/25 group-hover:bg-brand-700'}`}>
                  {resume ? 'ทำต่อ' : M.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  /* ── Explicit mode switch (progress is kept) ───────────────────────── */
  const switcher = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div role="tablist" aria-label="วิธีเรียน" className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-200/60 p-1">
        {ORDER.map((m) => {
          const Icon = MODE_META[m].icon;
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              data-mode={m}
              onClick={() => {
                if (stage !== 'learn') setStage('learn');
                onModeChange(m);
              }}
              className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors ${
                mode === m ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-ink'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{MODE_META[m].title}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">สลับวิธีเรียนได้ ความคืบหน้าไม่หาย</p>
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
    body = <InteractivePlayer lesson={interactive} state={state} dispatch={dispatch} onToCheck={() => setStage('check')} />;
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
      {switcher}
      {body}
    </div>
  );
}
