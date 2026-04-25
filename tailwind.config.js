export default {
  content: ["./client/index.html", "./client/src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070A12",
          900: "#0A1020",
          850: "#0E172A",
          800: "#111C31",
          700: "#1C2A44"
        },
        mint: {
          400: "#34D399",
          500: "#10B981"
        },
        amberRisk: "#F59E0B",
        danger: "#EF4444"
      },
      boxShadow: {
        glow: "0 20px 70px rgba(16, 185, 129, 0.10)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
