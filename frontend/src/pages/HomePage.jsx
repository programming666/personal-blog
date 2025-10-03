import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { postsAPI } from '../services/api';
import { FaExternalLinkAlt, FaEye, FaThumbsUp, FaClock } from 'react-icons/fa';

const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 格式化日期
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 获取文章列表
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await postsAPI.getAllPosts({ page, limit: 10 });
      setPosts(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
    } catch (err) {
      setError('无法加载文章列表，请稍后再试');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  // 页面加载或页码变化时获取文章
  useEffect(() => {
    fetchPosts();
    window.scrollTo(0, 0);
  }, [page]);

  // 处理分页
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  if (loading && page === 1) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">最新博客文章</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          探索大家的技术分享、学习心得或日常思考，希望能给你带来快乐
        </p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* 文章列表 */}
      {posts.length === 0 && !loading ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg dark:bg-gray-800/50">
          <h3 className="text-xl font-medium text-gray-500 dark:text-gray-400">暂无文章</h3>
          <p className="mt-2 text-gray-400 dark:text-gray-500">看起来这里还是空的，快去创建你的第一篇文章吧！</p>
          <Link
            to="/create"
            className="mt-4 inline-block bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg transition"
          >
            写文章
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <article
              key={post._id}
              className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              {/* 文章缩略图 */}
              <div className="h-48 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                {post.thumbnail ? (
                  <img
                    src={post.thumbnail}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-blue-500/10 dark:from-primary/20 dark:to-blue-500/20">
                    <div className="text-5xl text-primary/30 dark:text-primary/50">📝</div>
                  </div>
                )}
              </div>

              {/* 文章内容 */}
              <div className="p-6">
                {/* 标签 */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {post.tags.length > 2 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-full">
                        +{post.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}

                {/* 标题 */}
                <h2 className="text-xl font-bold mb-2 line-clamp-2 hover:text-primary transition-colors">
                  <Link to={`/posts/${post._id}`}>{post.title}</Link>
                </h2>

                {/* 摘要 */}
                <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                  {post.summary || post.content.substring(0, 120)}...
                </p>

                {/* 元数据 */}
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <span>{post.author?.username || '匿名作者'}</span>
                  <span>{formatDate(post.createdAt)}</span>
                </div>

                {/* 统计信息 */}
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center"><FaEye className="mr-1" /> {post.viewCount || 0}</span>
                    <span className="flex items-center"><FaThumbsUp className="mr-1" /> {post.likes.length}</span>
                  </div>
                  <Link
                    to={`/posts/${post._id}`}
                    className="text-primary hover:text-primary/80 flex items-center"
                  >
                    阅读更多 <FaExternalLinkAlt className="ml-1 text-xs" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center mt-12">
          <nav className="flex items-center space-x-1">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>

            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => handlePageChange(i + 1)}
                className={`px-4 py-2 rounded-lg ${page === i + 1
                  ? 'bg-primary text-white'
                  : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}
                `}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default HomePage;
