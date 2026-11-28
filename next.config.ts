import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Live hub retired (22 Nov 2026): live matches now open their own match page,
      // which carries the Live now rail. The route files stay; this 301 sits in front.
      { source: "/live", destination: "/#live", statusCode: 301 },
    ];
  },
};
export default nextConfig;
