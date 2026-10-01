import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { SubjectPage } from './pages/SubjectPage';
import { LessonDetail } from './pages/LessonDetail';
import { Settings } from './pages/Settings';
import { PlannerPage } from './pages/PlannerPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { NotUnderstoodPage } from './pages/NotUnderstoodPage';
import { ProgressPage } from './pages/ProgressPage';
import { GoalsPage } from './pages/GoalsPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { SearchPage } from './pages/SearchPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/calendar" element={<PlannerPage />} />
        <Route path="/roadmap" element={<RoadmapPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
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
