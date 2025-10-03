import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope } from 'react-icons/fa';
import { messagesAPI } from '../services/messagesAPI';
import { useAuth } from '../context/AuthContext';

const MessageNotification = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user) return;
      
      try {
        const response = await messagesAPI.getUnreadCount();
        setUnreadCount(response.data.data.unreadCount);
        setLoading(false);
      } catch (error) {
        console.error('获取未读消息数量失败:', error);
        setLoading(false);
      }
    };

    fetchUnreadCount();
    
    // 设置定时器定期检查未读消息
    const interval = setInterval(fetchUnreadCount, 30000); // 每30秒检查一次
    
    return () => clearInterval(interval);
  }, [user]);

  if (!user || loading) return null;

  return (
    <Link
      to="/messages"
      className="relative flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-200 dark:hover:text-primary-400"
    >
      <FaEnvelope className="mr-2" />
      <span>消息</span>
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
};

export default MessageNotification;