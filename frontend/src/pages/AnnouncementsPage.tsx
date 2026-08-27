// @ts-nocheck
import { useState, useEffect } from 'react';
import { announcementsAPI } from '../services/api';
import { getLang, t } from '../i18n';
import { displayText } from '../translate';
import { FaThumbtack, FaBullhorn, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AnnouncementsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [trMap, setTrMap] = useState({}); // en 模式:公告标题/内容译文
  const lang = getLang();

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const response = await announcementsAPI.list({ page, limit: 10 });
        setItems(response.data.data);
        setTotalPages(response.data.pagination.pages);
      } catch (err) {
        setError(t('ann.listError'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
    window.scrollTo(0, 0);
  }, [page]);

  // AI 翻译:按站点语言拉取公告标题/内容译文;原文已含目标语言直接展示原文
  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;
    (async () => {
      const map = {};
      await Promise.all(
        items.map(async (it) => {
          const [title, content] = await Promise.all([
            displayText('announcement', it._id, 'title', it.title),
            displayText('announcement', it._id, 'body', it.content),
          ]);
          if (!cancelled) map[it._id] = { title, content };
        })
      );
      if (!cancelled) setTrMap(map);
    })();
    return () => { cancelled = true; };
  }, [items, lang]);

  return (
    <div>
      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-5 border border-neutral-200 dark:border-neutral-800 grid place-items-center">
            <FaBullhorn className="text-2xl text-neutral-900 dark:text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {t('ann.title')}
          </h1>
          <p className="mt-4 max-w-xl mx-auto text-neutral-500 dark:text-neutral-400">
            {t('ann.subtitle')}
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:bg-red-500/5 dark:border-red-500/30 dark:text-red-400">
            {error}
          </div>
        )}

        {loading && page === 1 ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 rounded-2xl border border-neutral-200 dark:border-neutral-800 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200">{t('ann.empty')}</h3>
            <p className="mt-2 text-neutral-500 dark:text-neutral-400">{t('ann.emptySub')}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {items.map((item) => (
              <article
                key={item._id}
                className={`card p-6 sm:p-7 ${item.pinned ? 'border-neutral-900 dark:border-white' : ''}`}
              >
                <header className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.pinned && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                        <FaThumbtack className="text-[10px]" /> {t('ann.pinned')}
                      </span>
                    )}
                    <h2 className="text-xl font-semibold text-neutral-900 dark:text-white truncate">
                      {trMap[item._id]?.title || item.title}
                    </h2>
                  </div>
                  <time className="text-sm text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                    {formatDate(item.createdAt)}
                  </time>
                </header>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{trMap[item._id]?.content || item.content}</ReactMarkdown>
                </div>
              </article>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center mt-10 gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <FaChevronLeft />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
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
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <FaChevronRight />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default AnnouncementsPage;
