/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                monstro: {
                    bg: '#FFFFFF', // Clean White
                    surface: '#F3F4F6', // Soft Gray
                    light: '#E5E7EB', // Border Gray
                    primary: '#00D97E', // Vivid Green (Sports)
                    'primary-dim': '#00B368',
                    secondary: '#000000', // Solid Black
                    accent: '#DC2626', // Alert Red
                    text: '#111827', // Gray 900
                    'text-dim': '#4B5563', // Gray 600
                }
            },
            fontFamily: {
                sans: ['Montserrat', 'Inter', 'system-ui', 'sans-serif'],
                display: ['Montserrat', 'sans-serif'],
            },
            boxShadow: {
                'clean': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                'hover': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
            },
            animation: {
                'fade-in': 'fadeIn 0.6s ease-out forwards',
                'slide-up': 'slideUp 0.6s ease-out forwards',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                }
            }
        },
    },
    plugins: [],
}
