import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Served by the HomeQuote site at /studio: the build lands in the site's public/studio/
// (see "build:studio" in the root package.json). Paths are absolute under /studio/ so the
// page works at /studio with or without a trailing slash.
export default defineConfig({
    base: '/studio/',
    build: {
        outDir: '../public/studio',
        emptyOutDir: true,
    },
    // Inline (empty) PostCSS config: stops Vite from picking up the website's postcss.config.mjs one folder up.
    css: { postcss: {} },
    plugins: [
        tailwindcss(),
    ],
    server: {
        proxy: {
            '/api': {
                target: 'https://api.kie.ai',
                changeOrigin: true,
                secure: false
            }
        }
    }
});
