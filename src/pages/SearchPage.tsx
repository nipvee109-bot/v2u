import { useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CuratedSearchResults } from '../components/search/CuratedSearchResults';
import { useStore } from '../store/useStore';
import { 
  BookOpen, 
  AlertCircle, 
  FileText, 
  Link as LinkIcon, 
  Search as SearchIcon, 
  History, 
  Sparkles, 
  Clock 
} from 'lucide-react';
import { SUBJECTS } from '../types';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rawQ = searchParams.get('q') || '';
  const q = rawQ.toLowerCase().trim();
  const { lessons, unclearTopics, learningSessionsHistory, resources, getAllResources, recordResourceOpened } = useStore();

  // Fast O(1) lesson lookup map
  const lessonMap = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);

  // Memoized unified resources
  const allResources = useMemo(() => getAllResources(), [getAllResources, resources, lessons]);

  // 1. Search in Lessons & Memory
  const matchedLessons = useMemo(() => {
    if (!q) return [];
    return lessons
      .map((l) => {
        const matchReasons: string[] = [];
        if (l.title.toLowerCase().includes(q)) matchReasons.push('ชื่อบทเรียน');
        if (l.description && l.description.toLowerCase().includes(q)) matchReasons.push('คำอธิบาย');
        if (l.learnedNotes && l.learnedNotes.toLowerCase().includes(q)) matchReasons.push('สิ่งที่ฉันเรียนรู้');
        if (l.stillUnclearNotes && l.stillUnclearNotes.toLowerCase().includes(q)) matchReasons.push('สิ่งที่ยังไม่เข้าใจ');
        if (l.reviewNotes && l.reviewNotes.toLowerCase().includes(q)) matchReasons.push('บันทึกการทบทวน');
        if (l.quizScore !== undefined && (l.quizScore.toString() === q || q === 'quiz' || q === 'คะแนน')) {
          matchReasons.push(`Quiz (${l.quizScore}%)`);
        }
        if (l.quizAttempts && l.quizAttempts.some((qa) => qa.score.toString() === q || (qa.notes && qa.notes.toLowerCase().includes(q)))) {
          matchReasons.push('ประวัติ Quiz');
        }
        if (l.mastery && l.mastery.toLowerCase().includes(q)) {
          matchReasons.push(`Mastery (${l.mastery})`);
        }
        if (l.confidence && l.confidence.toLowerCase().includes(q)) {
          matchReasons.push(`Confidence (${l.confidence})`);
        }

        return {
          lesson: l,
          matchReasons,
          isMatch: matchReasons.length > 0,
        };
      })
      .filter((item) => item.isMatch);
  }, [lessons, q]);

  // 2. Search in Learning Sessions History with O(1) lesson lookup
  const matchedSessions = useMemo(() => {
    if (!q) return [];
    const isSessionKeyword = q === 'session' || q === 'เซสชัน';
    return learningSessionsHistory.filter((s) => {
      const parentLesson = lessonMap.get(s.lessonId);
      const lessonTitleMatch = parentLesson?.title.toLowerCase().includes(q);
      const sourceMatch = s.source?.title.toLowerCase().includes(q);
      const learnedDraft = s.notesDraft?.learnedNotes?.toLowerCase().includes(q);
      const unclearDraft = s.notesDraft?.stillUnclearNotes?.toLowerCase().includes(q);
      const reviewDraft = s.notesDraft?.reviewNotes?.toLowerCase().includes(q);

      return lessonTitleMatch || sourceMatch || learnedDraft || unclearDraft || reviewDraft || isSessionKeyword;
    });
  }, [learningSessionsHistory, lessonMap, q]);

  // 3. Search in Resources with O(1) lesson lookup
  const matchedResources = useMemo(() => {
    if (!q) return [];
    return allResources.filter((r) => {
      const titleMatch = r.title.toLowerCase().includes(q);
      const urlMatch = r.url.toLowerCase().includes(q);
      const descMatch = r.description ? r.description.toLowerCase().includes(q) : false;
      let lessonMatch = false;
      if (r.lessonId) {
        const parentLesson = lessonMap.get(r.lessonId);
        if (parentLesson && parentLesson.title.toLowerCase().includes(q)) {
          lessonMatch = true;
        }
      }
      return titleMatch || urlMatch || descMatch || lessonMatch;
    });
  }, [allResources, lessonMap, q]);

  // 4. Search in Unclear Topics
  const matchedUnclear = useMemo(() => {
    if (!q) return [];
    return unclearTopics.filter(
      (t) => t.topic.toLowerCase().includes(q) || (t.details && t.details.toLowerCase().includes(q))
    );
  }, [unclearTopics, q]);

  const totalResults = matchedLessons.length + matchedSessions.length + matchedResources.length + matchedUnclear.length;

  if (!q) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl flex items-center gap-4">
          <div className="bg-blue-500/20 p-3 rounded-2xl">
            <SearchIcon className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ค้นหาในระบบความจำ (Search in Memory)</h1>
            <p className="text-slate-300 text-xs mt-1">พิมพ์คำค้นหาในช่องค้นหาด้านบน เพื่อค้นหาบทเรียน, โน้ตสรุป, แบบทดสอบ, หรือประวัติเซสชัน</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Search Header */}
      <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-4">
          <div className="bg-blue-500/20 p-3 rounded-2xl">
            <SearchIcon className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ผลการค้นหาสำหรับ "{q}"</h1>
            <p className="text-slate-300 text-xs mt-1">
              ในเนื้อหา V2U และบันทึกของคุณ (บันทึก {totalResults} รายการ)
            </p>
          </div>
        </div>
      </div>

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const v = (new FormData(e.currentTarget).get('q') as string | null)?.trim() ?? '';
          if (v) navigate(`/search?q=${encodeURIComponent(v)}`);
        }}
        className="flex gap-2"
      >
        <input name="q" defaultValue={rawQ} key={rawQ} aria-label="ค้นหา" placeholder="ค้นหาบทเรียน คลิป โจทย์" className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-sm" />
        <button type="submit" className="min-h-[44px] rounded-xl bg-blue-600 px-4 text-sm font-bold text-white">ค้นหา</button>
      </form>

      <CuratedSearchResults query={rawQ} />

      <h2 className="text-sm font-bold text-slate-700">จากบันทึกการเรียนของคุณ</h2>
      {totalResults === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-200/70 p-8 space-y-3">
          <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">ไม่พบข้อมูลที่ตรงกับคำค้นหา</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            ลองค้นหาด้วยชื่อบทเรียน, คำสำคัญในโน้ต (เช่น สูตร, ฟังก์ชัน), คะแนน Quiz, หรือประเภทของเนื้อหา
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Lessons & Memory Records */}
          {matchedLessons.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" /> บทเรียน & Learning Memory ({matchedLessons.length})
              </h2>
              <div className="grid gap-3">
                {matchedLessons.map(({ lesson: l, matchReasons }) => {
                  const subject = SUBJECTS[l.subjectId];
                  return (
                    <Link 
                      to={`/lessons/${l.id}`} 
                      key={l.id} 
                      className="block bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${subject?.color || 'bg-blue-500'}`} />
                          <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm">
                            {l.title}
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {matchReasons.map((reason, idx) => (
                            <span 
                              key={idx} 
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100"
                            >
                              ตรงกับ: {reason}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Snippet display */}
                      <div className="text-xs text-slate-600 space-y-1 mt-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        {l.learnedNotes && l.learnedNotes.toLowerCase().includes(q) && (
                          <p className="line-clamp-2">
                            <span className="font-semibold text-blue-600">สิ่งที่เรียนรู้: </span>{l.learnedNotes}
                          </p>
                        )}
                        {l.reviewNotes && l.reviewNotes.toLowerCase().includes(q) && (
                          <p className="line-clamp-2">
                            <span className="font-semibold text-amber-600">สิ่งที่ต้องทบทวน: </span>{l.reviewNotes}
                          </p>
                        )}
                        {l.stillUnclearNotes && l.stillUnclearNotes.toLowerCase().includes(q) && (
                          <p className="line-clamp-2">
                            <span className="font-semibold text-rose-600">จุดที่ยังไม่เข้าใจ: </span>{l.stillUnclearNotes}
                          </p>
                        )}
                        {!l.learnedNotes?.toLowerCase().includes(q) && 
                         !l.reviewNotes?.toLowerCase().includes(q) && 
                         !l.stillUnclearNotes?.toLowerCase().includes(q) && (
                          <p className="text-slate-500 line-clamp-1">
                            {l.description || 'ไม่มีโน้ตเพิ่มเติม'}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Learning Sessions Memory */}
          {matchedSessions.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" /> เซสชันการเรียนใน Memory ({matchedSessions.length})
              </h2>
              <div className="grid gap-3">
                {matchedSessions.map((s) => {
                  const parentLesson = lessons.find(l => l.id === s.lessonId);
                  const mins = Math.round(s.actualSeconds / 60);
                  return (
                    <Link
                      to={`/lessons/${s.lessonId}`}
                      key={s.sessionId}
                      className="block bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-xs block">
                              เซสชัน {mins} นาที &middot; {parentLesson?.title || 'บทเรียน'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {format(parseISO(s.completedAt || s.startedAt), 'dd MMMM yyyy HH:mm น.', { locale: th })}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {s.source ? s.source.title : 'เรียนรู้ด้วยตนเอง'}
                        </span>
                      </div>
                      {(s.notesDraft?.learnedNotes || s.notesDraft?.reviewNotes) && (
                        <p className="text-xs text-slate-600 mt-2 line-clamp-1 bg-slate-50 p-2 rounded-lg">
                          {s.notesDraft.learnedNotes || s.notesDraft.reviewNotes}
                        </p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resources */}
          {matchedResources.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-emerald-600" /> แหล่งเรียนรู้ ({matchedResources.length})
              </h2>
              <div className="grid gap-3">
                {matchedResources.map(r => {
                  const parentLesson = r.lessonId ? lessons.find(l => l.id === r.lessonId) : null;
                  const subject = r.subject ? SUBJECTS[r.subject] : null;
                  return (
                    <div 
                      key={r.id} 
                      className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all group"
                    >
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => recordResourceOpened(r.id)}
                        className="flex items-center gap-3 min-w-0 flex-1"
                      >
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                          {r.type === 'document' ? <FileText className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 truncate text-xs group-hover:text-emerald-600 transition-colors">
                            {r.title}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 truncate flex items-center gap-2">
                            {subject && (
                              <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                                <span className={`w-1.5 h-1.5 rounded-full ${subject.color}`} />
                                {subject.name}
                              </span>
                            )}
                            <span className="truncate">{r.url}</span>
                          </div>
                        </div>
                      </a>

                      {parentLesson && (
                        <Link
                          to={`/lessons/${parentLesson.id}`}
                          className="shrink-0 text-[11px] font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          ไปที่บทเรียน
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unclear Topics */}
          {matchedUnclear.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" /> สิ่งที่ยังไม่เข้าใจ ({matchedUnclear.length})
              </h2>
              <div className="grid gap-3">
                {matchedUnclear.map(u => (
                  <Link 
                    to="/not-understood" 
                    key={u.id} 
                    className="block bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 hover:border-rose-300 hover:shadow-md transition-all"
                  >
                    <div className="font-bold text-slate-900 text-xs">{u.topic}</div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-2">{u.details}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
