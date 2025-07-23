import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { postsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FaEdit, FaTrash, FaPlus, FaEye, FaThumbsUp, FaClock, FaSpinner, FaFileAlt } from 'react-icons/fa';

const UserDashboard = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingPostId, setDeletingPostId] = useState(null);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/dashboard' } });
    } else if (isAuthenticated) {
      fetchUserPosts();
    }
  }, [isAuthenticated, navigate]);

  // 获取用户文章
  const fetchUserPosts = async () => {
    try {
      setLoading(true);
      const response = await postsAPI.getUserPosts();
      setPosts(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching user posts:', err);
      setError('获取文章失败，请刷新页面重试');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 处理文章删除
  const handleDelete = async (postId) => {
    if (!window.confirm('确定要删除这篇文章吗？此操作不可恢复。')) {
      return;
    }

    try {
      setDeletingPostId(postId);
      await postsAPI.deletePost(postId);
      setPosts(posts.filter(post => post._id !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('删除失败，请稍后再试');
    } finally {
      setDeletingPostId(null);
    }
  };

  // 如果仍在加载中
  if (loading && isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mb-6"></div>
        <h2 className="text-xl font-medium text-gray-600 dark:text-gray-300">正在加载您的文章...</h2>
      </div>
    );
  }

  // 如果未登录（不显示给已登录用户）
  if (!isAuthenticated && !loading) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面标题和操作区 */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">控制台</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">管理您的文章和账户</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/create"
            className="inline-flex items-center bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg transition"
          >
            <FaPlus className="mr-2" /> 写文章
          </Link>
        </div>
      </div>

      {/* 用户信息卡片 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-10 flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex items-center mb-4 md:mb-0">
          <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mr-4">
            <FaFileAlt className="text-2xl text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{user?.username || '用户'}</h2>
            <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{posts.length}</div>
            <div className="text-gray-500 dark:text-gray-400 text-sm">文章总数</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {posts.reduce((total, post) => total + (post.viewCount || 0), 0)}
            </div>
            <div className="text-gray-500 dark:text-gray-400 text-sm">总阅读量</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {posts.reduce((total, post) => total + (post.likes?.length || 0), 0)}
            </div>
            <div className="text-gray-500 dark:text-gray-400 text-sm">总点赞数</div>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchUserPosts}
            className="text-sm font-medium text-primary hover:text-primary/80"
          >
            刷新
          </button>
        </div>
      )}

      {/* 文章列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">我的文章</h2>
        </div>

        {posts.length === 0 && !loading ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaFileAlt className="text-2xl text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-500 dark:text-gray-400 mb-2">暂无文章</h3>
            <p className="text-gray-400 dark:text-gray-500 max-w-md mx-auto mb-6">
              您还没有发布任何文章。创建您的第一篇文章，分享您的想法和知识。
            </p>
            <Link
              to="/create"
              className="inline-flex items-center bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg transition"
            >
              <FaPlus className="mr-2" /> 创建第一篇文章
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">标题</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">发布日期</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">统计</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {posts.map((post) => (
                  <tr key={post._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <Link
                            to={`/posts/${post._id}`}
                            className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary"
                          >
                            {post.title}
                          </Link>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {post.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="inline-block mr-2">{tag}</span>
                            ))}
                            {post.tags.length > 2 && (
                              <span className="inline-block text-gray-400 dark:text-gray-500">+{post.tags.length - 2} 标签</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${post.status === 'published'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}
                      `}>
                        {post.status === 'published' ? '已发布' : '草稿'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(post.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center"><FaEye className="mr-1" /> {post.viewCount || 0}</div>
                        <div className="flex items-center"><FaThumbsUp className="mr-1" /> {post.likes?.length || 0}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/posts/${post._id}`}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1.5"
                          title="查看"
                        >
                          <FaEye />
                        </Link>
                        <Link
                          to={`/edit/${post._id}`}
                          className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1.5"
                          title="编辑"
                        >
                          <FaEdit />
                        </Link>
                        <button
                          onClick={() => handleDelete(post._id)}
                          disabled={deletingPostId === post._id}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1.5"
                          title="删除"
                        >
                          {deletingPostId === post._id ? (
                            <FaSpinner className="animate-spin" />
                          ) : (
                            <FaTrash />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
