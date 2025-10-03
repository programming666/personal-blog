import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api'; // 导入原始api实例
import AdminPanel from '../components/AdminPanel';
import { FaLock, FaUser, FaSpinner } from 'react-icons/fa';

const AdminPage = () => {
  const { user, setAuthUser } = useAuth(); // 修改这里，使用setAuthUser而不是setUser
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  // 页面卸载时清除认证状态
  useEffect(() => {
    return () => {
      // 组件卸载时清除认证状态
      setIsAuthenticated(false);
      setAuthUser(null); // 修改这里，使用setAuthUser而不是setUser
    };
  }, [setAuthUser]); // 修改这里，依赖setAuthUser而不是setUser

  // 检查用户是否为管理员
  useEffect(() => {
    if (user && user.role === 'admin') {
      setIsAuthenticated(true);
    }
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 直接使用axios发送请求，不通过authAPI
      const response = await api.post('/api/admin/login', formData);
      
      if (response.data.success) {
        // 更新认证状态
        setIsAuthenticated(true);
        setAuthUser(response.data.user); // 修改这里，使用setAuthUser而不是setUser
        
        // 不存储token到localStorage，仅在内存中使用
        // token会在页面刷新后丢失，需要重新登录
        
        // 手动设置当前请求的token
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }
    } catch (error) {
      setError(error.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-12 w-12 bg-primary rounded-full flex items-center justify-center">
              <FaLock className="h-6 w-6 text-white" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              管理员登录
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              请输入管理员凭据
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="username" className="sr-only">用户名</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                  placeholder="管理员用户名"
                  value={formData.username}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">密码</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                  placeholder="密码"
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {loading ? (
                  <FaSpinner className="animate-spin h-5 w-5" />
                ) : (
                  <>
                    <FaLock className="h-4 w-4 mr-2" />
                    登录
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return <AdminPanel />;
};

export default AdminPage;