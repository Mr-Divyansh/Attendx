import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the default Next.js output for the current Vercel deployment.
  // Only enable standalone output if the deployment target changes to a self-hosted server.
  typescript: {
    // Type checking is ON at build time: verified clean via `npx tsc --noEmit`
    // and `npm run build` before enabling. Keep this false so future type
    // errors fail the build instead of shipping broken code silently.
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  // Hides the "X-Powered-By: Next.js" header. The middleware's
  // response.headers.delete('x-powered-by') can't remove it because Next.js
  // appends the header after middleware runs — this config flag is the
  // reliable way to suppress it.
  poweredByHeader: false,
};

export default nextConfig;
