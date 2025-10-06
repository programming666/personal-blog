// @ts-nocheck
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true, // 带上 HttpOnly cookie (admin 会话)
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    if (!config.url.startsWith('/api/admin/')) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAdminCall = error.config?.url?.startsWith('/api/admin/');
      if (!isAdminCall) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  adminLogin: (credentials) => api.post('/api/admin/login', credentials),
  adminLogout: () => api.post('/api/admin/logout'),
  adminTwoFactorVerify: (payload) => api.post('/api/admin/2fa/verify', payload),
  getCurrentUser: () => api.get('/api/auth/me'),
  githubLogin: () => { window.location.href = `${api.defaults.baseURL}/api/auth/github`; }
};

export const adminAPI = {
  getStats: () => api.get('/api/admin/stats'),
  getUsers: () => api.get('/api/admin/users'),
  getPosts: () => api.get('/api/admin/posts'),
  getComments: () => api.get('/api/admin/comments'),
  updateUserStatus: (id, status) => api.put(`/api/admin/users/${id}/status`, status),
  deleteUser: (id) => api.delete(`/api/admin/users/${id}`),
  deletePost: (id) => api.delete(`/api/admin/posts/${id}`),
  deleteComment: (id) => api.delete(`/api/admin/comments/${id}`),
  // 评论审核队列
  getCommentQueue: (status) => api.get('/api/admin/comments/queue', { params: { status } }),
  moderateComment: (id, payload) => api.put(`/api/admin/comments/${id}/moderate`, payload),
  retryModeration: (id) => api.post(`/api/admin/comments/${id}/retry-moderation`),
  getModerationQuota: () => api.get('/api/admin/moderation/quota'),
  triggerModerationTick: () => api.post('/api/admin/moderation/tick'),
  listAllAnnouncements: (params) => api.get('/api/announcements/admin/all', { params }),
  createAnnouncement: (data) => api.post('/api/announcements', data),
  updateAnnouncement: (id, data) => api.put(`/api/announcements/${id}`, data),
  deleteAnnouncement: (id) => api.delete(`/api/announcements/${id}`),
  twoFactorStatus: () => api.get('/api/admin/2fa/status'),
  twoFactorSetup: () => api.post('/api/admin/2fa/setup'),
  twoFactorEnable: (code) => api.post('/api/admin/2fa/enable', { code }),
  twoFactorDisable: (code) => api.post('/api/admin/2fa/disable', { code }),
  uploadLogo: (file) => {
    const fd = new FormData();
    fd.append('logo', file);
    return api.post('/api/settings/logo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteLogo: () => api.delete('/api/settings/logo')
};

export const postsAPI = {
  getAllPosts: (params) => api.get('/api/posts', { params }),
  getPost: (id) => api.get(`/api/posts/${id}`),
  createPost: (postData) => api.post('/api/posts', postData),
  updatePost: (id, postData) => api.put(`/api/posts/${id}`, postData),
  deletePost: (id) => api.delete(`/api/posts/${id}`),
  likePost: (id) => api.post(`/api/posts/${id}/like`)
};

export const commentsAPI = {
  createComment: (commentData) => api.post('/api/comments', commentData),
  getPostComments: (postId) => api.get(`/api/comments/post/${postId}`),
  updateComment: (id, commentData) => api.put(`/api/comments/${id}`, commentData),
  deleteComment: (id) => api.delete(`/api/comments/${id}`),
  likeComment: (id) => api.post(`/api/comments/${id}/like`)
};

export const announcementsAPI = {
  list: (params) => api.get('/api/announcements', { params }),
  get: (id) => api.get(`/api/announcements/${id}`)
};

export const settingsAPI = {
  getPublic: () => api.get('/api/settings')
};

export default api;
