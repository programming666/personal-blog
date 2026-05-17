import { defineConfig, createLogger } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// 静音 KaTeX 字体 unresolved 噪音
// Tailwind v4 + Vite 的 CSS pipeline 在处理 katex.min.css 时丢失 url(fonts/X) 的目录上下文,
// Vite 无法 hash 这些 URL,但 public/fonts/ 兜底保证运行时可达 — warning 是纯噪音
// 注:Vite 用 logger.warnOnce() 打印这条,不走 Rollup 的 onwarn 通道
const logger = createLogger();
const shouldSuppress = (msg: unknown): boolean =>
  typeof msg === 'string' &&
  msg.includes("didn't resolve at build time") &&
  /\bfonts\/KaTeX_/.test(msg);

const originalWarn = logger.warn.bind(logger);
const originalWarnOnce = logger.warnOnce.bind(logger);
logger.warn = (msg, options) => {
  if (shouldSuppress(msg)) return;
  originalWarn(msg, options);
};
logger.warnOnce = (msg, options) => {
  if (shouldSuppress(msg)) return;
  originalWarnOnce(msg, options);
};

export default defineConfig({
  customLogger: logger,
  plugins: [react(), tailwindcss()]
});
