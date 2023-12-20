/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        config.module.rules.push({
            test: /\.worker\.js$/,
            loader: 'worker-loader',
            options: {
                name: 'static/[hash].worker.js',
                publicPath: '/_next/'
            }
        })

        // Overcome Webpack referencing `window` in chunks
        config.output.globalObject = `(typeof self !== 'undefined' ? self : this)`

        return config
    },
    reactStrictMode: true,
    async headers() {
        return [
            {
                source: '/worker.js',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ]
    },
}

module.exports = nextConfig
