import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

// tsup bundles this module into a single dist-tui/index.js, which flattens
// the source tree — a fixed relative offset from this file wouldn't survive
// bundling. Instead, walk up from wherever this code is actually running to
// find the repo root (marked by package.json), then join with dist/.
export function resolveDistDir(): string {
  let dir = dirname(fileURLToPath(import.meta.url))
  while (true) {
    if (existsSync(join(dir, 'package.json'))) return join(dir, 'dist')
    const parent = dirname(dir)
    if (parent === dir) throw new Error('Could not locate repo root (no package.json found)')
    dir = parent
  }
}
