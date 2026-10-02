import { useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CuratedSearchResults } from '../components/search/CuratedSearchResults';
import { ScreenHeader } from '../components/ui';
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

  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-6xl space-y-6 sm:space-y-8">
      <ScreenHeader
        back={{ to: '/learn', label: 'เรียน' }}
        title={q ? `ผลการค้นหา “${rawQ}”` : 'ค้นหา'}
        subtitle={q ? `ในเนื้อหา V2U และบันทึกของคุณ (บันทึก ${totalResults} รายการ)` : 'บทเรียน คลิป เอกสาร และโจทย์ที่ V2U คัดไว้'}
      />

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const v = (new FormData(e.currentTarget).get('q') as string | null)?.trim() ?? '';
          if (v) navigate(`/search?q=${encodeURIComponent(v)}`);
        }}
        className="flex max-w-3xl gap-2"
      >
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input name="q" type="search" defaultValue={rawQ} key={rawQ} aria-label="ค้นหา" placeholder="ค้นหาบทเรียน คลิป โจทย์…" className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-3 text-sm text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
        </div>
        <button type="submit" className="min-h-[52px] shrink-0 rounded-2xl bg-brand-600 px-5 text-sm font-bold text-white hover:bg-brand-700">ค้นหา</button>
      </form>

      <div className={q ? "space-y-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-8 lg:space-y-0" : "space-y-8"}>
        <div className="min-w-0">
      <CuratedSearchResults query={rawQ} />
        </div>
        <div className="min-w-0 space-y-4">
      {q && <h2 className="text-base font-bold text-ink">จากบันทึกการเรียนของคุณ</h2>}
      {!q ? (
        <div>
          <p className="text-sm font-semibold text-slate-700">ลองค้นเรื่องเหล่านี้</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {['สมการ', 'อสมการ', 'ตรีโกณมิติ', 'เวกเตอร์', 'นิวตัน', 'Python', 'ลูป', 'ฟังก์ชัน'].map((t) => (
              <Link key={t} to={`/search?q=${encodeURIComponent(t)}`} className="inline-flex min-h-[40px] items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700">
                {t}
              </Link>
            ))}
          </div>
        </div>
      ) : totalResults === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm text-slate-500">
          <Sparkles className="mx-auto mb-1.5 h-5 w-5 text-slate-300" />
          ยังไม่มีบันทึกของคุณที่ตรงกับคำนี้
        </p>
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
      </div>
    </div>
  );
}
