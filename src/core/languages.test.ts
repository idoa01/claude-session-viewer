import { describe, it, expect } from 'vitest'
import { langFromPath } from './languages'

describe('langFromPath', () => {
  it.each([
    ['foo.ts', 'typescript'],
    ['foo.tsx', 'typescript'],
    ['foo.js', 'javascript'],
    ['foo.jsx', 'javascript'],
    ['foo.mjs', 'javascript'],
    ['foo.cjs', 'javascript'],
    ['foo.py', 'python'],
    ['foo.sh', 'bash'],
    ['foo.bash', 'bash'],
    ['foo.json', 'json'],
    ['foo.yaml', 'yaml'],
    ['foo.yml', 'yaml'],
    ['foo.md', 'markdown'],
    ['foo.markdown', 'markdown'],
  ])('maps %s to %s', (path, expected) => {
    expect(langFromPath(path)).toBe(expected)
  })

  it('is case-insensitive on the extension', () => {
    expect(langFromPath('foo.TS')).toBe('typescript')
  })

  it('resolves a nested path by its final extension', () => {
    expect(langFromPath('/a/b/c/foo.py')).toBe('python')
  })

  it('falls back to text for an unknown extension', () => {
    expect(langFromPath('foo.xyz')).toBe('text')
  })

  it('falls back to text when there is no extension', () => {
    expect(langFromPath('Makefile')).toBe('text')
  })
})
