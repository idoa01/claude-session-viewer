import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/tui/index.tsx'],
  outDir: 'dist-tui',
  format: 'esm',
  platform: 'node',
  esbuildOptions(options) {
    options.jsx = 'automatic'
  },
})
