import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Target,
  BookOpen,
  Clock,
  Calendar,
  CheckCircle2,
  PlayCircle,
  Check,
} from 'lucide-react';
import type { SubjectId, OnboardingPreferences, Lesson } from '../../types';
import { SUBJECTS } from '../../types';
import { generateFirstWeekPlan } from '../../utils/onboardingUtils';
import { useStore } from '../../store/useStore';

interface StudyOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessons: Lesson[];
}

const PRESET_GOALS = [
  'สอบติดวิศวกรรมคอมพิวเตอร์ / Data & AI',
  'สอบติดคณะวิศวกรรมศาสตร์ มหาวิทยาลัยชั้นนำ (จุฬาฯ / ลาดกระบัง / เกษตรฯ)',
  'ปูพื้นฐานคณิตศาสตร์และเขียนโปรแกรมสำหรับวิศวะให้แม่นยำ',
  'ทำคะแนน TGAT 3 และ TPAT 3 ให้ได้เกิน 75%',
];

const ALL_SUBJECT_IDS: SubjectId[] = ['math', 'programming', 'physics', 'tgat3', 'ai'];

const DAY_OPTIONS = [
  { id: 1, label: 'จันทร์', short: 'จ.' },
  { id: 2, label: 'อังคาร', short: 'อ.' },
  { id: 3, label: 'พุธ', short: 'พ.' },
  { id: 4, label: 'พฤหัสบดี', short: 'พฤ.' },
  { id: 5, label: 'ศุกร์', short: 'ศ.' },
  { id: 6, label: 'เสาร์', short: 'ส.' },
  { id: 0, label: 'อาทิตย์', short: 'อา.' },
];

export const StudyOnboardingModal: React.FC<StudyOnboardingModalProps> = ({
  isOpen,
  onClose,
  lessons,
}) => {
  const navigate = useNavigate();
  const { completeOnboarding, skipOnboarding, startLearningSession } = useStore();

  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [mainGoalTitle, setMainGoalTitle] = useState<string>(PRESET_GOALS[0]);
  const [customGoalText, setCustomGoalText] = useState<string>('');
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectId[]>([
    'math',
    'programming',
    'physics',
    'tgat3',
  ]);
  const [weeklyTargetHours, setWeeklyTargetHours] = useState<number>(12);
  const [preferredDays, setPreferredDays] = useState<number[]>([1, 3, 5, 6]); // Mon, Wed, Fri, Sat
  const [preferredTimeSlot, setPreferredTimeSlot] = useState<
    'morning' | 'afternoon' | 'evening'
  >('evening');

  // Generate First Week Plan dynamically for Step 5 & 6
  const activePreferences: OnboardingPreferences = useMemo(() => {
    return {
      mainGoalTitle: customGoalText.trim() ? customGoalText.trim() : mainGoalTitle,
      selectedSubjects,
      weeklyTargetHours,
      preferredDays,
      preferredTimeSlot,
    };
  }, [mainGoalTitle, customGoalText, selectedSubjects, weeklyTargetHours, preferredDays, preferredTimeSlot]);

  const generatedFirstWeekSessions = useMemo(() => {
    return generateFirstWeekPlan({
      preferences: activePreferences,
      lessons,
    });
  }, [activePreferences, lessons]);

  const firstSession = generatedFirstWeekSessions[0] || null;

  if (!isOpen) return null;

  // Handlers
  const handleToggleSubject = (subjectId: SubjectId) => {
    if (selectedSubjects.includes(subjectId)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter((s) => s !== subjectId));
      }
    } else {
      setSelectedSubjects([...selectedSubjects, subjectId]);
    }
  };

  const handleToggleDay = (dayId: number) => {
    if (preferredDays.includes(dayId)) {
      if (preferredDays.length > 1) {
        setPreferredDays(preferredDays.filter((d) => d !== dayId));
      }
    } else {
      setPreferredDays([...preferredDays, dayId]);
    }
  };

  const handleSkip = () => {
    skipOnboarding();
    onClose();
  };

  const handleSaveAndStartLesson = () => {
    const { firstLessonId } = completeOnboarding(activePreferences);
    onClose();
    if (firstLessonId) {
      startLearningSession({ lessonId: firstLessonId });
      navigate(`/lessons/${firstLessonId}?action=study`);
    } else {
      navigate('/');
    }
  };

  const handleSaveAndGoHome = () => {
    completeOnboarding(activePreferences);
    onClose();
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header & Progress */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-blue-600/30">
              {currentStep}/6
            </div>
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Study Onboarding &middot; ขั้นตอนที่ {currentStep}
              </p>
              <h2 className="text-sm font-bold text-slate-800">
                {currentStep === 1 && 'เป้าหมายหลัก 6 เดือน'}
                {currentStep === 2 && 'วิชาที่ต้องการโฟกัส'}
                {currentStep === 3 && 'เวลาเรียนต่อสัปดาห์'}
                {currentStep === 4 && 'วันที่สะดวกเรียน'}
                {currentStep === 5 && 'ตารางเรียนสัปดาห์แรก'}
                {currentStep === 6 && 'เริ่มเรียนคาบแรกของคุณ'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSkip}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              ข้ามไปก่อน (Skip)
            </button>
            <button
              onClick={handleSkip}
              className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Progress Line */}
        <div className="h-1 bg-slate-100 w-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${(currentStep / 6) * 100}%` }}
          />
        </div>

        {/* Step Content (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* ═══════════ STEP 1: GOAL ═══════════ */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 mb-2">
                  <Target className="w-3.5 h-3.5" />
                  <span>Step 1: กำหนดเป้าหมาย</span>
                </span>
                <h3 className="text-lg md:text-xl font-bold text-slate-900">
                  อะไรคือเป้าหมายหลักของคุณใน 6 เดือนนี้?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ระบบจะใช้เป้าหมายนี้เป็นทิศทางหลักในการจัดสรร Roadmap และระบบติดตามความก้าวหน้า
                </p>
              </div>

              <div className="space-y-2.5">
                {PRESET_GOALS.map((preset) => {
                  const isSelected = mainGoalTitle === preset && !customGoalText.trim();
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setMainGoalTitle(preset);
                        setCustomGoalText('');
                      }}
                      className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-sm font-semibold text-slate-800">
                        {preset}
                      </span>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Goal Input */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  หรือระบุเป้าหมายเฉพาะของคุณเอง:
                </label>
                <input
                  type="text"
                  value={customGoalText}
                  onChange={(e) => setCustomGoalText(e.target.value)}
                  placeholder="เช่น สอบติดวิศวะการบิน / เตรียมแข่งโอลิมปิกวิชาการ"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* ═══════════ STEP 2: SUBJECTS ═══════════ */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 mb-2">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Step 2: เลือกวิชาที่ต้องเรียน</span>
                </span>
                <h3 className="text-lg md:text-xl font-bold text-slate-900">
                  เลือกวิชาที่คุณต้องการเน้นในหลักสูตร 6 เดือน
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  สามารถเลือกได้มากกว่า 1 วิชา (ระบบจะเกลี่ยบทเรียนตามสัดส่วนที่เหมาะสม)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_SUBJECT_IDS.map((subId) => {
                  const sub = SUBJECTS[subId];
                  const isSelected = selectedSubjects.includes(subId);

                  return (
                    <button
                      key={subId}
                      type="button"
                      onClick={() => handleToggleSubject(subId)}
                      className={`p-4 rounded-2xl border text-left flex items-start justify-between gap-3 transition-all ${
                        isSelected
                          ? 'bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {sub.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {subId === 'math' && 'แคลคูลัส พีชคณิต สมการ และเมทริกซ์'}
                          {subId === 'programming' && 'Python พื้นฐาน Data Structures & OOP'}
                          {subId === 'physics' && 'กลศาสตร์ แรง การเคลื่อนที่ & ไฟฟ้า'}
                          {subId === 'tgat3' && 'การคิดอย่างมีเหตุผลและสมรรถนะการทำงาน'}
                          {subId === 'ai' && 'Machine Learning, Neural Net & Final Project'}
                        </p>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══════════ STEP 3: WEEKLY HOURS ═══════════ */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100 mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Step 3: จำนวนชั่วโมงต่อสัปดาห์</span>
                </span>
                <h3 className="text-lg md:text-xl font-bold text-slate-900">
                  คุณต้องการใช้เวลาอ่านหนังสือ/เรียนกี่ชั่วโมงต่อสัปดาห์?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  เลือกระดับความเข้มข้นที่สอดคล้องกับตารางชีวิตของคุณ
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    hours: 8,
                    title: 'สบายๆ (Paced)',
                    subtitle: 'ประมาณ 1–1.5 ชม./วัน',
                    desc: 'เหมาะสำหรับคนที่มีการบ้านหรือกิจกรรมอื่นเยอะ',
                  },
                  {
                    hours: 12,
                    title: 'แนะนำ (Balanced)',
                    subtitle: 'ประมาณ 1.5–2 ชม./วัน',
                    desc: 'ความเข้มข้นมาตรฐานเพื่อพิชิตคะแนนสอบ',
                    badge: 'ยอดนิยม',
                  },
                  {
                    hours: 16,
                    title: 'เข้มข้น (Intensive)',
                    subtitle: 'ประมาณ 2–2.5 ชม./วัน',
                    desc: 'สำหรับผู้เตรียมสอบแข่งขันและมุ่งสู่ท็อป 3',
                  },
                ].map((item) => {
                  const isSelected = weeklyTargetHours === item.hours;
                  return (
                    <button
                      key={item.hours}
                      type="button"
                      onClick={() => setWeeklyTargetHours(item.hours)}
                      className={`relative p-5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      {item.badge && (
                        <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[10px]">
                          {item.badge}
                        </span>
                      )}
                      <div>
                        <div className="text-2xl font-extrabold text-slate-900">
                          {item.hours} <span className="text-xs font-normal text-slate-500">ชม./สัปดาห์</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 mt-1">
                          {item.title}
                        </h4>
                        <p className="text-[11px] font-semibold text-blue-600">
                          {item.subtitle}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          {item.desc}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400">เลือกระดับนี้</span>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Hours slider */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>หรือปรับจำนวนชั่วโมงเอง:</span>
                  <span className="text-blue-600 font-bold text-sm">
                    {weeklyTargetHours} ชั่วโมง/สัปดาห์
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="25"
                  step="1"
                  value={weeklyTargetHours}
                  onChange={(e) => setWeeklyTargetHours(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          )}

          {/* ═══════════ STEP 4: PREFERRED DAYS & TIME ═══════════ */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100 mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Step 4: วันและช่วงเวลาที่สะดวก</span>
                </span>
                <h3 className="text-lg md:text-xl font-bold text-slate-900">
                  คุณสะดวกเรียนวันไหนและช่วงเวลาใดบ้าง?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ระบบจะสร้างตารางเรียนลงปฏิทิน Planner ให้อัตโนมัติตามวันที่เลือก
                </p>
              </div>

              {/* Day selection */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  เลือกวันในสัปดาห์ (เลือกได้หลายวัน):
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {DAY_OPTIONS.map((d) => {
                    const isSelected = preferredDays.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleToggleDay(d.id)}
                        className={`py-3 px-2 rounded-2xl border text-center transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/25 font-bold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-medium'
                        }`}
                      >
                        <div className="text-xs">{d.short}</div>
                        <div className="text-[10px] opacity-80 mt-0.5">{d.label.replace('วัน', '')}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time slot selection */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  เลือกช่วงเวลาหลักที่สะดวกที่สุด:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { slot: 'morning', label: 'ช่วงเช้า', time: '09:00 - 11:00', icon: '🌅' },
                    { slot: 'afternoon', label: 'ช่วงบ่าย', time: '14:00 - 16:00', icon: '☀️' },
                    { slot: 'evening', label: 'ช่วงค่ำ (แนะนำ)', time: '19:30 - 21:30', icon: '🌙' },
                  ].map((t) => {
                    const isSelected = preferredTimeSlot === t.slot;
                    return (
                      <button
                        key={t.slot}
                        type="button"
                        onClick={() => setPreferredTimeSlot(t.slot as any)}
                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200/80 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-lg mb-1">{t.icon}</div>
                        <p className="text-xs font-bold text-slate-900">{t.label}</p>
                        <p className="text-[11px] text-slate-500 font-medium">{t.time}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ STEP 5: FIRST WEEK PLAN PREVIEW ═══════════ */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-100 mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Step 5: ตรวจสอบแผนสัปดาห์แรก</span>
                </span>
                <h3 className="text-lg md:text-xl font-bold text-slate-900">
                  ระบบคำนวณและสร้างตารางเรียนสัปดาห์แรกให้คุณแล้ว
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  กระจาย {weeklyTargetHours} ชั่วโมงลงใน {preferredDays.length} วันที่คุณเลือก พร้อมเชื่อมโยงกับบทเรียนของเดือนที่ 1
                </p>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {generatedFirstWeekSessions.map((session, idx) => {
                  const sub = SUBJECTS[session.subjectId];
                  return (
                    <div
                      key={session.id}
                      className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-white text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 shadow-2xs">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {session.dayLabel}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({session.date})
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-blue-100 text-blue-800">
                              {sub ? sub.name.split('/')[0] : session.subjectId}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">
                            {session.lessonTitle}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-slate-800">
                          {session.startTime} - {session.endTime}
                        </span>
                        <p className="text-[10px] text-slate-500">
                          {session.plannedMinutes} นาที
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══════════ STEP 6: FIRST STUDY SESSION ═══════════ */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 mb-2">
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>Step 6: พร้อมเริ่มเรียนคาบแรก</span>
                </span>
                <h3 className="text-lg md:text-xl font-bold text-slate-900">
                  ยินดีด้วยครับ! แผนการเรียน 6 เดือนของคุณพร้อมแล้ว
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  นี่คือบทเรียนแรกของคุณ เริ่มต้นก้าวแรกเพื่อสร้างความต่อเนื่องและเริ่มสะสม Streak วันนี้!
                </p>
              </div>

              {firstSession ? (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/20">
                      FIRST STUDY SESSION
                    </span>
                    <span className="text-xs text-slate-300">
                      {firstSession.dayLabel} &middot; {firstSession.startTime}
                    </span>
                  </div>

                  <h4 className="text-base md:text-lg font-bold text-white">
                    {firstSession.lessonTitle}
                  </h4>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 pt-1">
                    <span className="px-2.5 py-0.5 rounded-md bg-white/10 font-semibold text-blue-200">
                      {SUBJECTS[firstSession.subjectId]?.name || firstSession.subjectId}
                    </span>
                    <span>&middot;</span>
                    <span>ระยะเวลา: {firstSession.plannedMinutes} นาที</span>
                    <span>&middot;</span>
                    <span>เป้าหมาย 6 เดือน: {activePreferences.mainGoalTitle}</span>
                  </div>
                </div>
              ) : null}

              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center gap-3 text-xs text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  เมื่อกดเริ่มเรียน ระบบจะบันทึกเป้าหมาย 6 เดือน ตารางเรียน Planner และเปิดโหมดเรียนรู้จริงทันที
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 hover:bg-white text-xs font-bold text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ย้อนกลับ</span>
            </button>
          ) : (
            <button
              onClick={handleSkip}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-3 py-2 rounded-xl transition-colors"
            >
              ข้าม (Skip)
            </button>
          )}

          {currentStep < 6 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
            >
              <span>ขั้นตอนถัดไป</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveAndGoHome}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-white text-xs font-bold text-slate-700 transition-colors"
              >
                บันทึกและไปหน้าหลัก
              </button>
              <button
                onClick={handleSaveAndStartLesson}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
              >
                <PlayCircle className="w-4 h-4" />
                <span>เริ่มเรียนคาบแรกเลยทันที</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
