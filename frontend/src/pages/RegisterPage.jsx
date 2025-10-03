import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaEnvelope, FaLock, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import TurnstileWidget from '../components/TurnstileWidget';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState('');

  const { isAuthenticated, user, register } = useAuth();
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

    // 检查密码是否匹配
    if (name === 'password' || name === 'confirmPassword') {
      setPasswordMatch(formData.password === formData.confirmPassword);
    }

    // 清除全局错误
    if (error) setError('');
  };

  // 表单验证
  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.username.trim()) {
      errors.username = '用户名不能为空';
    } else if (formData.username.length < 3) {
      errors.username = '用户名长度不能少于3个字符';
    } else if (formData.username.length > 20) {
      errors.username = '用户名长度不能超过20个字符';
    }

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

    // 添加密码确认验证
    if (!formData.confirmPassword) {
      errors.confirmPassword = '请确认密码';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致';
      setPasswordMatch(false);
    } else {
      setPasswordMatch(true);
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

      const registrationSuccess = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        passwordConfirm: formData.confirmPassword,
        'cf-turnstile-response': turnstileToken
      });

      if (registrationSuccess) {
        setSuccess('注册成功！正在跳转到仪表板...');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(
        err.response?.data?.message ||
        '注册失败，请稍后再试'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            创建账户
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            已有账户？{' '}
            <Link
              to="/login"
              className="font-medium text-primary hover:text-primary/90"
            >
              立即登录
            </Link>
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* 成功消息 */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400 px-4 py-3 rounded-lg flex items-start">
              <FaCheckCircle className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5 mr-2" />
              <p>{success}</p>
            </div>
          )}

          {/* 错误消息 */}
          {error && !Object.keys(formErrors).length && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 用户名输入 */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                用户名
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md ${formErrors.username
                    ? 'border-red-300 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-500 dark:bg-gray-700 dark:text-white'
                    : 'dark:bg-gray-700 dark:text-white'}
                  `}
                  placeholder="请输入用户名"
                />
              </div>
              {formErrors.username && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.username}</p>
              )}
            </div>

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
                  <FaEnvelope className="h-5 w-5 text-gray-400" />
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
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md ${formErrors.password
                    ? 'border-red-300 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-500 dark:bg-gray-700 dark:text-white'
                    : 'dark:bg-gray-700 dark:text-white'}
                  `}
                  placeholder="请输入密码（至少6位，包含字母和数字）"
                />
              </div>
              {formErrors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.password}</p>
              )}
            </div>

            {/* 确认密码输入 */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                确认密码
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md ${formErrors.confirmPassword
                    ? 'border-red-300 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-500 dark:bg-gray-700 dark:text-white'
                    : 'dark:bg-gray-700 dark:text-white'}
                  `}
                  placeholder="请再次输入密码"
                />
              </div>
              {formErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.confirmPassword}</p>
              )}
            </div>

            {/* Turnstile 人机验证 */}
            <div className="flex justify-center">
              <TurnstileWidget
                onSuccess={setTurnstileToken}
                onError={() => setTurnstileToken('')}
                onExpire={() => setTurnstileToken('')}
              />
            </div>

            {/* 注册按钮 */}
            <div>
              <button
                type="submit"
                disabled={loading || success}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition ${(loading || success) ? 'opacity-80' : ''}
                `}
              >
                {loading ? (
                  <> <FaSpinner className="animate-spin mr-2 h-5 w-5" /> 注册中...</>
                ) : success ? (
                  <> <FaCheckCircle className="mr-2 h-5 w-5" /> 注册成功</>
                ) : (
                  '注册'
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
            <p>点击"注册"，即表示您同意我们的
              <Link to="/terms" className="font-medium text-primary hover:text-primary/90 ml-1">服务条款</Link>
              和
              <Link to="/privacy" className="font-medium text-primary hover:text-primary/90 ml-1">隐私政策</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;