import { Link } from 'react-router-dom';
import { FaHome, FaSignInAlt, FaUserPlus, FaBlog, FaUserCircle, FaPlus, FaExternalLinkAlt } from 'react-icons/fa';
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white shadow-md dark:bg-gray-800">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-primary-600 dark:text-primary-400">
            Personal Blog
          </Link>

          <div className="flex items-center space-x-6">
            <Link
              to="/"
              className="flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-200 dark:hover:text-primary-400"
            >
              <FaHome className="mr-2" />
              <span>首页</span>
            </Link>

            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-200 dark:hover:text-primary-400"
                >
                  <FaUserCircle className="mr-2" />
                  <span>控制台</span>
                </Link>
                <Link
                  to="/create-post"
                  className="flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-200 dark:hover:text-primary-400"
                >
                  <FaPlus className="mr-2" />
                  <span>写文章</span>
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-200 dark:hover:text-primary-400"
                >
                  <FaSignInAlt className="mr-2" />
                  <span>退出</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-200 dark:hover:text-primary-400"
                >
                  <FaSignInAlt className="mr-2" />
                  <span>登录</span>
                </Link>
                <Link
                  to="/register"
                  className="flex items-center text-gray-700 hover:text-primary-600 dark:text-gray-200 dark:hover:text-primary-400"
                >
                  <FaUserPlus className="mr-2" />
                  <span>注册</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;