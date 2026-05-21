import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist"],
  experimental: {
    // كويت اليوم PDFs can be ~10MB+; proxy buffers the body before route handlers (default 10mb)
    proxyClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
