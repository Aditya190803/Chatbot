import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

loadEnv({
    path: resolve(__dirname, '../../.env'),
    override: true,
});

const nextConfig = {
    output: 'standalone',
    transpilePackages: [
        'next-mdx-remote',
        '@repo/common',
        '@repo/shared',
        '@repo/ui',
        '@repo/ai',
        '@repo/actions',
        '@repo/orchestrator',
        '@repo/prisma',
        '@repo/tailwind-config',
        '@repo/typescript-config',
    ],
    images: {
        remotePatterns: [
            { hostname: 'www.google.com' },
            { hostname: 'zyqdiwxgffuy8ymd.public.blob.vercel-storage.com' },
        ],
    },
    
    typescript: {
        ignoreBuildErrors: true,
    },
    
    eslint: {
        ignoreDuringBuilds: true,
    },

    experimental: {
        externalDir: true,
    },
    webpack: (config, options) => {
        if (!options.isServer) {
            config.resolve.fallback = { fs: false, module: false, path: false };
        }
        // Experimental features
        config.experiments = {
            ...config.experiments,
            topLevelAwait: true,
            layers: true,
        };

        return config;
    },
    async redirects() {
        return [{ source: '/', destination: '/chat', permanent: true }];
    },
};

export default nextConfig;
