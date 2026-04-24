import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { TanStackRouterRspack } from '@tanstack/router-plugin/rspack';

export default defineConfig({
    plugins: [pluginReact()],
    tools: {
        rspack: {
            plugins: [
                TanStackRouterRspack({
                    routesDirectory: './src/routes',
                    generatedRouteTree: './src/routeTree.gen.ts',
                    autoCodeSplitting: false,
                }),
            ],
        },
    },
    resolve: {
        alias: {
            '@': './src',
        },
    },
    output: {
        assetPrefix: './',
        distPath: {
            root: 'dist',
        },
    },
    server: {
        historyApiFallback: true,
        proxy: {
            '/api/v1': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
            },
            '/v1': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
            },
        },
    },
    html: {
        title: 'AI Agent Platform',
        favicon: './public/favicon.svg',
    },
});
