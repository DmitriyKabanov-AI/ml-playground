import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        primary: {
          50: "#eef2ff", 100: "#e0e7ff", 300: "#a5b4fc",
          500: "#6366f1", 600: "#4f46e5", 700: "#4338ca", 900: "#312e81",
        },
        accent: {
          emerald: "#10b981", amber: "#f59e0b",
          rose: "#f43f5e", sky: "#0ea5e9", violet: "#8b5cf6",
        },
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0,0,0,0.12)",
        glow: "0 0 24px rgba(99,102,241,0.35)",
      },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-500px 0" }, "100%": { backgroundPosition: "500px 0" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite linear",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
