// @ts-nocheck
import { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import { FaSave, FaUndo, FaPaperPlane, FaCheck, FaTimes, FaInfoCircle, FaRobot, FaSpinner } from 'react-icons/fa';

// OpenAI 兼容 AI 审核配置面板(baseURL / API Key / 模型 / 代理)
// .env 提供默认值;保存即写入 DB(Setting)覆盖 .env;「恢复默认」删除 DB 覆盖回退 .env
const AdminAiSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok'|'err', text }
  const [source, setSource] = useState('env');

  const [enabled, setEnabled] = useState(true);
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKeys, setApiKeys] = useState('');
  const [models, setModels] = useState('');
  const [proxy, setProxy] = useState('');
  const [keyCount, setKeyCount] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getAiConfig();
      if (res.data.success) {
        const d = res.data.data;
        setSource(d.source);
        setEnabled(!!d.enabled);
        setBaseUrl(d.baseUrl || '');
        setModels((d.models || []).join(', '));
        setProxy(d.proxy && d.proxy !== '<set>' ? d.proxy : '');
        setKeyCount(d.keyCount || 0);
        // apiKeys 直接留空不预填(避免误把脱敏值当真实 key 保存)
        setApiKeys('');
      }
    } catch (err) {
      setMessage({ type: 'err', text: err.response?.data?.message || '加载配置失败' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await adminAPI.saveAiConfig({
        enabled,
        baseUrl,
        apiKeys,   // 空字符串 = 保持当前 key;填了则整体替换(逗号分隔)
        models,
        proxy
      });
      const d = res.data.data;
      setKeyCount(d.keyCount);
      setSource('db');
      setMessage({ type: 'ok', text: `已保存。当前 ${d.keyCount} 个 key，模型: ${(d.models || []).join(', ')}` });
      setApiKeys('');
    } catch (err) {
      setMessage({ type: 'err', text: err.response?.data?.message || '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const res = await adminAPI.testAiConfig({ baseUrl, apiKeys, models, proxy });
      if (res.data.success) {
        setMessage({ type: 'ok', text: `连接成功（模型 ${res.data.model}）裁决: ${res.data.verdict ? JSON.stringify(res.data.verdict) : '(响应见下)'}` });
      } else {
        setMessage({ type: 'err', text: res.data.message });
      }
    } catch (err) {
      setMessage({ type: 'err', text: err.response?.data?.message || '测试失败' });
    } finally {
      setTesting(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('确定恢复为 .env 默认配置？将删除后台保存的覆盖。')) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await adminAPI.resetAiConfig();
      const d = res.data.data;
      setSource('env');
      setEnabled(!!d.enabled);
      setBaseUrl(d.baseUrl || '');
      setModels((d.models || []).join(', '));
      setProxy('');
      setKeyCount(d.keyCount || 0);
      setApiKeys('');
      setMessage({ type: 'ok', text: '已恢复为 .env 默认配置' });
    } catch (err) {
      setMessage({ type: 'err', text: err.response?.data?.message || '恢复失败' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-400">
        <FaSpinner className="animate-spin mr-2" /> 加载中…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">AI 评论审核（OpenAI 兼容）</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1">
            <FaInfoCircle /> 支持任意 OpenAI 兼容的 /chat/completions 端点（OpenAI / DeepSeek / Moonshot / OpenRouter / 本地 Ollama…）
          </p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border ${
          source === 'db'
            ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400'
            : 'border-neutral-300 bg-neutral-50 text-neutral-600 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300'
        }`}>
          {source === 'db' ? '使用后台配置（覆盖 .env）' : '使用 .env 默认配置'}
        </span>
      </div>

      {message && (
        <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
          message.type === 'ok'
            ? 'border-green-200 bg-green-50 text-green-700 dark:bg-green-500/5 dark:border-green-500/30 dark:text-green-400'
            : 'border-red-200 bg-red-50 text-red-700 dark:bg-red-500/5 dark:border-red-500/30 dark:text-red-400'
        }`}>
          {message.type === 'ok' ? <FaCheck /> : <FaTimes />} {message.text}
        </div>
      )}

      <div className="card p-6 space-y-5">
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <div className="font-medium text-neutral-900 dark:text-white flex items-center gap-2"><FaRobot /> 启用 AI 审核</div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400">关闭后评论直接发布（其它反滥用层照常生效）</div>
          </div>
          <button
            type="button"
            onClick={() => setEnabled((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-700'}`}
            aria-pressed={enabled}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white dark:bg-neutral-900 transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </label>

        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Base URL</label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="input-field"
          />
          <p className="text-xs text-neutral-400 mt-1">填到版本路径即可，会自动拼接 /chat/completions</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">API Key（逗号分隔，多 key 自动轮询）</label>
          <textarea
            value={apiKeys}
            onChange={(e) => setApiKeys(e.target.value)}
            placeholder={`当前已配置 ${keyCount} 个 key。留空则保持当前 key；填入新 key（逗号分隔）会整体替换`}
            rows={2}
            className="input-field font-mono"
          />
          <p className="text-xs text-neutral-400 mt-1">出于安全，此处不回显已保存的 key</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">模型（逗号分隔，多模型自动均衡）</label>
          <input
            type="text"
            value={models}
            onChange={(e) => setModels(e.target.value)}
            placeholder="gpt-4o-mini"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">出站代理（可选，socks5/http/https）</label>
          <input
            type="text"
            value={proxy}
            onChange={(e) => setProxy(e.target.value)}
            placeholder="socks5://127.0.0.1:1080"
            className="input-field font-mono"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <FaSpinner className="animate-spin" /> : <FaSave />} 保存
        </button>
        <button className="btn btn-outline" onClick={handleTest} disabled={testing}>
          {testing ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />} 测试连接
        </button>
        <button className="btn btn-outline" onClick={handleReset} disabled={saving}>
          <FaUndo /> 恢复默认(.env)
        </button>
      </div>
      <p className="text-xs text-neutral-400">保存/测试即生效，无需重启后端；评论审核吞吐限制为每 key 每模型 10 次/分钟、1500 次/天。</p>
    </div>
  );
};

export default AdminAiSettings;
