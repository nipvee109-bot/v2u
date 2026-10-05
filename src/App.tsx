import { lazy, Suspense, useSyncExternalStore } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { getCmsOverlay, subscribeCmsOverlay } from './cms/overlay';

// Admin CMS (Phase 72) — its own shell, outside the learner Layout; loaded only on /admin
const AdminApp = lazy(() => import('./admin/AdminApp').then((m) => ({ default: m.AdminApp })));
import { PageErrorBoundary, PageSkeleton } from './components/ui/states';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { LegacyLessonRoute } from './pages/legacy/LegacyLessonRoute';

// V2U primary section hubs (Phase 41)
const LearnHub = lazy(() => import('./pages/hubs/LearnHub').then((m) => ({ default: m.LearnHub })));
const ReviewHub = lazy(() => import('./pages/hubs/ReviewHub').then((m) => ({ default: m.ReviewHub })));
const RouteHub = lazy(() => import('./pages/hubs/RouteHub').then((m) => ({ default: m.RouteHub })));
const DiagnosticPage = lazy(() => import('./pages/DiagnosticPage').then((m) => ({ default: m.DiagnosticPage })));
const CurriculumPage = lazy(() => import('./pages/CurriculumPage').then((m) => ({ default: m.CurriculumPage })));
const CurriculumLessonPage = lazy(() => import('./pages/CurriculumLessonPage').then((m) => ({ default: m.CurriculumLessonPage })));
const MeHub = lazy(() => import('./pages/hubs/MeHub').then((m) => ({ default: m.MeHub })));
// Full legacy learning overview (former Home) — kept reachable from เรียน
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));

// Code-split pages for high-performance on-demand chunk loading
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const PlannerPage = lazy(() => import('./pages/PlannerPage').then((m) => ({ default: m.PlannerPage })));
const WeeklyReviewPage = lazy(() => import('./pages/WeeklyReviewPage').then((m) => ({ default: m.WeeklyReviewPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const RoadmapPage = lazy(() => import('./pages/RoadmapPage').then((m) => ({ default: m.RoadmapPage })));
const GoalsPage = lazy(() => import('./pages/GoalsPage').then((m) => ({ default: m.GoalsPage })));
const ResourcesPage = lazy(() => import('./pages/ResourcesPage').then((m) => ({ default: m.ResourcesPage })));
const SubjectPage = lazy(() => import('./pages/SubjectPage').then((m) => ({ default: m.SubjectPage })));
const StudyRoom = lazy(() => import('./pages/StudyRoom').then((m) => ({ default: m.StudyRoom })));
const ReviewRoom = lazy(() => import('./pages/ReviewRoom').then((m) => ({ default: m.ReviewRoom })));
const NotUnderstoodPage = lazy(() => import('./pages/NotUnderstoodPage').then((m) => ({ default: m.NotUnderstoodPage })));
const ProgressPage = lazy(() => import('./pages/ProgressPage').then((m) => ({ default: m.ProgressPage })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));

function PageLoadingFallback() {
  return <PageSkeleton />;
}

function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<Suspense fallback={<PageLoadingFallback />}><AdminApp /></Suspense>} />
      <Route path="*" element={<LearnerApp />} />
    </Routes>
  );
}

function LearnerApp() {
  // Published CMS data arrives after the first render; re-render learner pages when it lands.
  useSyncExternalStore(subscribeCmsOverlay, getCmsOverlay);
  return (
    <Layout>
      <PageErrorBoundary>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          {/* V2U primary navigation (5 sections) */}
          <Route path="/" element={<HomePage />} />
          <Route path="/learn" element={<LearnHub />} />
          <Route path="/learn/curriculum" element={<CurriculumPage />} />
          <Route path="/learn/curriculum/:lessonId" element={<CurriculumLessonPage />} />
          <Route path="/review" element={<ReviewHub />} />
          <Route path="/route" element={<RouteHub />} />
          <Route path="/me" element={<MeHub />} />
          <Route path="/me/diagnostic" element={<DiagnosticPage />} />

          {/* Compatibility redirects */}
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/subjects" element={<Navigate to="/learn" replace />} />
          <Route path="/lessons" element={<Navigate to="/learn" replace />} />
          <Route path="/study" element={<Navigate to="/learn" replace />} />
          <Route path="/study-room" element={<Navigate to="/learn" replace />} />
          <Route path="/review-room" element={<Navigate to="/review" replace />} />
          <Route path="/profile" element={<Navigate to="/me" replace />} />

          {/* Legacy deep links (unchanged) */}
          <Route path="/search" element={<SearchPage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/calendar" element={<PlannerPage />} />
          <Route path="/weekly-review" element={<WeeklyReviewPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/subjects/:id" element={<SubjectPage />} />
          <Route path="/lessons/:id" element={<LegacyLessonRoute />} />
          <Route path="/study/:id" element={<StudyRoom />} />
          <Route path="/study-room/:id" element={<StudyRoom />} />
          <Route path="/review/:id" element={<ReviewRoom />} />
          <Route path="/review-room/:id" element={<ReviewRoom />} />
          <Route path="/not-understood" element={<NotUnderstoodPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </PageErrorBoundary>
    </Layout>
  );
}

export default App;
