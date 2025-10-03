import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
  (config) => {
    // 对于管理员API，检查是否已设置Authorization头
    // 对于非管理员API，从localStorage获取token
    if (config.url.startsWith('/api/admin/')) {
      // 管理员API应该已经通过AdminPage设置了Authorization头
      // 如果没有设置，则不添加任何token（保持原逻辑）
    } else {
      // 非管理员API从localStorage获取token
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 处理常见错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 未授权 - 清除token
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证相关API
export const authAPI = {
  register: (userData) => api.post('/api/auth/register', userData),
  login: (credentials) => api.post('/api/auth/login', credentials),
  adminLogin: (credentials) => api.post('/api/admin/login', credentials),
  getCurrentUser: () => api.get('/api/auth/me'),
  githubLogin: () => window.location.href = `${api.defaults.baseURL}/api/auth/github`
};

// 管理员相关API
export const adminAPI = {
  getStats: () => api.get('/api/admin/stats'),
  getUsers: () => api.get('/api/admin/users'),
  getPosts: () => api.get('/api/admin/posts'),
  getComments: () => api.get('/api/admin/comments'),
  updateUserStatus: (id, status) => api.put(`/api/admin/users/${id}/status`, status),
  deleteUser: (id) => api.delete(`/api/admin/users/${id}`),
  deletePost: (id) => api.delete(`/api/admin/posts/${id}`),
  deleteComment: (id) => api.delete(`/api/admin/comments/${id}`)
};

// 文章相关API
export const postsAPI = {
  getAllPosts: (params) => api.get('/api/posts', { params }),
  getPost: (id) => api.get(`/api/posts/${id}`),
  createPost: (postData) => api.post('/api/posts', postData),
  updatePost: (id, postData) => api.put(`/api/posts/${id}`, postData),
  deletePost: (id) => api.delete(`/api/posts/${id}`),
  likePost: (id) => api.post(`/api/posts/${id}/like`),
  getUserPosts: () => api.get('/api/posts/user/me')
};

// 评论相关API
export const commentsAPI = {
  createComment: (commentData) => api.post('/api/comments', commentData),
  getPostComments: (postId) => api.get(`/api/comments/post/${postId}`),
  updateComment: (id, commentData) => api.put(`/api/comments/${id}`, commentData),
  deleteComment: (id) => api.delete(`/api/comments/${id}`),
  likeComment: (id) => api.post(`/api/comments/${id}/like`)
};

export default api;