import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { postsAPI, commentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FaEdit, FaTrash, FaThumbsUp, FaEye, FaComment, FaArrowLeft, FaUser } from 'react-icons/fa';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import remarkGfm from 'remark-gfm';

const PostPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // 格式化日期
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取文章详情
  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await postsAPI.getPost(id);
      setPost(response.data.data);
      setIsLiked(response.data.data.likes.includes(user?._id));
    } catch (err) {
      setError('无法加载文章内容，请稍后再试');
      console.error('Error fetching post:', err);
    } finally {
      setLoading(false);
    }
  };

  // 获取评论
  const fetchComments = async () => {
    try {
      const response = await commentsAPI.getPostComments(post._id);
      setComments(response.data.data);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  // 页面加载时获取数据
  useEffect(() => {
    if (!id) return;
    
    const loadData = async () => {
      await fetchPost();
    };
    
    loadData();
  }, [id]);

  // 当文章加载完成后获取评论
  useEffect(() => {
    if (post && post._id) {
      fetchComments();
    }
  }, [post]);

  // 代码高亮
  useEffect(() => {
    if (!post) return;
    
    const highlightCode = () => {
      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    };

    // 立即执行一次
    highlightCode();
    
    // 设置观察器处理动态内容
    const observer = new MutationObserver(highlightCode);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [post]);

  // 处理文章点赞
  const handleLike = async () => {
    if (!user) {
      if (window.confirm('请先登录再点赞')) {
        navigate('/login', { state: { from: `/posts/${id}` } });
      }
      return;
    }

    try {
      await postsAPI.likePost(post._id);
      setIsLiked(!isLiked);
      setPost(prev => ({
        ...prev,
        likes: isLiked
          ? prev.likes.filter(id => id !== user._id)
          : [...prev.likes, user._id]
      }));
    } catch (err) {
      console.error('Error liking post:', err);
      alert('点赞失败，请稍后再试');
    }
  };

  // 处理评论提交
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;

    try {
      setSubmittingComment(true);
      const response = await commentsAPI.createComment({
        content: commentText,
        post: post._id
      });

      setComments([response.data.data, ...comments]);
      setCommentText('');
    } catch (err) {
      console.error('Error submitting comment:', err);
      alert('评论提交失败，请稍后再试');
    } finally {
      setSubmittingComment(false);
    }
  };

  // 处理文章删除
  const handleDelete = async () => {
    if (!window.confirm('确定要删除这篇文章吗？此操作不可恢复。')) {
      return;
    }

    try {
      await postsAPI.deletePost(post._id);
      navigate('/');
      alert('文章已成功删除');
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('删除失败，请稍后再试');
    }
  };

  // 处理评论点赞
  const handleCommentLike = async (commentId) => {
    if (!user) {
      if (window.confirm('请先登录再点赞')) {
        navigate('/login', { state: { from: `/posts/${id}` } });
      }
      return;
    }

    try {
      await commentsAPI.likeComment(commentId);
      // 重新获取评论以更新点赞状态
      fetchComments();
    } catch (err) {
      console.error('Error liking comment:', err);
      alert('点赞失败，请稍后再试');
    }
  };

  // 处理回复评论
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const handleReplySubmit = async (e, parentCommentId) => {
    e.preventDefault();
    if (!replyText.trim() || !user) return;

    try {
      const response = await commentsAPI.createComment({
        content: replyText,
        post: post._id,
        parentComment: parentCommentId
      });

      setComments([response.data.data, ...comments]);
      setReplyText('');
      setReplyTo(null);
    } catch (err) {
      console.error('Error submitting reply:', err);
      alert('回复提交失败，请稍后再试');
    }
  };

  // 渲染评论内容（支持Markdown）
  const renderCommentContent = (content) => {
    return (
      <ReactMarkdown
        children={content}
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
              <pre style={{ 
                backgroundColor: 'var(--gray-100)', 
                padding: '0.5rem', 
                borderRadius: '0.25rem',
                margin: '0.5rem 0',
                fontSize: '0.875em'
              }}>
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code style={{
                backgroundColor: 'var(--gray-100)',
                padding: '0.125rem 0.25rem',
                borderRadius: '0.25rem',
                fontSize: '0.875em'
              }} {...props}>
                {children}
              </code>
            );
          },
          p: ({ children }) => <p style={{ marginBottom: '0.5rem', lineHeight: '1.6' }}>{children}</p>,
          h1: ({ children }) => <h1 style={{ fontSize: '1.5rem', margin: '0.5rem 0', fontWeight: 'bold' }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ fontSize: '1.25rem', margin: '0.5rem 0', fontWeight: 'bold' }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ fontSize: '1.125rem', margin: '0.5rem 0', fontWeight: 'bold' }}>{children}</h3>,
          ul: ({ children }) => <ul style={{ marginLeft: '1.5rem', marginBottom: '0.5rem' }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ marginLeft: '1.5rem', marginBottom: '0.5rem' }}>{children}</ol>,
          li: ({ children }) => <li style={{ marginBottom: '0.25rem' }}>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote style={{ 
              borderLeft: '3px solid var(--primary)', 
              paddingLeft: '0.75rem', 
              margin: '0.5rem 0',
              fontStyle: 'italic',
              color: 'var(--gray-600)'
            }}>
              {children}
            </blockquote>
          ),
          strong: ({ children }) => <strong style={{ fontWeight: 'bold' }}>{children}</strong>,
          em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>
        }}
      />
    );
  };

  // 渲染嵌套评论
  const renderComments = (comments, parentId = null) => {
    const filteredComments = comments.filter(comment => comment.parentComment === parentId);

    if (filteredComments.length === 0) return null;

    return (
      <div className="space-y-4">
        {filteredComments.map(comment => (
          <div key={comment._id} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                <FaUser className="text-primary" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{comment.author.username}</div>
                <div className="text-xs text-gray-500">{formatDate(comment.createdAt)}</div>
              </div>
            </div>
            <div className="text-gray-700 mb-3">
              {renderCommentContent(comment.content)}
            </div>
            <div className="flex items-center text-sm text-gray-500 space-x-4">
              <button 
                className="flex items-center hover:text-primary transition-colors"
                onClick={() => handleCommentLike(comment._id)}
              >
                <FaThumbsUp className="mr-1" /> {comment.likes.length}
              </button>
              <button 
                className="flex items-center hover:text-primary transition-colors"
                onClick={() => setReplyTo(comment._id)}
              >
                <FaComment className="mr-1" /> 回复
              </button>
            </div>
            
            {/* 回复表单 */}
            {replyTo === comment._id && (
              <form onSubmit={(e) => handleReplySubmit(e, comment._id)} className="mt-4 ml-8">
                <div className="mb-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`回复 ${comment.author.username}...`}
                    className="w-full p-3 border rounded-lg"
                    rows={3}
                  ></textarea>
                </div>
                <div className="flex space-x-2">
                  <button type="submit" className="btn-primary text-sm px-3 py-1">
                    发送回复
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary text-sm px-3 py-1"
                    onClick={() => setReplyTo(null)}
                  >
                    取消
                  </button>
                </div>
              </form>
            )}
            
            {/* 嵌套回复 */}
            <div className="mt-4 ml-8 border-l-2 border-gray-200 pl-4">
              {renderComments(comments, comment._id)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">文章不存在或已被删除</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{error || '抱歉，我们无法找到您请求的文章。'}</p>
        <Link
          to="/"
          className="inline-flex items-center bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg transition"
        >
          <FaArrowLeft className="mr-2" /> 返回首页
        </Link>
      </div>
    );
  }

  // 判断当前用户是否为文章作者
  const isAuthor = user && post.author._id === user._id;

  return (
    <div className="container">
      {/* 返回按钮 */}
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center text-gray-600 text-primary transition-colors"
        >
          <FaArrowLeft className="mr-2" /> 返回文章列表
        </Link>
      </div>

      {/* 文章头部 */}
      <header className="mb-8 max-w-4xl mx-auto">
        {/* 作者操作按钮 */}
        {isAuthor && (
          <div className="flex justify-end space-x-3 mb-4">
            <Link
              to={`/edit/${post._id}`}
              className="inline-flex items-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg transition btn-secondary"
            >
              <FaEdit className="mr-2" /> 编辑
            </Link>
            <button
              onClick={handleDelete}
              className="inline-flex items-center bg-red-50 text-red-700 px-4 py-2 rounded-lg transition"
              style={{ backgroundColor: 'var(--red-50)', color: 'var(--red-700)' }}
            >
              <FaTrash className="mr-2" /> 删除
            </button>
          </div>
        )}

        {/* 文章标题 */}
        <h1 className="text-4xl font-bold text-gray-900 mb-6 leading-tight">{post.title}</h1>

        {/* 作者信息 */}
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
            <FaUser className="text-primary" />
          </div>
          <div>
            <div className="font-medium text-gray-800">{post.author.username}</div>
            <div className="text-sm text-gray-500">{formatDate(post.createdAt)}</div>
          </div>
        </div>

        {/* 标签 */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 文章封面图 */}
        {post.thumbnail && (
          <div className="w-full h-80 bg-gray-100 rounded-xl overflow-hidden mb-8">
            <img
              src={post.thumbnail}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </header>

      {/* 文章内容 */}
      <main className="max-w-4xl mx-auto mb-12">
        <div className="markdown-content">
          <ReactMarkdown
            children={post.content}
            remarkPlugins={[remarkMath, remarkGfm]}
            rehypePlugins={[rehypeKatex]}
            components={{ 
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline ? (
                  <pre>
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              h1: ({ children }) => <h1 style={{ fontSize: '2.5rem', margin: '2rem 0 1rem', fontWeight: 'bold' }}>{children}</h1>,
              h2: ({ children }) => <h2 style={{ fontSize: '2rem', margin: '1.5rem 0 0.75rem', fontWeight: 'bold' }}>{children}</h2>,
              h3: ({ children }) => <h3 style={{ fontSize: '1.5rem', margin: '1.25rem 0 0.5rem', fontWeight: 'bold' }}>{children}</h3>,
              h4: ({ children }) => <h4 style={{ fontSize: '1.25rem', margin: '1rem 0 0.5rem', fontWeight: 'bold' }}>{children}</h4>,
              p: ({ children }) => <p style={{ marginBottom: '1rem', lineHeight: '1.8' }}>{children}</p>,
              ul: ({ children }) => <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>{children}</ul>,
              ol: ({ children }) => <ol style={{ marginLeft: '2rem', marginBottom: '1rem' }}>{children}</ol>,
              li: ({ children }) => <li style={{ marginBottom: '0.5rem' }}>{children}</li>,
              blockquote: ({ children }) => (
                <blockquote style={{ 
                  borderLeft: '4px solid var(--primary)', 
                  paddingLeft: '1rem', 
                  margin: '1rem 0',
                  fontStyle: 'italic',
                  color: 'var(--gray-600)'
                }}>
                  {children}
                </blockquote>
              ),
              img: ({ node, src, alt, ...props }) => (
                <img
                  src={src}
                  alt={alt || post.title}
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto', 
                    borderRadius: '0.5rem',
                    margin: '1rem auto',
                    display: 'block',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                  {...props}
                />
              ),
              table: ({ children }) => <table style={{ borderCollapse: 'collapse', width: '100%', margin: '1rem 0', border: '1px solid #ddd' }}>{children}</table>,
              thead: ({ children }) => <thead style={{ backgroundColor: '#f5f5f5' }}>{children}</thead>,
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => <tr style={{ borderBottom: '1px solid #ddd' }}>{children}</tr>,
              th: ({ children }) => <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', border: '1px solid #ddd' }}>{children}</th>,
              td: ({ children }) => <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{children}</td>,
            }}
          />
        </div>
      </main>

      {/* 文章统计和互动区域 */}
      <div className="max-w-4xl mx-auto border-t pt-8 mb-12">
        <div className="flex items-center justify-center space-x-8 text-gray-600 mb-6">
          <div className="flex items-center">
            <FaEye className="mr-2" /> 
            <span>{post.viewCount || 0} 阅读</span>
          </div>
          <div className="flex items-center">
            <FaThumbsUp className="mr-2" /> 
            <span>{post.likes.length} 点赞</span>
          </div>
          <div className="flex items-center">
            <FaComment className="mr-2" /> 
            <span>{comments.length} 评论</span>
          </div>
        </div>
        
        <div className="flex justify-center">
          <button
            onClick={handleLike}
            className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-full transition ${isLiked
              ? 'btn-primary'
              : 'btn-secondary'}
            `}
          >
            <FaThumbsUp className={isLiked ? 'fill-current' : ''} /> 
            <span>{isLiked ? '已点赞' : '点赞文章'}</span>
            <span className="ml-1 font-medium">({post.likes.length})</span>
          </button>
        </div>
      </div>

      {/* 评论区域 */}
      <section className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <FaComment className="mr-2" /> 评论 ({comments.length})
        </h2>

        {/* 评论表单 */}
        {user ? (
          <form onSubmit={handleCommentSubmit} className="mb-10">
            <div className="mb-4">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="写下你的评论..."
                className="w-full p-4 border rounded-lg"
                rows={4}
              ></textarea>
            </div>
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className="btn-primary"
            >
              {submittingComment ? '发布中...' : '发布评论'}
            </button>
          </form>
        ) : (
          <div className="bg-gray-50 p-6 rounded-lg mb-10 text-center">
            <p className="text-gray-600 mb-4">登录后即可发表评论</p>
            <Link
              to="/login"
              className="btn-primary"
            >
              登录
            </Link>
          </div>
        )}

        {/* 评论列表 */}
        {comments.length > 0 ? (
          renderComments(comments)
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-500">暂无评论</h3>
            {user && (
              <p className="mt-2 text-gray-400">成为第一个评论的人吧！</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default PostPage;
