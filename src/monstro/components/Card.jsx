import React from 'react';

export const Card = ({ children, className = '', ...props }) => {
    return (
        <div className={`glass-card ${className}`} {...props}>
            {children}
        </div>
    );
};
