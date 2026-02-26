/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'pure-black': '#000000',
                'pure-red': '#E50000',
                'zinc-950': '#09090b',
                'zinc-900': '#18181b',
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui'],
                mono: ['Space Mono', 'ui-monospace', 'SFMono-Regular'],
            },
            animation: {
                'slide-up': 'slideUp 0.3s ease-out',
            },
            keyframes: {
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: 0 },
                    '100%': { transform: 'translateY(0)', opacity: 1 },
                }
            }
        },
    },
    plugins: [],
}
