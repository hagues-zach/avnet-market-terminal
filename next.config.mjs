import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A second local dev server can use its own build folder so it doesn't clash
  // with the main one, e.g. NEXT_DIST_DIR=.next-kit next dev -p 3012.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // PowerPoint exports are built on the Avnet template (src/lib/brand/pptx): pptxgenjs
  // and jszip run as plain Node, and the template file, which serverless functions
  // don't ship by default, is traced into every route that exports.
  // oracledb (the Oracle store, src/lib/store/oracle.ts) loads only when STORE_ADAPTER=oracle.
  serverExternalPackages: ["pptxgenjs", "jszip", "oracledb"],
  outputFileTracingIncludes: { "/api/deck/export": ["./assets/brand/avnet-template-fy27.pptx"] },
  // A self-contained server in .next/standalone for the container build (see
  // Dockerfile). Tracing starts at this folder, so a checkout nested inside
  // another project (a git worktree, a monorepo) still puts server.js at the top.
  output: "standalone",
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
};

export default nextConfig;
