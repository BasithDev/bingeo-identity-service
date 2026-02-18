import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@domain': path.resolve(__dirname, 'src/domain'),
      '@adapters': path.resolve(__dirname, 'src/adapters'),
      '@usecases': path.resolve(__dirname, 'src/usecases'),
      '@http': path.resolve(__dirname, 'src/http'),
      '@config': path.resolve(__dirname, 'src/config'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/test/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/domain/**/*.ts', 'src/usecases/**/*.ts', 'src/http/**/*.ts'],
      exclude: ['src/test/**'],
      thresholds: {
        branches: 85,
        functions: 85,
        lines: 85,
        statements: 85,
      },
    },
  },
});
