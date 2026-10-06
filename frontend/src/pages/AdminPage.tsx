// @ts-nocheck
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import AdminPanel from '../components/AdminPanel';
import { FaLock, FaUser, FaSpinner, FaShieldAlt, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import '../styles/studio.css';

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
    <div className="studio-login">
      <section className="studio-login-story" aria-label="编辑工作室">
        <Link to="/" className="studio-brand"><span className="studio-monogram" aria-hidden="true">Q.</span><span><strong>编辑工作室</strong><small>THE EDITORIAL STUDIO</small></span></Link>
        <div className="studio-login-copy">
          <p className="studio-eyebrow">A QUIET PLACE FOR YOUR IDEAS</p>
          <h2>每一次记录，<br />都是新的开始。</h2>
          <p>欢迎回到你的创作空间。<br />整理灵感，打磨文字，与读者保持连接。</p>
        </div>
        <p className="studio-login-foot">WRITE WITH CARE. SHARE WITH THE WORLD.</p>
      </section>
      <section className="studio-login-form-side">
        <div className="studio-login-form">
          <p className="studio-eyebrow">{step === 'credentials' ? 'WELCOME BACK / 欢迎回来' : 'ONE MORE STEP / 安全验证'}</p>
          <h1>{step === 'credentials' ? '登录工作室' : '双重验证'}</h1>
          <p className="studio-login-form-intro">{step === 'credentials' ? '使用管理员账户，继续你的创作。' : '打开 Authenticator 应用，输入 6 位验证码。'}</p>
          {error && <div role="alert" className="mb-5 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm dark:bg-red-500/5 dark:border-red-500/30 dark:text-red-400">{error}</div>}
          {step === 'credentials' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-xs font-medium mb-2">管理员用户名</label>
                <div className="relative">
                  <FaUser aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs" />
                  <input id="username" name="username" type="text" autoComplete="username" required className="input-field pl-10" placeholder="输入用户名" value={formData.username} onChange={handleInputChange} />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-medium mb-2">密码</label>
                <div className="relative">
                  <FaLock aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs" />
                  <input id="password" name="password" type="password" autoComplete="current-password" required className="input-field pl-10" placeholder="输入密码" value={formData.password} onChange={handleInputChange} />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">{loading ? <><FaSpinner className="animate-spin" aria-hidden="true" /> 登录中…</> : <>进入工作室 <FaArrowRight aria-hidden="true" /></>}</button>
              <p className="text-xs text-neutral-500 leading-relaxed">管理入口仅供站点管理员使用，请妥善保管账户凭据。</p>
            </form>
          ) : (
            <form onSubmit={handleTwoFactor} className="space-y-5">
              <div>
                <label htmlFor="twoFactorCode" className="block text-xs font-medium mb-2">验证码</label>
                <input id="twoFactorCode" name="twoFactorCode" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} required autoFocus className="input-field text-center text-2xl tracking-[0.4em] font-mono" placeholder="000000" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} />
              </div>
              <button type="submit" disabled={loading || twoFactorCode.replace(/\s/g, '').length < 6} className="btn btn-primary w-full py-3">{loading ? <><FaSpinner className="animate-spin" aria-hidden="true" /> 验证中…</> : <><FaShieldAlt aria-hidden="true" /> 验证并登录</>}</button>
              <button type="button" disabled={loading} onClick={() => { setStep('credentials'); setTwoFactorCode(''); setTwoFactorTicket(''); setError(''); }} className="w-full text-xs text-neutral-500 inline-flex items-center justify-center gap-2"><FaArrowLeft aria-hidden="true" /> 返回重新登录</button>
            </form>
          )}
          <Link to="/" className="studio-login-back"><FaArrowLeft aria-hidden="true" /> 返回网站</Link>
        </div>
      </section>
    </div>
  );
};

export default AdminPage;
