import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Personalised responses must never be cached publicly (ADR-0002 §3 rule).
  // Pages are dynamic by default; explicit caching is opted into per route.
  poweredByHeader: false,
  reactStrictMode: true,
  output: "standalone",
};

export default withNextIntl(nextConfig);
