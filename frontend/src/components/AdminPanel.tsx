// @ts-nocheck
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI, authAPI } from '../services/api';
import api from '../services/api';
import {
  FaUsers,
  FaFileAlt,
  FaComments,
  FaTrash,
  FaBan,
  FaCheck,
  FaChartBar,
  FaSignOutAlt,
  FaUser,
  FaBullhorn,
  FaShieldAlt,
  FaCog,
  FaPlus,
  FaEdit
} from 'react-icons/fa';
import AdminAnnouncements from './AdminAnnouncements';
import AdminSecurity from './AdminSecurity';
import AdminSiteSettings from './AdminSiteSettings';
import AdminModerationQueue from './AdminModerationQueue';

const tabs = [
  { id: 'stats', name: '统计概览', icon: FaChartBar },
  { id: 'users', name: '用户管理', icon: FaUsers },
  { id: 'posts', name: '文章管理', icon: FaFileAlt },
  { id: 'comments', name: '评论管理', icon: FaComments },
  { id: 'moderation', name: '审核队列', icon: FaShieldAlt },
  { id: 'announcements', name: '公告管理', icon: FaBullhorn },
  { id: 'settings', name: '站点设置', icon: FaCog },
  { id: 'security', name: '安全', icon: FaShieldAlt }
];

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="card p-6 flex items-center gap-4">
    <div className="w-12 h-12 rounded-xl border border-neutral-200 dark:border-neutral-800 grid place-items-center text-neutral-900 dark:text-white">
      <Icon className="text-lg" />
    </div>
    <div>
      <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="text-2xl font-bold text-neutral-900 dark:text-white">{value ?? 0}</div>
    </div>
  </div>
);

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      await authAPI.adminLogout();
    } catch {
      // 即使后端 logout 失败也清前端
    }
    localStorage.removeItem('token');
    localStorage.removeItem('adminUser');
    delete api.defaults.headers.common['Authorization'];
    window.location.href = '/';
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (activeTab === 'stats') {
          const r = await adminAPI.getStats();
          if (r.data.success) setStats(r.data.data);
        } else if (activeTab === 'users') {
          const r = await adminAPI.getUsers();
          if (r.data.success) setUsers(r.data.data);
        } else if (activeTab === 'posts') {
          const r = await adminAPI.getPosts();
          if (r.data.success) setPosts(r.data.data);
        } else if (activeTab === 'comments') {
          const r = await adminAPI.getComments();
          if (r.data.success) setComments(r.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeTab]);

  const refetchUsers = async () => {
    const r = await adminAPI.getUsers();
    if (r.data.success) setUsers(r.data.data);
  };

  const handleUpdateUserStatus = async (userId, status) => {
    try {
      await adminAPI.updateUserStatus(userId, status);
      refetchUsers();
    } catch {
      alert('操作失败');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('确定要删除这个用户吗？将删除其所有文章和评论。')) return;
    try {
      await adminAPI.deleteUser(userId);
      refetchUsers();
    } catch {
      alert('删除失败');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('确定要删除这篇文章吗？')) return;
    try {
      await adminAPI.deletePost(postId);
      const r = await adminAPI.getPosts();
      if (r.data.success) setPosts(r.data.data);
    } catch {
      alert('删除失败');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('确定要删除这条评论吗？')) return;
    try {
      await adminAPI.deleteComment(commentId);
      const r = await adminAPI.getComments();
      if (r.data.success) setComments(r.data.data);
    } catch {
      alert('删除失败');
    }
  };

  const renderStats = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      <StatCard icon={FaUsers} label="用户总数" value={stats.totalUsers} />
      <StatCard icon={FaFileAlt} label="文章总数" value={stats.totalPosts} />
      <StatCard icon={FaComments} label="评论总数" value={stats.totalComments} />
    </div>
  );

  const renderUsers = () => (
    <div className="card overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
        <h3 className="font-semibold text-neutral-900 dark:text-white">用户列表</h3>
      </div>
      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {users.map((u) => (
          <div key={u._id} className="px-6 py-4 flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {u.avatar ? (
                <img src={u.avatar} alt={u.username} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 grid place-items-center text-neutral-500">
                  <FaUser />
                </div>
              )}
              <div className="min-w-0">
                <div className="font-medium text-neutral-900 dark:text-white truncate">{u.username}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{u.email}</div>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                  u.role === 'admin'
                    ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                    : 'border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400'
                }`}>
                  {u.role === 'admin' ? '管理员' : '普通用户'}
                </span>
              </div>
            </div>

            {u.role !== 'admin' && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleUpdateUserStatus(u._id, { canComment: !u.canComment, canLogin: u.canLogin })}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    u.canComment
                      ? 'border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900'
                      : 'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700 dark:border-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200'
                  }`}
                >
                  {u.canComment ? <FaCheck /> : <FaBan />} 评论
                </button>
                <button
                  onClick={() => handleUpdateUserStatus(u._id, { canComment: u.canComment, canLogin: !u.canLogin })}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    u.canLogin
                      ? 'border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900'
                      : 'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700 dark:border-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200'
                  }`}
                >
                  {u.canLogin ? <FaCheck /> : <FaBan />} 登录
                </button>
                <button onClick={() => handleDeleteUser(u._id)} className="btn btn-danger text-xs px-3 py-1.5">
                  <FaTrash /> 删除
                </button>
              </div>
            )}
          </div>
        ))}
        {users.length === 0 && (
          <div className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400">暂无用户</div>
        )}
      </div>
    </div>
  );

  const renderPosts = () => (
    <div className="card overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-neutral-900 dark:text-white">文章列表</h3>
        <Link
          to="/create"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700 dark:border-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors"
        >
          <FaPlus /> 新建文章
        </Link>
      </div>
      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {posts.map((p) => (
          <div key={p._id} className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-neutral-900 dark:text-white truncate">{p.title}</h4>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 flex gap-3 flex-wrap">
                <span>作者：{p.author?.username || '—'}</span>
                <span>发布：{new Date(p.createdAt).toLocaleDateString()}</span>
                <span>阅读：{p.viewCount || 0}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link to={`/edit/${p._id}`} className="btn btn-secondary text-xs px-3 py-1.5">
                <FaEdit /> 编辑
              </Link>
              <button onClick={() => handleDeletePost(p._id)} className="btn btn-danger text-xs px-3 py-1.5">
                <FaTrash /> 删除
              </button>
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <div className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400">暂无文章</div>
        )}
      </div>
    </div>
  );

  const renderComments = () => (
    <div className="card overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
        <h3 className="font-semibold text-neutral-900 dark:text-white">评论列表</h3>
      </div>
      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {comments.map((c) => (
          <div key={c._id} className="px-6 py-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-neutral-800 dark:text-neutral-200 line-clamp-2">{c.content}</p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 flex gap-3 flex-wrap">
                <span>作者：{c.author?.username || '—'}</span>
                <span>文章：{c.post?.title || '—'}</span>
                <span>时间：{new Date(c.createdAt).toLocaleDateString()}</span>
              </p>
            </div>
            <button onClick={() => handleDeleteComment(c._id)} className="btn btn-danger shrink-0">
              <FaTrash /> 删除
            </button>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400">暂无评论</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black">
      <header className="bg-white/80 dark:bg-black/70 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 dark:bg-white grid place-items-center">
              <FaChartBar className="text-white dark:text-neutral-900" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-neutral-900 dark:text-white leading-tight">后台管理</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Personal Blog Admin</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-danger">
            <FaSignOutAlt /> 退出
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 overflow-x-auto -mb-px">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`whitespace-nowrap inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    active
                      ? 'border-neutral-900 text-neutral-900 dark:border-white dark:text-white'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                  }`}
                >
                  <Icon className="text-sm" /> {t.name}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && activeTab !== 'announcements' && activeTab !== 'settings' && activeTab !== 'security' && activeTab !== 'moderation' ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 animate-pulse"></div>
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'stats' && renderStats()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'posts' && renderPosts()}
            {activeTab === 'comments' && renderComments()}
            {activeTab === 'moderation' && <AdminModerationQueue />}
            {activeTab === 'announcements' && <AdminAnnouncements />}
            {activeTab === 'settings' && <AdminSiteSettings />}
            {activeTab === 'security' && <AdminSecurity />}
          </>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
