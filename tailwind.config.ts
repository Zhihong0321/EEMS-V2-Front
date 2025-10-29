import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0E7490",
          foreground: "#FFFFFF"
        },
        success: "#22c55e",
        warning: "#f97316",
        danger: "#ef4444"
      }
    }
  },
  plugins: []
};

export default config;
