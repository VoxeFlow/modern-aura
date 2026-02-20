import React from 'react';

export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '',
  disabled = false,
  ...props 
}) => {
  const baseClass = variant === 'primary' ? 'btn-monstro' : 'btn-secondary class-panel';
  
  return (
    <button 
      className={`${baseClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
