import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import GitHubCallback from './pages/GitHubCallback';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import './index.css';

// 重依赖页面按路由懒加载:react-markdown / katex / highlight.js / 后台面板
// 只进对应 chunk,首页首屏不再下载(主 JS 从 ~596KB 大幅瘦身)
const PostPage = lazy(() => import('./pages/PostPage'));
const CreatePost = lazy(() => import('./pages/CreatePost'));
const EditPost = lazy(() => import('./pages/EditPost'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'));
const FriendsPage = lazy(() => import('./pages/FriendsPage'));

const Fallback = () => (
  <div className="flex items-center justify-center py-24 text-neutral-400">
    <span className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mr-3" />
    加载中…
  </div>
);

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 w-full">
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/posts/:id" element={<PostPage />} />
            <Route path="/create" element={<CreatePost />} />
            <Route path="/edit/:id" element={<EditPost />} />
            <Route path="/github-callback" element={<GitHubCallback />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/friends" element={<FriendsPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default App;