/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['"Space Mono"', 'monospace'],
            },
            colors: {
                'pure-red': '#E50000',
                'pure-black': '#000000',
                background: '#09090B',
            },
        },
    },
    plugins: [],
}
