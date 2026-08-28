/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        pos: "#1f8df9",
        neg: "#dd7a2b",
        ink: "#102033",
        paper: "#F3F5F7",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 8px 24px rgba(16,32,51,0.04)",
        float: "0 12px 40px rgba(16,32,51,0.12)",
      },
      maxWidth: {
        phone: "430px",
        reading: "760px",
      },
    },
  },
  plugins: [],
};
