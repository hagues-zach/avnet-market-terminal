/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A second local dev server can use its own build folder so it doesn't clash
  // with the main one, e.g. NEXT_DIST_DIR=.next-kit next dev -p 3012.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
