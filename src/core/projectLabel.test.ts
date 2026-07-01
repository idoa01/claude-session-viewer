import { describe, it, expect } from 'vitest'
import { deriveProjectLabel } from './projectLabel'

describe('deriveProjectLabel', () => {
  it('prefers cwd, taking the last two path segments', () => {
    expect(deriveProjectLabel('Users-x-code-my-cool-project', '/Users/x/code/my-cool-project')).toBe('code/my-cool-project')
  })

  it('resolves the hyphen-ambiguity case correctly when cwd is available', () => {
    // Both of these encode to the same directory name, but cwd disambiguates them.
    const dirName = 'Users-x-code-my-cool-project'
    expect(deriveProjectLabel(dirName, '/Users/x/code/my-cool-project')).toBe('code/my-cool-project')
    expect(deriveProjectLabel(dirName, '/Users/x/code/my/cool-project')).toBe('my/cool-project')
  })

  it('falls back to splitting the encoded directory name when no cwd is found', () => {
    expect(deriveProjectLabel('Users-x-code-my-cool-project')).toBe('cool/project')
  })

  it('falls back when cwd is an empty string', () => {
    expect(deriveProjectLabel('Users-x-code-my-cool-project', '')).toBe('cool/project')
  })
})
