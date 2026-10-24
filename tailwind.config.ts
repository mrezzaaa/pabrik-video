import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/remotion/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        blueprint: {
          bg: "#071324",
          surface: "rgba(11, 29, 54, 0.8)",
          border: "#0e3054",
          grid: "rgba(56, 189, 248, 0.18)",
          gridMajor: "rgba(56, 189, 248, 0.35)",
          cyan: "#38BDF8",
          white: "#F0F9FF",
          amber: "#F59E0B",
          emerald: "#10B981",
          crimson: "#EF4444",
        },
      },
      fontFamily: {
        mono: ["var(--font-jetbrains)", "Courier New", "monospace"],
      },
      backgroundImage: {
        "blueprint-grid": `
          linear-gradient(to right, rgba(56, 189, 248, 0.18) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(56, 189, 248, 0.18) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        "grid-20": "20px 20px",
      },
    },
  },
  plugins: [],
};

export default config;
