import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const Button = ({ 
  children, 
  type = 'button', 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  disabled = false, 
  className = '', 
  ...props 
}) => {
  const { isDarkMode } = useTheme();

  // 基础样式
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  // 尺寸样式
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl'
  };

  // 变体样式
  const variantStyles = {
    primary: isDarkMode
      ? 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500 focus:ring-offset-gray-900'
      : 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500 focus:ring-offset-white',
    secondary: isDarkMode
      ? 'bg-gray-700 hover:bg-gray-600 text-white focus:ring-gray-500 focus:ring-offset-gray-900'
      : 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-500 focus:ring-offset-white',
    outline: isDarkMode
      ? 'border border-gray-600 bg-transparent hover:bg-gray-800 text-white focus:ring-primary-500 focus:ring-offset-gray-900'
      : 'border border-gray-300 bg-transparent hover:bg-gray-100 text-gray-800 focus:ring-primary-500 focus:ring-offset-white',
    danger: isDarkMode
      ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 focus:ring-offset-gray-900'
      : 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 focus:ring-offset-white'
  };

  // 加载状态样式
  const loadingStyles = isLoading ? 'opacity-80 cursor-wait' : '';

  // 组合所有样式
  const combinedClasses = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${loadingStyles} ${className}`;

  return (
    <button
      type={type}
      className={combinedClasses}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;