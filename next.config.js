/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
        // Fix for pdfjs-dist in Next.js
        config.resolve.alias.canvas = false;

        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
            };
        }

        // Fix source map issue with pdfjs-dist
        // Override devtool to prevent the Object.defineProperty error
        Object.defineProperty(config, 'devtool', {
            get() {
                return 'source-map';
            },
            set() { },
        });

        return config;
    },
    // Transpile react-pdf for compatibility
    transpilePackages: ['react-pdf'],
};

module.exports = nextConfig;
