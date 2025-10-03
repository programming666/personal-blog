import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PostPage from './pages/PostPage';
import UserDashboard from './pages/UserDashboard';
import CreatePost from './pages/CreatePost';
import EditPost from './pages/EditPost';
import GitHubCallback from './pages/GitHubCallback';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import TeamPage from './pages/TeamPage';
import AdminPage from './pages/AdminPage';
import UserMessages from './components/UserMessages';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="container mx-auto px-4 py-8 flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/posts/:id" element={<PostPage />} />
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/create" element={<CreatePost />} />
            <Route path="/edit/:id" element={<EditPost />} />
            <Route path="/github-callback" element={<GitHubCallback />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/messages" element={<UserMessages />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
