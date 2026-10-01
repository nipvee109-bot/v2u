import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore, computeSessionElapsedSeconds, computeLessonLearningRecord } from '../store/useStore';
import { 
  ArrowLeft, 
  Trash2, 
  Plus, 
  Link as LinkIcon, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  CheckCircle, 
  ChevronRight, 
  Pause, 
  Play, 
  Square,
  Award,
  Sparkles,
  Calendar,
  Check,
  CalendarCheck,
  History,
  Clock
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Lesson, Resource, ConfidenceLevel } from '../types';
import { SUBJECTS } from '../types';
import { format, parseISO, isPast, differenceInDays } from 'date-fns';
import { th } from 'date-fns/locale';

type FlowStep = 'idle' | 'source_selection' | 'studying' | 'summary' | 'quiz' | 'notebook';

export function LessonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    lessons, 
    updateLesson, 
    deleteLesson,
    activeLearningSession,
    learningSessionsHistory,
    sessions,
    startLearningSession,
    pauseLearningSession,
    resumeLearningSession,
    updateLearningSessionDraft,
    finishLearningSession,
    abandonLearningSession,
    recoverLearningSession,
    heartbeatLearningSession,
    setLessonConfidence,
    recordLessonReview,
    recordQuizAttempt,
  } = useStore();
  
  const existingLesson = lessons.find(l => l.id === id);
  const [lesson, setLesson] = useState<Lesson | null>(existingLesson || null);
  const [step, setStep] = useState<FlowStep>(() => {
    if (activeLearningSession && activeLearningSession.lessonId === id && activeLearningSession.status !== 'completed') {
      return 'studying';
    }
    return existingLesson?.status === 'COMPLETED' ? 'notebook' : 'idle';
  });

  const [timerSeconds, setTimerSeconds] = useState<number>(() => {
    if (activeLearningSession && activeLearningSession.lessonId === id) {
      return computeSessionElapsedSeconds(activeLearningSession);
    }
    return 0;
  });

  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(() => {
    if (activeLearningSession && activeLearningSession.lessonId === id && activeLearningSession.source) {
      return activeLearningSession.source.id;
    }
    return null;
  });

  const [quizScore, setQuizScore] = useState<number | null>(existingLesson?.quizScore ?? null);
  const [showAbandonedModal, setShowAbandonedModal] = useState<boolean>(false);
  const [confirmedMinutesInput, setConfirmedMinutesInput] = useState<number>(() => (existingLesson?.durationHours || 1) * 60);

  // Phase 9: Memory state
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [reviewNoteInput, setReviewNoteInput] = useState<string>('');
  const [activeNotebookTab, setActiveNotebookTab] = useState<'notebook' | 'timeline'>('notebook');

  const learningRecord = useMemo(() => {
    if (!lesson) return null;
    return computeLessonLearningRecord(lesson, learningSessionsHistory, sessions);
  }, [lesson, learningSessionsHistory, sessions]);

  const timelineEvents = useMemo(() => {
    if (!lesson) return [];
    const events: Array<{
      id: string;
      date: string;
      title: string;
      description?: string;
      badge: string;
      badgeColor: string;
      type: 'session' | 'quiz' | 'review' | 'start' | 'unclear';
    }> = [];

    // First studied / started event
    if (learningRecord?.firstStudiedAt) {
      events.push({
        id: 'evt-first-studied',
        date: learningRecord.firstStudiedAt,
        title: 'เริ่มต้นเรียนบทเรียนนี้',
        description: `สถานะเริ่มต้น: ${lesson.title}`,
        badge: 'Start',
        badgeColor: 'bg-blue-100 text-blue-700',
        type: 'start',
      });
    }

    // Sessions history for this lesson
    const lessonSessions = learningSessionsHistory.filter(
      (s) => s.lessonId === lesson.id && s.status === 'completed'
    );
    lessonSessions.forEach((s) => {
      const mins = Math.round(s.actualSeconds / 60);
      events.push({
        id: `evt-session-${s.sessionId}`,
        date: s.completedAt || s.startedAt,
        title: `เซสชันการเรียนสำเร็จ (${mins} นาที)`,
        description: s.source ? `แหล่งเรียนรู้: ${s.source.title}` : undefined,
        badge: `${mins} นาที`,
        badgeColor: 'bg-emerald-100 text-emerald-700',
        type: 'session',
      });
    });

    // If lesson has actualStudyMinutes and no session in history
    if (lessonSessions.length === 0 && lesson.actualStudyMinutes && lesson.completedAt) {
      events.push({
        id: 'evt-initial-session',
        date: lesson.completedAt,
        title: `บันทึกเวลาเรียน (${lesson.actualStudyMinutes} นาที)`,
        description: 'เซสชันการเรียนที่บันทึกไว้',
        badge: `${lesson.actualStudyMinutes} นาที`,
        badgeColor: 'bg-emerald-100 text-emerald-700',
        type: 'session',
      });
    }

    // Quiz attempts
    (lesson.quizAttempts || []).forEach((qa) => {
      events.push({
        id: `evt-quiz-${qa.id}`,
        date: qa.timestamp,
        title: `ทำแบบทดสอบ (Quiz): ${qa.score}%`,
        description: qa.notes || (qa.score >= 90 ? 'เข้าใจแจ่มแจ้ง' : qa.score >= 70 ? 'พอเข้าใจหลักการ' : 'ยังไม่ค่อยเข้าใจ'),
        badge: `${qa.score}%`,
        badgeColor: qa.score >= 80 ? 'bg-indigo-100 text-indigo-700' : qa.score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700',
        type: 'quiz',
      });
    });

    // Legacy quiz score if no attempts
    if ((!lesson.quizAttempts || lesson.quizAttempts.length === 0) && lesson.quizScore !== undefined && lesson.completedAt) {
      events.push({
        id: 'evt-legacy-quiz',
        date: lesson.completedAt,
        title: `คะแนนแบบทดสอบ: ${lesson.quizScore}%`,
        badge: `${lesson.quizScore}%`,
        badgeColor: 'bg-indigo-100 text-indigo-700',
        type: 'quiz',
      });
    }

    // Unclear note marked
    if (lesson.stillUnclearNotes && lesson.stillUnclearNotes.trim().length > 0) {
      events.push({
        id: 'evt-unclear-note',
        date: lesson.lastStudiedAt || lesson.completedAt || new Date().toISOString(),
        title: 'บันทึกจุดที่ยังไม่เข้าใจ',
        description: lesson.stillUnclearNotes,
        badge: 'Unclear',
        badgeColor: 'bg-rose-100 text-rose-700',
        type: 'unclear',
      });
    }

    // Review notes
    if (lesson.reviewCount && lesson.reviewCount > 0) {
      events.push({
        id: 'evt-review-count',
        date: lesson.lastStudiedAt || new Date().toISOString(),
        title: `ทบทวนความรู้ (${lesson.reviewCount} ครั้ง)`,
        description: lesson.reviewNotes || undefined,
        badge: `Review #${lesson.reviewCount}`,
        badgeColor: 'bg-purple-100 text-purple-700',
        type: 'review',
      });
    }

    // Sort descending by date (most recent first)
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [lesson, learningRecord, learningSessionsHistory]);

  // Sync lesson with store
  useEffect(() => {
    const updated = lessons.find(l => l.id === id);
    if (updated) setLesson(updated);
  }, [lessons, id]);

  // Session Recovery & Abandoned Inactivity check
  useEffect(() => {
    if (activeLearningSession && activeLearningSession.lessonId === id) {
      // Check if session has been inactive/abandoned for > 2 hours
      const lastHeartbeat = new Date(activeLearningSession.lastHeartbeatAt || activeLearningSession.startedAt).getTime();
      const elapsedSinceHeartbeat = Date.now() - lastHeartbeat;
      const isAbandonedCandidate = elapsedSinceHeartbeat > 2 * 60 * 60 * 1000;

      if (isAbandonedCandidate && activeLearningSession.status !== 'completed') {
        setShowAbandonedModal(true);
      } else if (step === 'idle' || step === 'source_selection') {
        setStep('studying');
      }
    }
  }, [activeLearningSession, id, step]);

  // Timer Tick: Derives elapsed time directly from timestamps
  useEffect(() => {
    const isCurrentSessionActive = activeLearningSession && activeLearningSession.lessonId === id;

    const updateTimer = () => {
      if (isCurrentSessionActive) {
        const elapsed = computeSessionElapsedSeconds(activeLearningSession);
        setTimerSeconds(elapsed);
      }
    };

    updateTimer();
    const interval = window.setInterval(updateTimer, 500);

    // Heartbeat every 10 seconds while active
    const heartbeatInterval = window.setInterval(() => {
      if (isCurrentSessionActive && activeLearningSession.status === 'active') {
        heartbeatLearningSession();
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(heartbeatInterval);
    };
  }, [activeLearningSession, id, heartbeatLearningSession]);

  if (!lesson) return (
    <div className="flex items-center justify-center h-96">
      <div className="card p-12 text-center"><p className="text-slate-500 text-lg">ไม่พบบทเรียน</p></div>
    </div>
  );

  const subject = SUBJECTS[lesson.subjectId];
  const isSessionRunning = activeLearningSession?.lessonId === lesson.id && activeLearningSession.status === 'active';

  const handleDelete = () => { 
    if (confirm('แน่ใจหรือไม่ว่าต้องการลบบทเรียนนี้?')) { 
      if (activeLearningSession?.lessonId === lesson.id) {
        abandonLearningSession();
      }
      deleteLesson(lesson.id); 
      navigate(-1); 
    } 
  };

  const updateField = (field: keyof Lesson, value: any) => { 
    const updated = { ...lesson, [field]: value }; 
    setLesson(updated); 
    updateLesson(lesson.id, { [field]: value }); 
  };

  const handleStartFlow = () => { 
    if (lesson.resources.length === 0) { 
      startLearningSession({ lessonId: lesson.id });
      setStep('studying'); 
    } else { 
      setStep('source_selection'); 
    } 
  };

  const confirmSource = () => { 
    const chosen = lesson.resources.find(r => r.id === selectedSourceId);
    startLearningSession({ lessonId: lesson.id, source: chosen });
    setStep('studying'); 
  };

  const handleTogglePause = () => {
    if (isSessionRunning) {
      pauseLearningSession();
    } else {
      resumeLearningSession();
    }
  };

  const finishStudying = () => { 
    pauseLearningSession(); 
    setStep('summary'); 
  };

  const formatTime = (t: number) => 
    `${Math.floor(t / 3600).toString().padStart(2, '0')}:${Math.floor((t % 3600) / 60).toString().padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`;

  const handleFinishLesson = () => { 
    const actualMins = Math.max(1, Math.round(timerSeconds / 60));
    finishLearningSession(actualMins, quizScore !== null ? quizScore : undefined);
    setStep('notebook'); 
  };

  const handleAddResource = () => {
    const url = prompt('ใส่ URL (เช่น YouTube, Website, Document):');
    if (url) {
      let type: Resource['type'] = 'website';
      if (url.includes('youtube.com') || url.includes('youtu.be')) type = 'youtube';
      else if (url.includes('.pdf') || url.includes('docs.google.com')) type = 'document';
      updateField('resources', [...lesson.resources, { id: uuidv4(), type, title: type === 'youtube' ? 'YouTube Video' : 'Link / Document', url } as Resource]);
    }
  };

  const handleRemoveResource = (rId: string) => updateField('resources', lesson.resources.filter(r => r.id !== rId));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { 
    if (e.target.files) Array.from(e.target.files).forEach(f => { 
      const r = new FileReader(); 
      r.onload = ev => { 
        if (ev.target?.result) updateField('images', [...lesson.images, ev.target.result as string]); 
      }; 
      r.readAsDataURL(f); 
    }); 
  };

  const removeImage = (i: number) => { 
    const n = [...lesson.images]; 
    n.splice(i, 1); 
    updateField('images', n); 
  };

  const getYoutubeId = (url: string) => { 
    const m = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/); 
    return m && m[2].length === 11 ? m[2] : null; 
  };

  /* ============= STEP: IDLE ============= */
  const renderIdle = () => (
    <div className="max-w-2xl mx-auto">
      <div className="card p-0 overflow-hidden shadow-sm">
        {/* Hero banner */}
        <div className={`h-36 ${subject.color} relative flex items-end p-6`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="relative z-10">
            <p className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-1">{subject.name}</p>
            <h2 className="text-2xl font-bold text-white leading-tight">{lesson.title}</h2>
          </div>
        </div>
        <div className="p-8 text-center space-y-6">
          <div className="flex justify-center gap-6">
            <div className="text-center"><p className="text-2xl font-bold text-slate-900">{lesson.durationHours}</p><p className="text-xs text-slate-500 mt-1">ชั่วโมง</p></div>
            <div className="w-px bg-slate-200" />
            <div className="text-center"><p className="text-2xl font-bold text-slate-900">{lesson.difficulty === 'Easy' ? 'ง่าย' : lesson.difficulty === 'Medium' ? 'กลาง' : 'ยาก'}</p><p className="text-xs text-slate-500 mt-1">ระดับ</p></div>
            <div className="w-px bg-slate-200" />
            <div className="text-center"><p className="text-2xl font-bold text-slate-900">{lesson.resources.length}</p><p className="text-xs text-slate-500 mt-1">แหล่งเรียน</p></div>
          </div>
          <button onClick={handleStartFlow} className="w-full max-w-xs mx-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-blue-600/25 transition-all duration-200 text-base flex items-center justify-center gap-2">
            <Play className="w-5 h-5" /> เริ่มเรียน
          </button>
          <button onClick={() => setStep('notebook')} className="text-slate-500 hover:text-slate-900 text-xs font-semibold transition-colors block mx-auto">
            เปิดสมุดโน้ต &rarr;
          </button>
        </div>
      </div>
    </div>
  );

  /* ============= STEP: SOURCE SELECTION ============= */
  const renderSourceSelection = () => (
    <div className="max-w-2xl mx-auto">
      <div className="card p-8 space-y-6">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {['เลือกแหล่ง', 'เรียน', 'สรุป', 'ทดสอบ', 'เสร็จ'].map((_label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i === 0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-100 text-slate-400'}`}>{i + 1}</div>
              {i < 4 && <div className="w-6 h-px bg-slate-200" />}
            </div>
          ))}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">เลือกแหล่งเรียนรู้</h2>
          <p className="text-sm text-slate-500">คุณต้องการเรียนจากแหล่งข้อมูลไหน?</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lesson.resources.map(r => {
            const yId = r.type === 'youtube' ? getYoutubeId(r.url) : null;
            const sel = selectedSourceId === r.id;
            return (
              <button key={r.id} onClick={() => setSelectedSourceId(r.id)} className={`text-left card-compact p-0 overflow-hidden transition-all duration-200 relative ${sel ? 'ring-2 ring-blue-600 ring-offset-2 shadow-lg' : 'hover:shadow-md'}`}>
                {yId ? <img src={`https://img.youtube.com/vi/${yId}/hqdefault.jpg`} className="w-full h-28 object-cover" alt="" /> : <div className="w-full h-28 bg-slate-50 flex items-center justify-center">{r.type === 'document' ? <FileText className="w-8 h-8 text-slate-300" /> : <LinkIcon className="w-8 h-8 text-slate-300" />}</div>}
                <div className="p-3">
                  <p className="text-sm font-semibold text-slate-900 truncate">{r.title}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{r.url}</p>
                </div>
                {sel && <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-0.5"><CheckCircle className="w-4 h-4" /></div>}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button onClick={() => setStep('idle')} className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors">ยกเลิก</button>
          <button disabled={!selectedSourceId} onClick={confirmSource} className="bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:shadow-none">
            ยืนยัน เริ่มเรียน <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  /* ============= STEP: STUDYING (Deterministic Timer) ============= */
  const renderStudying = () => {
    const progress = lesson.durationHours > 0 ? Math.min((timerSeconds / (lesson.durationHours * 3600)) * 100, 100) : 0;
    const circumference = 2 * Math.PI * 90;
    const dashOffset = circumference - (progress / 100) * circumference;
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="card p-10 flex flex-col items-center text-center relative overflow-hidden shadow-md">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-white" />
          <div className="relative z-10 w-full">
            <div className="flex items-center justify-between mb-4">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                isSessionRunning ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {isSessionRunning ? '● กำลังบันทึกเวลา' : '⏸ พักชั่วคราว'}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Timestamp-verified
              </span>
            </div>

            <p className="text-sm font-bold text-slate-800 mb-6 truncate">{lesson.title}</p>

            {/* Circular Timer Ring */}
            <div className="relative w-52 h-52 mx-auto mb-8">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="90" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                <circle cx="100" cy="100" r="90" fill="none" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} className="transition-all duration-500" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-mono font-light text-slate-900 tracking-wider">{formatTime(timerSeconds)}</span>
                <span className="text-xs text-slate-400 mt-2">เป้าหมาย {lesson.durationHours} ชม.</span>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              {isSessionRunning ? (
                <button onClick={handleTogglePause} className="bg-amber-50 text-amber-700 hover:bg-amber-100 px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 border border-amber-200">
                  <Pause className="w-5 h-5" /> พัก
                </button>
              ) : (
                <button onClick={handleTogglePause} className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20">
                  <Play className="w-5 h-5" /> เรียนต่อ
                </button>
              )}
              <button onClick={finishStudying} className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2">
                <Square className="w-4 h-4" /> จบการเรียน
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ============= STEP: SUMMARY ============= */
  const renderSummary = () => (
    <div className="max-w-xl mx-auto">
      <div className="card p-10 text-center space-y-6 shadow-md">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-100">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">เก่งมาก! เรียนจบแล้ว</h2>
          <p className="text-slate-500 text-sm">ใช้เวลาเรียนจริง {formatTime(timerSeconds)}</p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-5 text-left border border-slate-200/60">
          <label className="block text-xs font-bold text-slate-700 mb-2">สิ่งที่ยังไม่เข้าใจ (บันทึกด่วน)</label>
          <textarea 
            value={lesson.stillUnclearNotes || ''} 
            onChange={e => {
              updateField('stillUnclearNotes', e.target.value);
              updateLearningSessionDraft({ stillUnclearNotes: e.target.value });
            }} 
            placeholder="จดไว้ตรงนี้..." 
            className="w-full bg-white border border-slate-200 rounded-xl p-3 min-h-[80px] outline-none focus:border-blue-500 text-xs resize-none" 
          />
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <button onClick={() => setStep('quiz')} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 text-xs transition-all">ทำแบบทดสอบ (Quiz)</button>
          <button onClick={handleFinishLesson} className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-200 text-xs transition-all">ข้ามไปสมุดโน้ต</button>
        </div>
      </div>
    </div>
  );

  /* ============= STEP: QUIZ ============= */
  const renderQuiz = () => (
    <div className="max-w-xl mx-auto">
      <div className="card overflow-hidden shadow-md">
        <div className="bg-indigo-600 px-8 py-5 flex justify-between items-center text-white">
          <h2 className="font-bold text-base">แบบทดสอบประเมินตนเอง (Quiz)</h2>
          <span className="text-indigo-200 text-xs font-medium">ประเมินความเข้าใจ</span>
        </div>
        <div className="w-full h-1 bg-indigo-100"><div className="h-full bg-indigo-400 w-full" /></div>
        <div className="p-8">
          {quizScore === null ? (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-slate-900">ให้คะแนนความเข้าใจในบทเรียนนี้</h3>
              <div className="space-y-3">
                {[
                  { score: 100, label: 'เข้าใจแจ่มแจ้ง', desc: 'สามารถนำไปประยุกต์และอธิบายต่อได้', color: 'hover:border-emerald-400 hover:bg-emerald-50/50' },
                  { score: 70, label: 'พอเข้าใจหลักการ', desc: 'เข้าใจทฤษฎีหลัก แต่ยังต้องฝึกทำโจทย์เพิ่ม', color: 'hover:border-amber-400 hover:bg-amber-50/50' },
                  { score: 40, label: 'ยังไม่ค่อยเข้าใจ', desc: 'เนื้อหายาก ต้องกลับมาอ่านทบทวนซ้ำ', color: 'hover:border-rose-400 hover:bg-rose-50/50' }
                ].map(opt => (
                  <button 
                    key={opt.score} 
                    onClick={() => {
                      setQuizScore(opt.score);
                      if (!activeLearningSession || activeLearningSession.lessonId !== lesson.id) {
                        recordQuizAttempt(lesson.id, opt.score);
                      }
                    }} 
                    className={`w-full text-left p-4 border-2 border-slate-200 rounded-xl transition-all duration-200 ${opt.color}`}
                  >
                    <p className="font-bold text-xs text-slate-900">{opt.label} ({opt.score}%)</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-5 py-4">
              <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center border-4 border-indigo-100 bg-indigo-50">
                <span className="text-2xl font-bold text-indigo-600">{quizScore}%</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">บันทึกผลสำเร็จ</h3>
                <p className="text-xs text-slate-500 mt-1">คะแนนถูกบันทึกลงใน Learning Record ของบทเรียนนี้แล้ว</p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                <button 
                  onClick={() => setQuizScore(null)} 
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  ทำใหม่อีกครั้ง
                </button>
                <button 
                  onClick={() => {
                    if (activeLearningSession && activeLearningSession.lessonId === lesson.id) {
                      handleFinishLesson();
                    } else {
                      setStep('notebook');
                    }
                  }} 
                  className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20 text-xs transition-all"
                >
                  เสร็จสิ้น / กลับสู่สมุดโน้ต
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /* ============= STEP: NOTEBOOK ============= */
  const renderNotebook = () => (
    <div className="space-y-6">
      {/* Lesson Info Header */}
      <div className="card p-0 overflow-hidden shadow-xs">
        {lesson.status === 'COMPLETED' && <div className="h-1 bg-emerald-500" />}
        <div className="p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex-1">
              <input 
                type="text" 
                value={lesson.title} 
                onChange={e => updateField('title', e.target.value)} 
                className="w-full text-2xl font-bold text-slate-900 bg-transparent border-none outline-none p-0 focus:ring-0" 
                placeholder="ชื่อบทเรียน..." 
              />
              <p className="text-xs text-slate-500 mt-2">{subject.name} &middot; เดือนที่ {lesson.month} สัปดาห์ที่ {lesson.week}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleStartFlow}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Play className="w-3.5 h-3.5" /> เริ่มเรียนเซสชัน
              </button>
              <select 
                value={lesson.status} 
                onChange={e => updateField('status', e.target.value)} 
                className={`px-4 py-2 rounded-xl text-xs font-bold border-0 cursor-pointer ${
                  lesson.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 
                  lesson.status === 'IN PROGRESS' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <option value="NOT STARTED">ยังไม่เริ่ม</option>
                <option value="IN PROGRESS">กำลังเรียน</option>
                <option value="COMPLETED">เรียนจบแล้ว</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[11px] text-slate-500 mb-0.5">เวลาประเมิน</p>
              <p className="text-base font-bold text-slate-900">{lesson.durationHours} ชม.</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[11px] text-slate-500 mb-0.5">ความยาก</p>
              <p className="text-base font-bold text-slate-900">{lesson.difficulty === 'Easy' ? 'ง่าย' : lesson.difficulty === 'Medium' ? 'กลาง' : 'ยาก'}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-[11px] text-blue-600 mb-0.5">เรียนไปแล้ว</p>
              <p className="text-base font-bold text-blue-700">{learningRecord?.studyCount || 0} ครั้ง ({learningRecord?.totalStudyMinutes || 0} นาที)</p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-3">
              <p className="text-[11px] text-indigo-600 mb-0.5">คะแนน Quiz สูงสุด</p>
              <p className="text-base font-bold text-indigo-700">{learningRecord?.quizBestScore !== undefined ? `${learningRecord.quizBestScore}%` : '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveNotebookTab('notebook')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative ${
            activeNotebookTab === 'notebook'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          📝 สมุดบันทึก & Learning Record
        </button>
        <button
          onClick={() => setActiveNotebookTab('timeline')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeNotebookTab === 'timeline'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5" /> ไทม์ไลน์การเรียนรู้ ({timelineEvents.length})
        </button>
      </div>

      {activeNotebookTab === 'notebook' ? (
        <div className="space-y-6">
          {/* Learning Memory Summary Card */}
          <div className="card p-6 bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Learning Record & Memory</h3>
                  <p className="text-[11px] text-slate-500">บันทึกความจำและความเชี่ยวชาญของบทเรียนนี้</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <CalendarCheck className="w-3.5 h-3.5" /> บันทึกการทบทวน
                </button>
                <button
                  onClick={() => { setQuizScore(null); setStep('quiz'); }}
                  className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Award className="w-3.5 h-3.5" /> ทำ Quiz
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Mastery Level */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">ระดับความเชี่ยวชาญ (Mastery)</span>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${
                    learningRecord?.mastery === 'Mastered' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                    learningRecord?.mastery === 'Proficient' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    learningRecord?.mastery === 'Familiar' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {learningRecord?.mastery === 'Mastered' && <Award className="w-3.5 h-3.5 text-amber-500" />}
                    {learningRecord?.mastery}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  {learningRecord?.mastery === 'Mastered' ? 'ยอดเยี่ยม! ผ่าน Quiz ≥ 90%, สรุปความรู้แล้ว, และทบทวนแล้ว' :
                   learningRecord?.mastery === 'Proficient' ? 'ระดับดี: เรียนจบและทำ Quiz ≥ 70%' :
                   learningRecord?.mastery === 'Familiar' ? 'ระดับคุ้นเคย: มีการเรียนหรือฝึกทำข้อสอบ' :
                   'ระดับเริ่มต้น: ยังไม่เริ่มหรือยังไม่ผ่านการทดสอบ'}
                </p>
              </div>

              {/* Confidence Selector */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">ความมั่นใจ (Confidence)</span>
                <div className="flex items-center gap-2">
                  {(['Low', 'Medium', 'High'] as ConfidenceLevel[]).map((level) => {
                    const active = (learningRecord?.confidence || 'Low') === level;
                    return (
                      <button
                        key={level}
                        onClick={() => {
                          setLessonConfidence(lesson.id, level);
                          updateField('confidence', level);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                          active
                            ? level === 'High' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : level === 'Medium' ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                            : 'bg-rose-500 text-white border-rose-500 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {level === 'High' ? 'มั่นใจมาก' : level === 'Medium' ? 'ปานกลาง' : 'ยังไม่มั่นใจ'}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400">ประเมินความรู้สึกของตนเองต่อบทเรียนนี้</p>
              </div>

              {/* Spaced Repetition Due */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Spaced Repetition</span>
                <div className="text-xs font-semibold text-slate-800">
                  {learningRecord?.nextReviewAt ? (
                    <div className="space-y-1">
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        ทบทวนรอบถัดไป: <span className="font-bold text-slate-900">{format(parseISO(learningRecord.nextReviewAt), 'dd/MM/yyyy', { locale: th })}</span>
                      </p>
                      {isPast(parseISO(learningRecord.nextReviewAt)) ? (
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 animate-pulse">
                          🔔 ถึงกำหนดทบทวนแล้ว
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          อีก {Math.max(1, differenceInDays(parseISO(learningRecord.nextReviewAt), new Date()))} วัน
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-400">ยังไม่มีรอบการทบทวน</p>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">ทบทวนแล้ว: {learningRecord?.reviewCount || 0} ครั้ง</p>
              </div>
            </div>
          </div>

          {/* Notebook Notes Sections */}
          <div className="grid grid-cols-1 gap-5">
            <div className="card p-6 lg:p-8 border-l-4 border-l-blue-500 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" /> สิ่งที่ฉันเรียนรู้จากบทนี้ (What I learned)
              </h3>
              <textarea 
                value={lesson.learnedNotes || ''} 
                onChange={e => updateField('learnedNotes', e.target.value)} 
                placeholder="จดสรุปเนื้อหา หรือ concept สำคัญที่เข้าใจแล้ว..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 min-h-[120px] outline-none focus:border-blue-500 text-slate-800 resize-y text-xs leading-relaxed" 
              />
            </div>
            <div className="card p-6 lg:p-8 border-l-4 border-l-rose-500 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" /> สิ่งที่ยังไม่เข้าใจ (What I don't understand)
              </h3>
              <textarea 
                value={lesson.stillUnclearNotes || ''} 
                onChange={e => updateField('stillUnclearNotes', e.target.value)} 
                placeholder="มีจุดไหนที่ยังงงอยู่บ้าง?..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 min-h-[100px] outline-none focus:border-rose-500 text-slate-800 resize-y text-xs leading-relaxed" 
              />
            </div>
            <div className="card p-6 lg:p-8 border-l-4 border-l-amber-500 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600" /> ต้องกลับมาทบทวนอะไร? (What to review)
              </h3>
              <textarea 
                value={lesson.reviewNotes || ''} 
                onChange={e => updateField('reviewNotes', e.target.value)} 
                placeholder="เช่น กลับไปดูสูตรหน้า 24, ฝึกเขียน loop เพิ่ม..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 min-h-[100px] outline-none focus:border-amber-500 text-slate-800 resize-y text-xs leading-relaxed" 
              />
            </div>
          </div>

          {/* Resources & Images */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card p-6 shadow-xs">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-900">แหล่งเรียนรู้</h3>
                <button onClick={handleAddResource} className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg transition-colors"><Plus className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2">
                {lesson.resources.length === 0 && <p className="text-slate-400 text-xs py-4 text-center">ยังไม่มีแหล่งเรียนรู้</p>}
                {lesson.resources.map(r => {
                  const yId = r.type === 'youtube' ? getYoutubeId(r.url) : null;
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl group hover:bg-slate-100 transition-colors">
                      {yId ? <img src={`https://img.youtube.com/vi/${yId}/mqdefault.jpg`} className="w-14 h-10 object-cover rounded-lg flex-shrink-0" alt="" /> : <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-xs">{r.type === 'document' ? <FileText className="w-4 h-4 text-slate-400" /> : <LinkIcon className="w-4 h-4 text-slate-400" />}</div>}
                      <div className="flex-1 min-w-0"><a href={r.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-slate-900 hover:text-blue-600 truncate block">{r.title}</a><p className="text-[10px] text-slate-400 truncate">{r.url}</p></div>
                      <button onClick={() => handleRemoveResource(r.id)} className="text-slate-300 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="card p-6 shadow-xs">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-900">รูปภาพประกอบ</h3>
                <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"><Plus className="w-4 h-4" /><input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} /></label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {lesson.images.length === 0 && <p className="text-slate-400 text-xs py-4 text-center col-span-3">ยังไม่มีรูปภาพ</p>}
                {lesson.images.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-50 border border-slate-200/60">
                    <img src={img} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><button onClick={() => removeImage(idx)} className="bg-rose-500 text-white p-1.5 rounded-full"><Trash2 className="w-3 h-3" /></button></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Timeline View */
        <div className="card p-6 lg:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" /> ไทม์ไลน์เหตุการณ์การเรียนรู้ (Learning Timeline)
              </h3>
              <p className="text-xs text-slate-500 mt-1">ประวัติการเรียนรู้จริงตามลำดับเวลาของบทเรียนนี้</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
              เรียนมาแล้ว {learningRecord?.studyCount || 0} ครั้ง
            </span>
          </div>

          {timelineEvents.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">ยังไม่มีเหตุการณ์การเรียนรู้ในบทนี้</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">กดปุ่มเริ่มเรียนเพื่อสร้างประวัติเซสชันแรกของคุณ</p>
              <button
                onClick={handleStartFlow}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                เริ่มเรียนตอนนี้
              </button>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 pl-6 py-2">
              {timelineEvents.map((evt) => (
                <div key={evt.id} className="relative group">
                  <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                    evt.type === 'session' ? 'bg-emerald-500 ring-4 ring-emerald-50' :
                    evt.type === 'quiz' ? 'bg-indigo-500 ring-4 ring-indigo-50' :
                    evt.type === 'review' ? 'bg-purple-500 ring-4 ring-purple-50' :
                    evt.type === 'unclear' ? 'bg-rose-500 ring-4 ring-rose-50' :
                    'bg-blue-500 ring-4 ring-blue-50'
                  }`} />
                  <div className="card-compact p-4 bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:shadow-xs transition-all space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">{evt.title}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${evt.badgeColor}`}>
                        {evt.badge}
                      </span>
                    </div>
                    {evt.description && (
                      <p className="text-xs text-slate-600 leading-relaxed">{evt.description}</p>
                    )}
                    <span className="text-[10px] text-slate-400 block pt-1">
                      {format(parseISO(evt.date), 'dd MMMM yyyy HH:mm น.', { locale: th })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 bg-white px-3.5 py-1.5 rounded-xl shadow-xs border border-slate-200/60 text-xs font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
        </button>
        <button onClick={handleDelete} className="text-slate-400 hover:text-rose-600 p-2 transition-colors" title="ลบบทเรียน">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Abandoned Session Confirmation Modal */}
      {showAbandonedModal && activeLearningSession && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">ตรวจพบเซสชันการเรียนที่เปิดค้างไว้</h3>
                <p className="text-xs text-slate-500">เซสชันนี้เปิดค้างไว้นานกว่า 2 ชั่วโมง</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              ระบบจะไม่ตัดสินเองว่าคุณเรียนครบตามเวลาที่เปิดค้างไว้ คุณเรียน session นี้จบแล้วหรือไม่?
            </p>
            <div className="space-y-2 pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หากเรียนจบแล้ว ระบุเวลาเรียนจริง (นาที):
                </label>
                <input
                  type="number"
                  value={confirmedMinutesInput}
                  onChange={(e) => setConfirmedMinutesInput(Math.max(1, Number(e.target.value)))}
                  className="w-full text-xs font-bold border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500"
                  min={1}
                />
              </div>
              <button
                onClick={() => {
                  recoverLearningSession(confirmedMinutesInput);
                  setShowAbandonedModal(false);
                  setStep('notebook');
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                ✓ ยืนยันว่าเรียนจบแล้ว (บันทึกเวลาจริง)
              </button>
              <button
                onClick={() => {
                  recoverLearningSession(); // continue learning
                  setShowAbandonedModal(false);
                  setStep('studying');
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                ▶ เรียนต่อจากเดิม
              </button>
              <button
                onClick={() => {
                  abandonLearningSession();
                  setShowAbandonedModal(false);
                  setStep('idle');
                }}
                className="w-full py-2 text-slate-500 hover:text-rose-600 text-xs font-semibold transition-colors"
              >
                ✕ ยกเลิกเซสชันที่ค้าง (Discard)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spaced Repetition Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">บันทึกการทบทวน (Spaced Repetition)</h3>
                  <p className="text-xs text-slate-500">รอบที่ {(learningRecord?.reviewCount || 0) + 1}</p>
                </div>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600 text-sm p-1">✕</button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              การทบทวนความรู้อย่างสม่ำเสมอจะช่วยส่งต่อเนื้อหาเข้าสู่ Long-term Memory ระบบจะคำนวณวันทบทวนรอบถัดไปโดยอัตโนมัติ (3 วัน &rarr; 7 วัน &rarr; 14 วัน)
            </p>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                บันทึกการทบทวน (Optional notes):
              </label>
              <textarea
                value={reviewNoteInput}
                onChange={(e) => setReviewNoteInput(e.target.value)}
                placeholder="เช่น ทำโจทย์เพิ่ม 2 ข้อ, ทบทวนสูตร, หรือข้อสังเกตสำคัญ..."
                className="w-full text-xs border border-slate-200 rounded-xl p-3 min-h-[80px] outline-none focus:border-purple-500 resize-none text-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  recordLessonReview(lesson.id, reviewNoteInput.trim() || undefined);
                  setReviewNoteInput('');
                  setShowReviewModal(false);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> บันทึกการทบทวน
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'idle' && renderIdle()}
      {step === 'source_selection' && renderSourceSelection()}
      {step === 'studying' && renderStudying()}
      {step === 'summary' && renderSummary()}
      {step === 'quiz' && renderQuiz()}
      {step === 'notebook' && renderNotebook()}
    </div>
  );
}
