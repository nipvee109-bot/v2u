import { useState } from 'react';
import { 
  X, 
  AlertCircle, 
  AlertTriangle,
  Brain, 
  BookOpen, 
  CheckCircle2, 
  FileText, 
  Clock, 
  ExternalLink, 
  PlayCircle, 
  RotateCcw,
  Sparkles,
  Award,
  HelpCircle
} from 'lucide-react';
import { SUBJECTS, MASTERY_SCALE } from '../types';
import type { KnowledgeGap, KnowledgeGapReasonItem, SubjectId } from '../types';
import { useStore } from '../store/useStore';
import { MasteryBadge } from './MasteryBar';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

interface KnowledgeGapDetailModalProps {
  gap: KnowledgeGap | null;
  onClose: () => void;
  onStartReview: (lessonId: string, topic: string) => void;
  onReStudy: (lessonId: string) => void;
  onTakeQuiz: (lessonId: string) => void;
  onViewNotes: (lessonId: string) => void;
}

type ModalTab = 'notes' | 'quiz' | 'review' | 'resources';

export function KnowledgeGapDetailModal({
  gap,
  onClose,
  onStartReview,
  onReStudy,
  onTakeQuiz,
  onViewNotes,
}: KnowledgeGapDetailModalProps) {
  const { lessons, unclearTopics = [] } = useStore();
  const [activeTab, setActiveTab] = useState<ModalTab>('notes');

  if (!gap) return null;

  const targetLessonId = gap.relatedLessonIds[0];
  const lesson = lessons.find((l) => l.id === targetLessonId);
  const subject = SUBJECTS[gap.subject as SubjectId] || SUBJECTS.math;

  // Unclear items matching this gap
  const relatedUnclears = unclearTopics.filter(
    (u) =>
      u.subjectId === gap.subject &&
      (gap.topic.toLowerCase().includes(u.topic.toLowerCase()) ||
       u.topic.toLowerCase().includes(gap.topic.toLowerCase()))
  );

  const getSeverityBadge = () => {
    switch (gap.severity) {
      case 'critical':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          label: 'ความเร่งด่วนสูง (Critical Gap)',
          icon: AlertTriangle,
        };
      case 'moderate':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          label: 'ความเร่งด่วนปานกลาง (Moderate Gap)',
          icon: AlertCircle,
        };
      case 'minor':
      default:
        return {
          bg: 'bg-sky-50 text-sky-700 border-sky-200',
          dot: 'bg-sky-500',
          label: 'ข้อแนะนำทบทวน (Minor Gap)',
          icon: HelpCircle,
        };
    }
  };

  const severityBadge = getSeverityBadge();
  const SeverityIcon = severityBadge.icon;

  const getReasonIcon = (code: KnowledgeGapReasonItem['code']) => {
    switch (code) {
      case 'low_quiz':
        return CheckCircle2;
      case 'repeated_unclear':
        return HelpCircle;
      case 'low_mastery':
        return Award;
      case 'review_overdue':
        return Clock;
      case 'never_reviewed':
        return RotateCcw;
      default:
        return AlertCircle;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-start justify-between gap-4 shrink-0 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-blue-500/10 rounded-full blur-2xl" />
          <div className="relative z-10 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${subject.color} text-white`}>
                {subject.name}
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${severityBadge.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${severityBadge.dot}`} />
                <SeverityIcon className="w-3 h-3" />
                <span>{severityBadge.label}</span>
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-snug">
              {gap.topic}
            </h2>

            <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
              <span>ตรวจพบ {gap.reasons.length} สัญญาณช่องว่างความรู้</span>
              {gap.lastStudied && (
                <>
                  <span>&middot;</span>
                  <span>เรียนล่าสุด {format(parseISO(gap.lastStudied), 'dd/MM/yyyy', { locale: th })}</span>
                </>
              )}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors relative z-10 shrink-0"
            title="ปิด"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* Diagnostic Reasons Box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                สาเหตุที่ระบบแนะนำให้กลับไปดู (Gap Diagnosis)
              </h3>
            </div>

            <div className="space-y-2">
              {gap.reasons.map((reason, idx) => {
                const ReasonIcon = getReasonIcon(reason.code);
                const reasonColor =
                  reason.severity === 'critical'
                    ? 'border-rose-200 bg-rose-50/70 text-rose-900'
                    : reason.severity === 'moderate'
                    ? 'border-amber-200 bg-amber-50/70 text-amber-900'
                    : 'border-sky-200 bg-sky-50/70 text-sky-900';

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex items-start gap-3 ${reasonColor}`}
                  >
                    <div className="p-1 rounded-lg bg-white/80 shrink-0 mt-0.5">
                      <ReasonIcon className="w-4 h-4 text-slate-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold">{reason.label}</p>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase">
                          {reason.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        {reason.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500">ระดับความเข้าใจ</span>
              <div className="mt-1 flex items-center gap-1.5">
                <MasteryBadge score={gap.mastery} size="sm" />
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                {MASTERY_SCALE[gap.mastery].shortDescription}
              </span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500">คะแนน Quiz สูงสุด</span>
              <p className={`text-base font-bold mt-1 ${
                gap.quizScore !== undefined && gap.quizScore >= 70
                  ? 'text-emerald-600'
                  : gap.quizScore !== undefined
                  ? 'text-rose-600'
                  : 'text-slate-400'
              }`}>
                {gap.quizScore !== undefined ? `${gap.quizScore}%` : 'ยังไม่มีคะแนน'}
              </p>
              <span className="text-[10px] text-slate-400 mt-1">
                {gap.quizScore !== undefined && gap.quizScore < 60 ? 'ต่ำกว่าเกณฑ์ 60%' : 'ผ่านเกณฑ์'}
              </span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500">รอบที่ทบทวนแล้ว</span>
              <p className="text-base font-bold text-slate-800 mt-1">
                {lesson?.reviewCount || 0} รอบ
              </p>
              <span className="text-[10px] text-slate-400 mt-1">
                {gap.lastReviewed
                  ? `ล่าสุด: ${format(parseISO(gap.lastReviewed), 'dd/MM/yy', { locale: th })}`
                  : 'ยังไม่เคยทบทวน'}
              </span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500">สถานะเนื้อหา</span>
              <p className="text-xs font-bold text-slate-800 mt-1">
                {lesson?.status === 'COMPLETED' ? 'เรียนจบแล้ว' : lesson?.status === 'IN PROGRESS' ? 'กำลังเรียน' : 'ยังไม่เริ่ม'}
              </p>
              <span className="text-[10px] text-slate-400 mt-1">
                {lesson?.difficulty ? `ระดับ: ${lesson.difficulty}` : 'วิชาหลัก'}
              </span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'notes'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>บันทึก & จุดที่ไม่เข้าใจ</span>
              {gap.unclearCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('quiz')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'quiz'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ประวัติแบบทดสอบ ({lesson?.quizAttempts?.length || (gap.quizScore !== undefined ? 1 : 0)})</span>
            </button>

            <button
              onClick={() => setActiveTab('review')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'review'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ประวัติการทบทวน</span>
            </button>

            <button
              onClick={() => setActiveTab('resources')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'resources'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>แหล่งเรียนรู้ ({lesson?.resources?.length || 0})</span>
            </button>
          </div>

          {/* Tab Content 1: Notes & Unclear */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Unclear notes alert */}
              {(gap.unclearNotes || relatedUnclears.length > 0) ? (
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>จุดที่ยังไม่เข้าใจ (Still Unclear / Needs Review):</span>
                  </div>
                  {gap.unclearNotes && (
                    <div className="bg-white/80 p-3 rounded-xl border border-rose-100 text-xs text-rose-950 whitespace-pre-wrap leading-relaxed">
                      {gap.unclearNotes}
                    </div>
                  )}
                  {relatedUnclears.map((u) => (
                    <div key={u.id} className="bg-white/80 p-3 rounded-xl border border-rose-100 text-xs text-rose-950">
                      <span className="font-bold">{u.topic}:</span> {u.details || 'ไม่มีรายละเอียดเพิ่มเติม'}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                  ไม่มีบันทึกจุดที่ติดขัดเป็นพิเศษในบทนี้
                </div>
              )}

              {/* What I learned */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>สรุปสิ่งที่ได้เรียนรู้ (Learned Notes):</span>
                </label>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap min-h-[70px]">
                  {gap.learnedNotes ? gap.learnedNotes : 'ยังไม่มีการบันทึกสรุปสิ่งที่เรียนรู้สำหรับบทนี้'}
                </div>
              </div>

              {/* Spaced Review notes */}
              {gap.reviewNotes && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                    <span>บันทึกจากการทบทวน (Review Notes History):</span>
                  </label>
                  <div className="p-3.5 bg-purple-50/50 border border-purple-200/70 rounded-2xl text-xs text-purple-950 leading-relaxed whitespace-pre-wrap">
                    {gap.reviewNotes}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab Content 2: Quiz Results */}
          {activeTab === 'quiz' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <p className="text-xs font-bold text-slate-800">ผลการประเมินแบบทดสอบ</p>
                  <p className="text-[11px] text-slate-500">
                    เกณฑ์ผ่านความเข้าใจสำหรับแบบทดสอบคือ 60% ขึ้นไป
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-base font-bold ${
                    gap.quizScore !== undefined && gap.quizScore >= 70
                      ? 'text-emerald-600'
                      : gap.quizScore !== undefined
                      ? 'text-rose-600'
                      : 'text-slate-400'
                  }`}>
                    {gap.quizScore !== undefined ? `${gap.quizScore}%` : 'ไม่มีคะแนน'}
                  </span>
                </div>
              </div>

              {lesson?.quizAttempts && lesson.quizAttempts.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700">ประวัติการทำแบบทดสอบทุกครั้ง:</h4>
                  <div className="space-y-2">
                    {lesson.quizAttempts.map((attempt, index) => (
                      <div
                        key={attempt.id}
                        className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-[11px] text-slate-600">
                            #{index + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-800">
                              ทำแบบทดสอบเมื่อ {format(parseISO(attempt.timestamp), 'dd/MM/yyyy HH:mm', { locale: th })}
                            </p>
                            {attempt.notes && (
                              <p className="text-[11px] text-slate-500 mt-0.5">{attempt.notes}</p>
                            )}
                          </div>
                        </div>
                        <span className={`font-bold px-2 py-0.5 rounded-md ${
                          attempt.score >= 70
                            ? 'bg-emerald-50 text-emerald-700'
                            : attempt.score >= 50
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {attempt.score}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : gap.quizScore !== undefined ? (
                <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center justify-between">
                  <span>คะแนนแบบทดสอบที่บันทึกไว้ล่าสุด</span>
                  <span className="font-bold text-slate-900">{gap.quizScore}%</span>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  ยังไม่มีประวัติการทำแบบทดสอบสำหรับบทนี้ กดปุ่ม &quot;ทำแบบทดสอบ&quot; ด้านล่างเพื่อเริ่มวัดระดับความเข้าใจ
                </div>
              )}
            </div>
          )}

          {/* Tab Content 3: Review History */}
          {activeTab === 'review' && (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-700" />
                  <h4 className="text-xs font-bold text-purple-900">
                    Spaced Repetition Schedule (1, 3, 7, 14, 30 วัน)
                  </h4>
                </div>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  การทบทวนแบบสลับช่วงช่วยถ่ายโอนความรู้จาก Working Memory สู่ Long-Term Memory และเพิ่มค่า Mastery สู่ระดับ 4
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="bg-white/80 p-2.5 rounded-xl border border-purple-100">
                    <span className="text-[10px] text-purple-700 block">จำนวนรอบที่ทบทวนแล้ว</span>
                    <span className="font-bold text-purple-950 text-sm">{lesson?.reviewCount || 0} รอบ</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-purple-100">
                    <span className="text-[10px] text-purple-700 block">กำหนดทบทวนรอบถัดไป</span>
                    <span className="font-bold text-purple-950 text-sm">
                      {lesson?.nextReviewAt
                        ? format(parseISO(lesson.nextReviewAt), 'dd/MM/yyyy', { locale: th })
                        : 'รอการจัดคิว'}
                    </span>
                  </div>
                </div>
              </div>

              {gap.reviewNotes ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700">ประวัติบันทึกการทบทวน:</h4>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {gap.reviewNotes}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs">
                  ยังไม่มีประวัติการทบทวน สามารถกดปุ่ม &quot;ทบทวน&quot; เพื่อเริ่มกระบวนการ Active Recall
                </div>
              )}
            </div>
          )}

          {/* Tab Content 4: Related Resources */}
          {activeTab === 'resources' && (
            <div className="space-y-3">
              {lesson?.resources && lesson.resources.length > 0 ? (
                lesson.resources.map((res) => (
                  <a
                    key={res.id}
                    href={res.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-slate-800 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 shrink-0">
                        {res.type === 'youtube' ? (
                          <PlayCircle className="w-4 h-4 text-rose-500" />
                        ) : res.type === 'document' ? (
                          <FileText className="w-4 h-4 text-blue-500" />
                        ) : (
                          <ExternalLink className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {res.title}
                        </p>
                        {res.description && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{res.description}</p>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-blue-600" />
                  </a>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  ไม่มีลิงก์แหล่งเรียนรู้เพิ่มเติมในบทนี้ สามารถเพิ่มได้ในหน้าบทเรียน
                </div>
              )}
            </div>
          )}

        </div>

        {/* Action Footer (The 4 Required Actions) */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {targetLessonId && (
              <button
                onClick={() => {
                  onClose();
                  onViewNotes(targetLessonId);
                }}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                title="ดูสมุดบันทึกฉบับเต็ม"
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>ดูโน้ต</span>
              </button>
            )}

            {targetLessonId && (
              <button
                onClick={() => {
                  onClose();
                  onTakeQuiz(targetLessonId);
                }}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                title="เปิดแบบทดสอบบทเรียน"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>ทำแบบทดสอบ</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {targetLessonId && (
              <button
                onClick={() => {
                  onClose();
                  onStartReview(targetLessonId, gap.topic);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                title="เริ่มทบทวน Spaced Review ทันที"
              >
                <Brain className="w-4 h-4" />
                <span>ทบทวน</span>
              </button>
            )}

            {targetLessonId && (
              <button
                onClick={() => {
                  onClose();
                  onReStudy(targetLessonId);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                title="เริ่มเรียนเนื้อหาบทนี้ใหม่อีกครั้งพร้อมจับเวลา"
              >
                <BookOpen className="w-4 h-4" />
                <span>เรียนอีกครั้ง</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
