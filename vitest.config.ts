import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'src/tests/**',
        '**/*.d.ts',
        'src/findReplaceViewSimple.ts', // Test/demo file
        'tests/**', // HTML test generator
        'esbuild.config.mjs',
        'version-bump.mjs',
        'release.mjs'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './src/tests'),
      'obsidian': path.resolve(__dirname, './src/tests/__mocks__/obsidian.ts')
    }
  },
  define: {
    global: 'globalThis'
  },
  esbuild: {
    target: 'node14'
  }
});