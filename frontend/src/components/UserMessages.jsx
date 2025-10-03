import React, { useState, useEffect } from 'react';
import { FaEnvelope, FaEnvelopeOpen, FaTrash } from 'react-icons/fa';
import { messagesAPI } from '../services/messagesAPI';

const UserMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // all, unread, read

  // 获取用户消息
  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await messagesAPI.getUserMessages();
      if (response.data.success) {
        setMessages(response.data.data);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || '获取消息失败');
    } finally {
      setLoading(false);
    }
  };

  // 标记为已读
  const markAsRead = async (messageId) => {
    try {
      const response = await messagesAPI.markAsRead(messageId);
      if (response.data.success) {
        // 更新本地状态
        setMessages(messages.map(msg => 
          msg._id === messageId ? { ...msg, isRead: true, readAt: new Date() } : msg
        ));
      }
    } catch (err) {
      console.error('标记为已读失败:', err);
    }
  };

  // 删除消息
  const deleteMessage = async (messageId) => {
    if (!window.confirm('确定要删除这条消息吗？')) return;
    
    try {
      const response = await messagesAPI.deleteMessage(messageId);
      if (response.data.success) {
        // 从本地状态中移除
        setMessages(messages.filter(msg => msg._id !== messageId));
      } else {
        alert(response.data.message);
      }
    } catch (err) {
      alert(err.response?.data?.message || '删除消息失败');
    }
  };

  // 获取未读消息数量
  const getUnreadCount = () => {
    return messages.filter(msg => !msg.isRead).length;
  };

  // 获取已读消息数量
  const getReadCount = () => {
    return messages.filter(msg => msg.isRead).length;
  };

  // 过滤消息
  const filteredMessages = messages.filter(msg => {
    if (activeTab === 'unread') return !msg.isRead;
    if (activeTab === 'read') return msg.isRead;
    return true;
  });

  // 初始化数据
  useEffect(() => {
    fetchMessages();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        {/* 页面标题 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <FaEnvelope className="mr-2 text-primary" />
            站内信
          </h1>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="px-6 py-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            <div className="text-red-700 dark:text-red-300">{error}</div>
          </div>
        )}

        {/* 标签页 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeTab === 'all'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              全部 ({messages.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeTab === 'unread'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              未读 ({getUnreadCount()})
            </button>
            <button
              onClick={() => setActiveTab('read')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeTab === 'read'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              已读 ({getReadCount()})
            </button>
          </div>
        </div>

        {/* 消息列表 */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-gray-400 dark:text-gray-500 mb-2">
                <FaEnvelope className="mx-auto h-12 w-12" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                {activeTab === 'all' && '暂无消息'}
                {activeTab === 'unread' && '暂无未读消息'}
                {activeTab === 'read' && '暂无已读消息'}
              </p>
            </div>
          ) : (
            filteredMessages.map((message) => (
              <div
                key={message._id}
                className={`px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 ${
                  !message.isRead ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                }`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-1">
                    {message.isRead ? (
                      <FaEnvelopeOpen className="h-5 w-5 text-gray-400" />
                    ) : (
                      <FaEnvelope className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  
                  <div className="ml-4 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-medium ${
                        message.isRead 
                          ? 'text-gray-900 dark:text-gray-200' 
                          : 'text-gray-900 dark:text-white font-bold'
                      }`}>
                        {message.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {!message.isRead && (
                          <button
                            onClick={() => markAsRead(message._id)}
                            className="text-xs px-2 py-1 bg-primary text-white rounded hover:bg-primary/90"
                          >
                            标记已读
                          </button>
                        )}
                        <button
                          onClick={() => deleteMessage(message._id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <FaTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {message.content}
                    </p>
                    
                    <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        {new Date(message.createdAt).toLocaleString()}
                      </span>
                      {message.readAt && (
                        <span className="ml-2">
                          已读于 {new Date(message.readAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UserMessages;