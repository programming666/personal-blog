interface TranslatedBadgeProps {
  /** 附加容器类名(默认靠右) */
  className?: string;
}

/**
 * 「Translated by AI」小角标:AI 翻译过的内容(标题/正文/评论)右下角展示。
 * 调用方需自行判定「译文 ≠ 原文」后再决定是否渲染本组件。
 */
export default function TranslatedBadge({ className = '' }: TranslatedBadgeProps) {
  return (
    <span
      className={`mt-1.5 block text-right text-[11px] text-neutral-400 dark:text-neutral-500 select-none ${className}`}
      title="AI 翻译"
    >
      Translated by AI
    </span>
  );
}