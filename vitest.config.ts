import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@domain': path.resolve(__dirname, 'src/domain'),
      '@adapters': path.resolve(__dirname, 'src/adapters'),
      '@application': path.resolve(__dirname, 'src/application'),
      '@interfaces': path.resolve(__dirname, 'src/interfaces'),
      '@shared': path.resolve(__dirname, 'src/shared'),
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
      include: [
        'src/domain/**/*.ts',
        'src/application/**/*.ts',
        'src/interfaces/**/*.ts',
        'src/adapters/**/*.ts',
      ],
      exclude: [
        'src/test/**',
        'src/adapters/cache/**',
        'src/adapters/crypto/argon-hasher.ts',
        'src/adapters/db/**',
        'src/adapters/external/**',
        'src/application/dtos/**',
        'src/domain/auth/entities.ts',
        'src/domain/auth/ports.ts',
        'src/domain/user/entities.ts',
        'src/domain/user/ports.ts',
        'src/domain/shared/unit-of-work.ts',
        'src/interfaces/http/auth/routes.ts',
        'src/interfaces/http/admin/routes.ts',
        'src/interfaces/http/middleware/rate-limit.middleware.ts',
        'src/main.ts',
        'src/container.ts',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        statements: 85,
        branches: 85,
      },
    },
  },
});
