import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin();

// Content Security Policy - Permite recursos necesarios
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.paypal.com https://sdk.mercadopago.com https://www.googletagmanager.com https://www.google-analytics.com https://vercel.live;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: https: http:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.stripe.com https://api.mercadopago.com https://api.openai.com https://*.supabase.co https://vercel.live wss://ws-us3.pusher.com https://*.pusher.com;
  frame-src 'self' https://js.stripe.com https://www.paypal.com https://www.youtube.com https://vimeo.com https://vercel.live;
  frame-ancestors 'self';
  form-action 'self';
  base-uri 'self';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Security Headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Protección contra clickjacking
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Protección contra XSS
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // HSTS - Forzar HTTPS
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Política de referrer
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permisos de APIs del navegador
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Content Security Policy
          { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
        ],
      },
    ];
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'replicate.delivery',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'plataforma-frutos.s3.us-east-2.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Ayudar a resolver módulos de forma más explícita
    config.resolve.extensions = ['.tsx', '.ts', '.jsx', '.js', '.json'];
    
    // Asegurar resolución case-sensitive
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    return config;
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only upload source maps in production
  silent: !process.env.CI,
  
  // Suppresses source map uploading logs during build
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
  tunnelRoute: "/monitoring",

  // Enables automatic instrumentation of Vercel Cron Monitors
  automaticVercelMonitors: true,
};

// Only wrap with Sentry if DSN is configured
const finalConfig = process.env.SENTRY_DSN
  ? withSentryConfig(withNextIntl(nextConfig), sentryWebpackPluginOptions)
  : withNextIntl(nextConfig);

export default finalConfig;
