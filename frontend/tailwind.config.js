/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#f5f3ff',
                    100: '#ede9fe',
                    200: '#ddd6fe',
                    300: '#c4b5fd',
                    400: '#a78bfa',
                    500: '#8b5cf6',
                    600: '#7c3aed',
                    700: '#6d28d9',
                    800: '#5b21b6',
                    900: '#4c1d95',
                    DEFAULT: '#6366f1', // Indigo 500
                    dark: '#4f46e5',   // Indigo 600
                },
                slate: {
                    850: '#1e293b', // Sidebar dark
                    900: '#0f172a',
                },
                success: {
                    DEFAULT: '#10b981', // Emerald 500
                    light: '#d1fae5',
                },
                danger: {
                    DEFAULT: '#ef4444', // Rose/Red 500
                    light: '#fee2e2',
                },
                warning: {
                    DEFAULT: '#f59e0b', // Amber 500
                    light: '#fef3c7',
                },
                info: {
                    DEFAULT: '#3b82f6', // Blue 500
                    light: '#dbeafe',
                }
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
            },
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
            },
            boxShadow: {
                'premium': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            }
        },
    },
    plugins: [],
}
