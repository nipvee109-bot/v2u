import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  BookOpen,
  HelpCircle,
  RotateCcw,
  Plus,
  ExternalLink,
  Layers,
  Info,
  Trash2,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useStore, computeSessionElapsedSeconds, scoreToMasteryLevel } from '../store/useStore';
import type { Resource, ConfidenceLevel, MasteryScore } from '../types';
import { SUBJECTS, MASTERY_SCALE } from '../types';
import { ResourceViewer } from '../components/study/ResourceViewer';
import { CreateResourceModal } from '../components/CreateResourceModal';
import { PostLearningFlowModal } from '../components/study/PostLearningFlowModal';
import { formatVideoTime } from '../components/study/YouTubePlayer';

type ActiveTab = 'notes' | 'timestamps' | 'resources' | 'info';

export const StudyRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    lessons,
    updateLesson,
    activeLearningSession,
    startLearningSession,
    pauseLearningSession,
    resumeLearningSession,
    updateLearningSessionDraft,
    finishLearningSession,
    switchSessionResource,
    addTimestampedNote,
    deleteTimestampedNote,
    heartbeatLearningSession,
    recordQuizAttempt,
    setLessonConfidence,
    addUnclearTopic,
  } = useStore();

  const lesson = useMemo(() => lessons.find((l) => l.id === id), [lessons, id]);

  // Active workspace tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('notes');

  // Video player state & timestamp seeking
  const [videoCurrentSeconds, setVideoCurrentSeconds] = useState(0);
  const [seekTargetSeconds, setSeekTargetSeconds] = useState<number | null>(null);

  // New timestamp note input
  const [newTimestampContent, setNewTimestampContent] = useState('');

  // Active selected resource
  const [selectedResource, setSelectedResource] = useState<Resource | null>(() => {
    const current = useStore.getState().activeLearningSession;
    if (current && current.lessonId === id && current.source) {
      return current.source;
    }
    const currentLesson = useStore.getState().lessons.find((l) => l.id === id);
    return currentLesson?.resources?.[0] || null;
  });

  // Resource modal
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);

  // Finish flow modal
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);

  // Local draft notes
  const [learnedNotes, setLearnedNotes] = useState(lesson?.learnedNotes || '');
  const [stillUnclearNotes, setStillUnclearNotes] = useState(lesson?.stillUnclearNotes || '');
  const [reviewNotes, setReviewNotes] = useState(lesson?.reviewNotes || '');

  // Ensure active learning session is started
  useEffect(() => {
    if (lesson) {
      if (!activeLearningSession || activeLearningSession.lessonId !== lesson.id) {
        startLearningSession({ lessonId: lesson.id, source: selectedResource || undefined });
      }
    }
  }, [lesson, activeLearningSession, startLearningSession, selectedResource]);

  // Sync draft notes from active session or lesson
  useEffect(() => {
    if (activeLearningSession?.notesDraft) {
      if (activeLearningSession.notesDraft.learnedNotes !== undefined) {
        setLearnedNotes(activeLearningSession.notesDraft.learnedNotes);
      }
      if (activeLearningSession.notesDraft.stillUnclearNotes !== undefined) {
        setStillUnclearNotes(activeLearningSession.notesDraft.stillUnclearNotes);
      }
      if (activeLearningSession.notesDraft.reviewNotes !== undefined) {
        setReviewNotes(activeLearningSession.notesDraft.reviewNotes);
      }
    } else if (lesson) {
      setLearnedNotes(lesson.learnedNotes || '');
      setStillUnclearNotes(lesson.stillUnclearNotes || '');
      setReviewNotes(lesson.reviewNotes || '');
    }
  }, [activeLearningSession, lesson]);

  // Study timer heartbeat and UI updates
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!activeLearningSession) return;

    const timer = setInterval(() => {
      setElapsedSeconds(computeSessionElapsedSeconds(activeLearningSession));
    }, 500);

    const heartbeat = setInterval(() => {
      heartbeatLearningSession();
    }, 10000);

    return () => {
      clearInterval(timer);
      clearInterval(heartbeat);
    };
  }, [activeLearningSession, heartbeatLearningSession]);

  // Update session draft on notes change
  const handleLearnedNotesChange = (val: string) => {
    setLearnedNotes(val);
    updateLearningSessionDraft({ learnedNotes: val });
    if (lesson) updateLesson(lesson.id, { learnedNotes: val });
  };

  const handleUnclearNotesChange = (val: string) => {
    setStillUnclearNotes(val);
    updateLearningSessionDraft({ stillUnclearNotes: val });
    if (lesson) updateLesson(lesson.id, { stillUnclearNotes: val });
  };

  const handleReviewNotesChange = (val: string) => {
    setReviewNotes(val);
    updateLearningSessionDraft({ reviewNotes: val });
    if (lesson) updateLesson(lesson.id, { reviewNotes: val });
  };

  // Switch active resource without losing session timer or notes
  const handleSelectResource = (res: Resource) => {
    setSelectedResource(res);
    switchSessionResource(res);
  };

  // Add timestamped note
  const handleAddTimestampNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson || !newTimestampContent.trim()) return;

    addTimestampedNote(lesson.id, {
      timestampSeconds: Math.floor(videoCurrentSeconds),
      timestampDisplay: formatVideoTime(videoCurrentSeconds),
      content: newTimestampContent.trim(),
    });

    setNewTimestampContent('');
  };

  // Seek video player to timestamp
  const handleSeekTo = (seconds: number) => {
    setSeekTargetSeconds(seconds);
    // Reset seekTarget after brief trigger so subsequent clicks at same timestamp work
    setTimeout(() => setSeekTargetSeconds(null), 100);
  };

  // Phase 33: Learn -> Test -> Master Finish Flow
  const handleModalConfirm = ({
    actualMinutes,
    quizScore,
    confidence,
    learnedNotes: finalLearnedNotes,
    stillUnclearNotes: finalUnclearNotes,
    reviewNotes: finalReviewNotes,
    newMasteryScore,
  }: {
    actualMinutes: number;
    quizScore?: number;
    confidence: ConfidenceLevel;
    learnedNotes: string;
    stillUnclearNotes: string;
    reviewNotes: string;
    newMasteryScore: MasteryScore;
  }) => {
    if (!lesson) return;

    // 1. Update draft notes in session
    updateLearningSessionDraft({
      learnedNotes: finalLearnedNotes,
      stillUnclearNotes: finalUnclearNotes,
      reviewNotes: finalReviewNotes,
    });

    // 2. If there are still unclear notes, register as UnclearTopic
    if (finalUnclearNotes.trim()) {
      addUnclearTopic({
        id: uuidv4(),
        topic: `${lesson.title}: ${finalUnclearNotes.slice(0, 50)}`,
        details: finalUnclearNotes,
        subjectId: lesson.subjectId,
        priority: 'High',
        status: 'Not Understood',
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Complete the learning session
    finishLearningSession(actualMinutes, quizScore, confidence);
    setLessonConfidence(lesson.id, confidence);

    // 4. Update lesson explicit masteryScore and notes
    updateLesson(lesson.id, {
      learnedNotes: finalLearnedNotes,
      stillUnclearNotes: finalUnclearNotes,
      reviewNotes: finalReviewNotes,
      masteryScore: newMasteryScore,
      mastery: scoreToMasteryLevel(newMasteryScore),
    });

    if (quizScore !== undefined) {
      recordQuizAttempt(lesson.id, quizScore);
    }

    setIsFinishModalOpen(false);
    navigate(`/lessons/${lesson.id}?tab=timeline`);
  };

  if (!lesson) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-6 text-center">
        <h3 className="text-lg font-bold text-slate-800">ไม่พบบทเรียนที่ต้องการ</h3>
        <p className="text-xs text-slate-500 mt-1">บทเรียนนี้อาจถูกลบหรือระบุรหัสไม่ถูกต้อง</p>
        <Link
          to="/"
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
        >
          กลับหน้าหลัก
        </Link>
      </div>
    );
  }

  const subjectInfo = SUBJECTS[lesson.subjectId];
  const isTimerActive = activeLearningSession?.status === 'active';
  const targetDurationMinutes = lesson.durationHours * 60;
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const durationProgressPercent = Math.min(
    100,
    targetDurationMinutes > 0 ? Math.round((elapsedMinutes / targetDurationMinutes) * 100) : 0
  );

  const lessonResources = lesson.resources || [];
  const timestampedNotes = lesson.timestampedNotes || [];

  return (
    <div className="space-y-4 pb-16 animate-fadeIn">
      {/* ═══════════ TOP HEADER & CONTROL BAR ═══════════ */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-4 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        {/* Left: Breadcrumbs & Title */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link
              to={`/lessons/${lesson.id}`}
              className="inline-flex items-center gap-1 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>หน้ารายละเอียดบทเรียน</span>
            </Link>
            <span>&middot;</span>
            <span className="text-blue-400 font-semibold">{subjectInfo.name}</span>
            <span>&middot;</span>
            <span>เดือนที่ {lesson.month}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white">
              {lesson.title}
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold border border-blue-400/20">
              Study Room
            </span>
          </div>
        </div>

        {/* Right: Study Timer & Finish Control */}
        <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
          {/* Real Study Timer Card */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2 rounded-2xl shadow-inner">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <span className={`w-2 h-2 rounded-full ${isTimerActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                <span className="font-medium">เวลาเรียนจริง</span>
                <span className="text-white/40">/</span>
                <span className="text-white/60">เป้าหมาย {targetDurationMinutes} น.</span>
              </div>
              <div className="text-xl sm:text-2xl font-mono font-bold tracking-wider text-white">
                {formatVideoTime(elapsedSeconds)}
              </div>
              <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${durationProgressPercent}%` }}
                />
              </div>
            </div>

            {/* Play/Pause Button */}
            <button
              onClick={isTimerActive ? pauseLearningSession : resumeLearningSession}
              aria-label={isTimerActive ? 'พักเวลาเรียน' : 'เริ่มจับเวลาเรียนต่อ'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-md ${
                isTimerActive
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {isTimerActive ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
          </div>

          {/* Finish Session Button */}
          <button
            onClick={() => setIsFinishModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>เสร็จสิ้นการเรียน</span>
          </button>
        </div>
      </div>

      {/* ═══════════ MULTI-PANEL MAIN LEARNING WORKSPACE ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Resource Switcher & Primary Player (lg:col-span-7 or 8) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3">
          {/* Multi-source Switcher Bar */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex items-center gap-2">
              {lessonResources.map((res) => {
                const isSelected = selectedResource?.id === res.id;
                return (
                  <button
                    key={res.id}
                    onClick={() => handleSelectResource(res)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="capitalize">{res.type}</span>
                    <span className="text-[11px] font-normal opacity-70 truncate max-w-[120px] sm:max-w-[160px]">
                      {res.title}
                    </span>
                    {res.role === 'primary' && (
                      <span className="px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-300 text-[10px]">
                        หลัก
                      </span>
                    )}
                  </button>
                );
              })}

              {lessonResources.length === 0 && (
                <span className="text-xs text-slate-500 italic">ยังไม่มีแหล่งเรียนรู้ที่เชื่อมโยง</span>
              )}
            </div>

            {/* Quick add resource button */}
            <button
              onClick={() => setIsResourceModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold transition-colors shrink-0 border border-blue-200/60"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มสื่อ</span>
            </button>
          </div>

          {/* Primary Embedded Resource Viewer */}
          <ResourceViewer
            resource={selectedResource}
            onTimeUpdate={(seconds) => setVideoCurrentSeconds(seconds)}
            seekToSeconds={seekTargetSeconds}
          />

          {/* Resource quick meta pill */}
          {selectedResource && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-2 truncate">
                <span className="font-semibold text-slate-800">{selectedResource.title}</span>
                {selectedResource.provider && (
                  <span className="text-slate-400">&middot; {selectedResource.provider}</span>
                )}
              </div>
              <a
                href={selectedResource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 shrink-0 font-medium"
              >
                <span>เปิดแท็บใหม่</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Notebook, Timestamps & Lesson Hub (lg:col-span-5 or 4) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden flex flex-col min-h-[540px]">
          {/* Workspace Tabs Header */}
          <div className="flex items-center border-b border-slate-100 bg-slate-50/70 p-2 gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'notes'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>สมุดโน้ต</span>
            </button>

            <button
              onClick={() => setActiveTab('timestamps')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'timestamps'
                  ? 'bg-white text-purple-600 shadow-xs'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>โน้ตตามเวลา ({timestampedNotes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('resources')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'resources'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>แหล่งเรียน ({lessonResources.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('info')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'info'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>ข้อมูลบท</span>
            </button>
          </div>

          {/* TAB 1: LEARNING NOTEBOOK (3 Core Sections) */}
          {activeTab === 'notes' && (
            <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
              {/* Section 1: สิ่งที่ฉันเรียนรู้ */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>สิ่งที่ฉันเรียนรู้ (Learned Notes)</span>
                </label>
                <textarea
                  value={learnedNotes}
                  onChange={(e) => handleLearnedNotesChange(e.target.value)}
                  placeholder="สรุปแนวคิด สูตร นิยาม หรือโค้ดตัวอย่างที่เข้าใจจากบทเรียน..."
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-slate-400"
                />
              </div>

              {/* Section 2: สิ่งที่ยังไม่เข้าใจ */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <HelpCircle className="w-4 h-4 text-rose-500" />
                  <span>สิ่งที่ยังไม่เข้าใจ (Still Unclear)</span>
                </label>
                <textarea
                  value={stillUnclearNotes}
                  onChange={(e) => handleUnclearNotesChange(e.target.value)}
                  placeholder="จุดที่ยังติดขัด ข้อสงสัย หรือทฤษฎีที่ยังต้องการคำอธิบายเพิ่ม..."
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm text-slate-800 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 outline-none transition-all placeholder-slate-400"
                />
              </div>

              {/* Section 3: ต้องกลับมาทบทวน */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <RotateCcw className="w-4 h-4 text-purple-500" />
                  <span>ต้องกลับมาทบทวน (Review Focus)</span>
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => handleReviewNotesChange(e.target.value)}
                  placeholder="หัวข้อย่อยหรือโจทย์ข้อสำคัญที่ต้องกลับมาทำซ้ำในรอบทบทวน..."
                  rows={2}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs sm:text-sm text-slate-800 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all placeholder-slate-400"
                />
              </div>
            </div>
          )}

          {/* TAB 2: TIMESTAMPED VIDEO NOTES (Phase 29) */}
          {activeTab === 'timestamps' && (
            <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col overflow-y-auto">
              {/* Add timestamp note form */}
              <form onSubmit={handleAddTimestampNote} className="space-y-2 p-3 bg-purple-50/50 rounded-2xl border border-purple-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-900 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    เวลาในคลิปขณะนี้:
                  </span>
                  <span className="font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-purple-200 text-purple-700">
                    {formatVideoTime(videoCurrentSeconds)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTimestampContent}
                    onChange={(e) => setNewTimestampContent(e.target.value)}
                    placeholder="จดบันทึก ณ เวลานี้ (เช่น ตัวอย่างโจทย์ข้อที่ 2)..."
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!newTimestampContent.trim()}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    + บันทึก
                  </button>
                </div>
              </form>

              {/* Timestamp Notes Timeline */}
              <div className="space-y-2 flex-1 overflow-y-auto">
                {timestampedNotes.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 space-y-1">
                    <Clock className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-semibold">ยังไม่มีโน้ตที่ระบุเวลา</p>
                    <p className="text-[11px]">พิมพ์ข้อความด้านบนแล้วกด + บันทึก ขณะที่วิดีโอกำลังเล่น</p>
                  </div>
                ) : (
                  timestampedNotes.map((note) => (
                    <div
                      key={note.id}
                      className="group flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/20 transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => handleSeekTo(note.timestampSeconds)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-100 hover:bg-purple-200 text-purple-800 font-mono font-bold text-xs shrink-0 transition-colors"
                        title="คลิกเพื่อกระโดดไปยังเวลานี้ในวิดีโอ"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>{note.timestampDisplay}</span>
                      </button>

                      <div className="flex-1 min-w-0 text-xs text-slate-800 mt-0.5">
                        <p className="break-words font-medium">{note.content}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteTimestampedNote(lesson.id, note.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity"
                        title="ลบโน้ตนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ALL RESOURCES (Phase 30 Multi-Source) */}
          {activeTab === 'resources' && (
            <div className="p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">
                  แหล่งเรียนรู้ของบทเรียนนี้ ({lessonResources.length})
                </span>
                <button
                  onClick={() => setIsResourceModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มแหล่งเรียน
                </button>
              </div>

              <div className="space-y-2">
                {lessonResources.map((res) => {
                  const isCurrent = selectedResource?.id === res.id;
                  return (
                    <div
                      key={res.id}
                      className={`p-3 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{res.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold uppercase">
                              {res.type}
                            </span>
                            {res.role && (
                              <span className="text-[10px] font-medium text-slate-500">
                                บทบาท: {res.role}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isCurrent && (
                            <button
                              onClick={() => handleSelectResource(res)}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-colors"
                            >
                              สลับมาดูสื่อนี้
                            </button>
                          )}
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-400 hover:text-slate-600"
                            title="เปิดในแท็บใหม่"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: LESSON INFO & OBJECTIVES */}
          {activeTab === 'info' && (
            <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-700">คำอธิบายบทเรียน</span>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  {lesson.description || 'ยังไม่มีคำอธิบายรายละเอียดบทเรียน'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">ระดับความยาก</span>
                  <span className="font-bold text-slate-800 text-sm">{lesson.difficulty}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">สถานะปัจจุบัน</span>
                  <span className="font-bold text-slate-800 text-sm">{lesson.status}</span>
                </div>
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-1">
                <span className="text-purple-900 font-bold block">ระดับความเข้าใจ (Mastery)</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-purple-700">
                    {lesson.masteryScore ?? 0} / 4
                  </span>
                  <span className="text-purple-600 font-medium">
                    {MASTERY_SCALE[(lesson.masteryScore ?? 0) as 0 | 1 | 2 | 3 | 4].title}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ PHASE 33: POST-LEARNING FLOW (Learn -> Test -> Master) ═══════════ */}
      <PostLearningFlowModal
        isOpen={isFinishModalOpen}
        onClose={() => setIsFinishModalOpen(false)}
        lesson={lesson}
        elapsedSeconds={elapsedSeconds}
        resourcesUsed={
          activeLearningSession?.resourcesUsed && activeLearningSession.resourcesUsed.length > 0
            ? activeLearningSession.resourcesUsed
            : (selectedResource ? [selectedResource] : [])
        }
        initialLearnedNotes={learnedNotes}
        initialUnclearNotes={stillUnclearNotes}
        initialReviewNotes={reviewNotes}
        initialConfidence={lesson.confidence || 'Medium'}
        onConfirm={handleModalConfirm}
      />

      {/* Create / Add Resource Modal */}
      <CreateResourceModal
        isOpen={isResourceModalOpen}
        onClose={() => setIsResourceModalOpen(false)}
        defaultSubject={lesson.subjectId}
        defaultLessonId={lesson.id}
      />
    </div>
  );
};
