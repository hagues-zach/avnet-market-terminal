import type { Config } from "tailwindcss";

/**
 * Avnet brand tokens, from DESIGN.md. HARD RULE: `avnet.green` / `primary` is the
 * signature and, in any chart, ALWAYS represents Avnet — never reuse it for another
 * series. Tertiary data-viz colors (greenDark, blueDark, orange, grayDark) are for
 * data visualization only.
 *
 * Light mode only for now. Components use the semantic tokens (surface, ink-muted,
 * hairline, positive...) so a dark theme is a remap of these values later.
 * The legacy names at the bottom of each group are kept until step 1.6 moves the
 * components over; don't use them in new code.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: { DEFAULT: "#41C363", fg: "#000000" }, // fills, rules, focus; never text on white
        // Surfaces and lines
        canvas: "#F4F5F6",
        surface: {
          DEFAULT: "#FFFFFF",
          sunken: "#F4F5F6", // table headers, inputs, hovered rows
          selected: "#EAF8EE", // selected row, active nav item
        },
        hairline: { DEFAULT: "#E3E5E8", soft: "#EEF0F2", strong: "#000000" },
        // Text
        ink: {
          DEFAULT: "#000000",
          muted: "#6B7075", // 5.0:1, secondary text
          subtle: "#919191", // 3.2:1, disabled and 18px+ only
        },
        // Status: UI states only, never chart series
        positive: "#138036",
        negative: "#D7263D",
        warning: { DEFAULT: "#FDB813", text: "#8A6100" },
        info: "#4273B8",
        mock: "#FDB813",
        // Data visualization (mirrors VIZ in src/lib/colors.ts)
        viz: {
          avnet: "#41C363",
          "avnet-2": "#138036",
          arrow: "#4273B8",
          orange: "#E88320",
          "blue-light": "#53B8E1",
          yellow: "#E7A300",
          other: "#D2D2D2",
          benchmark: "#919191",
        },

        // Brand palette by name
        avnet: {
          green: "#41C363",
          greenDark: "#138036", // data-viz only
        },
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
        // Legacy semantic names (use hairline, ink-muted, negative instead)
        line: "#E3E5E8",
        muted: "#6B7075",
        danger: "#D7263D",
      },
      fontFamily: {
        display: ["var(--font-oswald)", "Arial Narrow", "sans-serif"],
        body: ["var(--font-inter)", "Arial", "sans-serif"],
      },
      fontSize: {
        // Type scale from DESIGN.md. Oswald tokens pair with font-display.
        "page-title": ["1.5rem", { lineHeight: "1.875rem", letterSpacing: "0.03em", fontWeight: "300" }],
        "section-title": ["1rem", { lineHeight: "1.25rem", letterSpacing: "0.0125em", fontWeight: "400" }],
        "card-title": ["0.875rem", { lineHeight: "1.125rem", letterSpacing: "0.0125em", fontWeight: "400" }],
        "figure-xl": ["2rem", { lineHeight: "2.2rem", fontWeight: "400" }],
        figure: ["1.5rem", { lineHeight: "1.75rem", fontWeight: "400" }],
        label: ["0.6875rem", { lineHeight: "0.875rem", letterSpacing: "0.055em", fontWeight: "400" }],
        // Inter tokens
        body: ["0.875rem", { lineHeight: "1.25rem" }],
        "body-sm": ["0.8125rem", { lineHeight: "1.125rem" }],
        table: ["0.8125rem", { lineHeight: "1.0625rem" }],
        caption: ["0.75rem", { lineHeight: "1rem" }],
        micro: ["0.6875rem", { lineHeight: "0.875rem", fontWeight: "500" }],
        button: ["0.8125rem", { lineHeight: "1rem", fontWeight: "600" }],
        // Legacy
        "2xs": ["0.6875rem", { lineHeight: "0.875rem" }], // 11px dense labels
      },
      height: {
        control: "2rem", // buttons, inputs, selects, compact table rows
        "row-comfortable": "2.5rem",
        tab: "2.25rem",
        "filter-bar": "2.75rem",
        topbar: "3rem",
      },
      minHeight: {
        "filter-bar": "2.75rem",
      },
      width: {
        sidebar: "15rem",
        "sidebar-collapsed": "3.5rem",
      },
      maxWidth: {
        content: "99rem", // 1584px
      },
      boxShadow: {
        overlay: "0 4px 16px rgba(0,0,0,0.12)", // menus, popovers, tooltips, toasts only
        // Legacy name: cards have no shadow (step 1.6). Remove usages in page passes.
        card: "none",
      },
      borderRadius: {
        // none (0) for controls and sm (2px) for cards are Tailwind defaults; pill = full.
        // Legacy name for the 2px card corner (step 1.6). Prefer rounded-sm.
        card: "0.125rem",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
    },
  },
  plugins: [],
};

export default config;
