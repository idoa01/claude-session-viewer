export const ENTER_MOUSE_MODE = '\x1b[?1049h\x1b[?1000h\x1b[?1006h'
export const EXIT_MOUSE_MODE = '\x1b[?1006l\x1b[?1000l\x1b[?1049l'
const ESC = '\x1b'

export type MouseEventType =
  | 'wheel-up'
  | 'wheel-down'
  | 'left-press'
  | 'left-release'
  | 'other'

export interface ParsedMouseEvent {
  type: MouseEventType
  x: number
  y: number
}

const SGR_MOUSE_RE = /^\[<(\d+);(\d+);(\d+)([Mm])$/

export function parseMouseEvent(input: string): ParsedMouseEvent | null {
  const normalized = input.startsWith(ESC) ? input.slice(1) : input
  const match = SGR_MOUSE_RE.exec(normalized)
  if (!match) return null

  const buttonCode = Number(match[1])
  const column = Number(match[2])
  const row = Number(match[3])
  const finalByte = match[4]

  if (!Number.isInteger(buttonCode) || !Number.isInteger(column) || !Number.isInteger(row)) {
    return null
  }
  if (column <= 0 || row <= 0) return null

  const x = column - 1
  const y = row - 1

  if (finalByte === 'M' && buttonCode === 64) return { type: 'wheel-up', x, y }
  if (finalByte === 'M' && buttonCode === 65) return { type: 'wheel-down', x, y }

  const baseButton = buttonCode & 3
  if (baseButton === 0) {
    return {
      type: finalByte === 'M' ? 'left-press' : 'left-release',
      x,
      y,
    }
  }

  return { type: 'other', x, y }
}
