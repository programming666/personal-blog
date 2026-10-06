import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { defaultPresentation, isReadableAccent, normalizePresentation, resetAppearance, updateDraft } from '../utils/presentation';
import type { Presentation } from '../utils/presentation';
import AdminSiteSettings from './AdminSiteSettings';
import AppearancePreview from './AppearancePreview';
import AppearanceSections from './AppearanceSections';
import '../styles/appearance.css';

const appearanceGroups = [
  { id: 'brand', title: '站点身份', subtitle: '让读者认识你', number: '01' },
  { id: 'home', title: '首页内容', subtitle: '属于你的开场白', number: '02' },
  { id: 'theme', title: '视觉主题', subtitle: '纸张、墨色与字体', number: '03' },
  { id: 'posts', title: '文章展示', subtitle: '安排文字的节奏', number: '04' },
  { id: 'navigation', title: '导航', subtitle: '清晰的阅读路径', number: '05' },
  { id: 'footer', title: '页脚与链接', subtitle: '与外面的世界连接', number: '06' },
  { id: 'media', title: 'Logo 与图标', subtitle: '品牌的第一印象', number: '07' },
];

export default function AdminAppearance() {
  const { refresh } = useSettings();
  const [draft, setDraft] = useState<Presentation>(defaultPresentation);
  const [saved, setSaved] = useState<Presentation>(defaultPresentation);
  const [group, setGroup] = useState('brand');
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const generation = useRef(0);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const load = useCallback(async () => {
    const id = ++generation.current;
    setLoading(true); setError('');
    try {
      const response = await adminAPI.getPresentation();
      if (id !== generation.current) return;
      const value = normalizePresentation(response.data.data);
      setDraft(value); setSaved(value); setLoaded(true);
    } catch {
      if (id === generation.current) setError('无法读取外观配置。请重试；为保护已有设置，暂不能保存。');
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); return () => { generation.current += 1; }; }, [load]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => (dirty || saving) &&
    (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search));
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (!saving && window.confirm('外观设置尚未保存，确定离开并放弃修改吗？')) blocker.proceed();
    else blocker.reset();
  }, [blocker, saving]);
  useEffect(() => {
    if (!dirty && !saving) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    // 退出会话使用整页跳转，须在请求发出前保护草稿。
    const logout = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('[data-studio-logout]') : null;
      if (target && (saving || !window.confirm('外观设置尚未保存，确定退出并放弃修改吗？'))) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', logout, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', logout, true); };
  }, [dirty, saving]);

  const update = (path: string, value: unknown) => {
    setDraft((current) => updateDraft(current, path, value));
    setErrors((current) => { const next = {...current}; delete next[path]; return next; });
    setNotice('');
  };
  const save = async () => {
    if (!loaded || saving || !dirty) return;
    setError(''); setNotice(''); setErrors({});
    if (!isReadableAccent(draft.theme.accent)) { setGroup('theme'); setError('强调色对比度不足，请选择更深的颜色。'); return; }
    setSaving(true);
    try {
      const response = await adminAPI.savePresentation(draft);
      const value = normalizePresentation(response.data.data);
      setSaved(value); setDraft(value);
      const refreshed = await refresh();
      setNotice(refreshed ? '设置已保存，新的外观已生效。' : '设置已保存，但当前页面刷新配置失败。重新加载页面后可查看新外观。');
    } catch (cause: unknown) {
      const failure = cause as { response?: {data?: {message?: string; errors?: Record<string, string>}} };
      const data = failure.response?.data;
      setError(data?.message || '保存失败，修改已保留，请稍后重试。');
      setErrors(data?.errors || {});
      const first = Object.keys(data?.errors || {})[0]?.split('.')[0];
      if (appearanceGroups.some((item) => item.id === first)) setGroup(first);
    } finally { setSaving(false); }
  };

  if (loading) return <div className="appearance-loading" role="status"><span className="loading-spinner" /> 正在读取外观设置…</div>;
  if (!loaded) return <div className="appearance-message is-error" role="alert"><p>{error}</p><button className="btn btn-secondary" onClick={() => void load()}>重新加载</button></div>;
  const selected = appearanceGroups.find((item) => item.id === group)!;
  return <div className="appearance-page">
    <header className="appearance-intro"><div><span className="appearance-kicker">MAKE IT YOURS</span><h2>你的站点，你的风格。</h2><p>为文字选择一张纸，为想法留一个位置。所有更改在保存后才会公开。</p></div><span className="appearance-draft-status">{dirty ? '● 有未保存修改' : '✓ 已与站点同步'}</span></header>
    {error && <div className="appearance-message is-error" role="alert">{error}</div>}
    {notice && <div className="appearance-message" role="status">{notice}</div>}
    <nav className="appearance-tabs" aria-label="外观设置分组">{appearanceGroups.map((item) => <button key={item.id} type="button" aria-current={group === item.id ? 'page' : undefined} onClick={() => setGroup(item.id)}><span>{item.number}</span>{item.title}</button>)}</nav>
    <div className="appearance-workspace">
      <div className="appearance-editor">
        <div className="appearance-section-heading"><span>{selected.number} / {selected.subtitle}</span><h3>{selected.title}</h3></div>
        {group === 'media' ? <div className="appearance-media"><p className="appearance-message">Logo 和图标沿用独立上传接口：上传或恢复后立即生效，不受下方“保存设置”控制。</p><AdminSiteSettings /></div> : <form id="appearance-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <fieldset disabled={saving} className="appearance-edit-fields"><AppearanceSections group={group} draft={draft} update={update} setDraft={setDraft} errors={errors} /></fieldset>
        </form>}
      </div>
      <AppearancePreview presentation={draft} />
    </div>
    <div className="appearance-savebar"><div><strong>{dirty ? '把新的想法保存下来。' : '让每一次阅读，都有你的温度。'}</strong><span>文字与外观统一保存 · 媒体上传即时生效</span></div><div className="appearance-save-actions">
      <button type="button" className="appearance-reset" disabled={saving} onClick={() => { if (window.confirm('恢复默认主题和文章展示方式？品牌、文案、导航和图片将保留；点击保存后才会生效。')) { setDraft(resetAppearance(draft)); setErrors({}); setNotice('默认外观已载入草稿，保存后生效。'); } }}>恢复默认外观</button>
      <button type="button" className="btn btn-secondary" disabled={!dirty || saving} onClick={() => { setDraft(structuredClone(saved)); setErrors({}); setError(''); setNotice('未保存的修改已取消。'); }}>取消修改</button>
      <button type="button" className="btn btn-primary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? <><span className="loading-spinner" /> 保存中…</> : '保存设置 ↗'}</button>
    </div></div>
  </div>;
}
