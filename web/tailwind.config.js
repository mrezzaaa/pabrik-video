/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./remotion_embed/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        panas: "#FF3B30",
        dingin: "#0A84FF",
        highlight: "#FFD60A",
        aman: "#30D158",
        stroke: "#111111",
      },
    },
  },
  plugins: [],
};
