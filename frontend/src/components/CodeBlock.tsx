// 代码块 wrapper:用 react-markdown 的 `pre` 替换组件。
// react-markdown 在代码块处生成 <pre><code class="language-xxx">...</code></pre>,
// 替换 `pre` 后 children 就是一个 <code> element。CodeBlock 把它包成
// header (lang + copy) + content 区域,并根据主题走浅/深色。
import { useState, useCallback, isValidElement, cloneElement } from 'react';
import { FaCopy, FaCheck } from 'react-icons/fa';

type CodeProps = {
  className?: string;
  children?: React.ReactNode;
};

function getCodeElement(
  child: React.ReactNode
): React.ReactElement<CodeProps> | null {
  if (!isValidElement<CodeProps>(child)) return null;
  return child;
}

function pickLang(className?: string): string | null {
  if (!className) return null;
  const m = /language-([\w+-]+)/.exec(className);
  return m ? m[1] : null;
}

function flattenText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  if (isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return flattenText(props.children);
  }
  return '';
}

export default function CodeBlock({
  children,
}: {
  children?: React.ReactNode;
}) {
  const codeEl = getCodeElement(children);
  if (!codeEl) {
    return <>{children}</>;
  }
  const codeClassName = codeEl.props.className;
  const lang = pickLang(codeClassName) ?? '';

  return (
    <CodeBlockShell lang={lang} codeClassName={codeClassName}>
      {codeEl}
    </CodeBlockShell>
  );
}

function CodeBlockShell({
  lang,
  codeClassName,
  children,
}: {
  lang: string;
  codeClassName?: string;
  children: React.ReactElement<CodeProps>;
}) {
  const [copied, setCopied] = useState(false);

  const preClass =
    'hljs m-0 p-4 overflow-x-auto text-sm leading-relaxed ' +
    'bg-neutral-50 dark:bg-[#0d1117] text-neutral-900 dark:text-neutral-100';

  const onCopy = useCallback(async () => {
    try {
      const text = flattenText((children.props as CodeProps).children).replace(
        /\n$/,
        ''
      );
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
  }, [children]);

  const inner = cloneElement(children, {
    className: `hljs ${codeClassName ?? ''}`,
  });

  return (
    <div className="code-block-wrapper not-prose my-4 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
      <div className="flex items-center justify-between px-3 py-1.5 text-xs border-b border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-[#161b22]">
        <span className="font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
          {lang || 'text'}
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
      <pre className={preClass}>{inner}</pre>
    </div>
  );
}