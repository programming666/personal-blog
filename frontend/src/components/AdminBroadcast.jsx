import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { FaBroadcastTower, FaUsers, FaPaperPlane, FaSync, FaSearch, FaCalendar, FaChartBar, FaHistory, FaCheck } from 'react-icons/fa';

const AdminBroadcast = () => {
  const [activeTab, setActiveTab] = useState('send');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sendToAll, setSendToAll] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // 表单数据
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getBroadcastUsers({ 
        search: searchTerm,
        page: 1,
        limit: 100 
      });
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    }
  };

  // 获取广播列表
  const fetchBroadcasts = async () => {
    try {
      const params = {};
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      
      const response = await adminAPI.getBroadcasts(params);
      if (response.data.success) {
        setBroadcasts(response.data.data);
      }
    } catch (error) {
      console.error('获取广播列表失败:', error);
    }
  };

  // 获取统计信息
  const fetchStats = async () => {
    try {
      const response = await adminAPI.getBroadcastStats();
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  };

  // 发送广播消息
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const broadcastData = {
        title: formData.title,
        content: formData.content,
        sendToAll,
        specificUsers: sendToAll ? [] : selectedUsers
      };

      const response = await adminAPI.createBroadcast(broadcastData);
      if (response.data.success) {
        alert('广播消息已开始发送');
        setFormData({ title: '', content: '' });
        setSelectedUsers([]);
        // 切换到历史记录标签查看进度
        setActiveTab('history');
        fetchBroadcasts();
      }
    } catch (error) {
      console.error('发送广播失败:', error);
      alert('发送失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 重试失败的广播
  const handleRetryBroadcast = async (broadcastId) => {
    if (window.confirm('确定要重试这个广播吗？')) {
      try {
        await adminAPI.retryBroadcast(broadcastId);
        alert('广播重试已开始');
        fetchBroadcasts();
      } catch (error) {
        console.error('重试广播失败:', error);
        alert('重试失败');
      }
    }
  };

  // 切换用户选择
  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  // 选择/取消选择所有用户
  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user._id));
    }
  };

  // 根据活跃标签加载数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        switch (activeTab) {
          case 'send':
            await fetchUsers();
            break;
          case 'history':
            await fetchBroadcasts();
            break;
          case 'stats':
            await fetchStats();
            break;
        }
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeTab, searchTerm, dateRange]);

  // 渲染发送广播界面
  const renderSendTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 发送表单 */}
      <div className="lg:col-span-2">
        <form onSubmit={handleSendBroadcast} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">发送广播消息</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                标题
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="输入消息标题"
                maxLength={100}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                内容
              </label>
              <textarea
                required
                rows={6}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="输入消息内容"
                maxLength={2000}
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={sendToAll}
                  onChange={() => setSendToAll(true)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">发送给所有用户</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={!sendToAll}
                  onChange={() => setSendToAll(false)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">选择特定用户</span>
              </label>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50"
            >
              {loading ? '发送中...' : '发送广播'}
            </button>
          </div>
        </form>
      </div>

      {/* 用户选择面板 */}
      {!sendToAll && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">选择用户</h4>
              <button
                onClick={toggleSelectAll}
                className="text-xs text-primary hover:text-primary/80"
              >
                {selectedUsers.length === users.length ? '取消全选' : '全选'}
              </button>
            </div>
            
            <div className="mt-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索用户..."
                className="w-full px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {users.map(user => (
              <div key={user._id} className="flex items-center p-3 border-b border-gray-100 dark:border-gray-700">
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user._id)}
                  onChange={() => toggleUserSelection(user._id)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // 渲染历史记录界面
  const renderHistoryTab = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">广播历史记录</h3>
          <div className="flex space-x-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md"
            />
            <span className="text-gray-500">至</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md"
            />
          </div>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {broadcasts.map(broadcast => (
          <div key={broadcast._id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-md font-medium text-gray-900 dark:text-white">{broadcast.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{broadcast.content}</p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>发送时间: {new Date(broadcast.createdAt).toLocaleString()}</span>
                  <span>目标用户: {broadcast.totalRecipients}人</span>
                  <span>成功: {broadcast.successCount}人</span>
                  <span>失败: {broadcast.failedCount}人</span>
                </div>
                
                {/* 进度条 */}
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>发送进度</span>
                    <span>{broadcast.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${broadcast.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="ml-4 flex items-center space-x-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  broadcast.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                  broadcast.status === 'sending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                  broadcast.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {broadcast.status === 'completed' ? '已完成' :
                   broadcast.status === 'sending' ? '发送中' :
                   broadcast.status === 'failed' ? '失败' : '等待中'}
                </span>
                
                {broadcast.status === 'failed' && (
                  <button
                    onClick={() => handleRetryBroadcast(broadcast._id)}
                    className="text-primary hover:text-primary/80"
                    title="重试发送"
                  >
                    <FaSync />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // 渲染统计界面
  const renderStatsTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
            <FaBroadcastTower className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总广播次数</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalBroadcasts || 0}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400">
            <FaCheck className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">成功广播</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.completedBroadcasts || 0}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400">
            <FaSync className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">失败广播</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.failedBroadcasts || 0}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400">
            <FaUsers className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">覆盖用户</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {stats.recentStats?.reduce((sum, stat) => sum + stat.totalRecipients, 0) || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'send', name: '发送广播', icon: FaPaperPlane },
    { id: 'history', name: '历史记录', icon: FaHistory },
    { id: 'stats', name: '统计信息', icon: FaChartBar }
  ];

  return (
    <div>
      {/* 标签导航 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="inline-block mr-2 h-4 w-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 内容区域 */}
      <div>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {activeTab === 'send' && renderSendTab()}
            {activeTab === 'history' && renderHistoryTab()}
            {activeTab === 'stats' && renderStatsTab()}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminBroadcast;