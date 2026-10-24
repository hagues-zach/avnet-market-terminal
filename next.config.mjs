/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A second local dev server can use its own build folder so it doesn't clash
  // with the main one, e.g. NEXT_DIST_DIR=.next-kit next dev -p 3012.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The PowerPoint export (src/lib/deck/pptx.ts) runs pptxgenjs as plain Node and
  // reads the logo from public/, which serverless functions don't ship by default.
  serverExternalPackages: ["pptxgenjs"],
  outputFileTracingIncludes: { "/api/deck/export": ["./public/avnet-logo.png"] },
};

export default nextConfig;
