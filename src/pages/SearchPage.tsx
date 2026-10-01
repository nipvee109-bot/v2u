import { useSearchParams, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { BookOpen, AlertCircle, FileText, Link as LinkIcon, Search as SearchIcon } from 'lucide-react';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q')?.toLowerCase() || '';
  const { lessons, unclearTopics } = useStore();

  const matchedLessons = lessons.filter(l => 
    l.title.toLowerCase().includes(q) || 
    (l.learnedNotes && l.learnedNotes.toLowerCase().includes(q)) ||
    (l.stillUnclearNotes && l.stillUnclearNotes.toLowerCase().includes(q)) ||
    (l.reviewNotes && l.reviewNotes.toLowerCase().includes(q))
  );

  const matchedResources = lessons.flatMap(l => 
    l.resources.filter(r => r.title.toLowerCase().includes(q) || r.url.toLowerCase().includes(q))
    .map(r => ({ ...r, lessonId: l.id, lessonTitle: l.title }))
  );

  const matchedUnclear = unclearTopics.filter(t => 
    t.topic.toLowerCase().includes(q) || (t.details && t.details.toLowerCase().includes(q))
  );

  const totalResults = matchedLessons.length + matchedResources.length + matchedUnclear.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
       <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-4">
             <div className="bg-blue-500/20 p-3 rounded-full">
               <SearchIcon className="w-6 h-6 text-blue-400" />
             </div>
             <div>
                <h1 className="text-2xl font-bold">ผลการค้นหาสำหรับ "{q}"</h1>
                <p className="text-slate-300">พบทั้งหมด {totalResults} รายการ</p>
             </div>
          </div>
       </div>

       {totalResults === 0 ? (
         <div className="text-center py-20 text-gray-500 bg-white rounded-3xl shadow-sm border border-gray-100">
           ไม่พบข้อมูลที่ค้นหา
         </div>
       ) : (
         <div className="space-y-8">
           
           {matchedLessons.length > 0 && (
             <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5" /> บทเรียน & โน้ต</h2>
                <div className="grid gap-3">
                   {matchedLessons.map(l => (
                     <Link to={`/lessons/${l.id}`} key={l.id} className="block bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all">
                        <div className="font-bold text-gray-900">{l.title}</div>
                        <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                           {l.learnedNotes || l.reviewNotes || l.stillUnclearNotes || 'ไม่มีโน้ต'}
                        </div>
                     </Link>
                   ))}
                </div>
             </div>
           )}

           {matchedResources.length > 0 && (
             <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><LinkIcon className="w-5 h-5" /> แหล่งเรียนรู้</h2>
                <div className="grid gap-3">
                   {matchedResources.map(r => (
                     <a href={r.url} target="_blank" rel="noreferrer" key={r.id} className="block bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-green-300 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 text-gray-500">
                             {r.type === 'document' ? <FileText className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                           </div>
                           <div>
                             <div className="font-bold text-gray-900">{r.title}</div>
                             <div className="text-xs text-gray-500 mt-0.5">ในบทเรียน: {r.lessonTitle}</div>
                           </div>
                        </div>
                     </a>
                   ))}
                </div>
             </div>
           )}

           {matchedUnclear.length > 0 && (
             <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-red-500" /> สิ่งที่ยังไม่เข้าใจ</h2>
                <div className="grid gap-3">
                   {matchedUnclear.map(u => (
                     <Link to="/not-understood" key={u.id} className="block bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-red-300 hover:shadow-md transition-all">
                        <div className="font-bold text-gray-900">{u.topic}</div>
                        <div className="text-sm text-gray-500 mt-1 line-clamp-2">{u.details}</div>
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
