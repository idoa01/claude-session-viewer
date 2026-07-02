import { describe, it, expect } from 'vitest'
import { sanitizeForTerminal } from './sanitize'

describe('sanitizeForTerminal', () => {
  it('strips CSI sequences (colors, cursor movement)', () => {
    expect(sanitizeForTerminal('\x1b[31mred\x1b[0m')).toBe('red')
  })

  it('strips OSC sequences (e.g. terminal title injection)', () => {
    expect(sanitizeForTerminal('before\x1b]0;evil-title\x07after')).toBe('beforeafter')
  })

  it('strips bare control characters not preceded by ESC', () => {
    expect(sanitizeForTerminal('a\x07b\x08c\x00d')).toBe('abcd')
  })

  it('strips a CSI sequence including its terminating byte', () => {
    expect(sanitizeForTerminal('leading\x1b[999stray')).toBe('leadingtray')
  })

  it('leaves ordinary text, newlines, and tabs untouched', () => {
    expect(sanitizeForTerminal('line one\nline\ttwo')).toBe('line one\nline\ttwo')
  })
})
