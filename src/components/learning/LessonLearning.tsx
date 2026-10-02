import type { ReactNode } from 'react';
import { Clock, ExternalLink, ArrowRight, Check } from 'lucide-react';
import { MODE_META, READING_SECTION_IDS } from './meta';
import { CURRICULUM } from '../../curriculum/data';
import { getOriginalLesson } from '../../content/originals';
import { getInteractiveLesson } from '../../interactive/registry';
import type { LearningMode, UnderstandingSummary } from '../../interactive/types';
import { summarize } from '../../interactive/engine';
import { useLearningStage, useLessonPlayer, useReadingProgress } from '../../interactive/usePlayer';
import { InteractivePlayer } from './InteractivePlayer';
import { LessonCompletion, UnderstandingCheck } from './UnderstandingCheck';
import { ReadingExperience } from './ReadingExperience';

const ORDER: LearningMode[] = ['read', 'video', 'v2u'];

export interface VideoInfo {
  title: string;
  provider: string;
  minutes?: number;
}

interface Props {
  curriculumLessonId: string;
  mode?: LearningMode;
  onModeChange: (m: LearningMode) => void;
  /** Description of the external clip (shown on the picker WITHOUT loading it). */
  video?: VideoInfo;
  /** Rendered ONLY after the learner picks "ดูคลิป". */
  renderVideo: () => ReactNode;
  onCheckSubmitted?: (s: UnderstandingSummary) => void;
  /** Receives the check result (also after a reload, from the saved state). */
  onNext: (summary?: UnderstandingSummary) => void;
  nextLabel: string;
}

/** Lesson → "วันนี้คุณอยากเรียนแบบไหน?" → mode → check → completion → next step. */
export function LessonLearning({ curriculumLessonId, mode, onModeChange, video, renderVideo, onCheckSubmitted, onNext, nextLabel }: Props) {
  const lesson = CURRICULUM.lessons.find((l) => l.id === curriculumLessonId);
  const original = getOriginalLesson(curriculumLessonId);
  const interactive = getInteractiveLesson(curriculumLessonId);
  const [state, dispatch] = useLessonPlayer(curriculumLessonId);
  const [stage, setStage] = useLearningStage(curriculumLessonId);
  const [seen] = useReadingProgress(curriculumLessonId);
  if (!lesson || !original || !interactive) return null;

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
        time: video?.minutes ? `${video.minutes} นาที` : 'ตามความยาวคลิป',
        detail: video ? `${video.title} · ${video.provider} (แหล่งภายนอก)` : 'บทนี้ยังไม่มีคลิปที่ V2U คัดไว้',
      },
      v2u: {
        time: `${interactive.steps.length} ขั้น + เช็ก ${interactive.finalCheck.length} ข้อ`,
        detail: interactive.mission.goal,
        progress: answered ? `ทำแล้ว ${answered}/${interactiveTotal}` : undefined,
      },
    };
    return (
      <section aria-labelledby="pick-mode" data-testid="mode-picker">
        <h2 id="pick-mode" className="text-xl font-bold text-ink sm:text-2xl">
          วันนี้คุณอยากเรียนแบบไหน?
        </h2>
        <p className="mt-1 text-sm text-slate-600">ทุกแบบจบด้วยการเช็กความเข้าใจ แล้ว V2U จะบอกขั้นต่อไปให้</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {ORDER.map((m) => {
            const M = MODE_META[m];
            const Icon = M.icon;
            const signature = m === 'v2u';
            return (
              <button
                key={m}
                type="button"
                data-mode={m}
                onClick={() => {
                  if (stage !== 'learn') setStage('learn');
                  onModeChange(m);
                }}
                className={`group flex min-h-[132px] md:min-h-[176px] flex-col rounded-3xl border-2 p-5 text-left transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 ${
                  signature ? 'border-brand-500 bg-brand-50/60 hover:bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300'
                }`}
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${signature ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-brand-100 group-hover:text-brand-700'}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="mt-3 text-lg font-bold text-ink">{M.title}</span>
                <span className="mt-0.5 text-sm text-slate-600">{M.description}</span>
                <span className="mt-3 line-clamp-2 text-xs text-slate-500 break-words">{meta[m].detail}</span>
                <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {meta[m].time}
                  </span>
                  {meta[m].progress && <span className="text-brand-700">{meta[m].progress}</span>}
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
          onCheckSubmitted?.(s);
        }}
      />
    );
  } else if (stage === 'done') {
    body = <LessonCompletion lesson={interactive} state={state} onReviewWeak={reviewWeak} onNext={() => onNext(state.finished ? summarize(interactive, state) : undefined)} nextLabel={nextLabel} />;
  } else if (mode === 'read') {
    body = <ReadingExperience content={original} outcomes={lesson.learningOutcomes} onDone={() => setStage('check')} />;
  } else if (mode === 'v2u') {
    body = <InteractivePlayer lesson={interactive} state={state} dispatch={dispatch} onToCheck={() => setStage('check')} />;
  } else {
    body = (
      <section aria-label="ดูคลิป" className="space-y-4" data-testid="video-mode">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5">
          <p className="text-xs font-semibold text-brand-700">ดูคลิปนี้เพื่อ</p>
          <ul className="mt-1.5 space-y-1 text-sm text-slate-800">
            {lesson.learningOutcomes.map((o) => (
              <li key={o} className="flex gap-2 break-words">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                {o}
              </li>
            ))}
          </ul>
          {video && (
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="font-semibold text-slate-700">แหล่งภายนอก</span>
              <span className="break-words">{video.title}</span>
              <span>· {video.provider}</span>
              {video.minutes && <span>· ประมาณ {video.minutes} นาที</span>}
            </p>
          )}
        </div>
        {renderVideo()}
        <div className="rounded-3xl bg-brand-50 p-5 text-center">
          <p className="text-sm text-brand-900">ดูจบแล้ว — ดูคลิปอย่างเดียวยังไม่ได้แปลว่าเข้าใจ</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => setStage('check')} className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-brand-600 px-6 text-sm font-bold text-white hover:bg-brand-700">
              ลองเช็กความเข้าใจ <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => onModeChange('v2u')} className="min-h-[52px] rounded-2xl border-2 border-brand-200 bg-white px-5 text-sm font-bold text-brand-700 hover:bg-brand-50">
              ยังไม่เข้าใจ — เรียนกับ V2U
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5" data-learning-mode={mode}>
      {switcher}
      {body}
    </div>
  );
}
