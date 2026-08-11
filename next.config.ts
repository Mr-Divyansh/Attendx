import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: "standalone" output was removed — it's for self-hosted Node/Bun servers
  // (see the old Caddyfile in this repo). Netlify's official Next.js Runtime builds
  // and deploys the app itself; shipping a "standalone" build confuses it and is a
  // likely cause of the live site behaving incorrectly. Do not re-add this unless
  // you're deploying to your own server instead of Netlify.
  typescript: {
    // Type checking is ON at build time: verified clean via `npx tsc --noEmit`
    // and `npm run build` before enabling. Keep this false so future type
    // errors fail the build instead of shipping broken code silently.
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
};

export default nextConfig;
