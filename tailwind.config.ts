import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // >>> EDIT HERE: BRAND COLOURS (brand = main orange, sun = yellow, mint = green, ink = text) <<<
      colors: {
        ink: "#231F20",
        paper: "#FFF9F4",
        brand: { DEFAULT: "#E8590C", deep: "#B84508", soft: "#FFEBDC" },
        sun: { DEFAULT: "#FFC247", soft: "#FFF1CC" },
        mint: { DEFAULT: "#19C6A1", soft: "#D9F7EF" },
        pink: { DEFAULT: "#D9381E", soft: "#FFE1DA" },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        body: ['"Figtree"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        lift: "0 18px 40px -18px rgba(35,31,32,.35)",
        tile: "0 1px 0 rgba(35,31,32,.06), 0 8px 20px -12px rgba(35,31,32,.25)",
      },
    },
  },
  plugins: [],
};
export default config;
