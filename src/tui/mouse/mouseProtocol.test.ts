import { describe, expect, it } from 'vitest'
import { ENTER_MOUSE_MODE, EXIT_MOUSE_MODE, parseMouseEvent } from './mouseProtocol'

describe('mouseProtocol', () => {
  it('exports terminal mode sequences for alt-screen SGR mouse tracking', () => {
    expect(ENTER_MOUSE_MODE).toContain('\x1b[?1049h')
    expect(ENTER_MOUSE_MODE).toContain('\x1b[?1000h')
    expect(ENTER_MOUSE_MODE).toContain('\x1b[?1006h')
    expect(EXIT_MOUSE_MODE).toContain('\x1b[?1006l')
    expect(EXIT_MOUSE_MODE).toContain('\x1b[?1000l')
    expect(EXIT_MOUSE_MODE).toContain('\x1b[?1049l')
  })

  it('parses wheel-up events with zero-based coordinates', () => {
    expect(parseMouseEvent('[<64;12;5M')).toEqual({ type: 'wheel-up', x: 11, y: 4 })
  })

  it('parses wheel-down events with zero-based coordinates', () => {
    expect(parseMouseEvent('[<65;1;24M')).toEqual({ type: 'wheel-down', x: 0, y: 23 })
  })

  it('parses left press and release events', () => {
    expect(parseMouseEvent('[<0;7;9M')).toEqual({ type: 'left-press', x: 6, y: 8 })
    expect(parseMouseEvent('[<0;7;9m')).toEqual({ type: 'left-release', x: 6, y: 8 })
  })

  it('accepts a leading escape byte for direct parser tests', () => {
    expect(parseMouseEvent('\x1b[<64;3;4M')).toEqual({ type: 'wheel-up', x: 2, y: 3 })
  })

  it('returns other for recognized but unsupported mouse buttons', () => {
    expect(parseMouseEvent('[<1;3;4M')).toEqual({ type: 'other', x: 2, y: 3 })
  })

  it('returns null for non-mouse or malformed input', () => {
    expect(parseMouseEvent('j')).toBeNull()
    expect(parseMouseEvent('[A')).toBeNull()
    expect(parseMouseEvent('[<64;0;5M')).toBeNull()
    expect(parseMouseEvent('[<64;12M')).toBeNull()
  })
})
