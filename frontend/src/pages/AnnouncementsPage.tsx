// @ts-nocheck
import { useState, useEffect } from 'react';
import { announcementsAPI } from '../services/api';
import { getLang, t } from '../i18n';
import { displayText } from '../translate';
import { FaThumbtack, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import TranslatedBadge from '../components/TranslatedBadge';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import '../styles/hljs-theme.css';
import '../styles/journal.css';
import CodeBlock from '../components/CodeBlock';
import { renderMarkdownLink } from '../utils/markdownLink.jsx';

const AnnouncementsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [trMap, setTrMap] = useState({});
  const lang = getLang();
  const formatDate = value => new Date(value).toLocaleDateString(lang === 'en' ? 'en-GB' : 'zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await announcementsAPI.list({ page, limit: 10 });
        if (!cancelled) {
          setItems(response.data.data || []);
          setTotalPages(Math.max(1, response.data.pagination?.pages || 1));
        }
      } catch (err) {
        if (!cancelled) setError(t('ann.listError'));
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, retry]);

  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;
    (async () => {
      const map = {};
      await Promise.all(items.map(async (item) => {
        const [title, content] = await Promise.all([displayText('announcement', item._id, 'title', item.title), displayText('announcement', item._id, 'body', item.content)]);
        if (!cancelled) map[item._id] = { title, content };
      }));
      if (!cancelled) setTrMap(map);
    })();
    return () => { cancelled = true; };
  }, [items, lang]);

  const changePage = (next) => {
    setPage(next);
    document.getElementById('journal-notices')?.scrollIntoView({ block: 'start' });
  };
  return (
    <div className="journal-page" id="journal-content">
      <header className="journal-page-heading journal-shell"><p className="journal-eyebrow"><span className="journal-small-rule" />THE NOTICEBOARD</p><h1>{t('ann.title')}</h1><p>{t('ann.subtitle')}</p><span className="journal-page-flourish" aria-hidden="true">✳</span></header>
      <section className="journal-shell journal-notices" id="journal-notices" aria-busy={loading}>
        {error ? <div className="journal-empty" role="alert"><p>{error}</p><button className="btn btn-secondary" onClick={() => setRetry(n => n + 1)}>{lang === 'en' ? 'Try again' : '重新加载'}</button></div>
          : loading ? <div role="status" aria-label={lang === 'en' ? 'Loading announcements' : '正在加载公告'}>{Array.from({ length: 3 }, (_, i) => <div className="journal-post-skeleton" key={i}><div /><div /><div /></div>)}</div>
            : items.length === 0 ? <div className="journal-empty"><h2>{t('ann.empty')}</h2><p>{t('ann.emptySub')}</p></div>
              : items.map(item => <article key={item._id} className={`journal-notice ${item.pinned ? 'is-pinned' : ''}`}>
                <div className="journal-notice-aside"><time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>{item.pinned && <span className="journal-pinned"><FaThumbtack aria-hidden="true" />{t('ann.pinned')}</span>}</div>
                <div className="journal-notice-body"><h2>{trMap[item._id]?.title || item.title}</h2><div className="journal-prose prose prose-neutral dark:prose-invert max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={{ pre: CodeBlock, a: renderMarkdownLink }}>{trMap[item._id]?.content || item.content}</ReactMarkdown></div>{trMap[item._id] && (trMap[item._id].title !== item.title || trMap[item._id].content !== item.content) && <TranslatedBadge />}</div>
              </article>)}
        {!error && totalPages > 1 && <nav className="journal-pagination" aria-label={lang === 'en' ? 'Announcement pages' : '公告分页'}><button onClick={() => changePage(Math.max(1, page - 1))} disabled={page === 1 || loading} aria-label={t('home.prev')}><FaChevronLeft /></button><span className="journal-page-count">{page} / {totalPages}</span><button onClick={() => changePage(Math.min(totalPages, page + 1))} disabled={page === totalPages || loading} aria-label={t('home.next')}><FaChevronRight /></button></nav>}
      </section>
    </div>
  );
};

export default AnnouncementsPage;
