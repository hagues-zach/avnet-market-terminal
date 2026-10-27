import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./print.css";

// Self hosted so builds need no internet access. Latin subset variable fonts
// from @fontsource-variable, SIL Open Font License (see fonts/OFL-*.txt).
// Oswald covers the 300 to 700 weights in use; Inter covers 100 to 900.
const oswald = localFont({
  src: "./fonts/oswald-latin-wght-normal.woff2",
  weight: "300 700",
  variable: "--font-oswald",
  display: "swap",
});
const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = { themeColor: "#FFFFFF" };

export const metadata: Metadata = {
  title: "Avnet Market Intelligence Terminal",
  description: "Semiconductor market intelligence for Avnet sellers, engineers and leaders, from live public data and Avnet's own.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${oswald.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
