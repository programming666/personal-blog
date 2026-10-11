// 分页参数解析 — 所有把 page/limit 直接从 query 交给 Mongoose 的列表接口都走这里。
//
// 为什么必须有钳制(线上实测):
//   ?limit=99999  → 原样传给 .limit(),一条请求就能把整张表读进内存(数据一多就是免费 DoS)
//   ?limit=-1     → 生成负 limit,MongoDB 按默认值返回,页数计算随之错乱
//   ?page=abc     → parseInt 得 NaN,原代码靠 `|| 1` 兜住,但 `?page=-3` 会算出负 skip
// 这里统一把 page 归一到 ≥1、limit 归一到 [1, maxLimit],缺失/非法一律用默认值,
// 不抛错——保持既有响应结构不变,只把取值范围收进安全区间。
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/**
 * @param {object} query  req.query
 * @param {{defaultLimit?: number, maxLimit?: number}} [options]
 * @returns {{page: number, limit: number, skip: number}}
 */
function parsePagination(query = {}, options = {}) {
  const defaultLimit = Number.isFinite(options.defaultLimit) && options.defaultLimit > 0
    ? Math.floor(options.defaultLimit)
    : DEFAULT_LIMIT;
  const maxLimit = Number.isFinite(options.maxLimit) && options.maxLimit > 0
    ? Math.floor(options.maxLimit)
    : MAX_LIMIT;

  const rawPage = parseInt(query.page, 10);
  const rawLimit = parseInt(query.limit, 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, maxLimit)
    : defaultLimit;

  return { page, limit, skip: (page - 1) * limit };
}

module.exports = { parsePagination, DEFAULT_LIMIT, MAX_LIMIT };
