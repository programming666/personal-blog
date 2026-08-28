// @ts-nocheck
import { useRef, useState } from 'react';
import { adminAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { FaImage, FaUpload, FaTrash, FaSpinner } from 'react-icons/fa';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminSiteSettings = () => {
  const { logoPath, faviconPath, refresh } = useSettings();
  const logoFileRef = useRef(null);
  const faviconFileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const logoUrl = logoPath ? `${API_BASE}/${logoPath}` : null;
  const faviconUrl = faviconPath ? `${API_BASE}/${faviconPath}` : null;

  const handlePick = (kind) => {
    (kind === 'favicon' ? faviconFileRef : logoFileRef).current?.click();
  };

  const handleFile = async (e, kind) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setInfo('');
    try {
      setUploading(true);
      if (kind === 'favicon') {
        await adminAPI.uploadFavicon(file);
        setInfo('图标已更新');
      } else {
        await adminAPI.uploadLogo(file);
        setInfo('Logo 已更新');
      }
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || '上传失败');
    } finally {
      setUploading(false);
      const ref = kind === 'favicon' ? faviconFileRef : logoFileRef;
      if (ref.current) ref.current.value = '';
    }
  };

  const handleDelete = async (kind) => {
    if (!window.confirm(kind === 'favicon' ? '确定要恢复默认图标吗？' : '确定要恢复默认 logo 吗？')) return;
    setError('');
    setInfo('');
    try {
      setUploading(true);
      if (kind === 'favicon') {
        await adminAPI.deleteFavicon();
        setInfo('已恢复默认图标');
      } else {
        await adminAPI.deleteLogo();
        setInfo('已恢复默认 logo');
      }
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || '删除失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <FaImage /> 站点 Logo
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          上传后将显示在页面左上角。支持 PNG / JPG，建议正方形，最大 5 MB。
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm dark:bg-red-500/5 dark:border-red-500/30 dark:text-red-400">
          {error}
        </div>
      )}
      {info && (
        <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
          {info}
        </div>
      )}

      <div className="card p-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="w-24 h-24 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden grid place-items-center bg-neutral-50 dark:bg-neutral-900">
            {logoUrl ? (
              <img src={logoUrl} alt="当前 logo" className="w-full h-full object-cover" />
            ) : (
              <FaImage className="text-3xl text-neutral-300 dark:text-neutral-700" />
            )}
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
              当前：{logoUrl ? '已上传自定义 logo' : '默认 logo'}
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                ref={logoFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e, 'logo')}
              />
              <button onClick={() => handlePick('logo')} disabled={uploading} className="btn btn-primary">
                {uploading ? <FaSpinner className="animate-spin" /> : <FaUpload />}
                {logoUrl ? '更换 logo' : '上传 logo'}
              </button>
              {logoUrl && (
                <button onClick={() => handleDelete('logo')} disabled={uploading} className="btn btn-danger">
                  <FaTrash /> 恢复默认
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <FaImage /> 站点图标 (Favicon)
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          上传后作为浏览器标签页图标。建议 64x64 PNG，最大 5 MB。不设置则使用默认图标。
        </p>
        <div className="card p-6 mt-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="w-16 h-16 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden grid place-items-center bg-neutral-50 dark:bg-neutral-900">
              {faviconUrl ? (
                <img src={faviconUrl} alt="当前 favicon" className="w-full h-full object-contain" />
              ) : (
                <FaImage className="text-2xl text-neutral-300 dark:text-neutral-700" />
              )}
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
                当前：{faviconUrl ? '已设置自定义图标' : '默认图标'}
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={faviconFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e, 'favicon')}
                />
                <button onClick={() => handlePick('favicon')} disabled={uploading} className="btn btn-primary">
                  {uploading ? <FaSpinner className="animate-spin" /> : <FaUpload />}
                  {faviconUrl ? '更换图标' : '上传图标'}
                </button>
                {faviconUrl && (
                  <button onClick={() => handleDelete('favicon')} disabled={uploading} className="btn btn-danger">
                    <FaTrash /> 恢复默认
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSiteSettings;
