import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Minecraft-ish dark gamer palette.
        creeper: {
          50: "#e9fbe9",
          100: "#c7f3c7",
          400: "#54d854",
          500: "#3bb143", // creeper green
          600: "#2f8f37",
          700: "#246b2a",
        },
        panel: {
          DEFAULT: "#16181d",
          soft: "#1d2026",
          border: "#2a2e37",
        },
      },
      fontFamily: {
        // Used for the blocky/pixel Minecraft branding accents in the UI.
        pixel: ['"Press Start 2P"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 30px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
