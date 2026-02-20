import React from 'react';

export const BackgroundGrid = () => {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-white">
            {/* Subtle Dot Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>

            {/* Soft Ambient Light */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial from-monstro-primary/5 to-transparent blur-[100px] opacity-40"></div>
        </div>
    );
};
