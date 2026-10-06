// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getLang, t } from '../i18n';
import { API_BASE, ProviderIcon } from '../utils/providerIcon';
import { FaSpinner, FaArrowRight } from 'react-icons/fa';
import { useSettings } from '../context/SettingsContext';
import { localized } from '../utils/presentation';
import '../styles/journal.css';

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
  const { presentation } = useSettings();
  const lang = getLang();
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
    <div className="journal-page journal-login-page journal-shell" id="journal-content">
      <aside className="journal-login-note">
        <p className="journal-eyebrow"><span className="journal-small-rule" />A PLACE FOR CONVERSATION</p>
        <h2>{lang === 'en' ? 'Good ideas begin\nwith a conversation.' : '好的想法，\n从交流开始。'}</h2>
        <p>{localized(presentation.brand.description, lang)}</p>
        <span className="journal-login-signature">{localized(presentation.brand.name, lang)}</span>
      </aside>
      <section className="journal-login-panel" aria-labelledby="login-title">
        <p className="journal-eyebrow">{lang === 'en' ? 'WELCOME BACK' : '欢迎来访'}</p>
        <h1 id="login-title">{t('login.welcome')}</h1>
        <p className="journal-login-subtitle">{t('login.subtitle')}</p>
        {errorText && <div className="journal-inline-error" role="alert">{errorText}</div>}
        {loading ? <div className="journal-empty" role="status"><FaSpinner className="animate-spin" /><p>{t('login.loading')}</p></div>
          : providers.length === 0 ? <div className="journal-login-unavailable" role={loadFailed ? 'alert' : 'status'}><p>{loadFailed ? t('login.errFetch') : t('login.none')}</p><small>{loadFailed ? t('login.errFetchSub') : t('login.noneSub')}</small></div>
            : <div className="journal-login-providers">{providers.map(provider => <button key={provider.id} onClick={() => startLogin(provider)} type="button" className="journal-provider-button"><ProviderIcon icon={provider.icon} className="text-xl shrink-0" /><span>{labelOf(provider)}</span><FaArrowRight aria-hidden="true" /></button>)}</div>}
        <p className="journal-login-legal">{t('login.agree')} <Link to="/terms">{t('login.terms')}</Link> {lang === 'en' ? 'and' : '与'} <Link to="/privacy">{t('login.privacy')}</Link></p>
      </section>
    </div>
  );
};

export default LoginPage;
