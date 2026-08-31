// 去除 markdown 语法,保留纯文本(与 backend/server.js 的 stripMarkdown 逻辑一致)
export function stripMarkdown(src) {
  if (!src) return '';
  return String(src)
    .replace(/```[\s\S]*?```/g, ' ')       // 代码块
    .replace(/`[^`]*`/g, ' ')              // 行内代码
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接 → 保留文字
    .replace(/^#{1,6}\s+/gm, '')           // ATX 标题
    .replace(/^\s*([-*_])(\s*\1){2,}\s*$/gm, '') // 分隔线
    .replace(/^\s*[-*+]\s+/gm, '')         // 无序列表
    .replace(/^\s*\d+\.\s+/gm, '')         // 有序列表
    .replace(/\*\*([^*]+)\*\*/g, '$1')     // 粗体
    .replace(/\*([^*]+)\*/g, '$1')         // 斜体
    .replace(/~~([^~]+)~~/g, '$1')         // 删除线
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
