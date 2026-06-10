import type { NextConfig } from "next";

// Applied to the whole app except the embeddable widget. Denies framing
// (clickjacking), MIME sniffing, and leaks; enforces HTTPS.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      // Embeddable widget: must be iframe-able from any origin.
      {
        source: "/embed/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      // Everything else: lock down framing.
      { source: "/((?!embed).*)", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
