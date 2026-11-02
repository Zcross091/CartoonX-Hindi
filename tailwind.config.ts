import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        toons: {
          primary: "#3B82F6",    // Playful blue
          secondary: "#EC4899",  // Joyful pink
          accent: "#F59E0B",     // Sunny yellow
          success: "#10B981",    // Cheerful green
          purple: "#8B5CF6",     // Magic purple
          dark: "#0F172A",       // Deep navy theater
          card: "#1E293B",       // Slate card
          surface: "#334155"     // Card border/hover
        }
      },
      fontFamily: {
        sans: ["var(--font-comic)", "Comic Sans MS", "Chalkboard SE", "system-ui", "sans-serif"],
      },
      animation: {
        'bounce-slow': 'bounce 2.5s infinite',
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;

