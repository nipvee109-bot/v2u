import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Eye, Clock, ExternalLink, Check, ArrowRight, ArrowLeft, Plus, CircleDot, CheckCircle2, Circle, Hourglass, ChevronRight } from 'lucide-react';
import { CURRICULUM } from '../../curriculum/data';
import { useStore } from '../../store/useStore';
import type { Resource } from '../../types';
import {
  getLessonVideoSequence,
  getRecommendedVideo,
  getTopicVideoPath,
  groupVideos,
  sequenceLabel,
  VIDEO_GROUP_LABEL,
  VIDEO_STATE_LABEL,
  PATH_STATUS_LABEL,
} from '../../video/engine';
import type { VideoGroup, VideoItem, PathItem } from '../../video/engine';
import { progressKey, REFLECTION_LABEL } from '../../notes/engine';
import type { VideoProgress } from '../../notes/types';
import { useSelectedVideo, useVideoStage } from '../../interactive/usePlayer';
import { YouTubePlayer } from '../study/YouTubePlayer';
import { NotesPanel } from './NotesPanel';

interface Props {
  lessonId: string;
  /** The learner's own resources for this lesson (YouTube links they added) */
  ownResources?: Resource[];
  availableMinutes?: number;
  weakSkillIds?: string[];
  onToCheck: () => void;
  onSwitchToV2U: () => void;
  onAddResource?: () => void;
}

const GROUP_ORDER: VideoGroup[] = ['recommended', 'basics', 'practice', 'next'];

function StateChip({ state }: { state: VideoProgress['state'] }) {
  const tone =
    state === 'done' ? 'bg-emerald-100 text-emerald-800' : state === 'checked' || state === 'watched' ? 'bg-brand-50 text-brand-700' : state === 'learning' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600';
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{VIDEO_STATE_LABEL[state]}</span>;
}

function VideoMeta({ v }: { v: VideoItem }) {
  return (
    <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-500">
      <span>{v.provider}</span>
      {v.minutes !== undefined && <span>· {v.durationKnown ? '' : 'ประมาณ '}{v.minutes} นาที</span>}
      {v.language && <span>· {v.language === 'th' ? 'ภาษาไทย' : 'ภาษาอังกฤษ'}</span>}
      <span className={v.checked ? 'text-emerald-700' : 'text-amber-700'}>· {v.linkState}</span>
    </p>
  );
}

/** V2U-generated cover — no third-party thumbnails are fetched or stored. */
export function VideoCover({ v, index, lessonTitle }: { v: VideoItem; index: number; lessonTitle: string }) {
  const tone = v.group === 'practice' ? 'from-sky-600 to-brand-800' : 'from-brand-600 to-brand-900';
  return (
    <div className={`relative flex aspect-[16/8] flex-col justify-between bg-gradient-to-br ${tone} p-4 text-white`} aria-hidden="true" data-testid="video-cover">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm">▶</span>
      <div>
        <p className="line-clamp-2 text-sm font-bold leading-snug">{lessonTitle}</p>
        <p className="mt-0.5 text-[11px] text-white/80">
          {index} • {sequenceLabel(v)}
          {v.minutes !== undefined && ` · ${v.durationKnown ? '' : '~'}${v.minutes} นาที`}
          {v.language && ` · ${v.language === 'th' ? 'ไทย' : 'EN'}`}
        </p>
      </div>
      <span className="absolute right-3 top-3 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">V2U</span>
    </div>
  );
}

/** Lessons of this topic in order, with honest status (nothing is locked). */
export function TopicPath({ items, currentId }: { items: PathItem[]; currentId: string }) {
  const icon = (s: PathItem['status']) =>
    s === 'done' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : s === 'current' ? <CircleDot className="h-5 w-5 text-brand-600" /> : s === 'wait' ? <Hourglass className="h-5 w-5 text-slate-400" /> : <Circle className="h-5 w-5 text-slate-300" />;
  return (
    <section aria-label="เส้นทางคลิปในหัวข้อนี้" className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5">
      <p className="text-sm font-bold text-ink">เส้นทางการเรียนในหัวข้อนี้</p>
      <ol className="mt-3 space-y-1">
        {items.map((it, i) => (
          <li key={it.lessonId}>
            <Link
              to={`/learn/curriculum/${it.lessonId}?mode=video`}
              aria-current={it.lessonId === currentId ? 'step' : undefined}
              className={`flex min-h-[52px] items-center gap-3 rounded-2xl px-3 py-2 ${it.lessonId === currentId ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
            >
              <span className="w-6 shrink-0 font-mono text-xs text-slate-400">{String(i + 1).padStart(2, '0')}</span>
              {icon(it.status)}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink break-words">{it.title}</span>
                <span className="block text-xs text-slate-500 break-words">
                  {it.status === 'wait' ? it.note : `${PATH_STATUS_LABEL[it.status]} · ${it.videoCount ? `${it.videoCount} คลิป` : 'ยังไม่มีคลิปที่คัดไว้'}`}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** ① พื้นฐาน → ② ฝึกทำโจทย์ … — the lesson's own clip sequence, current one highlighted. */
function SequenceHeader({ lessonTitle, seq, currentKey }: { lessonTitle: string; seq: VideoItem[]; currentKey?: string }) {
  const idx = seq.findIndex((v) => v.key === currentKey);
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="min-w-0 text-sm text-slate-500">
          บท: <span className="font-bold text-ink break-words">{lessonTitle}</span>
        </p>
        {idx >= 0 && (
          <span className="font-mono text-xs font-semibold text-slate-500">
            {String(idx + 1).padStart(2, '0')} / {String(seq.length).padStart(2, '0')}
          </span>
        )}
      </div>
      <ol aria-label="เส้นทางคลิปของบทนี้" className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-semibold">
        {seq.map((v, i) => (
          <li key={v.key} className="flex items-center gap-1.5" aria-current={v.key === currentKey ? 'step' : undefined}>
            <span className={`rounded-full px-2.5 py-1 ${v.key === currentKey ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {i + 1} {sequenceLabel(v)}
            </span>
            {i < seq.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />}
          </li>
        ))}
      </ol>
      {seq.length === 1 && <p className="mt-2 text-xs text-slate-500">ตอนนี้มี 1 คลิปที่ V2U คัดไว้</p>}
    </div>
  );
}

/** Watch → note → reflect → check. The clip is material; V2U is the workspace. */
export function VideoLearning({ lessonId, ownResources = [], availableMinutes, weakSkillIds = [], onToCheck, onSwitchToV2U, onAddResource }: Props) {
  const lesson = CURRICULUM.lessons.find((l) => l.id === lessonId)!;
  const { lessons: storeLessons, setVideoProgress } = useStore();
  const progress = useStore((s) => s.learningNotes?.videoProgress) ?? {};
  const [stage, setStage] = useVideoStage(lessonId);
  const [selectedKey, setSelectedKey] = useSelectedVideo(lessonId);
  const [currentSeconds, setCurrentSeconds] = useState<number | undefined>(undefined);
  const [seekTo, setSeekTo] = useState<number | null>(null);

  const seq = useMemo(() => getLessonVideoSequence(lessonId, ownResources), [lessonId, ownResources]);
  const watchedKeys = Object.entries(progress)
    .filter(([k, p]) => k.startsWith(`${lessonId}|`) && p.state !== 'not-started' && p.state !== 'learning')
    .map(([k]) => k.split('|')[1]);
  const skippedKeys = Object.entries(progress)
    .filter(([k, p]) => k.startsWith(`${lessonId}|`) && p.skipped)
    .map(([k]) => k.split('|')[1]);
  const rec = getRecommendedVideo({ lessonId, storeLessons, ownResources, availableMinutes, watchedKeys, skippedKeys, weakSkillIds });
  const groups = groupVideos(lessonId, ownResources, rec?.lessonId === lessonId ? rec.video.key : undefined);
  const recLessonTitle = rec && rec.lessonId !== lessonId ? CURRICULUM.lessons.find((l) => l.id === rec.lessonId)?.title : undefined;
  const allVideos = [...seq, ...(rec && rec.lessonId !== lessonId ? [rec.video] : []), ...groups.next];
  const selected = allVideos.find((v) => v.key === selectedKey);
  const stateOf = (v: VideoItem) => progress[progressKey(v.lessonId, v.key)]?.state ?? 'not-started';
  const isSkipped = (v: VideoItem) => !!progress[progressKey(v.lessonId, v.key)]?.skipped;
  /** Skipping only records the choice — it never counts as watched or understood. */
  const skip = (v: VideoItem) => setVideoProgress(v.lessonId, v.key, { skipped: true });
  const path = getTopicVideoPath(lessonId, storeLessons);

  const choose = (v: VideoItem) => {
    if (isSkipped(v)) setVideoProgress(v.lessonId, v.key, { skipped: false });
    setSelectedKey(v.key);
    setCurrentSeconds(undefined);
    if (stateOf(v) === 'not-started') setVideoProgress(v.lessonId, v.key, { state: 'learning' });
    setStage('watch');
  };

  /* ── Entry: "คุณอยากให้ V2U ช่วยเลือกให้ไหม?" — no video is shown here ── */
  if (stage === 'entry' || (stage !== 'pick' && !selected)) {
    return (
      <section aria-labelledby="video-entry" className="space-y-5" data-testid="video-entry">
        <div>
          <p className="text-sm font-semibold text-brand-700">🎬 คลิปสำหรับบทนี้</p>
          <h3 id="video-entry" className="mt-0.5 text-lg font-bold text-ink sm:text-xl">
            คุณอยากให้ V2U ช่วยเลือกให้ไหม?
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {seq.length === 0 ? 'ยังไม่มีคลิปที่ V2U คัดไว้สำหรับบทนี้' : `ตอนนี้มี ${seq.length} คลิปที่ V2U คัดไว้สำหรับบทนี้`}
          </p>
        </div>
        {seq.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 text-center" data-testid="no-videos">
            <p className="text-sm text-slate-700">ยังไม่มีคลิปที่ V2U คัดไว้สำหรับบทนี้ — V2U จะไม่สร้างคลิปขึ้นมาเอง</p>
            <button type="button" onClick={onSwitchToV2U} className="mt-3 min-h-[48px] rounded-2xl bg-brand-600 px-5 text-sm font-bold text-white hover:bg-brand-700">
              ลองเรียนกับ V2U
            </button>
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            data-choice="recommend"
            disabled={!rec}
            onClick={() => rec && choose(rec.video)}
            className="flex min-h-[150px] flex-col rounded-3xl border-2 border-brand-500 bg-brand-50/60 p-5 text-left transition-colors hover:bg-brand-50 disabled:border-slate-200 disabled:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
          >
            <span className="flex items-center gap-2 text-base font-bold text-ink">
              <Sparkles className="h-5 w-5 text-brand-600" /> แนะนำให้ฉัน
            </span>
            {rec ? (
              <>
                <span className="mt-2 text-sm font-semibold text-ink break-words">{rec.video.title}</span>
                {recLessonTitle && <span className="mt-0.5 text-xs font-semibold text-amber-800">จากบทพื้นฐาน “{recLessonTitle}”</span>}
                <span className="mt-1 text-xs text-slate-600 break-words" data-testid="rec-reason">
                  แนะนำคลิปนี้ เพราะ{rec.reasons[0]}
                </span>
                <span className="mt-auto pt-2 text-xs font-semibold text-brand-700">
                  คลิปที่ {rec.position}/{rec.of} ของบท{rec.estimatedMinutes !== undefined && ` · ${rec.video.durationKnown ? '' : 'ประมาณ '}${rec.estimatedMinutes} นาที`}
                </span>
              </>
            ) : (
              <span className="mt-2 text-sm text-slate-500">ยังไม่มีคลิปให้แนะนำ — ลองเรียนแบบ “อ่าน” หรือ “เรียนกับ V2U”</span>
            )}
          </button>
          <button
            type="button"
            data-choice="manual"
            onClick={() => setStage('pick')}
            className="flex min-h-[150px] flex-col rounded-3xl border-2 border-slate-200 bg-white p-5 text-left transition-colors hover:border-brand-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
          >
            <span className="flex items-center gap-2 text-base font-bold text-ink">
              <Eye className="h-5 w-5 text-slate-600" /> เลือกเอง
            </span>
            <span className="mt-2 text-sm text-slate-600">ดูทุกคลิปที่ V2U คัดไว้ แยกตามพื้นฐาน ฝึกทำโจทย์ และบทต่อไป</span>
          </button>
        </div>
        {rec && rec.reasons.length > 1 && (
          <details className="rounded-2xl bg-slate-50 px-4 py-2 text-sm">
            <summary className="flex min-h-[40px] cursor-pointer items-center font-semibold text-slate-700">ทำไม V2U แนะนำคลิปนี้</summary>
            <ul className="space-y-1 pb-2 text-slate-600">
              {rec.reasons.map((r) => (
                <li key={r} className="break-words">• {r}</li>
              ))}
            </ul>
          </details>
        )}
        {seq.length > 0 && (
          <section aria-label="คลิปทั้งหมดของบทนี้" className="space-y-3" data-testid="clip-list">
            <SequenceHeader lessonTitle={lesson.title} seq={seq} />
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {seq.map((v, i) => {
                const state = stateOf(v);
                const seenIt = state === 'watched' || state === 'checked' || state === 'done';
                return (
                  <li key={v.key} className="flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white">
                    <VideoCover v={v} index={i + 1} lessonTitle={lesson.title} />
                    <div className="flex flex-1 flex-col p-4">
                      <p className="text-sm font-semibold text-ink break-words">{v.title}</p>
                      <VideoMeta v={v} />
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {seenIt ? <span className="text-xs font-semibold text-emerald-700">✓ ดูแล้ว</span> : <StateChip state={state} />}
                        {isSkipped(v) && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">ข้ามไว้</span>}
                      </div>
                      <div className="mt-auto flex flex-wrap gap-2 pt-3">
                        <button type="button" onClick={() => choose(v)} className="min-h-[44px] rounded-xl border-2 border-brand-200 px-3 text-sm font-bold text-brand-700 hover:bg-brand-50">
                          {seenIt ? 'ดูอีกครั้ง' : 'ดูคลิปนี้'}
                        </button>
                        {(seenIt || state === 'learning') && !isSkipped(v) && (
                          <button type="button" onClick={() => skip(v)} className="min-h-[44px] rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                            ข้ามคลิป →
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        <TopicPath items={path} currentId={lessonId} />
      </section>
    );
  }

  /* ── Manual choice ─────────────────────────────────────────────────── */
  if (stage === 'pick') {
    const shown = GROUP_ORDER.filter((g) => groups[g].length > 0);
    return (
      <section aria-labelledby="video-pick" className="space-y-5" data-testid="video-pick">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="video-pick" className="text-lg font-bold text-ink">เลือกคลิปเอง</h3>
          <button type="button" onClick={() => setStage('entry')} className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-brand-700">
            <ArrowLeft className="h-4 w-4" /> ให้ V2U แนะนำ
          </button>
        </div>
        {shown.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">บทนี้ยังไม่มีคลิปที่ V2U คัดไว้</p>}
        {shown.map((g) => (
          <div key={g} data-group={g}>
            <p className="mb-2 text-xs font-semibold text-slate-500">{VIDEO_GROUP_LABEL[g]}{g === 'next' ? ' — บทถัดไปในเส้นทาง' : ''}</p>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200/80 bg-white">
              {groups[g].map((v) => (
                <li key={v.key} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink break-words">{v.title}</p>
                    <VideoMeta v={v} />
                    {v.why && <p className="mt-1 text-xs text-slate-600 break-words">{v.why}</p>}
                  </div>
                  <StateChip state={stateOf(v)} />
                  <button type="button" onClick={() => choose(v)} className="min-h-[44px] rounded-xl border-2 border-brand-200 bg-white px-4 text-sm font-bold text-brand-700 hover:bg-brand-50">
                    เลือกคลิปนี้
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {onAddResource && (
          <button type="button" onClick={onAddResource} className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand-700">
            <Plus className="h-4 w-4" /> เพิ่มคลิปของคุณเอง
          </button>
        )}
      </section>
    );
  }

  const v = selected!;
  const inSeq = seq.findIndex((x) => x.key === v.key);
  const prev = inSeq > 0 ? seq[inSeq - 1] : undefined;
  const next = inSeq >= 0 && inSeq < seq.length - 1 ? seq[inSeq + 1] : undefined;
  const reflection = progress[progressKey(v.lessonId, v.key)]?.reflection;

  /* ── Reflect (self-report only) ─────────────────────────────────────── */
  if (stage === 'reflect') {
    return (
      <section aria-labelledby="reflect" className="space-y-4" data-testid="video-reflect">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7">
          <h3 id="reflect" className="text-lg font-bold text-ink">หลังจากดูคลิปนี้ คุณคิดว่าตัวเองเข้าใจแค่ไหน?</h3>
          <p className="mt-1 text-xs text-slate-500">นี่คือความรู้สึกของคุณ — V2U จะเช็กความเข้าใจอีกครั้งก่อนนับว่าเข้าใจ</p>
          <div role="radiogroup" aria-label="ระดับความเข้าใจ" className="mt-4 grid gap-2 sm:grid-cols-2">
            {(Object.keys(REFLECTION_LABEL) as NonNullable<VideoProgress['reflection']>[]).map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={reflection === r}
                onClick={() => setVideoProgress(v.lessonId, v.key, { reflection: r })}
                className={`flex min-h-[52px] items-center gap-3 rounded-2xl border-2 px-4 text-left text-sm font-medium ${reflection === r ? 'border-brand-500 bg-brand-50 text-brand-900' : 'border-slate-200 bg-white text-ink hover:border-brand-300'}`}
              >
                <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${reflection === r ? 'border-brand-600 bg-brand-600' : 'border-slate-300'}`} aria-hidden="true" />
                {REFLECTION_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-brand-50 p-5 text-center">
          <p className="text-sm text-brand-900">ดูจบแล้ว — ดูคลิปอย่างเดียวยังไม่ได้แปลว่าเข้าใจ</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={onToCheck} disabled={!reflection} className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-brand-600 px-6 text-sm font-bold text-white hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-500">
              ลองเช็กความเข้าใจ <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={onSwitchToV2U} className="min-h-[52px] rounded-2xl border-2 border-brand-200 bg-white px-5 text-sm font-bold text-brand-700 hover:bg-brand-50">
              ยังไม่เข้าใจ — เรียนกับ V2U
            </button>
          </div>
          <button type="button" onClick={() => setStage('watch')} className="mt-2 min-h-[44px] text-sm font-semibold text-slate-600">
            ← กลับไปดูคลิปต่อ
          </button>
        </div>
      </section>
    );
  }

  /* ── Workspace: video + notes ──────────────────────────────────────── */
  return (
    <section aria-label="ดูคลิปและจดโน้ต" className="space-y-4" data-testid="video-workspace">
      <SequenceHeader lessonTitle={lesson.title} seq={seq} currentKey={v.key} />
      <div className="@container">
        <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_300px] @5xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">
            {v.embeddable && v.url ? (
              <YouTubePlayer
                url={v.url}
                title={v.title}
                onTimeUpdate={setCurrentSeconds}
                onTimeSupported={() => undefined}
                onEnded={() => setVideoProgress(v.lessonId, v.key, { state: stateOf(v) === 'learning' || stateOf(v) === 'not-started' ? 'watched' : stateOf(v) })}
                seekToSeconds={seekTo}
              />
            ) : (
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5" data-testid="external-video">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <ExternalLink className="h-3.5 w-3.5" /> แหล่งภายนอก — เปิดคลิปไว้ข้าง ๆ แล้วจดโน้ตใน V2U ได้เลย
                </p>
                <p className="mt-1 text-base font-bold text-ink break-words">{v.title}</p>
                <VideoMeta v={v} />
                {v.url || v.candidateUrl ? (
                  <a href={v.url ?? v.candidateUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800">
                    <ExternalLink className="h-4 w-4" /> เปิดคลิปในแท็บใหม่
                  </a>
                ) : null}
                {!v.checked && <p className="mt-2 text-xs text-amber-700">ยังไม่ได้ตรวจลิงก์ — ถ้าเปิดไม่ได้ หาได้ที่: {v.locator}</p>}
              </div>
            )}
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
              <p className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                สถานะ: <StateChip state={stateOf(v)} />
                {v.minutes !== undefined && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {v.durationKnown ? '' : 'ประมาณ '}{v.minutes} นาที
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="@3xl:sticky @3xl:top-0 self-start">
            <NotesPanel lessonId={lessonId} videoKey={v.key} currentSeconds={v.embeddable ? currentSeconds : undefined} onSeek={v.embeddable ? (s) => setSeekTo(s) : undefined} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-3xl border border-slate-200/80 bg-white p-3">
        <button type="button" onClick={() => (prev ? choose(prev) : setStage('pick'))} className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">
          <ArrowLeft className="h-4 w-4" /> {prev ? 'คลิปก่อนหน้า' : 'เลือกคลิปอื่น'}
        </button>
        <div className="flex flex-wrap gap-2">
          {next && (
            <button type="button" onClick={() => choose(next)} className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border-2 border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:border-brand-300">
              คลิปถัดไป <ArrowRight className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (stateOf(v) === 'learning' || stateOf(v) === 'not-started') setVideoProgress(v.lessonId, v.key, { state: 'watched' });
              setStage('reflect');
            }}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-brand-600 px-5 text-sm font-bold text-white hover:bg-brand-700"
          >
            <Check className="h-4 w-4" /> ฉันดูจบแล้ว
          </button>
        </div>
      </div>
    </section>
  );
}
