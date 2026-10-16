import type { NextConfig } from "next";

const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
const mediaBucket = (process.env.SUPABASE_STORAGE_BUCKET || "media").replace(/^\/+|\/+$/g, "");
const mediaPrefix = (process.env.SUPABASE_STORAGE_PREFIX || "uploads").replace(/^\/+|\/+$/g, "");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma", "bcryptjs"],
  // Ảnh cũ lưu dạng /uploads/<tên>. Redirect thẳng sang Supabase Storage ở tầng
  // routing để không tốn một lần gọi function cho mỗi ảnh.
  async redirects() {
    if (!supabaseUrl) return [];
    return [
      {
        source: "/uploads/:path*",
        destination: `${supabaseUrl}/storage/v1/object/public/${mediaBucket}/${mediaPrefix}/:path*`,
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
