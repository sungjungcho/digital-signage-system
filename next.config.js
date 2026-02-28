/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  output: 'standalone',
  eslint: {
    // 프로덕션 빌드 시 ESLint 에러 무시
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 프로덕션 빌드 시 TypeScript 에러 무시
    ignoreBuildErrors: true,
  },
  // 파일 업로드 크기 제한 증가 (100MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

module.exports = nextConfig;
