import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      thresholds: {
        lines: 70,
      },
    },
    projects: [
      {
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './src'),
          },
        },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts', 'tests/api/**/*.test.ts', 'tests/db/**/*.test.ts'],
          setupFiles: ['tests/setup/clock.ts', 'tests/setup/adapters.ts'],
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './src'),
          },
        },
        test: {
          name: 'dom',
          environment: 'happy-dom',
          include: ['tests/dom/**/*.test.tsx'],
          setupFiles: ['tests/setup/adapters.ts', 'tests/setup/jest-dom.ts'],
        },
      },
    ],
  },
})
