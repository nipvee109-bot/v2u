import { useState, useMemo } from 'react';
import {
  BookOpen,
  RotateCcw,
  PenLine,
  Play,
  FileText,
  Clock,
  ChevronRight,
  Check,
  Sparkles,
  Zap,
  X,
  ClipboardCheck,
  ArrowLeft,
  Timer,
  GraduationCap,
} from 'lucide-react';
import type { Lesson, SubjectId, StudySession, LearningSession, ReviewItem, Resource } from '../../types';
import { SUBJECTS } from '../../types';
import {
  generateSmartStudyPlan,
  getLearningTypes,
  type StudyPlanItem,
  type LearningType,
} from '../../utils/studyPlannerEngine';
import { format } from 'date-fns';

type ChoiceMode = 'initial' | 'manual' | 'auto';
type ManualStep = 'subject' | 'lesson' | 'type' | 'duration' | 'preview';

const DURATION_PRESETS = [
  { value: 30, label: '30 นาที' },
  { value: 60, label: '1 ชั่วโมง' },
  { value: 90, label: '1.5 ชั่วโมง' },
  { value: 120, label: '2 ชั่วโมง' },
  { value: 180, label: '3 ชั่วโมง' },
];

const subjectColorMap: Record<SubjectId, { bg: string; border: string; text: string; icon: string }> = {
  math: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'bg-blue-500' },
  programming: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'bg-emerald-500' },
  physics: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: 'bg-orange-500' },
  tgat3: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'bg-purple-500' },
  ai: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: 'bg-rose-500' },
  web: { bg: 'bg-web-soft', border: 'border-web/30', text: 'text-web', icon: 'bg-web' },
};

const learningTypeIcons: Record<LearningType, typeof BookOpen> = {
  learn: BookOpen,
  review: RotateCcw,
  practice: PenLine,
  quiz: ClipboardCheck,
  watch: Play,
  read: FileText,
};

interface DailyLearningChoiceProps {
  lessons: Lesson[];
  sessions: StudySession[];
  learningSessionsHistory: LearningSession[];
  reviewQueue: ReviewItem[];
  onStartLesson: (lessonId: string, resource?: Resource) => void;
}

export function DailyLearningChoice({
  lessons,
  sessions,
  learningSessionsHistory,
  reviewQueue,
  onStartLesson,
}: DailyLearningChoiceProps) {
  const [mode, setMode] = useState<ChoiceMode>('initial');

  // Manual mode state
  const [manualStep, setManualStep] = useState<ManualStep>('subject');
  const [selectedSubject, setSelectedSubject] = useState<SubjectId | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<LearningType>('learn');
  const [selectedDuration, setSelectedDuration] = useState<number>(60);

  // Auto mode state
  const [autoMinutes, setAutoMinutes] = useState<number | null>(null);
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [generatedPlan, setGeneratedPlan] = useState<StudyPlanItem[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Derived data
  const subjectLessons = useMemo(() => {
    if (!selectedSubject) return [];
    return lessons
      .filter((l) => l.subjectId === selectedSubject)
      .sort((a, b) => {
        // Not started first, then in progress, then completed
        const order = { 'NOT STARTED': 0, 'IN PROGRESS': 1, 'COMPLETED': 2 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      });
  }, [lessons, selectedSubject]);

  const selectedLesson = useMemo(() => {
    return lessons.find((l) => l.id === selectedLessonId) || null;
  }, [lessons, selectedLessonId]);

  const learningTypes = getLearningTypes();

  // Reset to initial
  const handleReset = () => {
    setMode('initial');
    setManualStep('subject');
    setSelectedSubject(null);
    setSelectedLessonId(null);
    setSelectedType('learn');
    setSelectedDuration(60);
    setAutoMinutes(null);
    setCustomMinutes('');
    setGeneratedPlan(null);
    setIsGenerating(false);
  };

  // Manual: go back one step
  const handleManualBack = () => {
    const steps: ManualStep[] = ['subject', 'lesson', 'type', 'duration', 'preview'];
    const idx = steps.indexOf(manualStep);
    if (idx <= 0) {
      handleReset();
    } else {
      setManualStep(steps[idx - 1]);
    }
  };

  // Auto: generate plan
  const handleGeneratePlan = (minutes: number) => {
    setAutoMinutes(minutes);
    setIsGenerating(true);
    // Small delay for perceived intelligence
    setTimeout(() => {
      const plan = generateSmartStudyPlan({
        availableMinutes: minutes,
        lessons,
        sessions,
        learningSessionsHistory,
        reviewQueue,
        todayStr,
      });
      setGeneratedPlan(plan);
      setIsGenerating(false);
    }, 400);
  };

  // ═══════════ RENDER ═══════════

  // Initial state: the big question
  if (mode === 'initial') {
    return (
      <div className="card p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-5 sm:px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">วันนี้อยากเรียนอะไร?</h2>
              <p className="text-xs text-white/70">เลือกวิธีเริ่มต้นเรียนรู้วันนี้</p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <button
            onClick={() => setMode('manual')}
            className="group flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm sm:text-base">เลือกสิ่งที่อยากเรียน</p>
              <p className="text-xs text-slate-500 mt-0.5">Choose What to Learn &middot; เลือกวิชาและบทเรียนด้วยตนเอง</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 ml-auto shrink-0 group-hover:text-blue-500" />
          </button>

          <button
            onClick={() => setMode('auto')}
            className="group flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 transition-all text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm sm:text-base">ให้ V2U วางแผนให้</p>
              <p className="text-xs text-slate-500 mt-0.5">Let V2U Plan It &middot; จัดตารางอัตโนมัติตามเวลาที่คุณมี</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 ml-auto shrink-0 group-hover:text-purple-500" />
          </button>
        </div>
      </div>
    );
  }

  // ═══════════ MANUAL MODE ═══════════
  if (mode === 'manual') {
    return (
      <div className="card p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/50">
          <button onClick={handleManualBack} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            ย้อนกลับ
          </button>
          <div className="flex items-center gap-1.5">
            {(['subject', 'lesson', 'type', 'duration', 'preview'] as ManualStep[]).map((s, i) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i <= ['subject', 'lesson', 'type', 'duration', 'preview'].indexOf(manualStep)
                    ? 'bg-blue-600'
                    : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <button onClick={handleReset} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {/* Step 1: Subject */}
          {manualStep === 'subject' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">เลือกวิชาที่อยากเรียน</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {(Object.keys(SUBJECTS) as SubjectId[]).map((subjectId) => {
                  const colors = subjectColorMap[subjectId];
                  const lessonCount = lessons.filter((l) => l.subjectId === subjectId && l.status !== 'COMPLETED').length;
                  return (
                    <button
                      key={subjectId}
                      onClick={() => {
                        setSelectedSubject(subjectId);
                        setManualStep('lesson');
                      }}
                      className={`p-3.5 rounded-xl border-2 text-left transition-all hover:shadow-md ${colors.bg} ${colors.border}`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${colors.icon} text-white flex items-center justify-center mb-2`}>
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <p className={`text-sm font-bold ${colors.text}`}>{SUBJECTS[subjectId].name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{lessonCount} บทที่ยังไม่จบ</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Lesson */}
          {manualStep === 'lesson' && selectedSubject && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                เลือกบทเรียน — {SUBJECTS[selectedSubject].name}
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {subjectLessons.map((lesson) => {
                  const statusBadge = lesson.status === 'COMPLETED'
                    ? { label: 'เรียนจบแล้ว', cls: 'bg-emerald-100 text-emerald-700' }
                    : lesson.status === 'IN PROGRESS'
                    ? { label: 'กำลังเรียน', cls: 'bg-amber-100 text-amber-700' }
                    : { label: 'ยังไม่เริ่ม', cls: 'bg-slate-100 text-slate-600' };
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => {
                        setSelectedLessonId(lesson.id);
                        setManualStep('type');
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{lesson.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          เดือน {lesson.month} · {lesson.difficulty} · {lesson.durationHours} ชม.
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusBadge.cls}`}>
                        {statusBadge.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  );
                })}
                {subjectLessons.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-6">ยังไม่มีบทเรียนในวิชานี้</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Learning Type */}
          {manualStep === 'type' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">เลือกรูปแบบการเรียน</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {learningTypes.map((lt) => {
                  const Icon = learningTypeIcons[lt.value];
                  const isSelected = selectedType === lt.value;
                  return (
                    <button
                      key={lt.value}
                      onClick={() => {
                        setSelectedType(lt.value);
                        setManualStep('duration');
                      }}
                      className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                      <p className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                        {lt.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Duration */}
          {manualStep === 'duration' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">ตั้งเวลาเรียน</h3>
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => {
                      setSelectedDuration(p.value);
                      setManualStep('preview');
                    }}
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                      selectedDuration === p.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-700 hover:border-blue-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Preview & Start */}
          {manualStep === 'preview' && selectedLesson && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">สรุปก่อนเริ่มเรียน</h3>
              <div className={`rounded-2xl border-2 p-4 ${subjectColorMap[selectedLesson.subjectId].bg} ${subjectColorMap[selectedLesson.subjectId].border}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${subjectColorMap[selectedLesson.subjectId].icon} text-white flex items-center justify-center shrink-0`}>
                    {(() => { const Icon = learningTypeIcons[selectedType]; return <Icon className="w-5 h-5" />; })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-slate-900">{selectedLesson.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {SUBJECTS[selectedLesson.subjectId].name} · {learningTypes.find((t) => t.value === selectedType)?.label}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <Timer className="w-3.5 h-3.5" /> {selectedDuration} นาที
                      </span>
                      {selectedLesson.resources.length > 0 && (
                        <span className="text-xs text-slate-500">
                          {selectedLesson.resources.length} แหล่งเรียน
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onStartLesson(selectedLesson.id, selectedLesson.resources[0])}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all text-sm"
              >
                <Zap className="w-5 h-5" />
                เริ่มเรียน
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════ AUTO MODE ═══════════
  if (mode === 'auto') {
    return (
      <div className="card p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-100 bg-purple-50/30">
          <button onClick={handleReset} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            ย้อนกลับ
          </button>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700">
            <Sparkles className="w-3.5 h-3.5" />
            ระบบจัดแผนให้อัตโนมัติ
          </span>
          <button onClick={handleReset} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Time selection */}
          {!generatedPlan && !isGenerating && (
            <>
              <h3 className="text-sm font-bold text-slate-900">วันนี้มีเวลาเท่าไร?</h3>
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => handleGeneratePlan(p.value)}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-slate-200 text-slate-700 hover:border-purple-400 hover:bg-purple-50 transition-all"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  placeholder="กำหนดเอง (นาที)"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none"
                  min="15"
                  max="480"
                />
                <button
                  onClick={() => {
                    const mins = parseInt(customMinutes, 10);
                    if (mins >= 15) handleGeneratePlan(mins);
                  }}
                  disabled={!customMinutes || parseInt(customMinutes, 10) < 15}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  สร้างแผน
                </button>
              </div>
            </>
          )}

          {/* Loading */}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-10 h-10 animate-spin rounded-full border-3 border-purple-600 border-t-transparent" />
              <p className="text-sm font-semibold text-slate-600">กำลังวิเคราะห์และจัดแผนการเรียน...</p>
            </div>
          )}

          {/* Generated plan */}
          {generatedPlan && !isGenerating && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  แผนการเรียนวันนี้ ({autoMinutes} นาที)
                </h3>
                <button
                  onClick={() => {
                    setGeneratedPlan(null);
                    setAutoMinutes(null);
                  }}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-700"
                >
                  เลือกเวลาใหม่
                </button>
              </div>

              {generatedPlan.length === 0 ? (
                <div className="text-center py-8">
                  <Check className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">ไม่มีรายการที่แนะนำ</p>
                  <p className="text-xs text-slate-500 mt-1">คุณอาจเรียนจบครบทุกบทแล้ว หรือลองเพิ่มเวลา</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {generatedPlan.map((item, idx) => {
                    const colors = subjectColorMap[item.subjectId];
                    const Icon = learningTypeIcons[item.learningType];
                    return (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border ${colors.border} ${colors.bg} transition-all`}
                      >
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 shrink-0">
                          {idx + 1}
                        </div>
                        <div className={`w-9 h-9 rounded-lg ${colors.icon} text-white flex items-center justify-center shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{item.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-slate-600">{SUBJECTS[item.subjectId].name}</span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                              <Clock className="w-3 h-3" /> {item.durationMinutes} นาที
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 italic">{item.reason}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {generatedPlan.length > 0 && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      // Start the first lesson in the plan
                      const firstItem = generatedPlan[0];
                      if (firstItem) {
                        onStartLesson(firstItem.lessonId, firstItem.resource);
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-600/25 transition-all text-sm"
                  >
                    <Zap className="w-5 h-5" />
                    ใช้แผนนี้ · เริ่มเรียน
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedPlan(null);
                      setAutoMinutes(null);
                    }}
                    className="px-4 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm"
                  >
                    แก้ไข
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}
