import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const rootDir = resolve(import.meta.dirname)

export default defineConfig({
  resolve: {
    alias: {
      '#shared': resolve(rootDir, 'shared'),
    },
  },
})
