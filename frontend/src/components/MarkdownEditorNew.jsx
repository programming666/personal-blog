import React, { useState, useEffect } from 'react';
import Editor from 'react-markdown-editor-lite';
import 'react-markdown-editor-lite/lib/index.css';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import remarkGfm from 'remark-gfm';

const MarkdownEditorNew = ({ initialContent, onSave, height = '600px' }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [content, setContent] = useState(initialContent || '');
  const [activeTab, setActiveTab] = useState('edit');
  const [lastSavedContent, setLastSavedContent] = useState(initialContent || '');

  // 检测暗色模式
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);
    
    const handler = (e) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // 处理编辑器内容变化
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

  return (
    <div className={`border rounded-lg overflow-hidden transition-all duration-300 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} style={{ height }}>
      {/* 编辑器工具栏 */}
      <div className={`flex border-b ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-100'}`}>
        <button
          className={`px-4 py-2 text-sm font-medium focus:outline-none ${activeTab === 'edit' ? (isDarkMode ? 'text-primary border-b-2 border-primary' : 'text-primary border-b-2 border-primary') : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          onClick={() => setActiveTab('edit')}
        >
          编辑
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium focus:outline-none ${activeTab === 'preview' ? (isDarkMode ? 'text-primary border-b-2 border-primary' : 'text-primary border-b-2 border-primary') : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          onClick={() => setActiveTab('preview')}
        >
          预览
        </button>
        <div className="ml-auto flex items-center pr-2">
          <button
            onClick={handleManualSave}
            className={`text-sm px-3 py-1 rounded mr-2 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
          >
            保存
          </button>
        </div>
      </div>

      {/* 编辑器内容区域 */}
      <div style={{ height: `calc(100% - 40px)` }} className="relative">
        {activeTab === 'edit' ? (
          <Editor
            value={content}
            onChange={handleEditorChange}
            style={{ height: '100%' }}
            renderHTML={(text) => <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{text}</ReactMarkdown>}
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
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const isInlineCode = inline || (!match && String(children).indexOf('\n') === -1);
                
                return isInlineCode ? (
                  <code 
                    style={{
                      backgroundColor: 'rgba(175, 184, 193, 0.2)',
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
                    backgroundColor: '#f6f8fa',
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
                table: ({ children }) => <table style={{ borderCollapse: 'collapse', width: '100%', margin: '1rem 0', border: '1px solid #ddd' }}>{children}</table>,
                thead: ({ children }) => <thead style={{ backgroundColor: '#f5f5f5' }}>{children}</thead>,
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => <tr style={{ borderBottom: '1px solid #ddd' }}>{children}</tr>,
                th: ({ children }) => <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 'bold', border: '1px solid #ddd' }}>{children}</th>,
                td: ({ children }) => <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{children}</td>,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkdownEditorNew;
