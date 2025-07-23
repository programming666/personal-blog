import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const Card = ({ 
  children, 
  title, 
  footer, 
  variant = 'default', 
  className = '', 
  ...props 
}) => {
  const { isDarkMode } = useTheme();

  // 基础卡片样式
  const baseStyles = `rounded-xl overflow-hidden transition-all duration-300 shadow-md hover:shadow-lg ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`;

  // 变体样式
  const variantStyles = {
    default: '',
    elevated: isDarkMode ? 'shadow-lg shadow-primary-900/10' : 'shadow-lg shadow-primary-100/50',
    outlined: isDarkMode ? 'border-2 border-gray-700 bg-transparent' : 'border-2 border-gray-200 bg-transparent'
  };

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props}>
      {title && (
        <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{title}</h2>
        </div>
      )}
      <div className={`p-6 ${title ? '' : 'pt-6'}`}>
        {children}
      </div>
      {footer && (
        <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-gray-700 bg-gray-850' : 'border-gray-200 bg-gray-50'}`}>
          {footer}
        </div>
      )}
    </div>
  );
};

// Card.Header 组件
Card.Header = ({ children, className = '' }) => {
  const { isDarkMode } = useTheme();
  return (
    <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} ${className}`}>
      {children}
    </div>
  );
};

// Card.Footer 组件
Card.Footer = ({ children, className = '' }) => {
  const { isDarkMode } = useTheme();
  return (
    <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-gray-700 bg-gray-850' : 'border-gray-200 bg-gray-50'} ${className}`}>
      {children}
    </div>
  );
};

// Card.Title 组件
Card.Title = ({ children, className = '' }) => {
  const { isDarkMode } = useTheme();
  return (
    <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} ${className}`}>
      {children}
    </h2>
  );
};

export default Card;