// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from 'react-markdown-editor-lite';
import 'react-markdown-editor-lite/lib/index.css';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import hljs from 'highlight.js/lib/common';
import 'highlight.js/styles/github-dark.css';
import remarkGfm from 'remark-gfm';
import { useTheme } from '../context/ThemeContext';
import { adminAPI } from '../services/api';
import { renderMarkdownImg } from '../utils/markdownImg.jsx';

const MarkdownEditorNew = ({ initialContent, onSave, height = '600px' }) => {
  const { isDarkMode } = useTheme();
  const [content, setContent] = useState(initialContent || '');
  const [activeTab, setActiveTab] = useState('edit');
  const [lastSavedContent, setLastSavedContent] = useState(initialContent || '');
  const [uploadingPaste, setUploadingPaste] = useState(false);
  const wrapperRef = useRef(null);
  const editorIdRef = useRef(`md-editor-${Math.random().toString(36).slice(2, 9)}`);

  const handleEditorChange = ({ text }) => {
    setContent(text);
  };

  // 自动保存
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content !== lastSavedContent && onSave) {
        onSave(content);
        setLastSavedContent(content);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [content, lastSavedContent, onSave]);

  // 代码高亮
  useEffect(() => {
    hljs.highlightAll();
  }, [content, activeTab]);

  // 手动保存
  const handleManualSave = () => {
    onSave(content);
    setLastSavedContent(content);
  };

  // 在光标位置插入文本,并把新光标定位到插入末尾
  const insertAtCursor = useCallback((insertText) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      setContent((prev) => prev + insertText);
      return;
    }
    const ta = wrapper.querySelector('textarea');
    if (!ta) {
      setContent((prev) => prev + insertText);
      return;
    }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    const newContent = content.slice(0, start) + insertText + content.slice(end);
    setContent(newContent);
    const newPos = start + insertText.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = newPos;
    });
  }, [content]);

  // 替换 content 里第一个匹配 placeholder 为实际 markdown
  const replacePlaceholder = useCallback((placeholder, replacement) => {
    setContent((prev) => {
      const idx = prev.indexOf(placeholder);
      if (idx === -1) return prev;
      return prev.slice(0, idx) + replacement + prev.slice(idx + placeholder.length);
    });
  }, []);

  // 粘贴事件:识别 image/* 自动上传,插入 markdown 占位
  const handlePaste = useCallback(async (e) => {
    // 仅在编辑 tab 触发
    if (activeTab !== 'edit') return;
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;
    const imageItems = Array.from(items).filter((it) => it.kind === 'file' && it.type.startsWith('image/'));
    if (imageItems.length === 0) return; // 非图片粘贴,交给默认行为

    e.preventDefault();
    setUploadingPaste(true);
    try {
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (!file) continue;
        // 占位 markdown —— 用随机 id 避免多次粘贴冲突
        const pid = `__paste_${Date.now()}_${Math.random().toString(36).slice(2, 8)}__`;
        const altGuess = file.name?.replace(/\.[^.]+$/, '') || 'pasted-image';
        const placeholder = `![${altGuess}](${pid})`;
        insertAtCursor(placeholder);
        try {
          const res = await adminAPI.uploadPostImage(file);
          const fullUrl = res.data?.fullUrl || res.data?.url || '';
          const finalUrl = fullUrl || `${window.location.origin}/uploads/missing.png`;
          const replacement = `![${altGuess}](${finalUrl})`;
          replacePlaceholder(placeholder, replacement);
        } catch (err) {
          // 上传失败:把占位换成错误提示
          replacePlaceholder(placeholder, `> ⚠️ 图片上传失败: ${altGuess}`);
        }
      }
    } finally {
      setUploadingPaste(false);
    }
  }, [activeTab, insertAtCursor, replacePlaceholder]);

  return (
    <div
      ref={wrapperRef}
      data-md-editor-id={editorIdRef.current}
      onPaste={handlePaste}
      className={`markdown-editor-wrapper border rounded-lg overflow-hidden transition-all duration-300 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
      style={{ height }}
    >
      {/* 工具栏 */}
      <div className={`flex border-b ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-100'}`}>
        <button
          className={`px-4 py-2 text-sm font-medium focus:outline-none ${activeTab === 'edit' ? 'text-primary border-b-2 border-primary' : (isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')}`}
          onClick={() => setActiveTab('edit')}
        >
          编辑
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium focus:outline-none ${activeTab === 'preview' ? 'text-primary border-b-2 border-primary' : (isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')}`}
          onClick={() => setActiveTab('preview')}
        >
          预览
        </button>
        <div className="ml-auto flex items-center pr-2 gap-2">
          {uploadingPaste && (
            <span className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
              <span className="loading-spinner" style={{ width: '12px', height: '12px', display: 'inline-block', verticalAlign: 'middle' }}></span>{' '}
              上传粘贴图片...
            </span>
          )}
          <button
            onClick={handleManualSave}
            className={`text-sm px-3 py-1 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
          >
            保存
          </button>
        </div>
      </div>

      {/* 编辑器内容区 */}
      <div style={{ height: `calc(100% - 40px)` }} className="relative">
        {activeTab === 'edit' ? (
          <Editor
            value={content}
            onChange={handleEditorChange}
            style={{ height: '100%' }}
            renderHTML={(text) => (
              <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex]}
                components={{ img: renderMarkdownImg }}
              >
                {text}
              </ReactMarkdown>
            )}
            config={{
              view: {
                menu: true,
                md: true,
                html: false
              },
              logger: {
                debug: () => {},
                info: () => {},
                warn: () => {},
                error: () => {}
              }
            }}
          />
        ) : (
          <div className={`p-6 overflow-y-auto h-full ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}`}>
            <ReactMarkdown
              children={content}
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
              components={{
                img: renderMarkdownImg,
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInlineCode = inline || (!match && String(children).indexOf('\n') === -1);
                  return isInlineCode ? (
                    <code
                      style={{
                        backgroundColor: isDarkMode ? 'rgba(135, 142, 156, 0.3)' : 'rgba(175, 184, 193, 0.2)',
                        color: isDarkMode ? '#e6edf3' : 'inherit',
                        padding: '0.2em 0.4em',
                        borderRadius: '3px',
                        fontSize: '85%',
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
                      }}
                      {...props}
                    >
                      {children}
                    </code>
                  ) : (
                    <pre style={{
                      backgroundColor: isDarkMode ? '#0d1117' : '#f6f8fa',
                      color: isDarkMode ? '#e6edf3' : '#24292f',
                      borderRadius: '6px',
                      fontSize: '85%',
                      lineHeight: '1.45',
                      overflow: 'auto',
                      padding: '16px',
                      margin: '0 0 16px'
                    }}>
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  );
                },
                table: ({ children }) => <table style={{ borderCollapse: 'collapse', width: '100%', margin: '1rem 0', border: isDarkMode ? '1px solid #404040' : '1px solid #ddd' }}>{children}</table>,
                thead: ({ children }) => <thead style={{ backgroundColor: isDarkMode ? '#1f2937' : '#f5f5f5' }}>{children}</thead>,
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => <tr style={{ borderBottom: isDarkMode ? '1px solid #404040' : '1px solid #ddd' }}>{children}</tr>,
                th: ({ children }) => <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 'bold', border: isDarkMode ? '1px solid #404040' : '1px solid #ddd' }}>{children}</th>,
                td: ({ children }) => <td style={{ padding: '0.5rem', border: isDarkMode ? '1px solid #404040' : '1px solid #ddd' }}>{children}</td>,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkdownEditorNew;