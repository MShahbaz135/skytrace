import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Only the pure modules are unit-tested here; browser behaviour is covered by the
// Playwright suite at the repository root.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@skytrace/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
})
