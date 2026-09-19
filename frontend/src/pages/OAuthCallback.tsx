// @ts-nocheck
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaSpinner } from 'react-icons/fa';
import { t } from '../i18n';

// GitHub 与任意通用 OAuth2 提供方共用的回调落地点:
// 后端在 302 回跳时已把本站 JWT 与用户信息放在 query 上,这里只负责落到 AuthContext。
const OAuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthToken, setAuthUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(location.search);
        const error = urlParams.get('error');
        const token = urlParams.get('token');
        const userId = urlParams.get('userId');
        const username = urlParams.get('username');
        const email = urlParams.get('email');
        const name = urlParams.get('name');
        const avatar = urlParams.get('avatar');

        if (error) {
          navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true });
          return;
        }

        if (token) {
          const userData = {
            id: userId,
            username,
            email,
            name,
            // URLSearchParams 已经解码过一次,再解一次会在头像地址含 '%' 时抛 URIError 把登录打断
            avatar: avatar || ''
          };

          setAuthToken(token, userData);
          setAuthUser(userData);

          navigate('/', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        navigate('/login?error=oauth_failed', { replace: true });
      }
    };

    handleCallback();
  }, [location, navigate, setAuthToken, setAuthUser]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <FaSpinner className="animate-spin text-4xl text-primary mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('cb.processing')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('cb.redirect')}
        </p>
      </div>
    </div>
  );
};

export default OAuthCallback;
