import { 
  Clock, 
  BookOpen, 
  Award, 
  Brain, 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  AlertCircle, 
  Check, 
  Edit3, 
  Trash2,
  Plus,
  Minus
} from 'lucide-react';
import { SUBJECTS } from '../types';
import type { StudyGoal, CalculatedGoalProgress, GoalScope, GoalType } from '../types';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

interface GoalCardProps {
  goal: StudyGoal & CalculatedGoalProgress;
  onEdit: (goal: StudyGoal) => void;
  onDelete: (id: string) => void;
  onUpdateCustomProgress?: (id: string, newProgress: number) => void;
}

export function GoalCard({
  goal,
  onEdit,
  onDelete,
  onUpdateCustomProgress,
}: GoalCardProps) {
  const isCompleted = goal.status === 'completed';
  const isExpired = goal.status === 'expired';

  const subject = goal.subjectId ? SUBJECTS[goal.subjectId] : null;

  const getScopeBadge = (scope: GoalScope) => {
    switch (scope) {
      case 'daily':
        return { label: 'รายวัน (Daily)', bg: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'weekly':
        return { label: 'สัปดาห์ (Weekly)', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'monthly':
        return { label: 'รายเดือน (Monthly)', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'six_month':
        return { label: 'แผน 6 เดือน', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
  };

  const getTypeIcon = (type: GoalType) => {
    switch (type) {
      case 'study_hours':
        return Clock;
      case 'lessons_completed':
        return BookOpen;
      case 'subject_milestones':
        return Award;
      case 'review_consistency':
        return Brain;
      case 'quiz_target':
        return CheckCircle2;
      case 'custom':
      default:
        return Sparkles;
    }
  };

  const TypeIcon = getTypeIcon(goal.type);
  const scopeBadge = getScopeBadge(goal.scope);

  // Deadline text formatting with edge case safety
  const formatDeadlineText = () => {
    try {
      const formattedDate = format(parseISO(goal.targetDate), 'dd/MM/yyyy', { locale: th });
      if (isCompleted) {
        return { text: `สำเร็จเป้าหมาย (${formattedDate})`, color: 'text-emerald-600' };
      }
      if (isExpired) {
        const days = Math.abs(goal.remainingDays);
        return { text: `เลยกำหนด ${days} วัน (กำหนด: ${formattedDate})`, color: 'text-rose-600 font-bold' };
      }
      if (goal.remainingDays === 0) {
        return { text: `ครบกำหนดวันนี้! (${formattedDate})`, color: 'text-amber-600 font-bold' };
      }
      return { text: `เหลืออีก ${goal.remainingDays} วัน (กำหนด: ${formattedDate})`, color: 'text-slate-500' };
    } catch {
      return { text: `กำหนด: ${goal.targetDate}`, color: 'text-slate-500' };
    }
  };

  const deadlineInfo = formatDeadlineText();

  // Card Border Styling
  const cardBorder = isCompleted
    ? 'border-emerald-200 bg-white hover:border-emerald-300'
    : isExpired
    ? 'border-rose-200 bg-rose-50/20 hover:border-rose-300'
    : 'border-slate-200/80 bg-white hover:border-blue-300';

  return (
    <div className={`rounded-2xl border p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-4 ${cardBorder}`}>
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${scopeBadge.bg}`}>
              {scopeBadge.label}
            </span>
            {subject && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md text-white ${subject.color}`}>
                {subject.name.split('/')[0]}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isCompleted && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>สำเร็จแล้ว</span>
              </span>
            )}
            {isExpired && !isCompleted && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>เลยกำหนด</span>
              </span>
            )}
            {!isCompleted && !isExpired && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                กำลังทำ
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="flex items-start gap-2.5 mb-1">
          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 shrink-0 mt-0.5">
            <TypeIcon className="w-4 h-4 text-slate-700" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
              {goal.title}
            </h3>
            {goal.description && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                {goal.description}
              </p>
            )}
          </div>
        </div>

        {/* Progress Bar & Values */}
        <div className="mt-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">
              {goal.progressPercent}%
            </span>
            <span className="font-semibold text-slate-600">
              {goal.currentValue} / {goal.targetValue} {goal.unit}
            </span>
          </div>

          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isCompleted
                  ? 'bg-emerald-500'
                  : isExpired
                  ? 'bg-rose-500'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, goal.progressPercent))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <span className={isCompleted ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>
              {isCompleted
                ? 'บรรลุเป้าหมายครบถ้วน 🎉'
                : `ขาดอีก ${goal.remainingValue} ${goal.unit}`}
            </span>
            <span className={`flex items-center gap-1 ${deadlineInfo.color}`}>
              <Calendar className="w-3 h-3" />
              <span>{deadlineInfo.text}</span>
            </span>
          </div>
        </div>

        {/* Contributing Recent Activity */}
        {goal.recentActivityText && (
          <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2 text-[11px] text-slate-600">
            <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="truncate">
              <strong className="text-slate-700">กิจกรรมล่าสุด:</strong> {goal.recentActivityText}
            </span>
          </div>
        )}

        {/* Custom Progress Adjuster (for custom goals) */}
        {goal.type === 'custom' && onUpdateCustomProgress && (
          <div className="mt-2.5 flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-600 text-[11px]">ปรับความคืบหน้าเอง:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdateCustomProgress(goal.id, Math.max(0, (goal.customProgress || 0) - 1))}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 font-bold transition-colors"
                aria-label={`ลดความคืบหน้า 1 หน่วย สำหรับ ${goal.title}`}
              >
                <Minus className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <span className="font-bold text-slate-800 px-1 min-w-[20px] text-center">{goal.currentValue}</span>
              <button
                type="button"
                onClick={() => onUpdateCustomProgress(goal.id, (goal.customProgress || 0) + 1)}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 font-bold transition-colors"
                aria-label={`เพิ่มความคืบหน้า 1 หน่วย สำหรับ ${goal.title}`}
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card Actions Footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1 text-xs">
        <button
          onClick={() => onEdit(goal)}
          className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          aria-label={`แก้ไขเป้าหมาย ${goal.title}`}
        >
          <Edit3 className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          onClick={() => {
            if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเป้าหมาย "${goal.title}"?`)) {
              onDelete(goal.id);
            }
          }}
          className="w-9 h-9 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
          aria-label={`ลบเป้าหมาย ${goal.title}`}
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
