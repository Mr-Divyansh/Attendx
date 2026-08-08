import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: "standalone" output was removed — it's for self-hosted Node/Bun servers
  // (see the old Caddyfile in this repo). Netlify's official Next.js Runtime builds
  // and deploys the app itself; shipping a "standalone" build confuses it and is a
  // likely cause of the live site behaving incorrectly. Do not re-add this unless
  // you're deploying to your own server instead of Netlify.
  typescript: {
    // TODO: this hides real TypeScript errors at build time, which can let broken
    // code reach production silently. Once you can run `npm run build` locally and
    // it passes cleanly, flip this to false so future type errors fail the build
    // instead of shipping. Left as `true` here since I can't verify a clean build
    // from this environment (no network access to install packages).
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
