import React from 'react';
import { 
  Clock, 
  Calendar, 
  Award, 
  BookOpen, 
  ExternalLink, 
  Sparkles, 
  TrendingUp, 
  Layers, 
  Video, 
  FileText, 
  Globe,
  Tag
} from 'lucide-react';
import type { Lesson, LearningSession, Resource, ConfidenceLevel } from '../../types';
import { MASTERY_SCALE } from '../../types';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

interface LessonLearningHistoryProps {
  lesson: Lesson;
  sessionsHistory: LearningSession[];
  onStartSession?: () => void;
}

export function formatDurationThai(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0 นาที';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours} ชม. ${mins} นาที`;
  }
  if (hours > 0) {
    return `${hours} ชม.`;
  }
  return `${mins} นาที`;
}

export const LessonLearningHistory: React.FC<LessonLearningHistoryProps> = ({
  lesson,
  sessionsHistory,
  onStartSession,
}) => {
  // Filter sessions strictly matching this lesson and completed
  const completedSessions = sessionsHistory.filter(
    (s) => s.lessonId === lesson.id && s.status === 'completed'
  );

  // Compute total active study minutes from sessions or fallback to lesson
  const sessionTotalMinutes = completedSessions.reduce(
    (acc, s) => acc + Math.round((s.actualSeconds || 0) / 60),
    0
  );
  const totalStudyMinutes = Math.max(
    lesson.totalStudyMinutes || 0,
    lesson.actualStudyMinutes || 0,
    sessionTotalMinutes
  );

  const studyCount = Math.max(
    lesson.studyCount || 0,
    completedSessions.length,
    lesson.status === 'COMPLETED' ? 1 : 0
  );

  // First & Last studied timestamps
  const allDates: string[] = [
    ...(lesson.firstStudiedAt ? [lesson.firstStudiedAt] : []),
    ...(lesson.lastStudiedAt ? [lesson.lastStudiedAt] : []),
    ...(lesson.completedAt ? [lesson.completedAt] : []),
    ...completedSessions.flatMap((s) => [s.startedAt, s.completedAt]).filter((d): d is string => Boolean(d)),
  ].sort();

  const firstStudiedAt = lesson.firstStudiedAt || allDates[0];
  const lastStudiedAt = allDates[allDates.length - 1] || lesson.lastStudiedAt || lesson.completedAt;

  // Distinct resources used across sessions
  const distinctResourcesMap = new Map<string, Resource>();
  (lesson.resources || []).forEach((r) => distinctResourcesMap.set(r.id, r));
  completedSessions.forEach((s) => {
    if (s.source) distinctResourcesMap.set(s.source.id, s.source);
    (s.resourcesUsed || []).forEach((r) => distinctResourcesMap.set(r.id, r));
  });
  const allResourcesUsed = Array.from(distinctResourcesMap.values());

  // Quiz statistics
  const attempts = lesson.quizAttempts || [];
  const bestQuizScore = attempts.length > 0 
    ? Math.max(...attempts.map((a) => a.score))
    : lesson.quizScore;
  const latestQuizScore = attempts.length > 0
    ? attempts[attempts.length - 1].score
    : lesson.quizScore;

  // Current Mastery score & metadata
  const masteryScore = lesson.masteryScore ?? (lesson.status === 'COMPLETED' ? 2 : 0);
  const currentMasteryMeta = MASTERY_SCALE[masteryScore] || MASTERY_SCALE[0];

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'youtube': return <Video className="w-4 h-4 text-rose-500" />;
      case 'pdf':
      case 'document': return <FileText className="w-4 h-4 text-emerald-500" />;
      default: return <Globe className="w-4 h-4 text-blue-500" />;
    }
  };

  const getConfidenceBadge = (confidence?: ConfidenceLevel) => {
    switch (confidence) {
      case 'High':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">มั่นใจสูง</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">ปานกลาง</span>;
      case 'Low':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">ยังไม่ค่อยมั่นใจ</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── High-Level Memory Overview ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-compact p-4 bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>เริ่มเรียนครั้งแรก</span>
          </div>
          <p className="text-sm font-bold text-slate-900 truncate">
            {firstStudiedAt ? format(parseISO(firstStudiedAt), 'd MMM yyyy', { locale: th }) : 'ยังไม่ได้เริ่ม'}
          </p>
          <span className="text-[10px] text-slate-400 block truncate">
            {firstStudiedAt ? format(parseISO(firstStudiedAt), 'HH:mm น.', { locale: th }) : 'ไม่มีประวัติ'}
          </span>
        </div>

        <div className="card-compact p-4 bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span>เรียนล่าสุด</span>
          </div>
          <p className="text-sm font-bold text-slate-900 truncate">
            {lastStudiedAt ? format(parseISO(lastStudiedAt), 'd MMM yyyy', { locale: th }) : 'ยังไม่ได้เริ่ม'}
          </p>
          <span className="text-[10px] text-slate-400 block truncate">
            {lastStudiedAt ? format(parseISO(lastStudiedAt), 'HH:mm น.', { locale: th }) : 'ไม่มีประวัติ'}
          </span>
        </div>

        <div className="card-compact p-4 bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>จำนวนเซสชัน</span>
          </div>
          <p className="text-sm font-bold text-slate-900">
            {studyCount} ครั้ง
          </p>
          <span className="text-[10px] text-slate-400 block">
            รวมเวลา {formatDurationThai(totalStudyMinutes)}
          </span>
        </div>

        <div className="card-compact p-4 bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>ผล Quiz & Mastery</span>
          </div>
          <p className="text-sm font-bold text-slate-900">
            {bestQuizScore !== undefined ? `${bestQuizScore}% (สูงสุด)` : 'ยังไม่มี Quiz'}
          </p>
          <span className="text-[10px] text-indigo-600 font-semibold block truncate">
            {latestQuizScore !== undefined && latestQuizScore !== bestQuizScore 
              ? `ล่าสุด ${latestQuizScore}% · ระดับ ${masteryScore}/4` 
              : `ระดับ ${masteryScore}/4: ${currentMasteryMeta.title}`}
          </span>
        </div>
      </div>

      {/* ── Mastery Changes & Progression Tracker ── */}
      <div className="card p-5 bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              เส้นทางการพัฒนาความเข้าใจ (Mastery Progression)
            </h4>
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${currentMasteryMeta.badgeClass}`}>
            ระดับปัจจุบัน: {masteryScore}/4 {currentMasteryMeta.title}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2">
          {([0, 1, 2, 3, 4] as const).map((lvl) => {
            const meta = MASTERY_SCALE[lvl];
            const isReached = masteryScore >= lvl;
            const isCurrent = masteryScore === lvl;
            return (
              <div 
                key={lvl}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  isCurrent 
                    ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 shadow-xs' 
                    : isReached 
                    ? 'bg-white border-slate-200' 
                    : 'bg-slate-50 border-dashed border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className={`w-2 h-2 rounded-full ${isReached ? meta.barColor : 'bg-slate-300'}`} />
                  <span className="text-[11px] font-bold text-slate-800">ระดับ {lvl}</span>
                </div>
                <p className="text-[10px] font-semibold text-slate-700 truncate">{meta.title}</p>
                <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">{meta.shortDescription}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Resources Used Across All Sessions ── */}
      {allResourcesUsed.length > 0 && (
        <div className="card p-5 bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                สื่อการเรียนรู้ที่ใช้งานในบทเรียนนี้ ({allResourcesUsed.length} รายการ)
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {allResourcesUsed.map((res) => (
              <div 
                key={res.id} 
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70 hover:bg-white hover:shadow-xs transition-all gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    {getResourceIcon(res.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{res.title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="capitalize">{res.type}</span>
                      {res.role && (
                        <span className="px-1.5 py-0.2 bg-slate-200/60 rounded text-[9px] font-medium text-slate-600">
                          {res.role === 'primary' ? 'สื่อหลัก' : res.role === 'practice' ? 'โจทย์ฝึกหัด' : 'เอกสารอ้างอิง'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {res.url && (
                  <a 
                    href={res.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                    title="เปิดสื่อการเรียน"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quiz Attempts & Scores History ── */}
      {attempts.length > 0 && (
        <div className="card p-5 bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                ประวัติการทำแบบทดสอบ (Quiz Attempts - {attempts.length} ครั้ง)
              </h4>
            </div>
            {bestQuizScore !== undefined && (
              <span className="text-xs font-bold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                คะแนนสูงสุด: {bestQuizScore}%
              </span>
            )}
          </div>

          <div className="space-y-2">
            {attempts.map((qa, index) => {
              const isBest = qa.score === bestQuizScore;
              return (
                <div 
                  key={qa.id || index}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60 hover:bg-white transition-all text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[11px]">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">ได้คะแนน {qa.score}%</span>
                        {isBest && (
                          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">
                            Best
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {qa.timestamp ? format(parseISO(qa.timestamp), 'd MMMM yyyy HH:mm น.', { locale: th }) : '-'}
                      </p>
                    </div>
                  </div>
                  {qa.notes && (
                    <span className="text-[11px] text-slate-600 max-w-xs truncate text-right">
                      {qa.notes}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Detailed Session Timeline View ── */}
      <div className="card p-6 bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                ประวัติเซสชันการเรียนรู้ (Session Timeline View)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              บันทึกเวลาจริง สื่อที่ใช้ โน้ตที่จด และระดับความมั่นใจของแต่ละเซสชัน
            </p>
          </div>
          {onStartSession && (
            <button
              onClick={onStartSession}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" /> เริ่มเซสชันใหม่
            </button>
          )}
        </div>

        {completedSessions.length === 0 ? (
          <div className="text-center py-10 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">
              {lesson.status === 'COMPLETED' 
                ? 'บทเรียนนี้บันทึกเสร็จสมบูรณ์แล้ว (บันทึกเวลารวม ' + formatDurationThai(totalStudyMinutes) + ')' 
                : 'ยังไม่มีประวัติเซสชันการเรียนในห้องเรียน'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 mb-4">
              เมื่อเข้าเรียนใน Study Room ระบบจะบันทึกเซสชัน สื่อที่ใช้ และโน้ตไว้ที่นี่โดยอัตโนมัติ
            </p>
            {onStartSession && (
              <button
                onClick={onStartSession}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                เข้า Study Room ตอนนี้
              </button>
            )}
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 pl-6 py-2">
            {completedSessions.map((session, idx) => {
              const activeMinutes = Math.max(1, Math.round((session.actualSeconds || 0) / 60));
              
              // Total clock duration (from start to finish)
              let totalClockMinutes = activeMinutes;
              if (session.startedAt && session.completedAt) {
                const diffMs = new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime();
                if (diffMs > 0) {
                  totalClockMinutes = Math.max(activeMinutes, Math.round(diffMs / 60000));
                }
              }

              const draft = session.notesDraft;
              const hasDraftNotes = draft && (draft.learnedNotes || draft.stillUnclearNotes || draft.reviewNotes);
              const timestampNotesCount = session.timestampedNotes?.length || 0;

              return (
                <div key={session.sessionId || idx} className="relative group">
                  {/* Timeline Node */}
                  <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white bg-emerald-500 ring-4 ring-emerald-50" />

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:shadow-xs transition-all space-y-3">
                    {/* Header: Date, Active Time, Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          เซสชัน #{completedSessions.length - idx}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                          เรียนจริง {formatDurationThai(activeMinutes)}
                        </span>
                        {totalClockMinutes > activeMinutes && (
                          <span className="text-[10px] text-slate-400">
                            (ระยะเวลาทั้งหมด {formatDurationThai(totalClockMinutes)})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {getConfidenceBadge(session.confidenceRating || lesson.confidence)}
                        {session.quizScore !== undefined && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            Quiz: {session.quizScore}%
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {session.completedAt 
                            ? format(parseISO(session.completedAt), 'd MMM yyyy HH:mm น.', { locale: th }) 
                            : format(parseISO(session.startedAt), 'd MMM yyyy HH:mm น.', { locale: th })}
                        </span>
                      </div>
                    </div>

                    {/* Resources Used In This Specific Session */}
                    {((session.resourcesUsed && session.resourcesUsed.length > 0) || session.source) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Tag className="w-3 h-3" /> สื่อที่ใช้:
                        </span>
                        {(session.resourcesUsed || (session.source ? [session.source] : [])).map((res) => (
                          <span 
                            key={res.id} 
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[10px] font-medium text-slate-700"
                          >
                            {getResourceIcon(res.type)}
                            <span className="max-w-[160px] truncate">{res.title}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Notes captured in this session */}
                    {hasDraftNotes && (
                      <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-xs">
                        {draft.learnedNotes && (
                          <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 text-slate-700">
                            <span className="text-[10px] font-bold text-emerald-700 block mb-0.5">สิ่งที่ได้เรียนรู้:</span>
                            <p className="line-clamp-3 whitespace-pre-line text-[11px] leading-relaxed">{draft.learnedNotes}</p>
                          </div>
                        )}
                        {draft.stillUnclearNotes && (
                          <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-100 text-slate-700">
                            <span className="text-[10px] font-bold text-amber-700 block mb-0.5">สิ่งที่ยังติดขัด / ไม่เข้าใจ:</span>
                            <p className="line-clamp-2 whitespace-pre-line text-[11px] leading-relaxed">{draft.stillUnclearNotes}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Timestamped notes indicator */}
                    {timestampNotesCount > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-lg w-fit">
                        <Clock className="w-3 h-3" />
                        <span>มี Timestamped Notes {timestampNotesCount} รายการในเซสชันนี้</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
