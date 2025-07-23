import React, { useEffect, useRef, useState } from 'react';

/**
 * Cloudflare Turnstile 人机验证组件
 * 支持隐式和显式渲染模式
 */
const TurnstileWidget = ({ 
  siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || import.meta.env.CLOUDFLARE_TURNSTILE_SITE_KEY,
  theme = 'auto',
  size = 'normal',
  action = 'general',
  onSuccess,
  onError,
  onExpired,
  className = '',
  mode = 'implicit' // 'implicit' 或 'explicit'
}) => {
  const widgetRef = useRef(null);
  const [token, setToken] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [widgetId, setWidgetId] = useState(null);

  // 加载Turnstile脚本
  useEffect(() => {
    if (!siteKey) {
      console.warn('Turnstile site key is not configured');
      return;
    }

    // 检查是否已加载脚本
    if (window.turnstile) {
      setIsReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setIsReady(true);
      console.log('Turnstile script loaded successfully');
    };
    
    script.onerror = () => {
      console.error('Failed to load Turnstile script');
      if (onError) onError('script_load_failed');
    };

    document.head.appendChild(script);

    return () => {
      // 清理脚本
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      // 重置Turnstile状态
      if (window.turnstile) {
        delete window.turnstile;
      }
    };
  }, [siteKey, onError]);

  // 隐式渲染模式
  useEffect(() => {
    if (mode === 'implicit' && isReady && widgetRef.current && siteKey) {
      // 清理之前的Turnstile实例
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
      
      // 确保turnstile对象已完全加载
      const renderTurnstile = () => {
        if (!window.turnstile) {
          console.warn('Turnstile object not available, retrying...');
          setTimeout(renderTurnstile, 100);
          return;
        }
        
        try {
          const id = window.turnstile.render(widgetRef.current, {
            sitekey: siteKey,
            theme: theme,
            size: size,
            action: action,
            callback: (token) => {
              setToken(token);
              if (onSuccess) onSuccess(token);
            },
            'error-callback': (errorCode) => {
              console.error('Turnstile error:', errorCode);
              if (onError) onError(errorCode);
            },
            'expired-callback': () => {
              setToken(null);
              if (onExpired) onExpired();
            }
          });
          setWidgetId(id);
        } catch (error) {
          console.error('Turnstile render error:', error);
          if (onError) onError('render_failed');
        }
      };
      
      renderTurnstile();
    }
    
    // 组件卸载时清理
    return () => {
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
        setWidgetId(null);
        setToken(null);
      }
    };
  }, [mode, isReady, siteKey]); // 减少依赖项，避免频繁重新渲染

  // 显式渲染模式
  const renderExplicit = () => {
    if (mode === 'explicit' && isReady && widgetRef.current && siteKey) {
      // 确保turnstile对象已完全加载
      const renderTurnstile = () => {
        if (!window.turnstile) {
          console.warn('Turnstile object not available, retrying...');
          setTimeout(renderTurnstile, 100);
          return;
        }
        
        try {
          const id = window.turnstile.render(widgetRef.current, {
            sitekey: siteKey,
            theme: theme,
            size: size,
            action: action,
            callback: (token) => {
              setToken(token);
              if (onSuccess) onSuccess(token);
            },
            'error-callback': (errorCode) => {
              console.error('Turnstile error:', errorCode);
              if (onError) onError(errorCode);
            },
            'expired-callback': () => {
              setToken(null);
              if (onExpired) onExpired();
            }
          });
          setWidgetId(id);
        } catch (error) {
          console.error('Turnstile explicit render error:', error);
          if (onError) onError('explicit_render_failed');
        }
      };
      
      renderTurnstile();
    }
  };

  // 重置验证
  const reset = () => {
    if (widgetId && window.turnstile) {
      window.turnstile.reset(widgetId);
      setToken(null);
    }
  };

  // 移除验证
  const remove = () => {
    if (widgetId && window.turnstile) {
      window.turnstile.remove(widgetId);
      setWidgetId(null);
      setToken(null);
    }
  };

  // 如果没有配置site key，显示占位符
  if (!siteKey) {
    return (
      <div className={`bg-gray-100 border border-gray-300 rounded p-4 text-center text-gray-500 ${className}`}>
        Turnstile验证未配置
      </div>
    );
  }

  // 如果脚本加载失败
  if (!isReady) {
    return (
      <div className={`bg-gray-100 border border-gray-300 rounded p-4 text-center text-gray-500 ${className}`}>
        加载验证组件中...
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 验证组件容器 */}
      <div ref={widgetRef} />
      
      {/* 显式渲染模式的控制按钮 */}
      {mode === 'explicit' && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={renderExplicit}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            显示验证
          </button>
          <button
            type="button"
            onClick={reset}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            重置验证
          </button>
        </div>
      )}
      
      {/* 隐藏的token字段，用于表单提交 */}
      {token && (
        <input type="hidden" name="cf-turnstile-response" value={token} />
      )}
    </div>
  );
};

export default TurnstileWidget;