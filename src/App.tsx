import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { SubjectPage } from './pages/SubjectPage';
import { LessonDetail } from './pages/LessonDetail';
import { Settings } from './pages/Settings';
import { CalendarPage } from './pages/CalendarPage';
import { NotUnderstoodPage } from './pages/NotUnderstoodPage';
import { ProgressPage } from './pages/ProgressPage';
import { SearchPage } from './pages/SearchPage';

// Placeholder components for other routes
const Placeholder = ({ title }: { title: string }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
    <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
    <p className="text-gray-500 mt-2">หน้านี้กำลังอยู่ระหว่างการพัฒนา</p>
  </div>
);

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/roadmap" element={<Placeholder title="แผน 6 เดือน" />} />
        <Route path="/subjects/:id" element={<SubjectPage />} />
        <Route path="/lessons/:id" element={<LessonDetail />} />
        <Route path="/not-understood" element={<NotUnderstoodPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

export default App;
