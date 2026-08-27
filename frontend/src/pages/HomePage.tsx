// @ts-nocheck
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { postsAPI } from '../services/api';
import { getLang, t } from '../i18n';
import { displayText, fetchTranslation, needsTranslation } from '../translate';
import { FaArrowRight, FaEye, FaClock, FaSearch, FaChevronLeft, FaChevronRight, FaHeart } from 'react-icons/fa';
import TranslatedBadge from '../components/TranslatedBadge';

const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [trTitles, setTrTitles] = useState({}); // en 模式:卡片标题/摘要译文
  const lang = getLang();

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const response = await postsAPI.getAllPosts({ page, limit: 9 });
        setPosts(response.data.data);
        setTotalPages(response.data.pagination.pages);
      } catch (err) {
        setError(t('home.error'));
        console.error('Error fetching posts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
    window.scrollTo(0, 0);
  }, [page]);

  // AI 翻译:按站点语言拉取卡片标题与摘要译文(摘要取正文译文前 140 字);原文已含目标语言直接展示原文
  useEffect(() => {
    if (!posts.length) return;
    let cancelled = false;
    (async () => {
      const map = {};
      await Promise.all(
        posts.map(async (p) => {
          const bodyOriginal = p.content || '';
          const summaryFallback = bodyOriginal.substring(0, 140);
          const summary = !bodyOriginal
            ? ''
            : !needsTranslation(bodyOriginal)
              ? summaryFallback
              : (await fetchTranslation('post', p._id, 'body'))?.substring(0, 140) || summaryFallback;
          const title = await displayText('post', p._id, 'title', p.title || '');
          if (!cancelled) map[p._id] = { title, summary };
        })
      );
      if (!cancelled) setTrTitles(map);
    })();
    return () => { cancelled = true; };
  }, [posts, lang]);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) setPage(newPage);
  };

  return (
    <div>
      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 mb-6">
            {t('home.tagline')}
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {t('home.heroTitle')}
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-neutral-500 dark:text-neutral-400 leading-relaxed">
            {t('home.heroSub')}
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:bg-red-500/5 dark:border-red-500/30 dark:text-red-400">
            {error}
          </div>
        )}

        {loading && page === 1 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-80 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 animate-pulse"
              />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <div className="w-16 h-16 mx-auto rounded-full border border-neutral-200 dark:border-neutral-800 grid place-items-center mb-4">
              <FaSearch className="text-2xl text-neutral-400" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200">{t('home.empty')}</h3>
            <p className="mt-2 text-neutral-500 dark:text-neutral-400">{t('home.emptySub')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <article
                key={post._id}
                className="group card card-hover flex flex-col overflow-hidden"
              >
                <Link to={`/posts/${post._id}`} className="block">
                  <div className="aspect-[16/9] bg-neutral-100 dark:bg-neutral-900 overflow-hidden border-b border-neutral-200 dark:border-neutral-800">
                    {post.thumbnail ? (
                      <img
                        src={post.thumbnail}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-4xl text-neutral-300 dark:text-neutral-700">
                        📝
                      </div>
                    )}
                  </div>
                </Link>

                <div className="p-6 flex flex-col flex-1">
                  {post.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}

                  <h2 className="text-lg font-semibold leading-snug text-neutral-900 dark:text-white line-clamp-2 mb-2">
                    <Link to={`/posts/${post._id}`}>{trTitles[post._id]?.title || post.title}</Link>
                  </h2>

                  <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-3 mb-4 flex-1">
                    {trTitles[post._id]?.summary || post.summary || (post.content ? post.content.substring(0, 140) + '…' : '')}
                  </p>
                  {(() => {
                    const tr = trTitles[post._id];
                    const rawSummary = post.summary || (post.content ? post.content.substring(0, 140) + '…' : '');
                    const translated = (!!tr?.title && tr.title !== post.title) || (!!tr?.summary && tr.summary !== rawSummary);
                    return translated ? <TranslatedBadge /> : null;
                  })()}

                  <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <FaClock /> {formatDate(post.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FaEye /> {post.viewCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <FaHeart /> {post.likes?.length || 0}
                      </span>
                    </div>
                    <Link
                      to={`/posts/${post._id}`}
                      className="flex items-center gap-1 font-medium text-neutral-900 dark:text-white group-hover:gap-2 transition-all"
                    >
                      {t('home.read')} <FaArrowRight className="text-[10px]" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center mt-12 gap-1">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={t('home.prev')}
            >
              <FaChevronLeft />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => handlePageChange(n)}
                className={`min-w-[40px] h-10 rounded-lg text-sm font-medium transition-colors ${
                  page === n
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'border border-neutral-200 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-white'
                }`}
              >
                {n}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={t('home.next')}
            >
              <FaChevronRight />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
