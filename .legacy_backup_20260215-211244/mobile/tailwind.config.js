/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                board: "#f3f6fb",
                ink: "#0f172a",
                accent: "#0ea5e9",
                card: "#ffffff"
            },
            borderRadius: {
                xl: "18px"
            }
        }
    },
    presets: [require("nativewind/preset")],
    plugins: []
};
