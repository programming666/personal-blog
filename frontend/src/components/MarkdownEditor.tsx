// @ts-nocheck
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { FaEye, FaEyeSlash, FaSave, FaUndo, FaRedo } from 'react-icons/fa';

const MarkdownEditor = ({ initialContent, onSave, height = '600px' }) => {
  const [content, setContent] = useState(initialContent || '');
  const [previewMode, setPreviewMode] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [lastSavedContent, setLastSavedContent] = useState(initialContent || '');

  // 初始化代码高亮
  useEffect(() => {
    hljs.highlightAll();
  }, [content, previewMode]);

  // 自动保存功能
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content !== lastSavedContent && onSave) {
        onSave(content);
        setLastSavedContent(content);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [content, lastSavedContent, onSave]);

  // 工具栏控制
  useEffect(() => {
    let timeout;
    const handleMouseMove = () => {
      setShowToolbar(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowToolbar(false), 3000);
    };

    const editor = document.getElementById('markdown-editor-container');
    if (editor) {
      editor.addEventListener('mousemove', handleMouseMove);
      return () => editor.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  // 格式化工具栏按钮点击处理
  const handleFormat = (formatType) => {
    const cursorPos = document.getElementById('markdown-input').selectionStart;
    const textBefore = content.substring(0, cursorPos);
    const textAfter = content.substring(cursorPos);
    let newContent, newCursorPos;

    switch (formatType) {
      case 'bold':
        newContent = `${textBefore}**加粗文本**${textAfter}`;
        newCursorPos = cursorPos + 2;
        break;
      case 'italic':
        newContent = `${textBefore}*斜体文本*${textAfter}`;
        newCursorPos = cursorPos + 1;
        break;
      case 'heading':
        newContent = `${textBefore}# 标题文本
${textAfter}`;
        newCursorPos = cursorPos + 3;
        break;
      case 'link':
        newContent = `${textBefore}[链接文本](https://example.com)${textAfter}`;
        newCursorPos = cursorPos + 4;
        break;
      case 'image':
        newContent = `${textBefore}![图片描述](https://example.com/image.jpg)${textAfter}`;
        newCursorPos = cursorPos + 4;
        break;
      case 'code':
        newContent = `${textBefore}\`\`\`语言
代码块
\`\`\`${textAfter}`;
        newCursorPos = cursorPos + 3;
        break;
      case 'list':
        newContent = `${textBefore}- 列表项
- 列表项${textAfter}`;
        newCursorPos = cursorPos + 3;
        break;
      default:
        return;
    }

    setContent(newContent);
    // 设置光标位置
    setTimeout(() => {
      const input = document.getElementById('markdown-input');
      if (input) input.selectionStart = input.selectionEnd = newCursorPos;
    }, 0);
  };

  return (
    <div 
      id="markdown-editor-container"
      className="relative border border-gray-300 rounded-lg overflow-hidden dark:border-gray-700"
      style={{ height }}
    >
      {/* 工具栏 */}
      <div 
        className={`bg-gray-100 p-2 flex justify-between items-center transition-all duration-300 dark:bg-gray-800 ${showToolbar ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="flex space-x-2">
          <button onClick={() => handleFormat('bold')} className="p-2 hover:bg-gray-200 rounded dark:hover:bg-gray-700">B</button>
          <button onClick={() => handleFormat('italic')} className="p-2 hover:bg-gray-200 rounded dark:hover:bg-gray-700">I</button>
          <button onClick={() => handleFormat('heading')} className="p-2 hover:bg-gray-200 rounded dark:hover:bg-gray-700">H</button>
          <button onClick={() => handleFormat('link')} className="p-2 hover:bg-gray-200 rounded dark:hover:bg-gray-700">🔗</button>
          <button onClick={() => handleFormat('image')} className="p-2 hover:bg-gray-200 rounded dark:hover:bg-gray-700">🖼️</button>
          <button onClick={() => handleFormat('code')} className="p-2 hover:bg-gray-200 rounded dark:hover:bg-gray-700">{`</>`}</button>
          <button onClick={() => handleFormat('list')} className="p-2 hover:bg-gray-200 rounded dark:hover:bg-gray-700">•</button>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="p-2 hover:bg-gray-200 rounded dark:hover:bg-gray-700"
            title={previewMode ? '编辑模式' : '预览模式'}
          >
            {previewMode ? <FaEyeSlash /> : <FaEye />}
          </button>
          <button
            onClick={() => {
              onSave(content);
              setLastSavedContent(content);
            }}
            className="p-2 hover:bg-gray-200 rounded dark:hover:bg-gray-700"
            title="保存"
          >
            <FaSave />
          </button>
          <button
            onClick={() => setContent(lastSavedContent)}
            className="p-2 hover:bg-gray-200 rounded dark:hover:bg-gray-700"
            title="撤销"
          >
            <FaUndo />
          </button>
        </div>
      </div>

      {/* 编辑器区域 */}
      {!previewMode ? (
        <textarea
          id="markdown-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-full p-4 bg-white dark:bg-gray-900 border-none focus:ring-0 resize-none"
          placeholder="在此处输入Markdown内容..."
        />
      ) : (
        <div 
          className="markdown-content w-full h-full p-4 overflow-y-auto bg-gray-50 dark:bg-gray-800"
          dangerouslySetInnerHTML={{ __html: '' }}
        >
          <ReactMarkdown
            children={content}
            remarkPlugins={[remarkGfm]}
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
              }
            }}
          />
        </div>
      )}

      {/* 底部状态栏 */}
      <div className={`bg-gray-100 p-2 text-xs text-gray-600 flex justify-between dark:bg-gray-800 dark:text-gray-400 ${showToolbar ? 'opacity-100' : 'opacity-0'} transition-all duration-300`}>
        <div>{content.length} 字符</div>
        <div>{previewMode ? '预览模式' : '编辑模式'}</div>
      </div>
    </div>
  );
};

export default MarkdownEditor;
