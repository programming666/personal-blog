// @ts-nocheck
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { authAPI } from '../services/api';
import AdminPanel from '../components/AdminPanel';
import { FaLock, FaUser, FaSpinner, FaChartBar, FaShieldAlt, FaArrowLeft } from 'react-icons/fa';

const AdminPage = () => {
  const { user, setAuthUser, setAuthToken } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [step, setStep] = useState('credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorTicket, setTwoFactorTicket] = useState('');

  useEffect(() => {
    if (user && user.role === 'admin') {
      setIsAuthenticated(true);
    }
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.adminLogin(formData);
      if (response.data.success) {
        if (response.data.requiresTwoFactor) {
          setTwoFactorTicket(response.data.ticket);
          setStep('twoFactor');
          setLoading(false);
          return;
        }
        setIsAuthenticated(true);
        setAuthUser(response.data.user);
        setAuthToken(response.data.token, response.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactor = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.adminTwoFactorVerify({
        ticket: twoFactorTicket,
        code: twoFactorCode
      });
      if (response.data.success) {
        setIsAuthenticated(true);
        setAuthUser(response.data.user);
        setAuthToken(response.data.token, response.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || '验证失败');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (isAuthenticated) {
    return <AdminPanel />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8 sm:p-10">
          {step === 'credentials' ? (
            <>
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-5 border border-neutral-200 dark:border-neutral-800 grid place-items-center">
                  <FaChartBar className="text-2xl text-neutral-900 dark:text-white" />
                </div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">管理员登录</h1>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">请输入管理员凭据</p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm dark:bg-red-500/5 dark:border-red-500/30 dark:text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    用户名
                  </label>
                  <div className="relative">
                    <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm" />
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      className="input-field pl-10"
                      placeholder="管理员用户名"
                      value={formData.username}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    密码
                  </label>
                  <div className="relative">
                    <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="input-field pl-10"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary w-full py-2.5">
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin" /> 登录中…
                    </>
                  ) : (
                    <>
                      <FaLock /> 登录
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-5 border border-neutral-200 dark:border-neutral-800 grid place-items-center">
                  <FaShieldAlt className="text-2xl text-neutral-900 dark:text-white" />
                </div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">双重验证</h1>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                  打开您的 Authenticator 应用并输入 6 位验证码
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm dark:bg-red-500/5 dark:border-red-500/30 dark:text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleTwoFactor} className="space-y-4">
                <div>
                  <label htmlFor="twoFactorCode" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    验证码
                  </label>
                  <input
                    id="twoFactorCode"
                    name="twoFactorCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9 ]*"
                    maxLength={7}
                    required
                    autoFocus
                    className="input-field text-center text-2xl tracking-[0.4em] font-mono"
                    placeholder="000000"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                  />
                </div>

                <button type="submit" disabled={loading || twoFactorCode.length < 6} className="btn btn-primary w-full py-2.5">
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin" /> 验证中…
                    </>
                  ) : (
                    <>
                      <FaShieldAlt /> 验证并登录
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setTwoFactorCode('');
                    setTwoFactorTicket('');
                    setError('');
                  }}
                  className="w-full text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white inline-flex items-center justify-center gap-1"
                >
                  <FaArrowLeft className="text-[10px]" /> 返回重新登录
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
