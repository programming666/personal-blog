// 代码块组件:
//   - 行内 code (className 不含 language-xxx) → 直接渲染 <code>
//   - 代码块 (rehype-highlight 处理后,className 含 language-xxx) → 渲染带复制按钮的 wrapper
// 注:react-markdown 10 不再传 `inline` prop,用 className 是否有 language- 前缀判断
import { useState, useCallback } from 'react';
import { FaCopy, FaCheck } from 'react-icons/fa';

type CodeBlockProps = {
  className?: string;
  children?: React.ReactNode;
  node?: unknown;
};

function extractText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && node !== null && 'props' in node) {
    return extractText(
      (node as { props: { children?: React.ReactNode } }).props.children
    );
  }
  return '';
}

function pickLang(className?: string): string | null {
  if (!className) return null;
  const m = /language-([\w+-]+)/.exec(className);
  return m ? m[1] : null;
}

export default function CodeBlock({ className, children }: CodeBlockProps) {
  const lang = pickLang(className);
  // 行内 code 没有 language- 前缀
  const isBlock = lang !== null;

  if (!isBlock) {
    return <code className={className}>{children}</code>;
  }

  return <CodeBlockShell className={className} lang={lang}>{children}</CodeBlockShell>;
}

function CodeBlockShell({
  className,
  lang,
  children,
}: {
  className?: string;
  lang: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const text = extractText(children).replace(/\n$/, '');

  const onCopy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('复制失败', err);
    }
  }, [text]);

  return (
    <div className="code-block-wrapper not-prose my-4 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
      <div className="flex items-center justify-between px-3 py-1.5 text-xs border-b border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-[#161b22]">
        <span className="font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
          {lang}
        </span>
        <button
          type="button"
          onClick={onCopy}
          aria-label={copied ? '已复制' : '复制代码'}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          {copied ? <FaCheck /> : <FaCopy />}
          <span>{copied ? '已复制' : '复制'}</span>
        </button>
      </div>
      <pre className="hljs m-0 p-4 overflow-x-auto text-sm leading-relaxed bg-neutral-50 dark:bg-[#0d1117]">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}