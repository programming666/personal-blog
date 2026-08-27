interface TranslatedBadgeProps {
  /** 是否为 AI 翻译产物;false/undefined 时不渲染 */
  show?: boolean;
  /** 附加容器类名(默认靠右) */
  className?: string;
}

/**
 * 「Translated by AI」小角标:出现在 AI 翻译过的内容(标题/正文/评论)右下角。
 */
export default function TranslatedBadge({ show, className = '' }: TranslatedBadgeProps) {
  if (!show) return null;
  return (
    <span
      className={`mt-1.5 block text-right text-[11px] text-neutral-400 dark:text-neutral-500 select-none ${className}`}
      title="AI 翻译"
    >
      Translated by AI
    </span>
  );
}