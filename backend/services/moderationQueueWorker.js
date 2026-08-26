// 审核队列消费者:周期性地把 pending 评论交给 AI 复审
// AI 配额恢复后,pending 评论会自动被审完
const Comment = require('../models/Comment');
const { moderateComment, hasCapacity, applyVerdictToComment } = require('./aiModeration');

const TICK_INTERVAL = 30 * 1000; // 30s
const BATCH_MAX = 20; // 每轮最多处理 20 条,避免独占事件循环
const MAX_RETRIES = 5; // 真实异常(输出格式/调用失败)连续重试上限,超过转人工兜底,不再自动消耗配额
let running = false;

const tick = async () => {
  if (running) return;
  running = true;
  let processed = 0;
  try {
    while (processed < BATCH_MAX && hasCapacity()) {
      // 排除已超重试上限的评论 — 那些等管理员人工处理,不让 worker 无限消耗配额
      const next = await Comment.findOne({ moderationStatus: 'pending', moderationRetries: { $lt: MAX_RETRIES } }).sort({ createdAt: 1 });
      if (!next) break;
      // 带上相关文章上下文,让模型能判断评论是否离题
      if (!next.populated('post')) await next.populate('post', 'title content');
      // 回复语境:被回复的评论也喂给模型
      let replyToCtx = null;
      if (next.replyTo) {
        await next.populate('replyTo', 'content');
        replyToCtx = { content: next.replyTo.content };
      }

      const verdict = await moderateComment(next.content, { article: next.post ? { title: next.post.title, content: next.post.content } : null, replyTo: replyToCtx });
      // pending 分两种:quota=true 是配额满,不计数,退出等配额恢复;
      // retryable=true 是真实异常(调用失败/输出格式异常),计数,超上限转人工兜底
      if (verdict.status === 'pending') {
        if (verdict.quota) break; // 配额没恢复,本轮到此为止
        next.moderationRetries = (next.moderationRetries || 0) + 1;
        if (next.moderationRetries >= MAX_RETRIES) {
          next.moderationReason = `AI 审核连续异常 ${MAX_RETRIES} 次,已暂停自动重试,等待管理员处理: ${verdict.reason || ''}`;
          await next.save();
          processed += 1;
          continue; // 跳过该条,继续处理队列里其它评论
        }
        await next.save(); // 记录重试次数,下一轮再试
        break;
      }

      applyVerdictToComment(next, verdict, next.content);
      await next.save();
      processed += 1;
    }
  } catch (err) {
    console.error('[moderationQueueWorker] tick error:', err.message);
  } finally {
    running = false;
  }
};

exports.start = () => {
  // 启动后稍等 5s 再首跑,避免和应用启动其它初始化抢资源
  setTimeout(tick, 5000);
  const handle = setInterval(tick, TICK_INTERVAL);
  if (typeof handle.unref === 'function') handle.unref();
  console.log(`[moderationQueueWorker] started (interval=${TICK_INTERVAL / 1000}s)`);
};

exports.tickNow = tick; // 暴露给 admin 端手动触发
