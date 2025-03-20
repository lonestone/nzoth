import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./src/vitest.setup.ts'],
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/index.ts',
        'src/**/*.d.ts',
      ],
    },
  },
})
