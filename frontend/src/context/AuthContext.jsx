import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); // 不从localStorage读取token
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // 初始化 - 自动验证普通用户token
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // 检查localStorage中的token
        const storedToken = localStorage.getItem('token');
        
        if (storedToken) {
          // 尝试验证token
          const res = await api.get('/api/auth/me');
          if (res.data.success) {
            setToken(storedToken);
            setUser(res.data.user);
            api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          } else {
            // token无效，清除
            localStorage.removeItem('token');
          }
        }
      } catch (error) {
        // token验证失败，清除
        localStorage.removeItem('token');
        console.error('自动登录失败:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // 注册
  const register = async (formData) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/api/auth/register', formData);
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 登录
  const login = async (formData) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/api/auth/login', formData);
      setToken(res.data.token);
      setUser(res.data.user);
      
      // 保存普通用户token到localStorage，管理员不保存
      if (res.data.user && res.data.user.role !== 'admin') {
        localStorage.setItem('token', res.data.token);
      }
      
      navigate('/dashboard');
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 设置token（用于GitHub回调）
  const setAuthToken = useCallback((newToken, userData = null) => {
    setToken(newToken);
    if (newToken) {
      // 只有非管理员用户才保存token
      if (userData && userData.role !== 'admin') {
        localStorage.setItem('token', newToken);
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } else {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    }
  }, []);

  // 设置用户（用于GitHub回调）
  const setAuthUser = useCallback((userData) => {
    setUser(userData);
  }, []);

  // 登出
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
    // 导航到首页，让AdminPage组件自动卸载
    navigate('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        register,
        login,
        logout,
        setAuthToken,
        setAuthUser,
        isAuthenticated: !!token
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
