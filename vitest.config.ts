import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['src/test/setup.ts'],
    env: {
      VITE_HA_URL: 'http://localhost:8123',
      VITE_HA_TOKEN: 'test-token',
    },
  },
})
