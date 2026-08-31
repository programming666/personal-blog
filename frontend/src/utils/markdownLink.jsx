// 让 markdown 中的链接默认在新窗口打开
// 用法:components={{ a: renderMarkdownLink }}
export const renderMarkdownLink = ({ href, children, ...props }) => {
  if (!href) return <a {...props}>{children}</a>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
};
