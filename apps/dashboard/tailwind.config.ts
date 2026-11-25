import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        uta: {
          950: "#06182B",
          900: "#0A2540",
          800: "#003366",
          700: "#0B4A85",
          600: "#1560A8",
          500: "#2E7BD1",
          400: "#5B9BE3",
          100: "#E6EFF8",
          50: "#F2F7FC",
        },
        paper: "#F8FAFC",
        ink: {
          900: "#0F172A",
          700: "#334155",
          500: "#64748B",
          400: "#94A3B8",
          200: "#E2E8F0",
          100: "#F1F5F9",
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ['"Source Serif 4 Variable"', "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 1px 1px rgba(15,23,42,0.02)",
        lift: "0 12px 32px -12px rgba(10,37,64,0.18), 0 2px 6px rgba(10,37,64,0.05)",
        drawer: "-24px 0 64px -24px rgba(6,24,43,0.35)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "rise": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: {
        "fade-in": "fade-in .25s ease-out both",
        rise: "rise .4s cubic-bezier(.2,.7,.2,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
