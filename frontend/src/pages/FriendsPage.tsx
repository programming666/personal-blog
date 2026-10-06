// @ts-nocheck
import { useState, useEffect } from 'react';
import { friendLinksAPI } from '../services/api';
import { getLang, t } from '../i18n';
import { FaArrowRight, FaLink, FaSpinner } from 'react-icons/fa';
import '../styles/journal.css';

const FriendsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);
  const lang = getLang();
  const resolveAvatar = (avatar) => {
    if (!avatar) return null;
    if (/^https?:\/\//i.test(avatar)) return avatar;
    return `${import.meta.env.VITE_API_URL || ''}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
  };
  const linkInfo = (value) => {
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      return ['http:', 'https:'].includes(url.protocol) ? { href: url.href, hostname: url.hostname } : null;
    } catch { return null; }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await friendLinksAPI.list();
        if (!cancelled) setItems(response.data.data || []);
      } catch {
        if (!cancelled) setError(t('friends.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [retry]);

  return (
    <div className="journal-page" id="journal-content">
      <header className="journal-page-heading journal-shell">
        <p className="journal-eyebrow"><span className="journal-small-rule" />THE NEIGHBOURHOOD</p>
        <h1>{t('friends.title')}</h1>
        <p>{t('friends.subtitle')}</p>
        <span className="journal-page-flourish" aria-hidden="true">↗</span>
      </header>
      <section className="journal-shell journal-directory" aria-label={t('friends.title')} aria-busy={loading}>
        {loading ? <div className="journal-empty" role="status"><FaSpinner className="animate-spin" /><p>{t('friends.loading')}</p></div>
          : error ? <div className="journal-empty" role="alert"><p>{error}</p><button className="btn btn-secondary" onClick={() => setRetry(n => n + 1)}>{lang === 'en' ? 'Try again' : '重新加载'}</button></div>
            : items.length === 0 ? <div className="journal-empty"><FaLink aria-hidden="true" /><p>{t('friends.empty')}</p></div>
              : <div className="journal-friends-grid">{items.map(link => {
                const info = linkInfo(link.url);
                return <a key={link._id} href={info?.href} target="_blank" rel="noopener noreferrer" className="journal-friend-card">
                  <div className="journal-friend-avatar"><span aria-hidden="true">{link.name?.slice(0, 1) || '↗'}</span>{link.avatar && <img src={resolveAvatar(link.avatar)} alt="" loading="lazy" onError={event => { event.currentTarget.hidden = true; }} />}</div>
                  <div className="journal-friend-copy"><h2>{link.name}</h2>{info && <span className="journal-friend-domain">{info.hostname}</span>}{link.description && <p>{link.description}</p>}</div>
                  <FaArrowRight className="journal-friend-arrow" aria-hidden="true" />
                </a>;
              })}</div>}
      </section>
    </div>
  );
};

export default FriendsPage;
