import api from './api';

// 用户消息相关API
export const messagesAPI = {
  // 获取用户消息
  getUserMessages: (params) => api.get('/api/messages', { params }),
  
  // 标记消息为已读
  markAsRead: (id) => api.put(`/api/messages/${id}/read`),
  
  // 删除消息
  deleteMessage: (id) => api.delete(`/api/messages/${id}`),
  
  // 获取未读消息数量
  getUnreadCount: () => api.get('/api/messages/unread-count')
};