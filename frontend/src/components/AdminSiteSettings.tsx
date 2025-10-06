// @ts-nocheck
import { useRef, useState } from 'react';
import { adminAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { FaImage, FaUpload, FaTrash, FaSpinner } from 'react-icons/fa';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminSiteSettings = () => {
  const { logoPath, refresh } = useSettings();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const logoUrl = logoPath ? `${API_BASE}/${logoPath}` : null;

  const handlePick = () => {
    fileRef.current?.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setInfo('');
    try {
      setUploading(true);
      await adminAPI.uploadLogo(file);
      await refresh();
      setInfo('Logo 已更新');
    } catch (err) {
      setError(err.response?.data?.message || '上传失败');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('确定要恢复默认 logo 吗？')) return;
    setError('');
    setInfo('');
    try {
      setUploading(true);
      await adminAPI.deleteLogo();
      await refresh();
      setInfo('已恢复默认 logo');
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
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
              <button onClick={handlePick} disabled={uploading} className="btn btn-primary">
                {uploading ? <FaSpinner className="animate-spin" /> : <FaUpload />}
                {logoUrl ? '更换 logo' : '上传 logo'}
              </button>
              {logoUrl && (
                <button onClick={handleDelete} disabled={uploading} className="btn btn-danger">
                  <FaTrash /> 恢复默认
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSiteSettings;
