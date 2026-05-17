// @ts-nocheck
import { useEffect, useState, useRef } from 'react';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaSave, FaSpinner, FaUpload, FaCheckCircle } from 'react-icons/fa';

const AdminProfile = () => {
  const { user, setAuthUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await adminAPI.getProfile();
        if (mounted && res.data?.success) {
          const data = res.data.data;
          setProfile(data);
          setName(data.name || '');
          setAvatarPreview(data.avatar || '');
        }
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || '加载失败');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const onPickAvatar = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('头像图片不能超过 5MB');
      return;
    }
    setError('');
    setAvatarFile(f);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(f);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.length > 50) {
      setError('显示名长度需在 1-50 字符之间');
      return;
    }
    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append('name', trimmed);
      if (avatarFile) fd.append('avatar', avatarFile);

      const res = await adminAPI.updateProfile(fd);
      if (res.data?.success) {
        const data = res.data.data;
        setProfile(data);
        setName(data.name || '');
        setAvatarPreview(data.avatar || '');
        setAvatarFile(null);
        if (fileRef.current) fileRef.current.value = '';
        // 同步 AuthContext + localStorage,Navbar/AdminPanel 立即生效
        if (user) setAuthUser({ ...user, name: data.name, avatar: data.avatar });
        setInfo('保存成功');
      }
    } catch (err) {
      setError(err.response?.data?.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="h-32 rounded-xl bg-neutral-100 dark:bg-neutral-900 animate-pulse"></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <FaUser /> 管理员个人资料
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          自定义在文章、评论和站点上展示的显示名和头像。GitHub 注册用户不能在站内自改,以 GitHub 同步为准。
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm dark:bg-red-500/5 dark:border-red-500/30 dark:text-red-400">
          {error}
        </div>
      )}
      {info && (
        <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 flex items-center gap-2">
          <FaCheckCircle /> {info}
        </div>
      )}

      <form onSubmit={onSubmit} className="card p-6 space-y-6">
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            登录用户名 (不可改)
          </label>
          <div className="mt-1 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-sm font-mono text-neutral-600 dark:text-neutral-400">
            {profile?.username || '—'}
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            由环境变量 <code>ADMIN_USERNAME</code> 决定,改它需要重启后端。
          </p>
        </div>

        <div>
          <label htmlFor="display-name" className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            显示名 *
          </label>
          <input
            id="display-name"
            type="text"
            required
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field mt-1"
            placeholder="例如:站长 / Yin Yining / 阿宁"
          />
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            将出现在文章作者、评论作者、管理面板等位置。1-50 字符。
          </p>
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            头像
          </label>
          <div className="mt-2 flex items-center gap-5">
            <div className="w-20 h-20 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 grid place-items-center shrink-0">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar preview" className="w-full h-full object-cover" />
              ) : (
                <FaUser className="text-2xl text-neutral-400" />
              )}
            </div>
            <div className="flex-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onPickAvatar}
                className="hidden"
                id="avatar-upload"
              />
              <label
                htmlFor="avatar-upload"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900 cursor-pointer transition-colors"
              >
                <FaUpload /> 选择新头像
              </label>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                PNG / JPG,5MB 以内。服务端会裁剪为 256×256 正方形。
              </p>
              {avatarFile && (
                <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300">
                  已选: {avatarFile.name} ({(avatarFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? <FaSpinner className="animate-spin" /> : <FaSave />}
            保存
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminProfile;
