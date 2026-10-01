/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        math: '#3b82f6',       // Blue
        programming: '#10b981', // Green
        physics: '#f97316',    // Orange
        tgat: '#a855f7',       // Purple
        ai: '#ef4444',         // Red
      }
    },
  },
  plugins: [],
}
