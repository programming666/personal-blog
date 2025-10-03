import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaSpinner } from 'react-icons/fa';

const GitHubCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthToken, setAuthUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 从URL中获取token和用户信息
        const urlParams = new URLSearchParams(location.search);
        const token = urlParams.get('token');
        const userId = urlParams.get('userId');
        const username = urlParams.get('username');
        const email = urlParams.get('email');
        const name = urlParams.get('name');
        const avatar = urlParams.get('avatar');

        if (token) {
          // 设置用户数据
          const userData = {
            id: userId,
            username: username,
            email: email,
            name: name,
            avatar: decodeURIComponent(avatar || '')
          };
          
          setAuthToken(token);
          setAuthUser(userData);
          
          // 重定向到仪表板
          navigate('/dashboard', { replace: true });
        } else {
          // 如果没有token，重定向到登录页
          navigate('/login', { replace: true });
        }
      } catch (error) {
        console.error('GitHub callback error:', error);
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [location, navigate, setAuthToken, setAuthUser]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <FaSpinner className="animate-spin text-4xl text-primary mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          正在处理GitHub登录...
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          请稍候，正在为您登录
        </p>
      </div>
    </div>
  );
};

export default GitHubCallback;
