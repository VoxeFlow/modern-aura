import React from 'react';

export const GlassCard = ({ children, className = '' }) => {
    return (
        <div
            className={`
        bg-white 
        border border-gray-100 
        rounded-2xl 
        shadow-[0_4px_20px_rgba(0,0,0,0.03)] 
        hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] 
        transition-shadow duration-300 
        ${className}
      `}
        >
            {children}
        </div>
    );
};
