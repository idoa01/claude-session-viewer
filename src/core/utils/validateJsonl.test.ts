import { describe, it, expect } from 'vitest'
import { validateJsonl } from './validateJsonl'

function line(obj: unknown): string {
  return JSON.stringify(obj)
}

describe('validateJsonl', () => {
  it('returns no failures for well-formed content', () => {
    const raw = [
      line({ type: 'ai-title', aiTitle: 'Fix the login bug' }),
      line({ type: 'user', uuid: 'u1', sessionId: 'sess-1' }),
    ].join('\n')

    expect(validateJsonl(raw)).toEqual([])
  })

  it('ignores blank lines', () => {
    const raw = [line({ type: 'user', uuid: 'u1' }), '', ''].join('\n')
    expect(validateJsonl(raw)).toEqual([])
  })

  it('reports the 1-indexed line number of malformed content deeper in the file', () => {
    const raw = [
      line({ type: 'ai-title', aiTitle: 'Fix the login bug' }),
      line({ type: 'user', uuid: 'u1', sessionId: 'sess-1' }),
      'not valid json {{{',
      line({ type: 'user', uuid: 'u2', sessionId: 'sess-1' }),
    ].join('\n')

    const failures = validateJsonl(raw)
    expect(failures).toHaveLength(1)
    expect(failures[0].line).toBe(3)
  })

  it('stops after maxFailures parse failures', () => {
    const raw = ['bad1', 'bad2', 'bad3', 'bad4'].join('\n')
    expect(validateJsonl(raw, 2)).toHaveLength(2)
  })

  it('returns no failures for empty input', () => {
    expect(validateJsonl('')).toEqual([])
  })
})
