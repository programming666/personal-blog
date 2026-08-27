// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { postsAPI, adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MarkdownEditorNew from '../components/MarkdownEditorNew';
import TurnstileWidget from '../components/TurnstileWidget';
import { FaArrowLeft, FaSave, FaEye, FaTrash, FaImage } from 'react-icons/fa';
import '../styles/edit-post.css';

const EditPost = () => {
  const { id } = useParams();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    content: '',
    tags: '',
    status: 'published',
    thumbnail: '',
    images: []  // 文章配图 URL 数组
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [originalPost, setOriginalPost] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState('');

  // 未登录跳登录;非管理员直接跳首页 — 编辑文章是管理员独占
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/edit/${id}` } });
      return;
    }
    if (user?.role !== 'admin') {
      navigate('/', { replace: true });
      return;
    }
    if (id) fetchPost();
  }, [isAuthenticated, user, navigate, authLoading, id]);

  // 获取文章详情
  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await postsAPI.getPost(id);
      const post = response.data.data;
      setOriginalPost(post);

      if (user?.role !== 'admin') {
        setError('您没有权限编辑此文章');
        return;
      }

      const tagsString = post.tags.join(', ');

      setFormData({
        title: post.title,
        summary: post.summary || '',
        content: post.content,
        tags: tagsString,
        status: post.status,
        thumbnail: post.thumbnail || '',
        images: Array.isArray(post.images) ? post.images : []
      });

      if (post.thumbnail) {
        setImagePreview(post.thumbnail);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching post:', err);
      setError(err.response?.data?.message || '加载文章失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理表单输入变化
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 处理图片上传预览
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormData(prev => ({ ...prev, thumbnail: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // 处理配图上传(支持多选,逐个上传)
  const handleGalleryChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingImages(true);
    setError(null);
    try {
      const urls = [];
      for (const file of files) {
        const res = await adminAPI.uploadPostImage(file);
        if (res.data && res.data.success && res.data.url) {
          urls.push(res.data.url);
        }
      }
      setFormData(prev => ({ ...prev, images: [...(prev.images || []), ...urls] }));
    } catch (err) {
      setError(err.response?.data?.message || '配图上传失败,请稍后再试');
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  // 删除某张已上传的配图
  const handleRemoveGalleryImage = (idx) => {
    setFormData(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== idx)
    }));
  };

  // 处理表单提交
  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('标题和内容不能为空');
      return;
    }

    // 非草稿模式下需要Turnstile验证
    if (!isDraft && !turnstileToken) {
      setError('请先完成人机验证');
      return;
    }

    try {
      if (isDraft) setSavingDraft(true);
      else setLoading(true);

      setError(null);

      // 处理标签格式
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);

      // 明确设置状态：如果是草稿操作，强制设为draft
      const postStatus = isDraft ? 'draft' : formData.status;

      const postData = {
        ...formData,
        tags: tagsArray,
        status: postStatus
      };

      // 非草稿模式下添加Turnstile token
      if (!isDraft) {
        postData['cf-turnstile-response'] = turnstileToken;
      }

      await postsAPI.updatePost(id, postData);
      
      // 提交成功后重置token
      if (!isDraft) {
        setTurnstileToken('');
      }
      
      navigate(`/posts/${id}`);
    } catch (err) {
      console.error('Error updating post:', err);
      setError(err.response?.data?.message || '更新文章失败，请稍后再试');
    } finally {
      if (isDraft) setSavingDraft(false);
      else setLoading(false);
    }
  };

  // 处理文章删除
  const handleDelete = async () => {
    if (!window.confirm('确定要删除这篇文章吗？此操作不可恢复。')) {
      return;
    }

    try {
      setDeleting(true);
      await postsAPI.deletePost(id);
      navigate('/');
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('删除失败，请稍后再试');
    } finally {
      setDeleting(false);
    }
  };

  // 加载状态
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div className="loading-spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="edit-post-container">
        <div className="error-message">{error}</div>
        <Link
          to={originalPost ? `/posts/${originalPost._id}` : '/'}
          className="btn btn-primary"
        >
          <FaArrowLeft style={{ marginRight: '8px' }} />
          {originalPost ? '返回文章' : '返回首页'}
        </Link>
      </div>
    );
  }

  return (
    <div className="edit-post-container">
      {/* 返回按钮 */}
      <div className="edit-post-header">
        <Link
          to={previewMode ? `/edit/${id}` : `/posts/${id}`}
          className="back-link"
        >
          <FaArrowLeft style={{ marginRight: '8px' }} /> 
          {previewMode ? '返回编辑' : '返回文章'}
        </Link>
      </div>

      <div className="edit-post-card">
        <div className="edit-post-header-inner">
          <h1 className="edit-post-title">
            {previewMode ? '预览文章' : '编辑文章'}
          </h1>
        </div>

        {previewMode ? (
          // 预览模式
          <div className="preview-section">
            <h2 className="preview-title">{formData.title || '无标题'}</h2>
            <div className="preview-meta">
              <span>状态: {formData.status === 'published' ? '已发布' : '草稿'}</span>
              {formData.tags && (
                <span style={{ marginLeft: '16px' }}>
                  标签: {formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag).join(', ')}
                </span>
              )}
            </div>

            {imagePreview && (
              <img
                src={imagePreview}
                alt="预览图"
                className="preview-image"
              />
            )}

            {formData.images && formData.images.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '12px 0' }}>
                {formData.images.map((url, idx) => (
                  <img key={idx} src={url} alt={`配图 ${idx + 1}`} style={{ maxWidth: '240px', borderRadius: '4px' }} />
                ))}
              </div>
            )}

            {formData.summary && (
              <div className="preview-summary">
                {formData.summary}
              </div>
            )}

            <div style={{ marginTop: '20px' }}>
              <MarkdownEditorNew
                initialContent={formData.content}
                height="600px"
                onSave={() => {}} // 预览模式不需要保存
              />
            </div>
          </div>
        ) : (
          // 编辑模式 - 表单
          <form onSubmit={handleSubmit} className="edit-post-content">
            {/* 错误提示 */}
            {error && (
              <div className="error-message">{error}</div>
            )}

            {/* 标题输入 */}
            <div className="form-group">
              <label htmlFor="title" className="form-label">
                文章标题 <span className="required">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="form-input"
                placeholder="输入文章标题..."
                required
              />
            </div>

            {/* 摘要输入 */}
            <div className="form-group">
              <label htmlFor="summary" className="form-label">
                文章摘要
              </label>
              <textarea
                id="summary"
                name="summary"
                value={formData.summary}
                onChange={handleChange}
                className="form-textarea"
                placeholder="输入文章摘要（可选）"
                rows={3}
              ></textarea>
            </div>

            {/* 缩略图上传 */}
            <div className="form-group">
              <label className="form-label">文章缩略图</label>
              <div className="image-upload-container">
                {imagePreview ? (
                  <div className="image-preview-container">
                    <img
                      src={imagePreview}
                      alt="预览"
                      className="image-preview"
                    />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => {
                        setImagePreview('');
                        setFormData(prev => ({ ...prev, thumbnail: '' }));
                      }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="thumbnail" style={{ cursor: 'pointer', color: '#007bff' }}>
                      上传图片
                    </label>
                    <input
                      id="thumbnail"
                      name="thumbnail"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                      PNG, JPG, GIF 最大 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 文章配图(支持多张,最多 10 张) */}
            <div className="form-group">
              <label className="form-label">文章配图</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-start' }}>
                {(formData.images || []).map((url, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '140px', height: '100px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ddd' }}>
                    <img src={url} alt={`配图 ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryImage(idx)}
                      style={{ position: 'absolute', top: '4px', right: '4px', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      aria-label="删除配图"
                    >
                      <FaTrash size={11} />
                    </button>
                  </div>
                ))}
                <label htmlFor="gallery-upload-edit" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '140px', height: '100px', border: '2px dashed #ccc', borderRadius: '6px', cursor: uploadingImages ? 'not-allowed' : 'pointer', color: '#666', fontSize: '13px' }}>
                  {uploadingImages ? (
                    <span className="loading-spinner" style={{ width: '20px', height: '20px' }}></span>
                  ) : (
                    <>
                      <FaImage size={20} style={{ marginBottom: '4px' }} />
                      <span>添加配图</span>
                    </>
                  )}
                  <input
                    id="gallery-upload-edit"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryChange}
                    disabled={uploadingImages}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                可上传多张(JPG/PNG/WebP,单张 ≤5MB),用于文章正文里配图;最多 10 张。
              </p>
            </div>

            {/* Markdown 编辑器 */}
            <div className="form-group">
              <label className="form-label">
                文章内容 <span className="required">*</span>
              </label>
              <MarkdownEditorNew
                initialContent={formData.content}
                onSave={(content) => setFormData(prev => ({ ...prev, content }))}
                height="600px"
              />
            </div>

            {/* 标签和状态 */}
            <div className="form-row">
              <div className="form-col">
                <label htmlFor="tags" className="form-label">
                  标签
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="输入标签，用逗号分隔"
                />
              </div>

              <div className="form-col">
                <label htmlFor="status" className="form-label">
                  发布状态
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="published">已发布</option>
                  <option value="draft">草稿</option>
                </select>
              </div>
            </div>

            {/* Turnstile 人机验证 */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <TurnstileWidget
                  onSuccess={(token) => setTurnstileToken(token)}
                  onError={() => setTurnstileToken('')}
                  onExpire={() => setTurnstileToken('')}
                />
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  if (window.confirm('确定要删除这篇文章吗？此操作不可恢复。')) {
                    handleDelete();
                  }
                }}
                disabled={deleting}
              >
                {deleting ? (
                  <span className="loading-spinner"></span>
                ) : (
                  <FaTrash style={{ marginRight: '5px' }} />
                )}
                删除文章
              </button>

              <div className="btn-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={savingDraft}
                >
                  {savingDraft ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    <FaSave style={{ marginRight: '5px' }} />
                  )}
                  保存草稿
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setPreviewMode(true)}
                  disabled={!formData.content.trim()}
                >
                  <FaEye style={{ marginRight: '5px' }} />
                  预览
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    <>
                      更新文章
                      <FaArrowLeft style={{ marginLeft: '5px', transform: 'rotate(90deg)' }} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditPost;
