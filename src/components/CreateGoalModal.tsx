import { useState, useEffect } from 'react';
import { 
  X, 
  Target, 
  Clock, 
  BookOpen, 
  Award, 
  Brain, 
  CheckCircle2, 
  Sparkles, 
  Calendar
} from 'lucide-react';
import { SUBJECTS } from '../types';
import type { StudyGoal, GoalType, GoalScope, SubjectId } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  addMonths 
} from 'date-fns';

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: StudyGoal) => void;
  initialGoal?: StudyGoal | null;
}

export function CreateGoalModal({
  isOpen,
  onClose,
  onSave,
  initialGoal,
}: CreateGoalModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<GoalType>('study_hours');
  const [scope, setScope] = useState<GoalScope>('weekly');
  const [targetValue, setTargetValue] = useState<number>(10);
  const [unit, setUnit] = useState('ชม.');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [subjectId, setSubjectId] = useState<SubjectId | ''>('');
  const [customProgress, setCustomProgress] = useState<number>(0);

  // Set default dates on open
  useEffect(() => {
    if (initialGoal) {
      setTitle(initialGoal.title);
      setDescription(initialGoal.description || '');
      setType(initialGoal.type);
      setScope(initialGoal.scope);
      setTargetValue(initialGoal.targetValue);
      setUnit(initialGoal.unit);
      setStartDate(initialGoal.startDate.split('T')[0]);
      setTargetDate(initialGoal.targetDate.split('T')[0]);
      setSubjectId(initialGoal.subjectId || '');
      setCustomProgress(initialGoal.customProgress || initialGoal.currentValue || 0);
    } else {
      const now = new Date();
      setTitle('');
      setDescription('');
      setType('study_hours');
      setScope('weekly');
      setTargetValue(10);
      setUnit('ชม.');
      setStartDate(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      setTargetDate(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      setSubjectId('');
      setCustomProgress(0);
    }
  }, [initialGoal, isOpen]);

  // Close modal on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Preset Date handlers
  const handleApplyPreset = (targetScope: GoalScope) => {
    const now = new Date();
    setScope(targetScope);

    switch (targetScope) {
      case 'daily':
        setStartDate(format(now, 'yyyy-MM-dd'));
        setTargetDate(format(now, 'yyyy-MM-dd'));
        if (type === 'study_hours' && targetValue > 5) setTargetValue(2);
        break;
      case 'weekly':
        setStartDate(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        setTargetDate(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        if (type === 'study_hours') setTargetValue(10);
        break;
      case 'monthly':
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setTargetDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        if (type === 'study_hours') setTargetValue(40);
        break;
      case 'six_month':
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setTargetDate(format(endOfMonth(addMonths(now, 5)), 'yyyy-MM-dd'));
        if (type === 'study_hours') setTargetValue(200);
        break;
    }
  };

  const handleTypeChange = (newType: GoalType) => {
    setType(newType);
    switch (newType) {
      case 'study_hours':
        setUnit('ชม.');
        if (targetValue === 0 || targetValue > 1000) setTargetValue(10);
        break;
      case 'lessons_completed':
        setUnit('บท');
        setTargetValue(scope === 'daily' ? 1 : scope === 'weekly' ? 3 : scope === 'monthly' ? 8 : 23);
        break;
      case 'subject_milestones':
        setUnit('บท');
        setTargetValue(scope === 'six_month' ? 6 : 3);
        if (!subjectId) setSubjectId('programming');
        break;
      case 'review_consistency':
        setUnit('รอบ');
        setTargetValue(scope === 'daily' ? 1 : scope === 'weekly' ? 4 : 15);
        break;
      case 'quiz_target':
        setUnit('%');
        setTargetValue(75);
        break;
      case 'custom':
        setUnit('ครั้ง');
        setTargetValue(5);
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const goalToSave: StudyGoal = {
      id: initialGoal?.id || uuidv4(),
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      scope,
      targetValue: Number(targetValue) || 0,
      currentValue: initialGoal?.currentValue || 0,
      unit: unit.trim() || 'หน่วย',
      startDate: startDate || format(new Date(), 'yyyy-MM-dd'),
      targetDate: targetDate || format(new Date(), 'yyyy-MM-dd'),
      status: initialGoal?.status || 'in_progress',
      subjectId: subjectId ? (subjectId as SubjectId) : undefined,
      customProgress: type === 'custom' ? Number(customProgress) || 0 : undefined,
      createdAt: initialGoal?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(goalToSave);
    onClose();
  };

  const goalTypeOptions: { type: GoalType; title: string; desc: string; icon: typeof Clock }[] = [
    { type: 'study_hours', title: 'ชั่วโมงการเรียน (Study Hours)', desc: 'สะสมเวลาเรียนจริงจากตัวจับเวลา', icon: Clock },
    { type: 'lessons_completed', title: 'บทเรียนที่เรียนจบ (Lessons)', desc: 'นับจำนวนบทเรียนที่สำเร็จ', icon: BookOpen },
    { type: 'subject_milestones', title: 'ไมล์สโตนแยกวิชา (Subject)', desc: 'เป้าหมายเฉพาะวิชาที่ต้องการเน้น', icon: Award },
    { type: 'review_consistency', title: 'ความสม่ำเสมอทบทวน (Review)', desc: 'นับรอบการทบทวน Spaced Review', icon: Brain },
    { type: 'quiz_target', title: 'เป้าหมาย Quiz (Quiz Score)', desc: 'คะแนนเฉลี่ยแบบทดสอบ', icon: CheckCircle2 },
    { type: 'custom', title: 'กำหนดเอง (Custom Goal)', desc: 'เป้าหมายเฉพาะตัวปรับค่าเองได้', icon: Sparkles },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-goal-modal-title"
        className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Target className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="create-goal-modal-title" className="text-base sm:text-lg font-bold">
                {initialGoal ? 'แก้ไขเป้าหมายการเรียน' : 'สร้างเป้าหมายการเรียนใหม่'}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                ความคืบหน้าจะคำนวณจากบันทึกการเรียนจริงโดยอัตโนมัติ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างสร้างเป้าหมาย"
            className="p-2 min-h-[44px] min-w-[44px] rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center focus:ring-2 focus:ring-blue-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* Title */}
          <div>
            <label htmlFor="goal-title-input" className="block text-xs font-bold text-slate-700 mb-1">
              ชื่อเป้าหมาย <span className="text-rose-500">*</span>
            </label>
            <input
              id="goal-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น เรียนสัปดาห์นี้ 10 ชั่วโมง หรือ จบ Python 3 บท"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="goal-desc-input" className="block text-xs font-bold text-slate-700 mb-1">
              คำอธิบายเป้าหมาย (ถ้ามี)
            </label>
            <input
              id="goal-desc-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ระบุเหตุผลหรือแนวทาง เช่น กระจายเวลาเรียนทุกวันช่วงค่ำ"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs transition-all"
            />
          </div>

          {/* Goal Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ประเภทเป้าหมาย (Goal Type)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {goalTypeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = type === opt.type;

                return (
                  <button
                    type="button"
                    key={opt.type}
                    onClick={() => handleTypeChange(opt.type)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                      <span className={`text-xs font-bold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                        {opt.title.split('(')[0]}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 line-clamp-1">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scope Selector with Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                ระดับช่วงเวลา (Scope & Presets)
              </label>
              <div className="flex items-center gap-1">
                {(['daily', 'weekly', 'monthly', 'six_month'] as GoalScope[]).map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => handleApplyPreset(s)}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-colors ${
                      scope === s
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s === 'daily' ? 'รายวัน' : s === 'weekly' ? 'สัปดาห์' : s === 'monthly' ? 'เดือน' : '6 เดือน'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label htmlFor="goal-start-date" className="block text-[11px] text-slate-500 mb-1">วันที่เริ่มต้น</label>
                <div className="relative">
                  <input
                    id="goal-start-date"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
                  />
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label htmlFor="goal-target-date" className="block text-[11px] text-slate-500 mb-1">วันสิ้นสุด (Deadline)</label>
                <div className="relative">
                  <input
                    id="goal-target-date"
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600"
                  />
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Target Value & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="goal-target-value" className="block text-xs font-bold text-slate-700 mb-1">
                เป้าหมายที่ต้องการ (Target)
              </label>
              <input
                id="goal-target-value"
                type="number"
                min="0.1"
                step="any"
                required
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-600 font-bold"
              />
            </div>

            <div>
              <label htmlFor="goal-unit-input" className="block text-xs font-bold text-slate-700 mb-1">
                หน่วยนับ (Unit)
              </label>
              <input
                id="goal-unit-input"
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="เช่น ชม., บท, รอบ, %"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Optional Subject selection */}
          {(type === 'subject_milestones' || type === 'study_hours' || type === 'lessons_completed') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ระบุวิชาเฉพาะ {type === 'subject_milestones' ? '(จำเป็น)' : '(ไม่บังคับ)'}
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value as SubjectId)}
                required={type === 'subject_milestones'}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
              >
                <option value="">ทุกวิชา (All Subjects)</option>
                {Object.values(SUBJECTS).map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Custom progress override for custom goals */}
          {type === 'custom' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                ความคืบหน้าปัจจุบัน (ปรับแต่งเองได้)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={customProgress}
                onChange={(e) => setCustomProgress(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
              />
              <span className="text-[10px] text-slate-500">
                เป้าหมายแบบ Custom สามารถปรับแก้ตัวเลขความคืบหน้านี้ได้ตามต้องการ
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] text-slate-600 hover:text-slate-800 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors focus:ring-2 focus:ring-blue-500"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors focus:ring-2 focus:ring-blue-500"
            >
              {initialGoal ? 'บันทึกการแก้ไข' : 'สร้างเป้าหมาย'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
