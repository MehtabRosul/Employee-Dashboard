import '@angular/compiler';
import { defineConfig } from 'vitest/config';

import angular from '@analogjs/vite-plugin-angular';
import { join } from 'path';

export default defineConfig({
    plugins: [
        angular({
            jit: true,
        }),
    ],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: [join(process.cwd(), 'src/test-setup.ts')],
        include: ['src/**/*.{test,spec}.{js,ts}'],
        server: {
            deps: {
                inline: [/@angular/, /@analogjs/],
            },
        },
        pool: 'vmThreads',
    },
});
