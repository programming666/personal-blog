// @ts-nocheck
import { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import { FaCheck, FaTimes, FaRedo, FaSyncAlt, FaUser } from 'react-icons/fa';

const statusOptions = [
  { value: 'pending', label: '待审核' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'approved', label: '已通过' }
];

const AdminModerationQueue = () => {
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState([]);
  const [quota, setQuota] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [q, qq] = await Promise.all([
        adminAPI.getCommentQueue(status),
        adminAPI.getModerationQuota()
      ]);
      if (q.data.success) setItems(q.data.data);
      if (qq.data.success) setQuota(qq.data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const setItemBusy = (id, v) => setBusy((s) => ({ ...s, [id]: v }));

  const moderate = async (id, newStatus, reason) => {
    setItemBusy(id, true);
    try {
      await adminAPI.moderateComment(id, { status: newStatus, reason });
      setItems((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || '操作失败');
    } finally {
      setItemBusy(id, false);
    }
  };

  const retry = async (id) => {
    setItemBusy(id, true);
    try {
      const res = await adminAPI.retryModeration(id);
      if (res.data?.data?.moderationStatus !== status) {
        setItems((prev) => prev.filter((c) => c._id !== id));
      } else {
        load();
      }
    } catch (err) {
      alert(err.response?.data?.message || '重试失败');
    } finally {
      setItemBusy(id, false);
    }
  };

  const triggerTick = async () => {
    try {
      await adminAPI.triggerModerationTick();
      setTimeout(load, 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-neutral-900 dark:text-white">AI 审核配额</h3>
          <button onClick={load} className="btn btn-secondary text-xs">
            <FaSyncAlt /> 刷新
          </button>
        </div>
        {quota.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            未配置 GEMINI_API_KEYS — 评论将直接发布（不经过 AI 审核）
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quota.map((q) => (
              <div key={`${q.keyIdx}:${q.model}`} className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 text-xs">
                <div className="font-mono text-neutral-900 dark:text-white">key#{q.keyIdx} · {q.model}</div>
                <div className="mt-2 text-neutral-600 dark:text-neutral-400">
                  RPM: <span className="font-medium text-neutral-900 dark:text-white">{q.rpmUsed}/{q.rpmLimit}</span>
                </div>
                <div className="text-neutral-600 dark:text-neutral-400">
                  RPD: <span className="font-medium text-neutral-900 dark:text-white">{q.rpdUsed}/{q.rpdLimit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            {statusOptions.map((o) => (
              <button
                key={o.value}
                onClick={() => setStatus(o.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  status === o.value
                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <button onClick={triggerTick} className="btn btn-secondary text-xs">
            <FaSyncAlt /> 触发一次队列扫描
          </button>
        </div>

        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {loading ? (
            <div className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400">加载中…</div>
          ) : items.length === 0 ? (
            <div className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400">
              {status === 'pending' && '审核队列为空'}
              {status === 'rejected' && '无被拒绝的评论'}
              {status === 'approved' && '无已通过的评论'}
            </div>
          ) : (
            items.map((c) => (
              <div key={c._id} className="px-6 py-4 flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 grid place-items-center text-neutral-500 shrink-0">
                  {c.author?.avatar ? (
                    <img src={c.author.avatar} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <FaUser />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium text-neutral-900 dark:text-white">
                      {c.author?.username || '匿名'}
                    </span>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      文章: {c.post?.title || '—'}
                    </span>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words">
                    {c.content}
                  </p>
                  {(c.moderationReason || c.moderationModel) && (
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {c.moderationModel && <>模型: <code className="font-mono">{c.moderationModel}</code> · </>}
                      {c.moderationReason && <>原因: {c.moderationReason}</>}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {status !== 'approved' && (
                    <button
                      onClick={() => moderate(c._id, 'approved', '管理员通过')}
                      disabled={!!busy[c._id]}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700 dark:border-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 disabled:opacity-50"
                    >
                      <FaCheck /> 通过
                    </button>
                  )}
                  {status !== 'rejected' && (
                    <button
                      onClick={() => moderate(c._id, 'rejected', '管理员拒绝')}
                      disabled={!!busy[c._id]}
                      className="btn btn-danger text-xs px-3 py-1.5"
                    >
                      <FaTimes /> {status === 'approved' ? '撤回' : '拒绝'}
                    </button>
                  )}
                  <button
                    onClick={() => retry(c._id)}
                    disabled={!!busy[c._id]}
                    className="btn btn-secondary text-xs px-3 py-1.5"
                  >
                    <FaRedo /> AI 重判
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminModerationQueue;
