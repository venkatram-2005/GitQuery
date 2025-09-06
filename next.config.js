/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
    eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // next.config.js
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "tfjfq75p-3000.inc1.devtunnels.ms"],
    },
  }

};

export default config;
