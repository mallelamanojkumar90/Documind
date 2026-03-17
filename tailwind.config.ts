import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#185FA5",
          accent: "#378ADD",
          surface: "#E6F1FB",
          teal: "#0F6E56",
          ink: "#2C2C2A",
          paper: "#F1EFE8",
          primaryDark: "#0C447C",
          accentLight: "#B5D4F4",
        },
      },
      fontFamily: {
        heading: ["Georgia", "serif"],
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "Cascadia Code", "Source Code Pro", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
