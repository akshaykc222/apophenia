import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist"],
  // Ensure pdfjs standard fonts are included in the serverless bundle (Vercel).
  outputFileTracingIncludes: {
    "/api/inngest": [
      "./node_modules/pdfjs-dist/standard_fonts/**/*",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
  experimental: {
    // كويت اليوم PDFs can be ~10MB+; proxy buffers the body before route handlers (default 10mb)
    proxyClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
