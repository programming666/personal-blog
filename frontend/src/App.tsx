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
import './index.css';

function App() {
  return (
    <AuthProvider>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/posts/:id" element={<PostPage />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/create" element={<CreatePost />} />
          <Route path="/edit/:id" element={<EditPost />} />
          <Route path="/github-callback" element={<GitHubCallback />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}

export default App;
