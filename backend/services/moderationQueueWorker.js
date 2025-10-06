// 审核队列消费者:周期性地把 pending 评论交给 AI 复审
// AI 配额恢复后,pending 评论会自动被审完
const Comment = require('../models/Comment');
const { moderateComment, hasCapacity } = require('./aiModeration');

const TICK_INTERVAL = 30 * 1000; // 30s
const BATCH_MAX = 20; // 每轮最多处理 20 条,避免独占事件循环

let running = false;

const tick = async () => {
  if (running) return;
  running = true;
  let processed = 0;
  try {
    while (processed < BATCH_MAX && hasCapacity()) {
      const next = await Comment.findOne({ moderationStatus: 'pending' }).sort({ createdAt: 1 });
      if (!next) break;

      const verdict = await moderateComment(next.content);
      // 如果配额恰好被吃光,verdict 可能还是 queued — 退出等下一轮
      if (verdict.status === 'queued') break;

      next.moderationStatus = verdict.status;
      next.moderationReason = verdict.reason || '';
      next.moderationModel = verdict.model || '';
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
