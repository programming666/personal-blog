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
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
  getCurrentUser: () => api.get('/api/auth/me'),
  githubLogin: () => window.location.href = `${api.defaults.baseURL}/api/auth/github`
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