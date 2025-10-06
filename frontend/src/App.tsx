import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import PostPage from './pages/PostPage';
import CreatePost from './pages/CreatePost';
import EditPost from './pages/EditPost';
import GitHubCallback from './pages/GitHubCallback';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import TeamPage from './pages/TeamPage';
import AdminPage from './pages/AdminPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import './index.css';

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 w-full">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/posts/:id" element={<PostPage />} />
          <Route path="/create" element={<CreatePost />} />
          <Route path="/edit/:id" element={<EditPost />} />
          <Route path="/github-callback" element={<GitHubCallback />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
