import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Permitir build en producción incluso con errores de ESLint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Permitir build en producción incluso con errores de TypeScript
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
