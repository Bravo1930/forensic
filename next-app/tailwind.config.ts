import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#E8B86D",
        gold: "#E8B86D",
        "gold-light": "#F0D48A",
        "gold-dark": "#C99A4E",
        background: "#12151E",
        surface: "#1A1D27",
        border: "#2A2E3A",
        muted: "#8892A0",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
    },
  },
  plugins: [],
};

export default config;
