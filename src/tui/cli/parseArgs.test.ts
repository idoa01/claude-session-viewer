import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseDirectModeArg, resolveDirectModePath } from './parseArgs'

describe('parseDirectModeArg', () => {
  it('returns undefined when no args are given', () => {
    expect(parseDirectModeArg([])).toBeUndefined()
  })

  it('returns the first positional argument', () => {
    expect(parseDirectModeArg(['./session.jsonl'])).toBe('./session.jsonl')
  })

  it('parses --file=<path>', () => {
    expect(parseDirectModeArg(['--file=./session.jsonl'])).toBe('./session.jsonl')
  })

  it('prefers --file= over a positional argument', () => {
    expect(parseDirectModeArg(['ignored.jsonl', '--file=./session.jsonl'])).toBe('./session.jsonl')
  })

  it('ignores other flags when looking for a positional argument', () => {
    expect(parseDirectModeArg(['--verbose', './session.jsonl'])).toBe('./session.jsonl')
  })
})

describe('resolveDirectModePath', () => {
  const dirsToClean: string[] = []
  afterEach(async () => {
    await Promise.all(dirsToClean.splice(0).map(d => rm(d, { recursive: true, force: true })))
  })

  it('resolves an existing file to an absolute path', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'sesh-cli-'))
    dirsToClean.push(dir)
    const filePath = join(dir, 'session.jsonl')
    await writeFile(filePath, '')

    const result = resolveDirectModePath('session.jsonl', dir)
    expect(result).toEqual({ ok: true, path: filePath })
  })

  it('reports a clear error for a nonexistent path', () => {
    const result = resolveDirectModePath('does-not-exist.jsonl', tmpdir())
    expect(result.ok).toBe(false)
    expect(result.ok || result.message).toContain('does-not-exist.jsonl')
  })

  it('reports a clear error when the path is a directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'sesh-cli-'))
    dirsToClean.push(dir)

    const result = resolveDirectModePath(dir, tmpdir())
    expect(result.ok).toBe(false)
  })
})
