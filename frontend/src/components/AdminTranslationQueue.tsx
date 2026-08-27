// @ts-nocheck
// 翻译队列:展示所有内容(post/公告/评论)的 zh/en 译文状态,支持整体/单条补译。
// 译文持久化在 MongoDB Translation 集合;原文本身就是目标语言的字段(如中文章节的标题)不需要译文。
import { useEffect, useState, useCallback } from 'react';
import { adminTranslateAPI } from '../services/api';
import { FaSpinner, FaCheck, FaTimes, FaMinus, FaPlay, FaLanguage, FaInfoCircle } from 'react-icons/fa';

const TYPE_LABEL = { post: '文章', comment: '评论', announcement: '公告' };
const TYPE_CLS = {
  post: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  comment: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  announcement: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

const AdminTranslationQueue = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminTranslateAPI.queue();
      if (res.data.success) setItems(res.data.items);
    } catch (err) {
      setMessage({ type: 'err', text: err.response?.data?.message || '加载翻译队列失败' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // 收集一条内容中所有「需要译文但尚未翻译」的目标(后端字段名 needZh/needEn,首字母小写)
  const collectMissing = (item) => {
    const targets = [];
    for (const f of item.fields) {
      for (const lang of ['zh', 'en']) {
        const need = lang === 'zh' ? f.needZh : f.needEn;
        if (need && !f[lang]) {
          targets.push({ sourceType: item.sourceType, sourceId: item.sourceId, field: f.field, lang, text: f.source });
        }
      }
    }
    return targets;
  };
  const runTargets = async (targets) => {
    if (!targets.length) return;
    setRunning(true);
    setMessage(null);
    try {
      const res = await adminTranslateAPI.run(targets);
      const failCount = res?.data?.fail?.length || 0;
      setMessage({
        type: failCount ? 'warn' : 'ok',
        text: `已补译 ${res.data.ok} 条${failCount ? `,${failCount} 条失败` : ''}`,
      });
      await load();
    } catch (err) {
      setMessage({ type: 'err', text: err.response?.data?.message || '补译失败' });
    } finally {
      setRunning(false);
    }
  };

  const translateAll = () => {
    const targets = items.flatMap(collectMissing);
    if (!targets.length) {
      setMessage({ type: 'ok', text: '没有缺失的译文' });
      return;
    }
    runTargets(targets);
  };
  const translateRow = (item) => runTargets(collectMissing(item));

  const totalMissing = items.reduce((acc, it) => acc + collectMissing(it).length, 0);

  const Cell = ({ f, lang }) => {
    if (f.lang === lang) {
      return <span className="inline-flex items-center gap-1 text-xs text-neutral-400"><FaMinus /> 原文</span>;
    }
    if (f[lang]) {
      return <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><FaCheck /> 已译</span>;
    }
    return <span className="inline-flex items-center gap-1 text-xs text-red-500 dark:text-red-400"><FaTimes /> 缺失</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-neutral-500 dark:text-neutral-400">
        <FaSpinner className="animate-spin mr-2" /> 加载翻译队列...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
          <FaLanguage className="text-blue-500" />
          <span>翻译队列:{items.length} 条内容,缺失译文 {totalMissing} 个</span>
        </div>
        <button
          onClick={translateAll}
          disabled={running || totalMissing === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm"
        >
          {running ? <FaSpinner className="animate-spin" /> : <FaPlay />} 补译全部缺失
        </button>
      </div>

      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg border ${
          message.type === 'err'
            ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'
            : message.type === 'warn'
              ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
              : 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300'
        }`}>{message.text}</div>
      )}

      <div className="flex items-start gap-2 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-3">
        <FaInfoCircle className="mt-0.5 shrink-0" />
        <span>「原文」= 内容本身就是该语言(zh 或 en),无需翻译。「缺失」= 内容非该语言且尚未生成译文,可在本页补译;页面端遇到缺失会按需即时翻译并自动入库。译文存于数据库,后续访问直接取库,不再重复调用 AI。</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
              <th className="px-4 py-2.5 font-medium">内容</th>
              <th className="px-4 py-2.5 font-medium">原文</th>
              <th className="px-4 py-2.5 font-medium">中文译文</th>
              <th className="px-4 py-2.5 font-medium">英文译文</th>
              <th className="px-4 py-2.5 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-neutral-400">暂无内容</td></tr>
            )}
            {items.map((item) => {
              const titleField = item.fields.find((f) => f.field === 'title');
              const bodyField = item.fields.find((f) => f.field === 'body');
              return (
                <tr key={`${item.sourceType}:${item.sourceId}`} className="border-b border-neutral-100 dark:border-neutral-800 last:border-b-0 align-top">
                  <td className="px-4 py-3">
                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${TYPE_CLS[item.sourceType]}`}>{TYPE_LABEL[item.sourceType]}</span>
                    <div className="mt-1 text-xs font-medium break-all">
                      {titleField?.zh || titleField?.en || titleField?.source || item.title || item.preview || '(无标题)'}
                    </div>
                    {!titleField?.source && bodyField?.source && item.sourceType !== 'comment' && (
                      <div className="text-xs text-neutral-500 mt-0.5 break-all">{item.preview}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="font-medium">{item.sourceType === 'announcement' || item.sourceType === 'post' ? titleField?.lang || '-' : bodyField?.lang || '-'}</span>
                    <div className="text-neutral-400 mt-0.5">{(titleField?.source || bodyField?.source || '').length} 字符</div>
                  </td>
                  <td className="px-4 py-3"><Cell f={bodyField || titleField} lang="zh" /></td>
                  <td className="px-4 py-3"><Cell f={bodyField || titleField} lang="en" /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => translateRow(item)}
                      disabled={running || collectMissing(item).length === 0}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 disabled:opacity-40"
                    >
                      {running ? <FaSpinner className="animate-spin" /> : <FaPlay />} 补译
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTranslationQueue;