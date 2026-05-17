// 把 node_modules/katex/dist/fonts/* 复制到 public/fonts/
// 解决 Vite 构建时 KaTeX CSS 里出现的未 hash url(fonts/X.woff) 引用
// 第一套 @font-face 是 unhashed,第二套是 hashed;
// 把字体放在 public/ 让 unhashed URL 在运行时也能 200 命中,
// 同时让浏览器 console 不再 404 噪音。

const fs = require('node:fs');
const path = require('node:path');

const SRC = path.resolve(__dirname, '..', 'node_modules', 'katex', 'dist', 'fonts');
const DST = path.resolve(__dirname, '..', 'public', 'fonts');

if (!fs.existsSync(SRC)) {
  console.warn(`[copy-katex-fonts] katex 字体目录不存在: ${SRC} — 跳过`);
  process.exit(0);
}

fs.mkdirSync(DST, { recursive: true });

const files = fs.readdirSync(SRC).filter((f) => /^KaTeX_.+\.(woff2?|ttf)$/i.test(f));
let copied = 0;
let skipped = 0;
for (const file of files) {
  const src = path.join(SRC, file);
  const dst = path.join(DST, file);
  if (fs.existsSync(dst)) {
    const sStat = fs.statSync(src);
    const dStat = fs.statSync(dst);
    if (sStat.size === dStat.size && sStat.mtimeMs <= dStat.mtimeMs) {
      skipped += 1;
      continue;
    }
  }
  fs.copyFileSync(src, dst);
  copied += 1;
}

console.log(`[copy-katex-fonts] 复制 ${copied} 个、跳过 ${skipped} 个 (目标: ${path.relative(process.cwd(), DST)})`);
