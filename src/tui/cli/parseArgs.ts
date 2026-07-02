import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

// Supports `sesh <path>` (first non-flag argument) and `sesh --file=<path>`,
// mirroring the Web Viewer's existing `--file=` CLI mode (ADR 0001).
export function parseDirectModeArg(argv: string[]): string | undefined {
  const fileFlag = argv.find(a => a.startsWith('--file='))
  if (fileFlag) return fileFlag.slice('--file='.length)
  return argv.find(a => !a.startsWith('-'))
}

export type DirectModeResolution =
  | { ok: true; path: string }
  | { ok: false; message: string }

export function resolveDirectModePath(rawPath: string, cwd: string): DirectModeResolution {
  const resolved = resolve(cwd, rawPath)
  if (!existsSync(resolved)) {
    return { ok: false, message: `sesh: no such file: ${rawPath}` }
  }
  if (!statSync(resolved).isFile()) {
    return { ok: false, message: `sesh: not a file: ${rawPath}` }
  }
  return { ok: true, path: resolved }
}
