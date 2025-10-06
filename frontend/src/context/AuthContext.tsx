// @ts-nocheck
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

const ADMIN_USER_KEY = 'adminUser';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedAdminUser = localStorage.getItem(ADMIN_USER_KEY);

        if (storedToken) {
          // 普通用户:Bearer token 路径
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          try {
            const res = await api.get('/api/auth/me');
            if (res.data.success) {
              setToken(storedToken);
              setUser(res.data.data);
              return;
            }
          } catch {
            // fall through to clear
          }
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        }

        if (storedAdminUser) {
          // admin:依赖 HttpOnly cookie,/me 自动带 cookie 验证
          try {
            const res = await api.get('/api/auth/me');
            if (res.data.success) {
              setUser(res.data.data);
              // 标记 token 存在(实际值不暴露给 JS,但有 cookie)
              setToken('__admin_cookie__');
              return;
            }
          } catch {
            // cookie 过期或失效
          }
          localStorage.removeItem(ADMIN_USER_KEY);
        }
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const loginWithGitHub = () => {
    setError(null);
    window.location.href = `${api.defaults.baseURL}/api/auth/github`;
  };

  const setAuthToken = useCallback((newToken, userData = null) => {
    setToken(newToken);
    if (newToken) {
      if (userData && userData.role === 'admin') {
        // admin token 已通过 HttpOnly cookie 由服务端下发,前端不存
        // 仅持久化 user 信息,刷新后再用 cookie 调 /me 确认
        if (userData) localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(userData));
        // 不设 axios 默认 Authorization 头 — 走 cookie
      } else if (userData) {
        localStorage.setItem('token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      }
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem(ADMIN_USER_KEY);
      delete api.defaults.headers.common['Authorization'];
    }
  }, []);

  const setAuthUser = useCallback((userData) => {
    setUser(userData);
    if (userData?.role === 'admin') {
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(userData));
    }
  }, []);

  const logout = async () => {
    const wasAdmin = user?.role === 'admin';
    if (wasAdmin) {
      try {
        await api.post('/api/admin/logout');
      } catch {
        // 即使失败也清前端
      }
      localStorage.removeItem(ADMIN_USER_KEY);
    } else {
      localStorage.removeItem('token');
    }
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
    navigate('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        loginWithGitHub,
        logout,
        setAuthToken,
        setAuthUser,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
