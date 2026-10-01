import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Award, 
  ChevronRight, 
  BookOpen
} from 'lucide-react';
import { SUBJECTS } from '../types';
import type { MasteryScore, Lesson, LearningRecord } from '../types';
import { MasteryBar } from './MasteryBar';

interface TopicMatrixItem {
  lesson: Lesson;
  record: LearningRecord;
  masteryScore: MasteryScore;
  needsAttention: boolean;
  attentionReasons: string[];
}

interface TopicMasteryMatrixProps {
  items: TopicMatrixItem[];
  onStartReview?: (lessonId: string, title: string) => void;
  onOpenGuide?: () => void;
}

export function TopicMasteryMatrix({
  items,
  onStartReview,
  onOpenGuide,
}: TopicMasteryMatrixProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedMastery, setSelectedMastery] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredItems = useMemo(() => {
    return items.filter(({ lesson, masteryScore, needsAttention }) => {
      // Subject filter
      if (selectedSubject !== 'all' && lesson.subjectId !== selectedSubject) {
        return false;
      }
      // Mastery filter
      if (selectedMastery !== 'all' && masteryScore !== Number(selectedMastery)) {
        return false;
      }
      // Status filter
      if (selectedStatus === 'completed' && lesson.status !== 'COMPLETED') return false;
      if (selectedStatus === 'in_progress' && lesson.status !== 'IN PROGRESS') return false;
      if (selectedStatus === 'not_started' && lesson.status !== 'NOT STARTED') return false;
      if (selectedStatus === 'attention' && !needsAttention) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = lesson.title.toLowerCase().includes(q);
        const matchDesc = (lesson.description || '').toLowerCase().includes(q);
        const matchSubject = SUBJECTS[lesson.subjectId]?.name.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchSubject) return false;
      }

      return true;
    });
  }, [items, selectedSubject, selectedMastery, selectedStatus, searchQuery]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-5">
      {/* Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              เมทริกซ์ความเชี่ยวชาญรายบท (Topic Mastery Matrix)
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {filteredItems.length} จาก {items.length} บท
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            เปรียบเทียบสถานะการเรียน (Completion), เวลาเรียนจริง, ผลคะแนนสอบ และระดับความเข้าใจ (Mastery 0–4)
          </p>
        </div>

        {onOpenGuide && (
          <button
            onClick={onOpenGuide}
            className="px-3.5 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all flex items-center gap-1.5 self-start lg:self-auto"
          >
            <Award className="w-4 h-4" />
            <span>ดูเกณฑ์ประเมิน 0–4</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อบท หรือวิชา..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Subject Filter */}
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500 transition-colors"
        >
          <option value="all">ทุกวิชา (All Subjects)</option>
          {Object.values(SUBJECTS).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Mastery Filter */}
        <select
          value={selectedMastery}
          onChange={(e) => setSelectedMastery(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500 transition-colors"
        >
          <option value="all">ทุกระดับ Mastery (0–4)</option>
          <option value="0">ระดับ 0: ยังไม่เรียน</option>
          <option value="1">ระดับ 1: พอรู้ว่าคืออะไร</option>
          <option value="2">ระดับ 2: อธิบายพื้นฐานได้</option>
          <option value="3">ระดับ 3: ทำโจทย์/ใช้งานได้</option>
          <option value="4">ระดับ 4: อธิบายและประยุกต์ได้</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500 transition-colors"
        >
          <option value="all">ทุกสถานะ (All Statuses)</option>
          <option value="completed">จบแล้ว (Completed)</option>
          <option value="in_progress">กำลังเรียน (In Progress)</option>
          <option value="not_started">ยังไม่เริ่ม (Not Started)</option>
          <option value="attention">⚠️ ต้องให้ความสนใจ (Needs Attention)</option>
        </select>
      </div>

      {/* Results Count & Quick Reset */}
      {(selectedSubject !== 'all' || selectedMastery !== 'all' || selectedStatus !== 'all' || searchQuery) && (
        <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl">
          <span>พบ {filteredItems.length} รายการที่ตรงกับเงื่อนไข</span>
          <button
            onClick={() => {
              setSelectedSubject('all');
              setSelectedMastery('all');
              setSelectedStatus('all');
              setSearchQuery('');
            }}
            className="text-blue-600 hover:underline font-semibold"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      )}

      {/* Matrix Table (Desktop) / Cards (Mobile) */}
      {filteredItems.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          ไม่พบบทเรียนที่ตรงกับตัวกรองที่เลือก
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                <th className="py-3 px-3 rounded-l-xl">วิชา & บทเรียน</th>
                <th className="py-3 px-2 text-center">สถานะ</th>
                <th className="py-3 px-2 text-center">เวลาเรียนจริง</th>
                <th className="py-3 px-2 text-center">Quiz</th>
                <th className="py-3 px-2 text-center">ความมั่นใจ</th>
                <th className="py-3 px-3">ระดับความเข้าใจ (Mastery 0–4)</th>
                <th className="py-3 px-3 text-right rounded-r-xl">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(({ lesson, record, masteryScore, needsAttention, attentionReasons }) => {
                const subject = SUBJECTS[lesson.subjectId];

                return (
                  <tr
                    key={lesson.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* Subject & Lesson title */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${subject?.color || 'bg-slate-400'}`}
                          title={subject?.name}
                        />
                        <div className="min-w-0">
                          <Link
                            to={`/lessons/${lesson.id}`}
                            className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1"
                          >
                            {lesson.title}
                          </Link>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            <span>{subject?.name.split('/')[0]}</span>
                            <span>&middot;</span>
                            <span>เดือน {lesson.month} สัปดาห์ {lesson.week}</span>
                            {needsAttention && (
                              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 font-bold rounded-md">
                                ต้องใส่ใจ
                              </span>
                            )}
                          </div>
                          {needsAttention && attentionReasons.length > 0 && (
                            <p className="text-[10px] text-amber-700 mt-1 line-clamp-1 italic">
                              • {attentionReasons[0]}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Completion status */}
                    <td className="py-3.5 px-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          lesson.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : lesson.status === 'IN PROGRESS'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {lesson.status === 'COMPLETED'
                          ? 'จบแล้ว'
                          : lesson.status === 'IN PROGRESS'
                          ? 'กำลังเรียน'
                          : 'ยังไม่เริ่ม'}
                      </span>
                    </td>

                    {/* Study time */}
                    <td className="py-3.5 px-2 text-center font-medium">
                      {record.totalStudyMinutes > 0 ? (
                        <span className="text-slate-800 font-semibold">
                          {record.totalStudyMinutes >= 60
                            ? `${(record.totalStudyMinutes / 60).toFixed(1)} ชม.`
                            : `${record.totalStudyMinutes} นาที`}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Quiz score */}
                    <td className="py-3.5 px-2 text-center">
                      {record.quizBestScore !== undefined ? (
                        <span
                          className={`font-bold ${
                            record.quizBestScore >= 80
                              ? 'text-emerald-600'
                              : record.quizBestScore >= 60
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {record.quizBestScore}%
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Confidence */}
                    <td className="py-3.5 px-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                          record.confidence === 'High'
                            ? 'bg-emerald-50 text-emerald-700'
                            : record.confidence === 'Medium'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {record.confidence === 'High'
                          ? 'มั่นใจมาก'
                          : record.confidence === 'Medium'
                          ? 'ปานกลาง'
                          : 'ยังไม่มั่นใจ'}
                      </span>
                    </td>

                    {/* Mastery Bar */}
                    <td className="py-3.5 px-3 min-w-[170px]">
                      <MasteryBar
                        score={masteryScore}
                        showLabel={true}
                        showDescription={false}
                        size="sm"
                      />
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onStartReview && (
                          <button
                            onClick={() => onStartReview(lesson.id, lesson.title)}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold transition-colors"
                            title="ทบทวนบทนี้"
                          >
                            ทบทวน
                          </button>
                        )}
                        <Link
                          to={`/lessons/${lesson.id}`}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="เปิดหน้าบทเรียน"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
