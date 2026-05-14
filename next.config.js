/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['drizzle-orm', 'better-auth', 'pg'],
  },
  // Отключаем статическую генерацию для всех страниц
  staticPageGenerationTimeout: 120,
  compiler: {
    // Убираем оптимизации для клиентских компонентов
    styledComponents: true,
  },
  // Делаем все страницы динамическими
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
};

module.exports = nextConfig;