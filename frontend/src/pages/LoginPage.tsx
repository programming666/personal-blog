// @ts-nocheck
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FaGithub } from 'react-icons/fa';

const LoginPage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-5 border border-neutral-200 dark:border-neutral-800 grid place-items-center">
              <FaGithub className="text-2xl text-neutral-900 dark:text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
              欢迎回来
            </h1>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              使用 GitHub 账号继续，以发表评论
            </p>
          </div>

          <button
            onClick={() => authAPI.githubLogin()}
            className="w-full flex justify-center items-center gap-3 py-3 px-4 rounded-xl text-base font-medium bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors"
          >
            <FaGithub className="text-xl" />
            使用 GitHub 登录
          </button>

          <p className="mt-6 text-xs text-center text-neutral-500 dark:text-neutral-400">
            登录即表示同意我们的
            <a href="/terms" className="ml-1 underline underline-offset-2">服务条款</a> 与
            <a href="/privacy" className="ml-1 underline underline-offset-2">隐私协议</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
