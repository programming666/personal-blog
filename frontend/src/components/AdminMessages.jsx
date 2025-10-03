import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

const AdminMessages = () => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    recipients: []
  });
  
  // 新接收者输入
  const [newRecipient, setNewRecipient] = useState({
    type: 'email',
    value: ''
  });

  // 获取所有用户
  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getUsers();
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (err) {
      console.error('获取用户列表失败:', err);
    }
  };

  // 获取所有消息
  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getMessages();
      if (response.data.success) {
        setMessages(response.data.data);
      }
    } catch (err) {
      setError('获取消息列表失败');
      console.error('获取消息列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 发送消息
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content || formData.recipients.length === 0) {
      setError('请填写标题、内容并至少添加一个接收者');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await adminAPI.sendMessage({
        title: formData.title,
        content: formData.content,
        recipients: formData.recipients
      });
      
      if (response.data.success) {
        setSuccess(response.data.message);
        // 重置表单
        setFormData({
          title: '',
          content: '',
          recipients: []
        });
        // 刷新消息列表
        fetchMessages();
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || '发送消息失败');
    } finally {
      setLoading(false);
    }
  };

  // 添加接收者
  const addRecipient = () => {
    if (!newRecipient.value.trim()) {
      setError('请输入接收者信息');
      return;
    }
    
    // 检查是否已存在
    const exists = formData.recipients.some(
      r => r.type === newRecipient.type && r.value === newRecipient.value
    );
    
    if (exists) {
      setError('该接收者已存在');
      return;
    }
    
    setFormData({
      ...formData,
      recipients: [...formData.recipients, { ...newRecipient }]
    });
    
    // 重置输入
    setNewRecipient({
      type: 'email',
      value: ''
    });
    setError(null);
  };

  // 移除接收者
  const removeRecipient = (index) => {
    const newRecipients = [...formData.recipients];
    newRecipients.splice(index, 1);
    setFormData({
      ...formData,
      recipients: newRecipients
    });
  };

  // 初始化数据
  useEffect(() => {
    fetchUsers();
    fetchMessages();
  }, []);

  return (
    <div className="space-y-6">
      {/* 发送消息表单 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">发送站内信</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              标题
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
              placeholder="请输入消息标题"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              内容
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
              placeholder="请输入消息内容"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              接收者
            </label>
            
            {/* 添加接收者 */}
            <div className="flex gap-2 mb-2">
              <select
                value={newRecipient.type}
                onChange={(e) => setNewRecipient({...newRecipient, type: e.target.value})}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
              >
                <option value="email">邮箱</option>
                <option value="username">用户名</option>
                <option value="user_id">用户ID</option>
              </select>
              
              <input
                type="text"
                value={newRecipient.value}
                onChange={(e) => setNewRecipient({...newRecipient, value: e.target.value})}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
                placeholder="请输入接收者信息"
              />
              
              <button
                type="button"
                onClick={addRecipient}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition"
              >
                添加
              </button>
            </div>
            
            {/* 已添加的接收者列表 */}
            {formData.recipients.length > 0 && (
              <div className="mt-2">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  已添加的接收者：
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.recipients.map((recipient, index) => (
                    <div 
                      key={index} 
                      className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1"
                    >
                      <span className="text-sm">
                        {recipient.type === 'email' && '📧 '}
                        {recipient.type === 'username' && '👤 '}
                        {recipient.type === 'user_id' && '🆔 '}
                        {recipient.value}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRecipient(index)}
                        className="ml-2 text-gray-500 hover:text-red-500"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition disabled:opacity-50"
            >
              {loading ? '发送中...' : '发送消息'}
            </button>
          </div>
        </form>
      </div>
      
      {/* 消息列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">消息列表</h2>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            暂无消息
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    标题
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    内容
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    接收者
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    发送时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {messages.map((message) => (
                  <tr key={message._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {message.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {message.content}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {message.recipient}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(message.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {message.isRead ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          已读
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          未读
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMessages;