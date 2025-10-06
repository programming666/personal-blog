// @ts-nocheck
import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { FaPlus, FaEdit, FaTrash, FaThumbtack, FaSave, FaTimes } from 'react-icons/fa';

const emptyForm = { title: '', content: '', isPublished: true, pinned: false };

const AdminAnnouncements = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.listAllAnnouncements({ limit: 100 });
      setItems(res.data.data);
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
      title: item.title,
      content: item.content,
      isPublished: item.isPublished,
      pinned: item.pinned
    });
  };

  const cancel = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      alert('标题和内容不能为空');
      return;
    }
    try {
      setSaving(true);
      if (editing === 'new') {
        await adminAPI.createAnnouncement(form);
      } else {
        await adminAPI.updateAnnouncement(editing, form);
      }
      await fetchAll();
      cancel();
    } catch (err) {
      alert(err.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('确定删除该公告？此操作不可恢复。')) return;
    try {
      await adminAPI.deleteAnnouncement(id);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || '删除失败');
    }
  };

  const formatDate = (s) => new Date(s).toLocaleString('zh-CN');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">公告管理</h2>
        {editing === null && (
          <button onClick={startCreate} className="btn btn-primary">
            <FaPlus /> 新建公告
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:bg-red-500/5 dark:border-red-500/30 dark:text-red-400">
          {error}
        </div>
      )}

      {editing !== null && (
        <div className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {editing === 'new' ? '新建公告' : '编辑公告'}
          </h3>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">标题</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field"
              maxLength={100}
              placeholder="公告标题"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              内容 <span className="text-neutral-400 font-normal">（支持 Markdown）</span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="input-field min-h-48 resize-y font-mono text-sm"
              rows={10}
              maxLength={5000}
              placeholder="公告正文…"
            />
          </div>

          <div className="flex gap-6 text-sm">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                className="w-4 h-4 rounded text-primary"
              />
              <span className="text-neutral-700 dark:text-neutral-300">发布</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
                className="w-4 h-4 rounded text-primary"
              />
              <span className="text-neutral-700 dark:text-neutral-300">置顶</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <button onClick={cancel} className="btn btn-secondary">
              <FaTimes /> 取消
            </button>
            <button onClick={save} disabled={saving} className="btn btn-primary">
              <FaSave /> {saving ? '保存中…' : '保存'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  <th className="px-4 py-3 font-medium">标题</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">创建时间</th>
                  <th className="px-4 py-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {item.pinned && <FaThumbtack className="text-neutral-700 dark:text-neutral-300 text-xs" title="置顶" />}
                        <span className="font-medium text-neutral-900 dark:text-white">{item.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        item.isPublished
                          ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                          : 'border-neutral-200 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400'
                      }`}>
                        {item.isPublished ? '已发布' : '草稿'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => startEdit(item)}
                          className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                          title="编辑"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => remove(item._id)}
                          className="p-2 rounded-lg text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          title="删除"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-neutral-500 dark:text-neutral-400">
                      暂无公告
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnnouncements;
