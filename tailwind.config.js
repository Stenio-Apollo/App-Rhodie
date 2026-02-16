/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f1f5f9",
        card: "#ffffff",
        border: "#dbe4ee",
        primary: "#0f172a",
        accent: "#0284c7",
      },
      borderRadius: {
        xl: "18px",
      },
    },
  },
  plugins: [],
};
