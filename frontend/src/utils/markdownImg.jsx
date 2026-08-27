// 解析 ![alt|width](url) 语法中的 width 后缀。
// 支持 50% / 300px / 200 等任意 CSS 宽度值。
// 返回 { cleanedAlt, width } —— cleanedAlt 是去掉 |width 后的 alt, width 是字符串或 null。
export const parseImgAlt = (alt) => {
  const m = /^(.+?)\|(\d+(?:\.\d+)?%|[a-zA-Z0-9]+)$/.exec(alt || '');
  if (m) return { cleanedAlt: m[1], width: m[2] };
  return { cleanedAlt: alt || '', width: null };
};

// 通用 React img 渲染组件,挂在 ReactMarkdown 的 components.img 上。
// 自动识别 alt 中的 |width 后缀并应用到 style.width,普通 ![alt](url) 继续工作。
import React from 'react';
export const renderMarkdownImg = ({ src, alt, ...rest }) => {
  const { cleanedAlt, width } = parseImgAlt(alt);
  if (width) {
    return <img src={src} alt={cleanedAlt} style={{ width, height: 'auto', maxWidth: '100%' }} loading="lazy" {...rest} />;
  }
  return <img src={src} alt={cleanedAlt} loading="lazy" {...rest} />;
};