import type { Config } from "tailwindcss";

/**
 * Avnet brand tokens. HARD RULE: `avnet.green` is the signature and, in any chart,
 * ALWAYS represents Avnet — never reuse it for another series. Tertiary data-viz
 * colors (greenDark, blueDark, orange, grayDark) are for data visualization only.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        avnet: {
          green: "#41C363",
          greenDark: "#138036", // data-viz only
        },
        ink: "#000000",
        paper: "#FFFFFF",
        gray: {
          medium: "#919191",
          light: "#D2D2D2",
          dark: "#5F6369", // data-viz only
        },
        blue: {
          light: "#7DCEF1",
          dark: "#4273B8", // data-viz only
        },
        accent: {
          yellow: "#FDB813",
          orange: "#E88320", // data-viz only
        },
        // semantic surface layer (light, dense, professional terminal)
        canvas: "#F4F5F6",
        surface: "#FFFFFF",
        line: "#E3E5E8",
        muted: "#6B7075",
        danger: "#D7263D", // brand-safe red; confirm w/ brand team
      },
      fontFamily: {
        display: ["var(--font-oswald)", "Arial Narrow", "sans-serif"],
        body: ["var(--font-inter)", "Arial", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "0.875rem" }], // 11px dense labels
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)",
      },
      borderRadius: {
        card: "0.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
