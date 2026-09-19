// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getLang, t } from '../i18n';
import { API_BASE, ProviderIcon } from '../utils/providerIcon';
import { FaSpinner, FaSignInAlt } from 'react-icons/fa';

// 后端 ?error=xxx → 展示文案的键
const ERROR_KEYS = {
  oauth_state_mismatch: 'login.errState',
  oauth_denied: 'login.errDenied',
  provider_unavailable: 'login.errProvider',
  account_suspended: 'login.errSuspended',
  oauth_failed: 'login.errThirdParty',
  oauth_exchange_failed: 'login.errThirdParty',
  github_auth_failed: 'login.errThirdParty',
  user_not_found: 'login.errThirdParty'
};

const LoginPage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  // 拉取失败(含限流 429)与「后端确实没开任何登录方式」是两回事,不能都显示成后者
  const [loadFailed, setLoadFailed] = useState(false);

  const errorCode = new URLSearchParams(location.search).get('error');
  const errorText = errorCode ? t(ERROR_KEYS[errorCode] || 'login.errGeneric') : '';

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await authAPI.getOAuthProviders();
        if (alive && res.data?.success) setProviders(res.data.data || []);
      } catch {
        if (alive) {
          setProviders([]);
          setLoadFailed(true);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const startLogin = (provider) => {
    window.location.href = `${API_BASE}${provider.startPath}`;
  };

  // 文案:优先当前语言,缺失则回退另一种语言,再回退提供方名称
  const labelOf = (provider) => {
    const isEn = getLang() === 'en';
    const first = isEn ? provider.label?.en : provider.label?.zh;
    const second = isEn ? provider.label?.zh : provider.label?.en;
    return first || second || provider.name || provider.id;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-5 border border-neutral-200 dark:border-neutral-800 grid place-items-center">
              <FaSignInAlt className="text-2xl text-neutral-900 dark:text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
              {t('login.welcome')}
            </h1>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              {t('login.subtitle')}
            </p>
          </div>

          {errorText && (
            <div className="mb-5 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm dark:bg-red-500/5 dark:border-red-500/30 dark:text-red-400">
              {errorText}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-6 text-neutral-400 text-sm">
              <FaSpinner className="animate-spin mr-2" /> {t('login.loading')}
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                {loadFailed ? t('login.errFetch') : t('login.none')}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {loadFailed ? t('login.errFetchSub') : t('login.noneSub')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => startLogin(provider)}
                  className="w-full flex justify-center items-center gap-3 py-3 px-4 rounded-xl text-base font-medium bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors"
                >
                  <ProviderIcon icon={provider.icon} className="text-xl shrink-0" />
                  <span className="truncate">{labelOf(provider)}</span>
                </button>
              ))}
            </div>
          )}

          <p className="mt-6 text-xs text-center text-neutral-500 dark:text-neutral-400">
            {t('login.agree')}
            <a href="/terms" className="ml-1 underline underline-offset-2">{t('login.terms')}</a> 与
            <a href="/privacy" className="ml-1 underline underline-offset-2">{t('login.privacy')}</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
