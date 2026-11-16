/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Export estático: o mesmo build vai para a Vercel e para dentro do APK (Capacitor).
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
