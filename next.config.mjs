/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['youtube-dl-exec', 'ffmpeg-static'],
};

export default nextConfig;
