// @ts-nocheck
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';
import hljs from 'highlight.js';
import { postsAPI, commentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FaEdit, FaTrash, FaEye, FaComment, FaArrowLeft, FaUser, FaCalendarAlt, FaHeart, FaRegHeart } from 'react-icons/fa';
import TurnstileWidget from '../components/TurnstileWidget';

const COMMENT_MAX = 100;

const formatDate = (s) =>
  new Date(s).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

const Avatar = ({ user, size = 'md' }) => {
  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-11 h-11 text-base',
    lg: 'w-14 h-14 text-lg'
  };
  if (user?.avatar) {
    return <img src={user.avatar} alt={user.username} className={`${sizes[size]} rounded-full object-cover`} />;
  }
  return (
    <div className={`${sizes[size]} rounded-full bg-neutral-200 dark:bg-neutral-800 grid place-items-center text-neutral-700 dark:text-neutral-300 font-medium`}>
      {user?.username?.[0]?.toUpperCase() || <FaUser />}
    </div>
  );
};

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
  const [turnstileToken, setTurnstileToken] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [postLikeBusy, setPostLikeBusy] = useState(false);
  const [commentLikeBusy, setCommentLikeBusy] = useState({});
  const [hpComment, setHpComment] = useState('');
  const [hpReply, setHpReply] = useState('');

  const userIdStr = user?._id ? String(user._id) : user?.id ? String(user.id) : '';
  const isPostLiked = !!(userIdStr && post?.likes?.some((l) => String(l) === userIdStr));
  const postLikeCount = post?.likes?.length || 0;

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await postsAPI.getPost(id);
      setPost(response.data.data);
    } catch (err) {
      setError('无法加载文章内容，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!post?._id) return;
    try {
      const response = await commentsAPI.getPostComments(post._id);
      setComments(response.data.data);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  useEffect(() => {
    if (id) fetchPost();
  }, [id]);

  useEffect(() => {
    if (post?._id) fetchComments();
  }, [post]);

  useEffect(() => {
    if (!post) return;
    const highlight = () => {
      document.querySelectorAll('.markdown-content pre code').forEach((block) => {
        if (!block.dataset.highlighted) {
          hljs.highlightElement(block);
        }
      });
    };
    const t = setTimeout(highlight, 0);
    return () => clearTimeout(t);
  }, [post]);

  const handleLikePost = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/posts/${id}` } });
      return;
    }
    if (postLikeBusy) return;
    try {
      setPostLikeBusy(true);
      const res = await postsAPI.likePost(post._id);
      setPost((prev) => {
        if (!prev) return prev;
        const liked = res.data?.liked;
        const without = prev.likes?.filter((l) => String(l) !== userIdStr) || [];
        return { ...prev, likes: liked ? [...without, user._id || user.id] : without };
      });
    } catch (err) {
      alert(err.response?.data?.message || '点赞失败');
    } finally {
      setPostLikeBusy(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    if (!user) {
      navigate('/login', { state: { from: `/posts/${id}` } });
      return;
    }
    if (commentLikeBusy[commentId]) return;
    try {
      setCommentLikeBusy((m) => ({ ...m, [commentId]: true }));
      const res = await commentsAPI.likeComment(commentId);
      setComments((prev) =>
        prev.map((c) => {
          if (c._id !== commentId) return c;
          const liked = res.data?.liked;
          const without = c.likes?.filter((l) => String(l) !== userIdStr) || [];
          return { ...c, likes: liked ? [...without, user._id || user.id] : without };
        })
      );
    } catch (err) {
      alert(err.response?.data?.message || '点赞失败');
    } finally {
      setCommentLikeBusy((m) => ({ ...m, [commentId]: false }));
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    if (commentText.length > COMMENT_MAX) return;
    if (!turnstileToken) {
      alert('请先完成人机验证');
      return;
    }
    try {
      setSubmittingComment(true);
      const response = await commentsAPI.createComment({
        content: commentText,
        post: post._id,
        'cf-turnstile-response': turnstileToken,
        _hp_field: hpComment
      });
      const status = response.data?.moderationStatus;
      if (status === 'approved' && response.data?.data) {
        setComments([response.data.data, ...comments]);
      } else if (status === 'pending') {
        alert(response.data?.message || '评论已提交，正在审核中，通过后将公开显示');
      } else if (status === 'rejected') {
        alert(response.data?.message || '评论未通过审核');
      } else if (response.data?.data) {
        setComments([response.data.data, ...comments]);
      }
      setCommentText('');
      setTurnstileToken('');
      setHpComment('');
    } catch (err) {
      alert(err.response?.data?.message || '评论提交失败');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReplySubmit = async (e, parentCommentId) => {
    e.preventDefault();
    if (!replyText.trim() || !user) return;
    if (replyText.length > COMMENT_MAX) return;
    if (!turnstileToken) {
      alert('请先完成人机验证');
      return;
    }
    try {
      const response = await commentsAPI.createComment({
        content: replyText,
        post: post._id,
        parentComment: parentCommentId,
        'cf-turnstile-response': turnstileToken,
        _hp_field: hpReply
      });
      const status = response.data?.moderationStatus;
      if (status === 'approved' && response.data?.data) {
        setComments([response.data.data, ...comments]);
      } else if (status === 'pending') {
        alert(response.data?.message || '回复已提交，正在审核中');
      } else if (status === 'rejected') {
        alert(response.data?.message || '回复未通过审核');
      } else if (response.data?.data) {
        setComments([response.data.data, ...comments]);
      }
      setReplyText('');
      setReplyTo(null);
      setTurnstileToken('');
      setHpReply('');
    } catch (err) {
      alert(err.response?.data?.message || '回复提交失败');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('确定要删除这篇文章吗？此操作不可恢复。')) return;
    try {
      await postsAPI.deletePost(post._id);
      navigate('/');
    } catch (err) {
      alert('删除失败，请稍后再试');
    }
  };

  const renderComments = (parentId = null) => {
    const filtered = comments.filter((c) => c.parentComment === parentId);
    if (filtered.length === 0) return null;
    return (
      <div className="space-y-4">
        {filtered.map((comment) => {
          const liked = !!(userIdStr && comment.likes?.some((l) => String(l) === userIdStr));
          const count = comment.likes?.length || 0;
          return (
            <div key={comment._id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
              <div className="flex items-start gap-3 mb-3">
                <Avatar user={comment.author} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-900 dark:text-white">{comment.author?.username}</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(comment.createdAt)}</span>
                  </div>
                  <div className="mt-2 prose prose-sm prose-neutral dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300">
                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                      {comment.content}
                    </ReactMarkdown>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs">
                    <button
                      onClick={() => handleLikeComment(comment._id)}
                      disabled={!!commentLikeBusy[comment._id]}
                      className={`inline-flex items-center gap-1.5 font-medium transition-colors ${
                        liked
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                      }`}
                    >
                      {liked ? <FaHeart /> : <FaRegHeart />} {count}
                    </button>
                    <button
                      onClick={() => setReplyTo(replyTo === comment._id ? null : comment._id)}
                      className="inline-flex items-center gap-1.5 font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                    >
                      <FaComment /> 回复
                    </button>
                  </div>

                  {replyTo === comment._id && (
                    <form onSubmit={(e) => handleReplySubmit(e, comment._id)} className="mt-4 space-y-3">
                      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
                        <label htmlFor={`hp_website_reply_${comment._id}`}>网站 (请勿填写)</label>
                        <input
                          type="text"
                          id={`hp_website_reply_${comment._id}`}
                          name="website"
                          tabIndex={-1}
                          autoComplete="off"
                          value={hpReply}
                          onChange={(e) => setHpReply(e.target.value)}
                        />
                      </div>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`回复 ${comment.author?.username}…`}
                        className="input-field min-h-24 resize-y"
                        rows={3}
                        maxLength={COMMENT_MAX}
                      />
                      <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                        <span>{replyText.length}/{COMMENT_MAX}</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <TurnstileWidget
                          onSuccess={setTurnstileToken}
                          onError={() => setTurnstileToken('')}
                          onExpire={() => setTurnstileToken('')}
                        />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setReplyTo(null)} className="btn btn-secondary">取消</button>
                          <button type="submit" disabled={!replyText.trim() || replyText.length > COMMENT_MAX} className="btn btn-primary">发送</button>
                        </div>
                      </div>
                    </form>
                  )}

                  {comments.some((c) => c.parentComment === comment._id) && (
                    <div className="mt-4 pl-4 border-l-2 border-neutral-200 dark:border-neutral-700">
                      {renderComments(comment._id)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6 animate-pulse">
        <div className="h-10 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded-lg"></div>
        <div className="h-5 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded-lg"></div>
        <div className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-2xl"></div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">文章不存在或已被删除</h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-6">{error || '抱歉，我们无法找到您请求的文章。'}</p>
        <Link to="/" className="btn btn-primary">
          <FaArrowLeft /> 返回首页
        </Link>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const commentOver = commentText.length > COMMENT_MAX;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white mb-8 transition-colors"
      >
        <FaArrowLeft className="text-xs" /> 返回文章列表
      </Link>

      <article>
        <header className="mb-8">
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {post.tags.map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          )}

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white leading-tight">
            {post.title}
          </h1>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar user={post.author} size="md" />
              <div>
                <div className="font-medium text-neutral-900 dark:text-white">{post.author?.username}</div>
                <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="flex items-center gap-1">
                    <FaCalendarAlt /> {formatDate(post.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <FaEye /> {post.viewCount || 0}
                  </span>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="flex gap-2">
                <Link to={`/edit/${post._id}`} className="btn btn-secondary">
                  <FaEdit /> 编辑
                </Link>
                <button onClick={handleDelete} className="btn btn-danger">
                  <FaTrash /> 删除
                </button>
              </div>
            )}
          </div>
        </header>

        {post.thumbnail && (
          <div className="aspect-[16/9] rounded-2xl overflow-hidden mb-10 bg-neutral-100 dark:bg-neutral-800">
            <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="markdown-content prose prose-lg prose-neutral dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
            {post.content}
          </ReactMarkdown>
        </div>

        <div className="mt-12 pt-6 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-2"><FaEye /> {post.viewCount || 0} 阅读</span>
            <span className="flex items-center gap-2"><FaComment /> {comments.length} 评论</span>
            <span className="flex items-center gap-2">
              {isPostLiked ? <FaHeart className="text-red-600 dark:text-red-400" /> : <FaRegHeart />} {postLikeCount} 点赞
            </span>
          </div>
          <button
            onClick={handleLikePost}
            disabled={postLikeBusy}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              isPostLiked
                ? 'bg-red-600 border-red-600 text-white hover:bg-red-500'
                : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-200 hover:border-neutral-900 dark:hover:border-white'
            }`}
          >
            {isPostLiked ? <FaHeart /> : <FaRegHeart />}
            {isPostLiked ? '已点赞' : '点赞'}
          </button>
        </div>
      </article>

      <section className="mt-16">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
          <FaComment /> 评论
          <span className="text-base font-normal text-neutral-500 dark:text-neutral-400">({comments.length})</span>
        </h2>

        {user ? (
          <form onSubmit={handleCommentSubmit} className="card p-5 sm:p-6 mb-8">
            <div className="flex items-start gap-3">
              <Avatar user={user} size="md" />
              <div className="flex-1 space-y-3">
                <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
                  <label htmlFor="hp_website_main">网站 (请勿填写)</label>
                  <input
                    type="text"
                    id="hp_website_main"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={hpComment}
                    onChange={(e) => setHpComment(e.target.value)}
                  />
                </div>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={`留下你的想法…（最多 ${COMMENT_MAX} 字）`}
                  className="input-field min-h-28 resize-y"
                  rows={4}
                  maxLength={COMMENT_MAX}
                />
                <div className="flex items-center justify-between text-xs">
                  <span className={commentOver ? 'text-red-600 dark:text-red-400' : 'text-neutral-500 dark:text-neutral-400'}>
                    {commentText.length}/{COMMENT_MAX}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <TurnstileWidget
                    onSuccess={setTurnstileToken}
                    onError={() => setTurnstileToken('')}
                    onExpire={() => setTurnstileToken('')}
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !commentText.trim() || commentOver}
                    className="btn btn-primary"
                  >
                    {submittingComment ? '发布中…' : '发布评论'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50 p-8 text-center mb-8">
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">登录后即可发表评论</p>
            <Link to="/login" className="btn btn-primary">前往登录</Link>
          </div>
        )}

        {comments.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-12 text-center">
            <h3 className="text-base font-medium text-neutral-500 dark:text-neutral-400">暂无评论</h3>
            {user && <p className="mt-1 text-sm text-neutral-400">成为第一个评论的人吧</p>}
          </div>
        ) : (
          renderComments()
        )}
      </section>
    </div>
  );
};

export default PostPage;
