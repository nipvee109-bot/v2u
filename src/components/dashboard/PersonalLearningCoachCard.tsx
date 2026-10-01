import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Clock,
  ChevronRight,
  ChevronDown,
  Info,
  CalendarClock,
  CheckCircle2,
  X
} from 'lucide-react';
import type { CoachPriority } from '../../utils/personalLearningCoach';
import { getCoachRecommendations } from '../../utils/personalLearningCoach';
import { SUBJECTS } from '../../types';
import type { Lesson, StudySession, LearningSession, ReviewItem, UnclearTopic } from '../../types';

interface PersonalLearningCoachCardProps {
  lessons: Lesson[];
  sessions: StudySession[];
  learningSessionsHistory: LearningSession[];
  reviewQueue: ReviewItem[];
  unclearTopics: UnclearTopic[];
}

export const PersonalLearningCoachCard: React.FC<PersonalLearningCoachCardProps> = ({
  lessons,
  sessions,
  learningSessionsHistory,
  reviewQueue,
  unclearTopics,
}) => {
  const navigate = useNavigate();

  // State for dismissed recommendation IDs and active index
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isWhyExpanded, setIsWhyExpanded] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleMessage, setRescheduleMessage] = useState<string | null>(null);

  // Get raw recommendations
  const allRecommendations = useMemo(() => {
    return getCoachRecommendations({
      lessons,
      sessions,
      learningSessionsHistory,
      reviewQueue,
      unclearTopics,
    });
  }, [lessons, sessions, learningSessionsHistory, reviewQueue, unclearTopics]);

  // Filter out dismissed
  const activeRecommendations = useMemo(() => {
    return allRecommendations.filter((r) => !dismissedIds.has(r.id));
  }, [allRecommendations, dismissedIds]);

  // Safe active recommendation
  const safeIndex = activeRecommendations.length > 0 ? currentIndex % activeRecommendations.length : 0;
  const currentItem = activeRecommendations[safeIndex] || null;

  if (!currentItem) {
    return null; // All tasks completed or dismissed
  }

  const subject = SUBJECTS[currentItem.subjectId];

  const handleNextRecommendation = () => {
    setIsWhyExpanded(false);
    setIsRescheduleOpen(false);
    if (activeRecommendations.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % activeRecommendations.length);
    }
  };

  const handleDismiss = () => {
    setDismissedIds((prev) => new Set(prev).add(currentItem.id));
    setIsWhyExpanded(false);
    setIsRescheduleOpen(false);
  };

  const handleReschedule = (optionText: string) => {
    setRescheduleMessage(`เลื่อนรายการนี้แล้ว (${optionText})`);
    setIsRescheduleOpen(false);
    setTimeout(() => {
      setDismissedIds((prev) => new Set(prev).add(currentItem.id));
      setRescheduleMessage(null);
    }, 1500);
  };

  const getPriorityBadge = (priority: CoachPriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'high':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'medium':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 p-6 sm:p-7 text-white shadow-xl border border-indigo-800/60 animate-in fade-in">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-10 h-48 w-48 rounded-full bg-purple-500/10 blur-2xl pointer-events-none" />

      <div className="relative space-y-4">
        {/* ── Coach Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                  Personal Learning Coach
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                  แนะนำข้อ {safeIndex + 1} จาก {activeRecommendations.length}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
                ตอนนี้ควรทำอะไร?
              </h3>
            </div>
          </div>

          {/* Quick Switch / Dismiss Controls */}
          <div className="flex items-center gap-1.5">
            {activeRecommendations.length > 1 && (
              <button
                type="button"
                onClick={handleNextRecommendation}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-medium transition-colors flex items-center gap-1"
                title="ดูข้อแนะนำถัดไป"
              >
                <span>เปลี่ยนข้อ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="ซ่อนคำแนะนำนี้"
              aria-label="ซ่อนคำแนะนำนี้"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Recommendation Core Details ── */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getPriorityBadge(currentItem.priority)}`}>
              {currentItem.priorityLabel}
            </span>
            <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${subject?.color || 'bg-blue-600'} text-white`}>
              {subject?.name || currentItem.subjectId}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-300 font-medium">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              แนะนำใช้เวลา ~{currentItem.estimatedMinutes} นาที
            </span>
          </div>

          <div>
            <h4 className="text-lg sm:text-xl font-bold text-white leading-snug">
              {currentItem.title}
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              {currentItem.reason}
            </p>
          </div>
        </div>

        {/* ── Expandable Cognitive "Why Coach Picked This" ── */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setIsWhyExpanded(!isWhyExpanded)}
            className="flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200 transition-colors font-semibold"
          >
            <Info className="w-3.5 h-3.5" />
            <span>ทำไมโค้ชถึงเลือกข้อนี้? (หลักการทางสมอง & การเรียนรู้)</span>
            {isWhyExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {isWhyExpanded && (
            <div className="mt-2.5 p-4 rounded-2xl bg-white/10 border border-white/15 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-blue-200 font-bold text-[11px] uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{currentItem.cognitivePrinciple}</span>
              </div>
              <p className="text-slate-200 leading-relaxed text-[11px]">
                {currentItem.whyExplanation}
              </p>
            </div>
          )}
        </div>

        {/* Reschedule confirmation message */}
        {rescheduleMessage && (
          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{rescheduleMessage}</span>
          </div>
        )}

        {/* ── Action Buttons & Controls ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2 relative">
            <button
              type="button"
              onClick={() => setIsRescheduleOpen(!isRescheduleOpen)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>เลื่อนเวลา</span>
            </button>

            {/* Reschedule Dropdown Menu */}
            {isRescheduleOpen && (
              <div className="absolute left-0 bottom-full mb-2 w-44 rounded-2xl bg-slate-900 border border-slate-700 shadow-xl p-1.5 z-20 space-y-1 animate-in fade-in">
                <button
                  type="button"
                  onClick={() => handleReschedule('+1 ชั่วโมง')}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 rounded-lg transition-colors"
                >
                  อีก 1 ชั่วโมง
                </button>
                <button
                  type="button"
                  onClick={() => handleReschedule('เย็นนี้')}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 rounded-lg transition-colors"
                >
                  ช่วงเย็น (18:00 น.)
                </button>
                <button
                  type="button"
                  onClick={() => handleReschedule('พรุ่งนี้เช้า')}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 rounded-lg transition-colors"
                >
                  พรุ่งนี้เช้า
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(currentItem.targetUrl)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 hover:scale-[1.02]"
            >
              <span>{currentItem.actionButtonText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
