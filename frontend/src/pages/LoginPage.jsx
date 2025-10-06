import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FaGithub, FaLock, FaUser, FaSpinner } from 'react-icons/fa';
import TurnstileWidget from '../components/TurnstileWidget';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [turnstileToken, setTurnstileToken] = useState('');

  const { isAuthenticated, user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 从URL获取重定向路径
  const from = location.state?.from || '/dashboard';

  // 如果已登录，重定向到仪表板
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  // 处理表单输入变化
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // 清除对应字段的错误
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // 清除全局错误
    if (error) setError('');
  };

  // 表单验证
  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email.trim()) {
      errors.email = '邮箱不能为空';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = '请输入有效的邮箱地址';
    }

    if (!formData.password) {
      errors.password = '密码不能为空';
    } else if (formData.password.length < 6) {
      errors.password = '密码长度不能少于6个字符';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 表单验证
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (!turnstileToken) {
         setError('请完成人机验证');
         setLoading(false);
         return;
       }
 
       const loginSuccess = await login({ ...formData, 'cf-turnstile-response': turnstileToken });

      if (loginSuccess) {
        setSuccess('登录成功！正在跳转到仪表板...');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.message ||
        '登录失败，请检查邮箱和密码是否正确'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="text-center mb-8">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            登录您的账户
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            还没有账户？{' '}
            <Link
              to="/register"
              className="font-medium text-primary hover:text-primary/90"
            >
              立即注册
            </Link>
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* 成功消息 */}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* 错误消息 */}
          {error && !Object.keys(formErrors).length && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 邮箱输入 */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                邮箱地址
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md ${formErrors.email
                    ? 'border-red-300 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-500 dark:bg-gray-700 dark:text-white'
                    : 'dark:bg-gray-700 dark:text-white'}
                  `}
                  placeholder="your.email@example.com"
                />
              </div>
              {formErrors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.email}</p>
              )}
            </div>

            {/* 密码输入 */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                密码
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md ${formErrors.password
                    ? 'border-red-300 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-500 dark:bg-gray-700 dark:text-white'
                    : 'dark:bg-gray-700 dark:text-white'}
                  `}
                  placeholder="••••••••"
                />
              </div>
              {formErrors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.password}</p>
              )}
            </div>

            {/* Turnstile验证 */}
             <div>
               <TurnstileWidget onSuccess={setTurnstileToken} />
             </div>

            {/* 登录按钮 */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition ${loading ? 'opacity-80' : ''}
                `}
              >
                {loading ? (
                  <> <FaSpinner className="animate-spin mr-2 h-5 w-5" /> 登录中...</>
                ) : (
                  '登录'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  或者使用以下方式登录
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => authAPI.githubLogin()}
                className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <FaGithub className="mr-2 h-5 w-5" />
                使用 GitHub 账号登录
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;