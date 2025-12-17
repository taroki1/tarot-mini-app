/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{js,jsx,html}",
    "./public/src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin': 'spin 1s linear infinite',
      }
    },
  },
  plugins: [],
}
