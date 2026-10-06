// @ts-nocheck
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminAPI, authAPI } from '../services/api';
import api from '../services/api';
import {
  FaUsers,
  FaFileAlt,
  FaComments,
  FaTrash,
  FaBan,
  FaCheck,
  FaUser,
  FaEdit,
  FaArrowRight
} from 'react-icons/fa';
import AdminAnnouncements from './AdminAnnouncements';
import AdminSecurity from './AdminSecurity';
import AdminAppearance from './AdminAppearance';
import StudioLayout, { StudioWriteAction } from './StudioLayout';
import { studioGroups } from '../utils/studioNavigation';
import AdminModerationQueue from './AdminModerationQueue';
import AdminProfile from './AdminProfile';
import AdminAiSettings from './AdminAiSettings';
import AdminTranslationQueue from './AdminTranslationQueue';
import AdminFriendLinks from './AdminFriendLinks';
import AdminOAuthProviders from './AdminOAuthProviders';

const tabs = studioGroups.flatMap(group => group.items);
const dataTabs = ['stats', 'users', 'posts', 'comments'];

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="studio-stat">
    <dt className="studio-stat-heading"><span>{label}</span><Icon aria-hidden="true" /></dt>
    <dd>{typeof value === 'number' ? value.toLocaleString('zh-CN') : '—'}</dd>
    <p className="studio-stat-note">当前站点累计</p>
  </div>
);

const AdminPanel = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = tabs.some(tab => tab.id === searchParams.get('tab')) ? searchParams.get('tab') : 'stats';
  const currentTab = tabs.find(tab => tab.id === activeTab);
  const setActiveTab = (id) => setSearchParams({ tab: id });
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

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
    let cancelled = false;
    const load = async () => {
      setLoadError('');
      setActionError('');
      if (!dataTabs.includes(activeTab)) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const loaders = {
          stats: [adminAPI.getStats, setStats],
          users: [adminAPI.getUsers, setUsers],
          posts: [adminAPI.getPosts, setPosts],
          comments: [adminAPI.getComments, setComments],
        };
        const [fetch, update] = loaders[activeTab];
        const response = await fetch();
        if (!response.data.success) throw new Error(response.data.message || '加载失败');
        if (!cancelled) update(response.data.data);
      } catch (err) {
        if (!cancelled) setLoadError(err.response?.data?.message || err.message || '加载失败，请重试');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [activeTab, reloadKey]);

  const refetchUsers = async () => {
    const r = await adminAPI.getUsers();
    if (r.data.success) setUsers(r.data.data);
  };

  const handleUpdateUserStatus = async (userId, status) => {
    try {
      await adminAPI.updateUserStatus(userId, status);
      await refetchUsers();
    } catch {
      setActionError('操作失败，请重试');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('确定要删除这个用户吗？将删除其所有文章和评论。')) return;
    try {
      await adminAPI.deleteUser(userId);
      await refetchUsers();
    } catch {
      setActionError('删除失败，请重试');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('确定要删除这篇文章吗？')) return;
    try {
      await adminAPI.deletePost(postId);
      const r = await adminAPI.getPosts();
      if (r.data.success) setPosts(r.data.data);
    } catch {
      setActionError('删除失败，请重试');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('确定要删除这条评论吗？')) return;
    try {
      await adminAPI.deleteComment(commentId);
      const r = await adminAPI.getComments();
      if (r.data.success) setComments(r.data.data);
    } catch {
      setActionError('删除失败，请重试');
    }
  };

  const renderStats = () => (
    <>
      <dl className="studio-stat-grid" aria-label="站点累计统计">
        <StatCard icon={FaUsers} label="用户总数" value={stats.totalUsers} />
        <StatCard icon={FaFileAlt} label="文章总数" value={stats.totalPosts} />
        <StatCard icon={FaComments} label="评论总数" value={stats.totalComments} />
      </dl>
      <div className="studio-overview-grid">
        <section className="card studio-intro">
          <p className="studio-eyebrow">A PLACE TO CREATE</p>
          <h2>为下一个想法，留一页空白。</h2>
          <p>在这里整理文章、回应读者，也照顾这个小小的数字花园。无需匆忙，好的内容值得慢慢打磨。</p>
          <StudioWriteAction />
        </section>
        <section className="card studio-quick-links">
          <h2>常用入口</h2>
          <button type="button" data-studio-nav onClick={() => setActiveTab('moderation')}><span>查看待审核内容</span><FaArrowRight aria-hidden="true" /></button>
          <button type="button" data-studio-nav onClick={() => setActiveTab('settings')}><span>调整站点外观与内容</span><FaArrowRight aria-hidden="true" /></button>
          <button type="button" data-studio-nav onClick={() => setActiveTab('announcements')}><span>管理站点公告</span><FaArrowRight aria-hidden="true" /></button>
        </section>
      </div>
    </>
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
        <span className="text-xs text-neutral-500">共 {posts.length} 篇文章</span>
      </div>
      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {posts.map((p) => (
          <div key={p._id} className="studio-record-row px-6 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-neutral-900 dark:text-white truncate">{p.title}</h4>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 flex gap-3 flex-wrap">
                <span>
                  作者：{p.author?.name || p.author?.username || '—'}
                  {p.author?.role === 'admin' && (
                    <span className="ml-1.5 font-medium text-blue-600 dark:text-blue-400">[admin]</span>
                  )}
                </span>
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
          <div key={c._id} className="studio-record-row px-6 py-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-neutral-800 dark:text-neutral-200 line-clamp-2">{c.content}</p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 flex gap-3 flex-wrap">
                <span>
                  作者：{c.author?.name || c.author?.username || '—'}
                  {c.author?.role === 'admin' && (
                    <span className="ml-1.5 font-medium text-blue-600 dark:text-blue-400">[admin]</span>
                  )}
                </span>
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
    <StudioLayout title={currentTab.name} subtitle={currentTab.description} activeTab={activeTab} onSelectTab={setActiveTab} onLogout={handleLogout} actions={activeTab === 'stats' || activeTab === 'posts' ? <StudioWriteAction /> : undefined}>
      {actionError && <div className="studio-notice is-error" role="alert"><span>{actionError}</span><button type="button" className="btn btn-secondary" onClick={() => setActionError('')}>关闭</button></div>}
      {dataTabs.includes(activeTab) && loading ? (
        <div className="card studio-loading" role="status"><span className="loading-spinner" aria-hidden="true" /> 正在整理工作区…</div>
      ) : dataTabs.includes(activeTab) && loadError ? (
        <div className="studio-notice is-error" role="alert"><span>{loadError}</span><button type="button" className="btn btn-secondary" onClick={() => setReloadKey(key => key + 1)}>重新加载</button></div>
      ) : (
        <>
          {activeTab === 'stats' && renderStats()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'posts' && renderPosts()}
          {activeTab === 'comments' && renderComments()}
          {activeTab === 'moderation' && <AdminModerationQueue />}
          {activeTab === 'announcements' && <AdminAnnouncements />}
          {activeTab === 'settings' && <AdminAppearance />}
          {activeTab === 'profile' && <AdminProfile />}
          {activeTab === 'security' && <AdminSecurity />}
          {activeTab === 'aimodel' && <AdminAiSettings />}
          {activeTab === 'translate' && <AdminTranslationQueue />}
          {activeTab === 'friendlinks' && <AdminFriendLinks />}
          {activeTab === 'oauth' && <AdminOAuthProviders />}
        </>
      )}
    </StudioLayout>
  );
};

export default AdminPanel;
