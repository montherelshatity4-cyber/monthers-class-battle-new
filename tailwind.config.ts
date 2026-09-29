import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "team-red": "#EF4444",
        "team-blue": "#3B82F6",
        "team-green": "#10B981",
        "team-yellow": "#FBBF24",
      },
    },
  },
  plugins: [],
};

export default config;
