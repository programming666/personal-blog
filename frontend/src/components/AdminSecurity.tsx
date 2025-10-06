// @ts-nocheck
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { adminAPI } from '../services/api';
import { FaShieldAlt, FaCheckCircle, FaTimesCircle, FaSpinner, FaCopy } from 'react-icons/fa';

const AdminSecurity = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.twoFactorStatus();
      setEnabled(res.data?.data?.enabled || false);
    } catch (err) {
      setError(err.response?.data?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const startSetup = async () => {
    setError('');
    setInfo('');
    try {
      setSubmitting(true);
      const res = await adminAPI.twoFactorSetup();
      setSetupData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || '创建密钥失败');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmEnable = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    try {
      setSubmitting(true);
      await adminAPI.twoFactorEnable(code);
      setInfo('2FA 已启用');
      setSetupData(null);
      setCode('');
      fetchStatus();
    } catch (err) {
      setError(err.response?.data?.message || '验证失败');
    } finally {
      setSubmitting(false);
    }
  };

  const disable = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!window.confirm('确定要关闭 2FA 吗？')) return;
    try {
      setSubmitting(true);
      await adminAPI.twoFactorDisable(disableCode);
      setInfo('2FA 已关闭');
      setDisableCode('');
      fetchStatus();
    } catch (err) {
      setError(err.response?.data?.message || '验证失败');
    } finally {
      setSubmitting(false);
    }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard?.writeText(setupData.secret);
      setInfo('密钥已复制');
    }
  };

  if (loading) {
    return <div className="h-20 rounded-xl bg-neutral-100 dark:bg-neutral-900 animate-pulse"></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <FaShieldAlt /> 双重验证（2FA）
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            启用后，管理员登录将需要输入 Authenticator 应用生成的 6 位验证码。
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
          enabled
            ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
            : 'border-neutral-200 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400'
        }`}>
          {enabled ? <FaCheckCircle /> : <FaTimesCircle />}
          {enabled ? '已启用' : '未启用'}
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm dark:bg-red-500/5 dark:border-red-500/30 dark:text-red-400">
          {error}
        </div>
      )}
      {info && (
        <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
          {info}
        </div>
      )}

      {!enabled && !setupData && (
        <div className="card p-6">
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
            点击下方按钮生成密钥，然后用 Google Authenticator、1Password、Authy 等扫描二维码绑定。
          </p>
          <button onClick={startSetup} disabled={submitting} className="btn btn-primary">
            {submitting ? <FaSpinner className="animate-spin" /> : <FaShieldAlt />}
            开始绑定
          </button>
        </div>
      )}

      {setupData && (
        <div className="card p-6 space-y-5">
          <h3 className="font-semibold text-neutral-900 dark:text-white">扫描二维码或手动输入密钥</h3>
          <div className="grid sm:grid-cols-[auto,1fr] gap-6 items-start">
            <div className="p-3 bg-white rounded-xl border border-neutral-200 dark:border-neutral-800">
              <QRCodeSVG value={setupData.otpauthUrl} size={172} bgColor="#ffffff" fgColor="#000000" />
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  密钥（base32）
                </label>
                <div className="mt-1 flex gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs break-all">
                    {setupData.secret}
                  </code>
                  <button onClick={copySecret} className="btn btn-secondary" title="复制">
                    <FaCopy />
                  </button>
                </div>
              </div>
              <form onSubmit={confirmEnable} className="space-y-3">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    输入应用生成的 6 位验证码
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9 ]*"
                    maxLength={7}
                    required
                    autoFocus
                    className="input-field mt-1 text-center text-xl tracking-[0.4em] font-mono"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setSetupData(null); setCode(''); }}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                  <button type="submit" disabled={submitting || code.length < 6} className="btn btn-primary flex-1">
                    {submitting ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                    确认启用
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {enabled && (
        <form onSubmit={disable} className="card p-6 space-y-4">
          <h3 className="font-semibold text-neutral-900 dark:text-white">关闭 2FA</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            输入当前的 6 位验证码以关闭 2FA。
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={7}
            required
            className="input-field text-center text-xl tracking-[0.4em] font-mono"
            placeholder="000000"
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
          />
          <button type="submit" disabled={submitting || disableCode.length < 6} className="btn btn-danger">
            {submitting ? <FaSpinner className="animate-spin" /> : <FaTimesCircle />}
            关闭 2FA
          </button>
        </form>
      )}
    </div>
  );
};

export default AdminSecurity;
