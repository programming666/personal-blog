import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import api from '../services/api'; // 导入原始api实例
import { FaUsers, FaFileAlt, FaComments, FaTrash, FaBan, FaCheck, FaChartBar, FaSignOutAlt, FaUser, FaEnvelope, FaBroadcastTower } from 'react-icons/fa';
import AdminMessages from './AdminMessages';
import AdminBroadcast from './AdminBroadcast';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'stats', name: '统计', icon: FaChartBar },
    { id: 'users', name: '用户管理', icon: FaUsers },
    { id: 'posts', name: '文章管理', icon: FaFileAlt },
    { id: 'comments', name: '评论管理', icon: FaComments },
    { id: 'messages', name: '站内信', icon: FaEnvelope },
    { id: 'broadcast', name: '广播管理', icon: FaBroadcastTower }
  ];

  // 获取统计数据
  const fetchStats = async () => {
    try {
      const response = await adminAPI.getStats();
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('获取统计失败:', error);
    }
  };

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getUsers();
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    }
  };

  // 获取文章列表
  const fetchPosts = async () => {
    try {
      const response = await adminAPI.getPosts();
      if (response.data.success) {
        setPosts(response.data.data);
      }
    } catch (error) {
      console.error('获取文章列表失败:', error);
    }
  };

  // 获取评论列表
  const fetchComments = async () => {
    try {
      const response = await adminAPI.getComments();
      if (response.data.success) {
        setComments(response.data.data);
      }
    } catch (error) {
      console.error('获取评论列表失败:', error);
    }
  };

  // 删除文章
  const handleDeletePost = async (postId) => {
    if (window.confirm('确定要删除这篇文章吗？此操作不可恢复。')) {
      try {
        await adminAPI.deletePost(postId);
        fetchPosts(); // 刷新列表
      } catch (error) {
        console.error('删除文章失败:', error);
        alert('删除失败');
      }
    }
  };

  // 删除评论
  const handleDeleteComment = async (commentId) => {
    if (window.confirm('确定要删除这条评论吗？此操作不可恢复。')) {
      try {
        await adminAPI.deleteComment(commentId);
        fetchComments(); // 刷新列表
      } catch (error) {
        console.error('删除评论失败:', error);
        alert('删除失败');
      }
    }
  };

  // 更新用户状态
  const handleUpdateUserStatus = async (userId, status) => {
    try {
      await adminAPI.updateUserStatus(userId, status);
      fetchUsers(); // 刷新列表
    } catch (error) {
      console.error('更新用户状态失败:', error);
      alert('操作失败');
    }
  };

  // 删除用户
  const handleDeleteUser = async (userId) => {
    if (window.confirm('确定要删除这个用户吗？这将删除用户的所有文章和评论，此操作不可恢复。')) {
      try {
        await adminAPI.deleteUser(userId);
        fetchUsers(); // 刷新列表
      } catch (error) {
        console.error('删除用户失败:', error);
        alert('删除失败');
      }
    }
  };

  // 退出登录
  const handleLogout = () => {
    // 清除token
    localStorage.removeItem('token');
    // 清除默认请求头中的Authorization
    delete api.defaults.headers.common['Authorization'];
    // 重定向到首页
    window.location.href = '/';
  };

  // 根据活跃标签加载数据
  useEffect(() => {
    setLoading(true);
    
    const loadData = async () => {
      switch (activeTab) {
        case 'stats':
          await fetchStats();
          break;
        case 'users':
          await fetchUsers();
          break;
        case 'posts':
          await fetchPosts();
          break;
        case 'comments':
          await fetchComments();
          break;
        case 'messages':
          // 消息管理不需要额外加载数据，将在AdminMessages组件中处理
          break;
        case 'broadcast':
          // 广播管理不需要额外加载数据，将在AdminBroadcast组件中处理
          break;
      }
      setLoading(false);
    };

    loadData();
  }, [activeTab]);

  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
            <FaUsers className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总用户数</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalUsers || 0}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400">
            <FaFileAlt className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总文章数</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalPosts || 0}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400">
            <FaComments className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总评论数</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalComments || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">用户列表</h3>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {users.map(user => (
          <div key={user._id} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {user.avatar ? (
                    <img className="h-10 w-10 rounded-full" src={user.avatar} alt={user.username} />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      <FaUser className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                  <div className="flex space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {user.role === 'admin' ? '管理员' : '用户'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* 评论权限 */}
                <button
                  onClick={() => handleUpdateUserStatus(user._id, { 
                    canComment: !user.canComment,
                    canPost: user.canPost,
                    canLogin: user.canLogin 
                  })}
                  className={`inline-flex items-center px-3 py-1 rounded text-sm ${
                    user.canComment 
                      ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300'
                      : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-300'
                  }`}
                >
                  {user.canComment ? <FaCheck className="mr-1" /> : <FaBan className="mr-1" />}
                  评论
                </button>
                
                {/* 发布权限 */}
                <button
                  onClick={() => handleUpdateUserStatus(user._id, { 
                    canComment: user.canComment,
                    canPost: !user.canPost,
                    canLogin: user.canLogin 
                  })}
                  className={`inline-flex items-center px-3 py-1 rounded text-sm ${
                    user.canPost 
                      ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300'
                      : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-300'
                  }`}
                >
                  {user.canPost ? <FaCheck className="mr-1" /> : <FaBan className="mr-1" />}
                  发布
                </button>
                
                {/* 登录权限 */}
                <button
                  onClick={() => handleUpdateUserStatus(user._id, { 
                    canComment: user.canComment,
                    canPost: user.canPost,
                    canLogin: !user.canLogin 
                  })}
                  className={`inline-flex items-center px-3 py-1 rounded text-sm ${
                    user.canLogin 
                      ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300'
                      : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-300'
                  }`}
                >
                  {user.canLogin ? <FaCheck className="mr-1" /> : <FaBan className="mr-1" />}
                  登录
                </button>
                
                {/* 删除用户 */}
                <button
                  onClick={() => handleDeleteUser(user._id)}
                  className="inline-flex items-center px-3 py-1 rounded text-sm bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-300"
                >
                  <FaTrash className="mr-1" />
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPosts = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">文章列表</h3>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {posts.map(post => (
          <div key={post._id} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">{post.title}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  作者: {post.author?.username} | 
                  发布时间: {new Date(post.createdAt).toLocaleDateString()} | 
                  阅读量: {post.viewCount || 0}
                </p>
              </div>
              <button
                onClick={() => handleDeletePost(post._id)}
                className="ml-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:text-red-300 dark:bg-red-900 dark:hover:bg-red-800"
              >
                <FaTrash className="mr-1" />
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderComments = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">评论列表</h3>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {comments.map(comment => (
          <div key={comment._id} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-gray-900 dark:text-white">{comment.content}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  作者: {comment.author?.username} | 
                  文章: {comment.post?.title} | 
                  时间: {new Date(comment.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDeleteComment(comment._id)}
                className="ml-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:text-red-300 dark:bg-red-900 dark:hover:bg-red-800"
              >
                <FaTrash className="mr-1" />
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航 */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">后台管理系统</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <FaSignOutAlt className="mr-2" />
                退出登录
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 标签导航 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      </div>

      {/* 内容区域 */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {activeTab === 'stats' && renderStats()}
              {activeTab === 'users' && renderUsers()}
              {activeTab === 'posts' && renderPosts()}
              {activeTab === 'comments' && renderComments()}
              {activeTab === 'messages' && <AdminMessages />}
              {activeTab === 'broadcast' && <AdminBroadcast />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
