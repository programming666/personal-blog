// @ts-nocheck
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { postsAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { getLang, t } from '../i18n';
import { displayText, fetchTranslation, needsTranslation } from '../translate';
import { FaArrowRight, FaEye, FaChevronLeft, FaChevronRight, FaHeart } from 'react-icons/fa';
import TranslatedBadge from '../components/TranslatedBadge';
import JournalHero from '../components/JournalHero';
import { stripMarkdown } from '../utils/stripMarkdown';
import '../styles/journal.css';

const HomePage = () => {
  const { presentation } = useSettings();
  const pageSize = presentation.posts.pageSize;
  const [pagination, setPagination] = useState({ page: 1, size: pageSize });
  const page = pagination.size === pageSize ? pagination.page : 1;
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [trTitles, setTrTitles] = useState({});
  const lang = getLang();
  const isCards = presentation.posts.layout === 'cards';

  const formatDate = (value) => new Date(value).toLocaleDateString(lang === 'en' ? 'en-GB' : 'zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
  const summaryOf = (post) => stripMarkdown(post.summary || post.content || '').substring(0, 160);

  useEffect(() => {
    let cancelled = false;
    const fetchPosts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await postsAPI.getAllPosts({ page, limit: pageSize });
        if (cancelled) return;
        setPosts(response.data.data || []);
        setTotalPages(Math.max(1, response.data.pagination?.pages || 1));
      } catch (err) {
        if (!cancelled) setError(t('home.error'));
        console.error('Error fetching posts:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPosts();
    return () => { cancelled = true; };
  }, [page, pageSize, retry]);

  useEffect(() => {
    if (!posts.length) return;
    let cancelled = false;
    (async () => {
      const map = {};
      await Promise.all(posts.map(async (post) => {
        const bodyOriginal = post.content || '';
        const summaryFallback = summaryOf(post);
        const summary = bodyOriginal && needsTranslation(bodyOriginal)
          ? stripMarkdown((await fetchTranslation('post', post._id, 'body')) || '').substring(0, 160) || summaryFallback
          : summaryFallback;
        const title = await displayText('post', post._id, 'title', post.title || '');
        if (!cancelled) map[post._id] = { title, summary };
      }));
      if (!cancelled) setTrTitles(map);
    })();
    return () => { cancelled = true; };
  }, [posts, lang]);

  const handlePageChange = (next) => {
    if (next < 1 || next > totalPages || loading) return;
    setPagination({ page: next, size: pageSize });
    document.getElementById('journal-entries')?.scrollIntoView({ block: 'start' });
  };
  const pageNumbers = Array.from(new Set([1, page - 1, page, page + 1, totalPages])).filter(n => n > 0 && n <= totalPages).sort((a, b) => a - b);

  return (
    <div className="journal-page" id="journal-content">
      <JournalHero presentation={presentation} lang={lang} />
      <section className="journal-shell journal-entries" id="journal-entries" aria-labelledby="journal-entries-title" aria-busy={loading}>
        <div className="journal-section-heading">
          <div><span className="journal-eyebrow">THE JOURNAL</span><h2 id="journal-entries-title">{lang === 'en' ? 'Recent writing' : '最近的文字'}</h2></div>
          <span className="journal-section-caption">{lang === 'en' ? 'Ideas, experiences & things worth keeping.' : '记录想法，也收藏日常。'}</span>
        </div>
        {error ? (
          <div className="journal-empty" role="alert"><p>{error}</p><button className="btn btn-secondary" onClick={() => setRetry(n => n + 1)}>{lang === 'en' ? 'Try again' : '重新加载'}</button></div>
        ) : loading ? (
          <div className={isCards ? 'journal-post-grid' : 'journal-post-list'} role="status" aria-label={lang === 'en' ? 'Loading articles' : '正在加载文章'}>
            {Array.from({ length: 3 }, (_, i) => <div key={i} className="journal-post-skeleton"><div /><div /><div /></div>)}
          </div>
        ) : posts.length === 0 ? (
          <div className="journal-empty"><span className="journal-empty-mark" aria-hidden="true">¶</span><h3>{t('home.empty')}</h3><p>{t('home.emptySub')}</p></div>
        ) : (
          <div className={isCards ? 'journal-post-grid' : 'journal-post-list'}>
            {posts.map((post, index) => {
              const translated = trTitles[post._id];
              const title = translated?.title || post.title;
              const summary = translated?.summary || summaryOf(post);
              const hasTranslation = (translated?.title && translated.title !== post.title) || (translated?.summary && translated.summary !== summaryOf(post));
              return (
                <article key={post._id} className={`journal-post ${isCards ? 'journal-post-card' : ''}`}>
                  <div className="journal-post-index"><span>{String((page - 1) * pageSize + index + 1).padStart(2, '0')}</span><time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time></div>
                  <div className="journal-post-body">
                    {post.tags?.length > 0 && <div className="journal-post-tags">{post.tags.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div>}
                    <h3><Link to={`/posts/${post._id}`}>{title}</Link></h3>
                    {summary && <p className="journal-post-summary">{summary}</p>}
                    {hasTranslation && <TranslatedBadge />}
                    <div className="journal-post-bottom">
                      <div className="journal-post-metadata"><span aria-label={`${post.viewCount || 0} ${lang === 'en' ? 'views' : '次阅读'}`}><FaEye aria-hidden="true" /> {post.viewCount || 0}</span><span aria-label={`${post.likes?.length || 0} ${lang === 'en' ? 'likes' : '个赞'}`}><FaHeart aria-hidden="true" /> {post.likes?.length || 0}</span></div>
                      <Link to={`/posts/${post._id}`} className="journal-read-link">{t('home.read')} <FaArrowRight aria-hidden="true" /></Link>
                    </div>
                  </div>
                  {presentation.posts.showCover && post.thumbnail && <Link to={`/posts/${post._id}`} className="journal-post-cover" tabIndex={-1} aria-hidden="true"><img src={post.thumbnail} alt="" loading="lazy" /></Link>}
                </article>
              );
            })}
          </div>
        )}
        {!error && totalPages > 1 && <nav className="journal-pagination" aria-label={lang === 'en' ? 'Article pages' : '文章分页'}>
          <button onClick={() => handlePageChange(page - 1)} disabled={page === 1 || loading} aria-label={t('home.prev')}><FaChevronLeft /></button>
          {pageNumbers.map((n, index) => <span key={n} className="journal-pagination-item">{index > 0 && n - pageNumbers[index - 1] > 1 && <span className="journal-pagination-gap">…</span>}<button onClick={() => handlePageChange(n)} disabled={loading} aria-current={n === page ? 'page' : undefined} aria-label={`${lang === 'en' ? 'Page' : '第'} ${n}${lang === 'en' ? '' : ' 页'}`}>{n}</button></span>)}
          <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages || loading} aria-label={t('home.next')}><FaChevronRight /></button>
        </nav>}
      </section>
    </div>
  );
};

export default HomePage;
