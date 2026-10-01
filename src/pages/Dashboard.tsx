import { useState } from 'react';
import { useStore } from '../store/useStore';
import { PlayCircle, Calendar as CalendarIcon, BookOpen, AlertCircle, Search, Plus, Flame, Clock, CheckCircle2, FileText, Link as LinkIcon } from 'lucide-react';
import { SUBJECTS } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { format, isSameDay, subDays, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth } from 'date-fns';
import { th } from 'date-fns/locale';

export function Dashboard() {
  const { lessons, unclearTopics } = useStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const completedLessons = lessons.filter(l => l.status === 'COMPLETED');
  const totalLessons = lessons.length;
  const progressPercent = totalLessons === 0 ? 0 : Math.round((completedLessons.length / totalLessons) * 100);

  // Today's Study
  const todayLessons = lessons.filter(l => l.status === 'IN PROGRESS' || (l.month === 1 && l.status === 'NOT STARTED')).slice(0, 3);

  const urgentUnclear = unclearTopics.filter(t => t.status !== 'Understood').slice(0, 5);

  // Extract all resources
  const allResources = lessons.flatMap(l => l.resources.map(r => ({...r, lessonId: l.id, lessonTitle: l.title}))).reverse().slice(0, 4);

  // Streak calculation (simplified: check consecutive days backward from today)
  const calculateStreak = () => {
    let streak = 0;
    let checkDate = new Date();
    while (true) {
      const hasCompleted = completedLessons.some(l => l.completedAt && isSameDay(parseISO(l.completedAt), checkDate));
      if (hasCompleted) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else {
        if (streak === 0 && isSameDay(checkDate, new Date())) {
           // check yesterday if today is not done yet
           checkDate = subDays(checkDate, 1);
           const hasCompletedYesterday = completedLessons.some(l => l.completedAt && isSameDay(parseISO(l.completedAt), checkDate));
           if (hasCompletedYesterday) {
              streak++;
              checkDate = subDays(checkDate, 1);
              continue;
           }
        }
        break;
      }
    }
    return streak;
  };
  const streak = calculateStreak();

  // Mini Calendar logic
  const renderMiniCalendar = () => {
    const currentMonth = new Date();
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const isCurrentMonth = isSameMonth(cloneDay, monthStart);
        const isToday = isSameDay(cloneDay, new Date());
        const hasLesson = lessons.some(l => l.date && isSameDay(parseISO(l.date), cloneDay));
        const hasCompleted = completedLessons.some(l => l.completedAt && isSameDay(parseISO(l.completedAt), cloneDay));

        days.push(
          <div key={day.toString()} className="flex justify-center items-center py-1 relative">
            <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full
              ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
              ${isToday ? 'bg-blue-600 text-white font-bold' : ''}
              ${!isToday && hasCompleted ? 'bg-green-100 text-green-700' : ''}
            `}>
              {format(cloneDay, 'd')}
            </span>
            {!isToday && !hasCompleted && hasLesson && <div className="absolute bottom-0 w-1 h-1 bg-orange-400 rounded-full"></div>}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="grid grid-cols-7" key={day.toString()}>{days}</div>);
      days = [];
    }
    return rows;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery) navigate(`/search?q=${searchQuery}`); // We can implement a search page later or just rely on global state.
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex-1 w-full max-w-md">
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="ค้นหาบทเรียน, โน้ต, หรือทรัพยากร..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </form>
        </div>
        <div className="flex gap-2">
           <Link to="/lessons/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
             <Plus className="w-4 h-4" /> เพิ่มบทเรียน
           </Link>
        </div>
      </div>

      {/* Hero Welcome */}
      <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute -bottom-10 left-20 w-48 h-48 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="relative z-10 w-full">
          <div className="flex items-center gap-2 text-blue-300 text-sm font-medium mb-2">
             <CalendarIcon className="w-4 h-4" /> เดือนปัจจุบัน (1/6)
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 flex items-center gap-3">สวัสดีครับ 👋</h1>
          <p className="text-slate-300 max-w-lg leading-relaxed text-sm md:text-base">
            "เรียนทีละบท ทำทีละขั้น เพื่อไปถึงเป้าหมายที่ใหญ่กว่า"<br/>
            มุ่งสู่เป้าหมายวิศวกรรมคอมพิวเตอร์และ AI ของคุณใน 6 เดือน
          </p>
        </div>
        <div className="relative z-10 flex gap-4 w-full md:w-auto">
          {/* Streak Widget */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4 flex-1 md:flex-none">
            <div className="bg-orange-500/20 p-3 rounded-full">
              <Flame className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-slate-300">เรียนต่อเนื่อง</p>
              <p className="text-xl font-bold">{streak} วัน</p>
            </div>
          </div>
          {/* Progress Widget */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4 flex-1 md:flex-none">
            <div className="bg-blue-500/20 p-3 rounded-full">
              <BookOpen className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-300">ความก้าวหน้า</p>
              <p className="text-xl font-bold">{progressPercent}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Today's Study */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-5">
               <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                 <CalendarIcon className="w-5 h-5 text-blue-600" /> วันนี้ต้องเรียนอะไร?
               </h2>
            </div>
            <div className="space-y-4">
              {todayLessons.length === 0 && <p className="text-gray-500 text-sm">ไม่มีบทเรียนที่ต้องเรียนวันนี้</p>}
              {todayLessons.map(lesson => (
                <div key={lesson.id} className="group border border-gray-100 bg-white rounded-2xl p-4 hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row gap-4">
                  {/* Thumbnail Placeholder */}
                  <div className={`w-full sm:w-32 h-24 rounded-xl flex-shrink-0 flex items-center justify-center text-white ${SUBJECTS[lesson.subjectId].color}`}>
                    <span className="text-xs font-bold text-center px-2">{SUBJECTS[lesson.subjectId].name}</span>
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-gray-900 text-base leading-tight group-hover:text-blue-600 transition-colors">{lesson.title}</h3>
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-medium whitespace-nowrap ml-2">กำลังเรียน</span>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> {lesson.durationHours} ชม.</span>
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/> {lesson.difficulty}</span>
                      </p>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Link to={`/lessons/${lesson.id}`} className="bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
                        ดูบทเรียนต่อ
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6-Month Roadmap */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-5">
               <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                 <Map className="w-5 h-5 text-purple-600" /> แผนการเรียน 6 เดือน
               </h2>
               <Link to="/roadmap" className="text-sm text-blue-600 hover:underline">ดูทั้งหมด</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(m => {
                 const monthLessons = lessons.filter(l => l.month === m);
                 const mCompleted = monthLessons.filter(l => l.status === 'COMPLETED').length;
                 const mPercent = monthLessons.length ? Math.round((mCompleted/monthLessons.length)*100) : 0;
                 return (
                   <div key={m} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                     <div className="flex justify-between items-start mb-3">
                       <span className="bg-white text-gray-900 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">M{m}</span>
                       <span className="text-xs font-bold text-gray-500">{mCompleted}/{monthLessons.length}</span>
                     </div>
                     <h3 className="font-bold text-sm text-gray-900 mb-2">เดือนที่ {m}</h3>
                     <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{width: `${mPercent}%`}}></div>
                     </div>
                   </div>
                 )
              })}
            </div>
          </div>

          {/* Recent Resources */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-5">
              <LinkIcon className="w-5 h-5 text-green-600" /> ทรัพยากรล่าสุด
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {allResources.length === 0 && <p className="text-sm text-gray-500">ยังไม่มีทรัพยากร</p>}
               {allResources.map(r => (
                 <a href={r.url} target="_blank" rel="noreferrer" key={r.id} className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors group">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 group-hover:text-blue-600 transition-colors flex-shrink-0">
                      {r.type === 'youtube' ? <PlayCircle className="w-6 h-6 text-red-500"/> : r.type === 'document' ? <FileText className="w-6 h-6"/> : <LinkIcon className="w-6 h-6"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{r.title}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{r.lessonTitle}</p>
                    </div>
                 </a>
               ))}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* Overall Progress List */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-5">ความก้าวหน้าแยกวิชา</h2>
            <div className="space-y-4">
               {Object.values(SUBJECTS).map(subject => {
                  const subLessons = lessons.filter(l => l.subjectId === subject.id);
                  const subCompleted = subLessons.filter(l => l.status === 'COMPLETED').length;
                  const percent = subLessons.length ? Math.round((subCompleted/subLessons.length)*100) : 0;
                  return (
                    <Link to={`/subjects/${subject.id}`} key={subject.id} className="block group">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${subject.color}`}></div>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{subject.name}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-500">{subCompleted}/{subLessons.length}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${subject.color} transition-all duration-500`} style={{ width: `${percent}%` }} />
                      </div>
                    </Link>
                  )
               })}
            </div>
          </div>

          {/* Mini Calendar */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
             <div className="flex justify-between items-center mb-4">
               <h2 className="text-sm font-bold text-gray-900">{format(new Date(), 'MMMM yyyy', {locale: th})}</h2>
               <Link to="/calendar" className="text-xs text-blue-600 hover:underline">ดูปฏิทินเต็ม</Link>
             </div>
             <div className="grid grid-cols-7 mb-2">
               {['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map(d => <div key={d} className="text-center text-[10px] font-bold text-gray-400">{d}</div>)}
             </div>
             <div className="space-y-1">
               {renderMiniCalendar()}
             </div>
          </div>

          {/* Things I don't understand */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
             <div className="flex justify-between items-center mb-5">
               <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                 <AlertCircle className="w-5 h-5 text-red-500" /> ต้องทบทวน
               </h2>
             </div>
             <div className="space-y-3">
               {urgentUnclear.length === 0 && <p className="text-sm text-gray-500">ไม่มีเรื่องที่ค้างทบทวน</p>}
               {urgentUnclear.map(u => (
                 <Link to="/not-understood" key={u.id} className="block p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                   <div className="flex justify-between items-start mb-1">
                     <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{u.topic}</h4>
                     <span className={`text-[10px] px-2 py-0.5 rounded-full ${u.priority === 'High'?'bg-red-50 text-red-600':u.priority === 'Medium'?'bg-orange-50 text-orange-600':'bg-green-50 text-green-600'}`}>{u.priority}</span>
                   </div>
                   <p className="text-xs text-gray-500">{SUBJECTS[u.subjectId]?.name}</p>
                 </Link>
               ))}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Custom Map Icon since it wasn't imported properly previously if missing
function Map(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
}
