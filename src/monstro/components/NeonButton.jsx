import React from 'react';

export const NeonButton = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
    const baseStyles = "relative px-8 py-4 font-bold text-lg uppercase tracking-wider transition-all duration-300 rounded-lg overflow-hidden group flex items-center justify-center gap-2";

    const variants = {
        primary: "bg-monstro-primary text-white hover:bg-monstro-primary-dim shadow-md hover:shadow-lg transform hover:-translate-y-0.5",
        secondary: "bg-white text-monstro-text border border-gray-200 hover:border-monstro-primary hover:text-monstro-primary shadow-sm hover:shadow-md",
        obsidian: "bg-black text-white hover:bg-gray-900 shadow-md hover:shadow-lg"
    };

    return (
        <button
            onClick={onClick}
            className={`${baseStyles} ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
            {variant === 'primary' && (
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            )}
        </button>
    );
};
