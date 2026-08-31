// @ts-nocheck
import { useState, useEffect } from 'react';
import { friendLinksAPI } from '../services/api';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaExternalLinkAlt } from 'react-icons/fa';

const emptyForm = { name: '', url: '', description: '', avatar: '', sortOrder: 0, isActive: true, reciprocal: false };

const AdminFriendLinks = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // 'new' | _id | null
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await friendLinksAPI.listAll();
      setItems(res.data.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const startCreate = () => {
    setEditing('new');
    setForm(emptyForm);
  };

  const startEdit = (item) => {
    setEditing(item._id);
    setForm({
      name: item.name,
      url: item.url,
      description: item.description || '',
      avatar: item.avatar || '',
      sortOrder: item.sortOrder || 0,
      isActive: item.isActive !== false,
      reciprocal: !!item.reciprocal
    });
  };

  const cancel = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const save = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      alert('站点名称和链接地址不能为空');
      return;
    }
    try {
      setSaving(true);
      if (editing === 'new') {
        await friendLinksAPI.create(form);
      } else {
        await friendLinksAPI.update(editing, form);
      }
      await fetchAll();
      cancel();
    } catch (err) {
      alert(err.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id, name) => {
    if (!window.confirm(`确定删除友链「${name}」?`)) return;
    try {
      await friendLinksAPI.remove(id);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || '删除失败');
    }
  };

  const toggleActive = async (item) => {
    try {
      await friendLinksAPI.update(item._id, { isActive: !item.isActive });
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || '操作失败');
    }
  };

  const inputCls =
    'w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-400';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          {items.length} 个友链
        </div>
        <button
          onClick={startCreate}
          disabled={editing !== null}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors"
        >
          <FaPlus /> 添加友链
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {editing && (
        <div className="card p-5 space-y-4">
          <div className="text-sm font-semibold text-neutral-900 dark:text-white">
            {editing === 'new' ? '添加友链' : '编辑友链'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs mb-1 text-neutral-500 dark:text-neutral-400">站点名称 *</label>
              <input className={inputCls} value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="示例站" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-neutral-500 dark:text-neutral-400">链接地址 *</label>
              <input className={inputCls} value={form.url} onChange={(e) => setField('url', e.target.value)} placeholder="https://example.com" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs mb-1 text-neutral-500 dark:text-neutral-400">描述</label>
              <input className={inputCls} value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="一句话介绍该站点" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs mb-1 text-neutral-500 dark:text-neutral-400">头像/Logo(可选,URL 或 /uploads/... 路径)</label>
              <input className={inputCls} value={form.avatar} onChange={(e) => setField('avatar', e.target.value)} placeholder="留空则自动取对方站点 favicon" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-neutral-500 dark:text-neutral-400">排序(越小越靠前)</label>
              <input type="number" className={inputCls} value={form.sortOrder} onChange={(e) => setField('sortOrder', Number(e.target.value))} />
            </div>
            <div className="flex items-end gap-6 pb-1">
              <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setField('isActive', e.target.checked)} className="accent-neutral-900 dark:accent-white" />
                启用(前台可见)
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer">
                <input type="checkbox" checked={form.reciprocal} onChange={(e) => setField('reciprocal', e.target.checked)} className="accent-neutral-900 dark:accent-white" />
                已回链
              </label>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors"
            >
              <FaSave /> {saving ? '保存中…' : '保存'}
            </button>
            <button
              onClick={cancel}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <FaTimes /> 取消
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-neutral-400">加载中…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-neutral-400">暂无友链</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item._id} className="card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg shrink-0 overflow-hidden border border-neutral-200 dark:border-neutral-800 grid place-items-center bg-neutral-50 dark:bg-neutral-900">
                {item.avatar ? (
                  <img src={item.avatar.startsWith('http') ? item.avatar : `${import.meta.env.VITE_API_URL || ''}/${item.avatar}`} alt={item.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <span className="text-sm font-bold text-neutral-400">{item.name?.[0]}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-900 dark:text-white truncate">{item.name}</span>
                  {!item.isActive && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shrink-0">隐藏</span>
                  )}
                  {item.reciprocal && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shrink-0">已回链</span>
                  )}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{item.url}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={item.url.startsWith('http') ? item.url : `https://${item.url}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800" title="打开">
                  <FaExternalLinkAlt />
                </a>
                <button onClick={() => toggleActive(item)} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800" title={item.isActive ? '隐藏' : '显示'}>
                  {item.isActive ? '👁' : '🙈'}
                </button>
                <button onClick={() => startEdit(item)} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800" title="编辑">
                  <FaEdit />
                </button>
                <button onClick={() => remove(item._id, item.name)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="删除">
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFriendLinks;
