// @ts-nocheck
import { useState, useEffect } from 'react';
import { friendLinksAPI } from '../services/api';
import { getLang, t } from '../i18n';
import { FaLink, FaSpinner } from 'react-icons/fa';

const FriendsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lang = getLang();

  const resolveAvatar = (avatar) => {
    if (!avatar) return null;
    if (/^https?:\/\//.test(avatar)) return avatar;
    return `${import.meta.env.VITE_API_URL || ''}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
  };

  const resolveUrl = (url) => {
    if (!url) return '#';
    if (/^https?:\/\//.test(url) || url.startsWith('/')) return url;
    return `https://${url}`;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await friendLinksAPI.list();
        if (!cancelled) {
          setItems(response.data.data || []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(t('friends.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const favicon = (url) => {
    try {
      const u = new URL(resolveUrl(url));
      return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
    } catch {
      return null;
    }
  };

  return (
    <div>
      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-5 border border-neutral-200 dark:border-neutral-800 grid place-items-center">
            <FaLink className="text-2xl text-neutral-900 dark:text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {t('friends.title')}
          </h1>
          <p className="mt-4 max-w-xl mx-auto text-neutral-500 dark:text-neutral-400">
            {t('friends.subtitle')}
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-neutral-400">
            <FaSpinner className="animate-spin mr-3" /> {t('friends.loading')}
          </div>
        ) : error ? (
          <div className="text-center py-24 text-neutral-500">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-neutral-400">{t('friends.empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((link) => (
              <a
                key={link._id}
                href={resolveUrl(link.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="group card p-5 flex items-start gap-4 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl shrink-0 overflow-hidden border border-neutral-200 dark:border-neutral-800 grid place-items-center bg-neutral-50 dark:bg-neutral-900">
                  {link.avatar ? (
                    <img
                      src={resolveAvatar(link.avatar)}
                      alt={link.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : favicon(link.url) ? (
                    <img
                      src={favicon(link.url)}
                      alt={link.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <FaLink className="text-neutral-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900 dark:text-white truncate group-hover:underline">
                      {link.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 shrink-0">
                      {new URL(resolveUrl(link.url)).hostname}
                    </span>
                  </div>
                  {link.description && (
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">
                      {link.description}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default FriendsPage;
