// @ts-nocheck
// 后台「登录方式」面板:
//  - 维护登录页的第三方登录按钮列表(GitHub 内置项 + 任意标准 OAuth2/OIDC 提供方)
//  - 每个按钮可自定义文案(中/英)与图标(预设品牌图标 / 上传图片 / https 图片地址)
//  - OAuth2 参数(client_id/secret、端点、scope、PKCE、字段映射)在此配置,存 Setting 表
//  - clientSecret 只写不读:后端永不回传,留空表示保持原值
import { useEffect, useRef, useState } from 'react';
import { adminAPI } from '../services/api';
import {
  ICON_PRESETS,
  PROVIDER_TEMPLATES,
  ProviderIcon,
  blankProvider
} from '../utils/providerIcon';
import {
  FaSave,
  FaPlus,
  FaTrash,
  FaArrowUp,
  FaArrowDown,
  FaUpload,
  FaSpinner,
  FaCopy,
  FaCheck,
  FaTimes,
  FaInfoCircle,
  FaKey,
  FaSyncAlt,
  FaGithub
} from 'react-icons/fa';

const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-xs text-neutral-400 mt-1">{hint}</p>}
  </div>
);

const Badge = ({ children, tone = 'neutral' }) => (
  <span
    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
      tone === 'dark'
        ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
        : 'border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400'
    }`}
  >
    {children}
  </span>
);

const AdminOAuthProviders = () => {
  const [providers, setProviders] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState(null);
  // 是否成功从后端取到过配置:失败时保持 false,渲染层据此锁住编辑器
  const [loadedOk, setLoadedOk] = useState(false);
  const fileRefs = useRef({});

  const applyServerList = (list) => {
    setProviders(list || []);
    setSavedIds((list || []).map((p) => p.id));
    setDirty(false);
  };

  const load = async () => {
    setLoading(true);
    // 重新加载时先清掉上一次的提示(加载中界面会短暂替换掉错误面板)
    setMessage(null);
    try {
      const res = await adminAPI.getOAuthProviders();
      if (res.data.success) {
        applyServerList(res.data.data.providers);
        setLoadedOk(true);
      }
    } catch (err) {
      setMessage({ type: 'err', text: err.response?.data?.message || '加载配置失败' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // 本地字段修改(支持 'label.zh' / 'icon.preset' / 'mapping.id' 两级路径)
  const setField = (index, path, value) => {
    setProviders((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        const parts = path.split('.');
        const next = { ...p };
        if (parts.length === 1) {
          next[path] = value;
        } else {
          next[parts[0]] = { ...(next[parts[0]] || {}), [parts[1]]: value };
        }
        return next;
      })
    );
    setDirty(true);
  };

  const addProvider = (template) => {
    const suggested = template ? template.key : 'sso';
    const input = window.prompt('登录方式 id(小写字母/数字开头,可含 - _,例如 company-sso):', suggested);
    if (!input) return;
    const id = input.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(id)) {
      setMessage({ type: 'err', text: 'id 只能用小写字母/数字开头,可含 - 和 _,长度 2-40' });
      return;
    }
    if (['providers', 'callback', 'admin', 'login', 'logout', 'me'].includes(id)) {
      setMessage({ type: 'err', text: `id "${id}" 是保留字,请换一个` });
      return;
    }
    if (providers.some((p) => p.id === id)) {
      setMessage({ type: 'err', text: `id "${id}" 已存在` });
      return;
    }

    const provider = blankProvider(id);
    if (template) {
      const { iconPreset, mapping, ...rest } = template.patch;
      Object.assign(provider, rest);
      Object.assign(provider.mapping, mapping);
      provider.icon.preset = iconPreset;
    }
    setProviders((prev) => [...prev, provider]);
    setDirty(true);
    setMessage({ type: 'ok', text: `已添加 ${id},填好参数后点「保存配置」` });
  };

  const removeProvider = (index) => {
    const p = providers[index];
    if (!window.confirm(`确定删除登录方式「${p.name || p.id}」?保存后该按钮会从登录页消失。`)) return;
    setProviders((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const move = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= providers.length) return;
    setProviders((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    // 保险:配置没成功加载过就不允许保存,否则会把后端现有配置(含密钥)整体覆盖
    if (!loadedOk) {
      setMessage({ type: 'err', text: '配置尚未成功加载,已阻止保存以免覆盖现有配置' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await adminAPI.saveOAuthProviders(providers);
      applyServerList(res.data.data.providers);
      setMessage({ type: 'ok', text: '已保存,登录页立即生效' });
    } catch (err) {
      setMessage({ type: 'err', text: err.response?.data?.message || '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleIconFile = async (index, file) => {
    const p = providers[index];
    if (!file) {
      // 提前返回也要复位 input,否则重新选同一个文件不会再触发 change
      const ref = fileRefs.current[p.id];
      if (ref) ref.value = '';
      return;
    }
    if (!savedIds.includes(p.id)) {
      setMessage({ type: 'err', text: '请先「保存配置」,再上传图标' });
      // 这一路失败同样要复位,避免管理员保存后重选同一个文件没反应
      const ref = fileRefs.current[p.id];
      if (ref) ref.value = '';
      return;
    }
    // 上传成功后会用服务器返回的列表整体刷新本地状态,未保存的表单改动(含刚填的密钥)会被丢掉
    if (dirty && !window.confirm('上传图标会刷新当前表单,未保存的修改将丢失。先保存?点「取消」返回保存。')) return;
    setBusyId(p.id);
    setMessage(null);
    try {
      const res = await adminAPI.uploadOAuthIcon(p.id, file);
      applyServerList(res.data.data.providers);
      setMessage({ type: 'ok', text: '图标已更新' });
    } catch (err) {
      setMessage({ type: 'err', text: err.response?.data?.message || '图标上传失败' });
    } finally {
      setBusyId('');
      const ref = fileRefs.current[p.id];
      if (ref) ref.value = '';
    }
  };

  const handleDeleteIcon = async (index) => {
    const p = providers[index];
    if (!savedIds.includes(p.id)) {
      setField(index, 'icon.path', '');
      return;
    }
    if (!window.confirm('删除自定义图标,回落到预设图标?')) return;
    if (dirty && !window.confirm('删除图标会刷新当前表单,未保存的修改将丢失。继续?')) return;
    setBusyId(p.id);
    try {
      const res = await adminAPI.deleteOAuthIcon(p.id);
      applyServerList(res.data.data.providers);
      setMessage({ type: 'ok', text: '已恢复预设图标' });
    } catch (err) {
      setMessage({ type: 'err', text: err.response?.data?.message || '删除失败' });
    } finally {
      setBusyId('');
    }
  };

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage({ type: 'ok', text: `${label}已复制` });
    } catch {
      setMessage({ type: 'err', text: '复制失败,请手动选中复制' });
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <FaKey /> 登录方式
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1">
            <FaInfoCircle /> 支持任意标准 OAuth2 / OIDC 提供方(Gitee、GitLab、Google、自建 Keycloak…),
            文案与图标都可在下方自定义
          </p>
        </div>
        {loadedOk && (
          <div className="flex items-center gap-2">
            {dirty && <Badge tone="dark">有未保存的修改</Badge>}
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">
              {saving ? <FaSpinner className="animate-spin" /> : <FaSave />} 保存配置
            </button>
          </div>
        )}
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
            message.type === 'ok'
              ? 'border-green-200 bg-green-50 text-green-700 dark:bg-green-500/5 dark:border-green-500/30 dark:text-green-400'
              : 'border-red-200 bg-red-50 text-red-700 dark:bg-red-500/5 dark:border-red-500/30 dark:text-red-400'
          }`}
        >
          {message.type === 'ok' ? <FaCheck /> : <FaTimes />} {message.text}
        </div>
      )}

      {!loadedOk && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-500/5 dark:border-red-500/30 text-sm text-red-700 dark:text-red-400 space-y-3">
          <p className="flex items-center gap-2 font-medium">
            <FaTimes /> 配置加载失败,请刷新页面或重新登录后再编辑。
          </p>
          <p className="text-xs">
            编辑器已锁定:没取到后端配置就直接保存,会整体覆盖现有登录方式(含已保存的密钥)。
          </p>
          <button onClick={load} className="btn btn-secondary text-xs">
            <FaSyncAlt /> 重新加载
          </button>
        </div>
      )}

      {loadedOk && (
      <div className="card p-5">
        <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">快速添加(自动填好端点与字段映射,只需补 client_id / client_secret):</p>
        <div className="flex flex-wrap gap-2">
          {PROVIDER_TEMPLATES.map((tpl) => (
            <button key={tpl.key} onClick={() => addProvider(tpl)} className="btn btn-secondary text-xs">
              <FaPlus /> {tpl.label}
            </button>
          ))}
          <button onClick={() => addProvider(null)} className="btn btn-secondary text-xs">
            <FaPlus /> 自定义 OAuth2
          </button>
        </div>
      </div>
      )}

      {loadedOk && providers.length === 0 && (
        <div className="card p-8 text-center text-neutral-500 dark:text-neutral-400">
          当前没有任何登录方式,登录页会提示「暂未开启任何登录方式」。
        </div>
      )}

      {loadedOk && providers.map((p, index) => {
        const isGithub = p.type === 'github';
        const isSaved = savedIds.includes(p.id);
        const busy = busyId === p.id;
        return (
          <div key={`${p.id}-${index}`} className="card p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl border border-neutral-200 dark:border-neutral-800 grid place-items-center shrink-0">
                  <ProviderIcon icon={p.icon} className="text-xl" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-neutral-900 dark:text-white flex items-center gap-2 flex-wrap">
                    {p.name || p.id}
                    <Badge>{p.id}</Badge>
                    {isGithub ? <Badge>内置 GitHub</Badge> : <Badge>OAuth2</Badge>}
                    {!isSaved && <Badge>未保存</Badge>}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {p.label.zh || `使用 ${p.name || p.id} 登录`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setField(index, 'enabled', !p.enabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    p.enabled ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-700'
                  }`}
                  aria-pressed={p.enabled}
                  title={p.enabled ? '登录页显示中' : '已从登录页隐藏'}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white dark:bg-neutral-900 transition-all ${
                      p.enabled ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </button>
                <button onClick={() => move(index, -1)} className="btn btn-secondary text-xs px-2.5 py-1.5" title="上移">
                  <FaArrowUp />
                </button>
                <button onClick={() => move(index, 1)} className="btn btn-secondary text-xs px-2.5 py-1.5" title="下移">
                  <FaArrowDown />
                </button>
                <button onClick={() => removeProvider(index)} className="btn btn-danger text-xs px-2.5 py-1.5" title="删除">
                  <FaTrash />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="名称(显示用)">
                <input
                  type="text"
                  className="input-field"
                  value={p.name}
                  onChange={(e) => setField(index, 'name', e.target.value)}
                  placeholder="Gitee"
                />
              </Field>
              <Field label="按钮文案(中文)" hint={`留空则用「使用 ${p.name || p.id} 登录」`}>
                <input
                  type="text"
                  className="input-field"
                  value={p.label.zh}
                  onChange={(e) => setField(index, 'label.zh', e.target.value)}
                  placeholder={`使用 ${p.name || p.id} 登录`}
                />
              </Field>
              <Field label="Button text (English)" hint={`留空则用 “Sign in with ${p.name || p.id}”`}>
                <input
                  type="text"
                  className="input-field"
                  value={p.label.en}
                  onChange={(e) => setField(index, 'label.en', e.target.value)}
                  placeholder={`Sign in with ${p.name || p.id}`}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="预设图标">
                <select
                  className="input-field"
                  value={p.icon.preset}
                  onChange={(e) => setField(index, 'icon.preset', e.target.value)}
                >
                  {ICON_PRESETS.map((preset) => (
                    <option key={preset.id || 'default'} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="自定义图标(上传)" hint="上传后优先于预设图标;支持 SVG/PNG/JPG/WebP,自动转 128×128 PNG">
                <div className="flex items-center gap-2">
                  <input
                    ref={(el) => {
                      fileRefs.current[p.id] = el;
                    }}
                    type="file"
                    accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp,image/gif,image/avif"
                    className="hidden"
                    onChange={(e) => handleIconFile(index, e.target.files?.[0])}
                  />
                  <button
                    onClick={() => fileRefs.current[p.id]?.click()}
                    disabled={busy}
                    className="btn btn-secondary text-xs"
                    title={isSaved ? '上传图标' : '请先保存配置'}
                  >
                    {busy ? <FaSpinner className="animate-spin" /> : <FaUpload />} 上传图标
                  </button>
                  {p.icon.path && (
                    <button onClick={() => handleDeleteIcon(index)} disabled={busy} className="btn btn-danger text-xs">
                      <FaTrash /> 移除
                    </button>
                  )}
                </div>
              </Field>
              <Field label="自定义图标(图片地址)" hint="必须是 https(CSP 只放行 https 图片)">
                <input
                  type="text"
                  className="input-field"
                  value={p.icon.url}
                  onChange={(e) => setField(index, 'icon.url', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </Field>
            </div>

            {isGithub ? (
              <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-600 dark:text-neutral-300 flex items-start gap-2">
                <FaGithub className="mt-0.5 shrink-0" />
                <span>
                  内置 GitHub 登录仍使用 <code>.env</code> 里的 <code>GITHUB_CLIENT_ID</code> /{' '}
                  <code>GITHUB_CLIENT_SECRET</code> 与既有回调地址(见 passport 启动日志)。
                  这里只能改它的启用开关、文案与图标。
                </span>
              </div>
            ) : (
              <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Client ID">
                    <input
                      type="text"
                      className="input-field font-mono"
                      value={p.clientId}
                      onChange={(e) => setField(index, 'clientId', e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Client Secret"
                    hint={
                      p.clientSecret === null
                        ? '保存后将清空已保存的密钥'
                        : p.hasClientSecret
                          ? '已配置。留空保持不变;填入新值会覆盖'
                          : '填入后保存(不回显)'
                    }
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        className="input-field font-mono"
                        value={p.clientSecret === null ? '' : p.clientSecret || ''}
                        onChange={(e) => setField(index, 'clientSecret', e.target.value)}
                        placeholder={p.hasClientSecret ? '已配置(留空则保持不变)' : ''}
                        autoComplete="new-password"
                      />
                      {p.hasClientSecret && (
                        <button
                          type="button"
                          onClick={() => setField(index, 'clientSecret', null)}
                          className="btn btn-secondary text-xs shrink-0"
                          title="保存后清空后端已保存的密钥"
                        >
                          清除已保存的密钥
                        </button>
                      )}
                    </div>
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <Field label="授权地址 (authorization_endpoint)">
                    <input
                      type="text"
                      className="input-field font-mono"
                      value={p.authorizationUrl}
                      onChange={(e) => setField(index, 'authorizationUrl', e.target.value)}
                      placeholder="https://example.com/oauth/authorize"
                    />
                  </Field>
                  <Field label="Token 地址 (token_endpoint)">
                    <input
                      type="text"
                      className="input-field font-mono"
                      value={p.tokenUrl}
                      onChange={(e) => setField(index, 'tokenUrl', e.target.value)}
                      placeholder="https://example.com/oauth/token"
                    />
                  </Field>
                  <Field label="用户信息地址 (userinfo_endpoint)" hint="需返回 JSON;字段名对不上时用下面的「字段映射」纠正">
                    <input
                      type="text"
                      className="input-field font-mono"
                      value={p.userInfoUrl}
                      onChange={(e) => setField(index, 'userInfoUrl', e.target.value)}
                      placeholder="https://example.com/api/user"
                    />
                  </Field>
                  <Field label="邮箱补取地址(可选)" hint="用户信息里没有邮箱时再请求这里(支持数组或对象)">
                    <input
                      type="text"
                      className="input-field font-mono"
                      value={p.emailUrl}
                      onChange={(e) => setField(index, 'emailUrl', e.target.value)}
                      placeholder="https://example.com/api/emails"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Scope" hint="空格分隔">
                    <input
                      type="text"
                      className="input-field font-mono"
                      value={p.scope}
                      onChange={(e) => setField(index, 'scope', e.target.value)}
                      placeholder="openid profile email"
                    />
                  </Field>
                  <Field label="客户端认证方式" hint="多数提供方用「放请求体」;老式/严格实现用 Basic 头">
                    <select
                      className="input-field"
                      value={p.tokenAuthStyle}
                      onChange={(e) => setField(index, 'tokenAuthStyle', e.target.value)}
                    >
                      <option value="body">client_secret_post(放请求体)</option>
                      <option value="basic">client_secret_basic(Basic 头)</option>
                      <option value="none">不发送 secret(公共客户端 / 仅 PKCE)</option>
                    </select>
                  </Field>
                  <Field label="PKCE" hint="现代/OIDC 提供方建议开启">
                    <select
                      className="input-field"
                      value={p.pkce ? 'on' : 'off'}
                      onChange={(e) => setField(index, 'pkce', e.target.value === 'on')}
                    >
                      <option value="off">关闭</option>
                      <option value="on">开启(S256)</option>
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="回调地址覆盖(可选)" hint="留空即用下方默认回调地址">
                    <input
                      type="text"
                      className="input-field font-mono"
                      value={p.redirectUri}
                      onChange={(e) => setField(index, 'redirectUri', e.target.value)}
                      placeholder="https://your-domain.com/api/auth/oauth/xxx/callback"
                    />
                  </Field>
                  <Field label="默认回调地址(填到提供方后台)" hint="必须与这里完全一致,否则换取 token 会被拒">
                    <div className="flex items-center gap-2">
                      <input type="text" readOnly className="input-field font-mono" value={p.callbackUrl || ''} />
                      <button
                        onClick={() => copyText(p.callbackUrl || '', '回调地址')}
                        className="btn btn-secondary text-xs shrink-0"
                        disabled={!p.callbackUrl}
                      >
                        <FaCopy /> 复制
                      </button>
                    </div>
                  </Field>
                </div>

                <div>
                  <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    字段映射(留空自动按常见字段名匹配;可用 <code>a.b</code> 点路径,逗号分隔多个候选)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Field label="用户 ID">
                      <input
                        type="text"
                        className="input-field font-mono"
                        value={p.mapping.id}
                        onChange={(e) => setField(index, 'mapping.id', e.target.value)}
                        placeholder="sub"
                      />
                    </Field>
                    <Field label="昵称/用户名">
                      <input
                        type="text"
                        className="input-field font-mono"
                        value={p.mapping.name}
                        onChange={(e) => setField(index, 'mapping.name', e.target.value)}
                        placeholder="preferred_username"
                      />
                    </Field>
                    <Field label="邮箱">
                      <input
                        type="text"
                        className="input-field font-mono"
                        value={p.mapping.email}
                        onChange={(e) => setField(index, 'mapping.email', e.target.value)}
                        placeholder="email"
                      />
                    </Field>
                    <Field label="头像">
                      <input
                        type="text"
                        className="input-field font-mono"
                        value={p.mapping.avatar}
                        onChange={(e) => setField(index, 'mapping.avatar', e.target.value)}
                        placeholder="picture"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
        <p className="font-medium text-neutral-800 dark:text-neutral-200 mb-1">说明</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>用户首次用某个提供方登录时会自动建号,并在 <code>users.oauthAccounts</code> 里记录
            <code>(provider, providerUserId)</code>;后续登录按这个键直接命中。</li>
          <li>出于安全,不会按用户名 / 邮箱自动合并到已有账号(与 GitHub 流程一致),避免第三方身份吞掉历史评论作者。</li>
          <li>被提供方拒绝、state 校验失败、换 token 失败等细节只写后端日志(<code>[oauth]</code> 前缀),
            前端只提示一句笼统错误。</li>
          <li>出站请求可用代理:环境变量 <code>OAUTH_PROXY</code>(回落到 <code>AI_PROXY</code> / <code>HTTPS_PROXY</code>)。</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminOAuthProviders;
