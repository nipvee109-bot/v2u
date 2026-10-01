import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';

// Code-split pages for high-performance on-demand chunk loading
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const PlannerPage = lazy(() => import('./pages/PlannerPage').then((m) => ({ default: m.PlannerPage })));
const WeeklyReviewPage = lazy(() => import('./pages/WeeklyReviewPage').then((m) => ({ default: m.WeeklyReviewPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const RoadmapPage = lazy(() => import('./pages/RoadmapPage').then((m) => ({ default: m.RoadmapPage })));
const GoalsPage = lazy(() => import('./pages/GoalsPage').then((m) => ({ default: m.GoalsPage })));
const ResourcesPage = lazy(() => import('./pages/ResourcesPage').then((m) => ({ default: m.ResourcesPage })));
const SubjectPage = lazy(() => import('./pages/SubjectPage').then((m) => ({ default: m.SubjectPage })));
const LessonDetail = lazy(() => import('./pages/LessonDetail').then((m) => ({ default: m.LessonDetail })));
const StudyRoom = lazy(() => import('./pages/StudyRoom').then((m) => ({ default: m.StudyRoom })));
const NotUnderstoodPage = lazy(() => import('./pages/NotUnderstoodPage').then((m) => ({ default: m.NotUnderstoodPage })));
const ProgressPage = lazy(() => import('./pages/ProgressPage').then((m) => ({ default: m.ProgressPage })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));

function PageLoadingFallback() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center" aria-live="polite" aria-busy="true">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
        <span className="text-xs font-semibold text-slate-500">กำลังโหลดข้อมูล...</span>
      </div>
    </div>
  );
}

function App() {
  return (
    <Layout>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/calendar" element={<PlannerPage />} />
          <Route path="/weekly-review" element={<WeeklyReviewPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/subjects/:id" element={<SubjectPage />} />
          <Route path="/lessons/:id" element={<LessonDetail />} />
          <Route path="/study/:id" element={<StudyRoom />} />
          <Route path="/study-room/:id" element={<StudyRoom />} />
          <Route path="/not-understood" element={<NotUnderstoodPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;
