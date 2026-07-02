import { describe, it, expect } from 'vitest'
import {
  clampScrollTop,
  clampCursorIndex,
  computeVisibleSlice,
  ensureCursorVisible,
  itemIndexAtLine,
  totalLines,
} from './scroll'

describe('totalLines', () => {
  it('sums line counts', () => {
    expect(totalLines([3, 1, 4])).toBe(8)
  })
  it('is zero for an empty list', () => {
    expect(totalLines([])).toBe(0)
  })
})

describe('clampScrollTop', () => {
  it('clamps to 0 when content fits entirely in the viewport', () => {
    expect(clampScrollTop(5, [2, 2], 10)).toBe(0)
  })
  it('clamps to the max scroll top when content overflows', () => {
    // total lines = 20, viewport = 10 -> max scrollTop = 10
    expect(clampScrollTop(50, Array(10).fill(2), 10)).toBe(10)
  })
  it('clamps negative offsets to 0', () => {
    expect(clampScrollTop(-5, [10, 10], 5)).toBe(0)
  })
  it('passes through valid offsets unchanged', () => {
    expect(clampScrollTop(4, Array(10).fill(2), 10)).toBe(4)
  })
})

describe('clampCursorIndex', () => {
  it('returns 0 for an empty list', () => {
    expect(clampCursorIndex(5, 0)).toBe(0)
  })
  it('clamps to the last index when too large', () => {
    expect(clampCursorIndex(99, 3)).toBe(2)
  })
  it('clamps negative index to 0', () => {
    expect(clampCursorIndex(-1, 3)).toBe(0)
  })
})

describe('itemIndexAtLine', () => {
  const lineCounts = [3, 1, 4] // starts: 0, 3, 4; ranges: [0,3) [3,4) [4,8)
  it('finds the item spanning a mid-item line', () => {
    expect(itemIndexAtLine(lineCounts, 5)).toBe(2)
  })
  it('finds the item exactly at a boundary start', () => {
    expect(itemIndexAtLine(lineCounts, 3)).toBe(1)
  })
  it('returns 0 for line 0', () => {
    expect(itemIndexAtLine(lineCounts, 0)).toBe(0)
  })
  it('returns 0 for an empty list', () => {
    expect(itemIndexAtLine([], 5)).toBe(0)
  })
})

describe('ensureCursorVisible', () => {
  const lineCounts = Array(20).fill(1) // 20 single-line items

  it('does not move the viewport when the cursor is already visible', () => {
    expect(ensureCursorVisible(lineCounts, 5, 2, 10)).toBe(2)
  })
  it('scrolls down so the cursor becomes visible when it is past the bottom', () => {
    // viewport [2, 12); cursor at 15 -> aligns to its own start (15), then
    // clamped to the max scroll top (20 total lines - 10 viewport = 10)
    expect(ensureCursorVisible(lineCounts, 15, 2, 10)).toBe(10)
  })
  it('scrolls up so the cursor becomes visible when it is above the top', () => {
    // viewport [10, 20); cursor at 3 -> scroll top becomes 3
    expect(ensureCursorVisible(lineCounts, 3, 10, 10)).toBe(3)
  })
  it('aligns to the block start when the block itself is taller than the viewport', () => {
    const tall = [1, 1, 20, 1]
    // cursor on the 20-line block (index 2), viewport height 10, currently scrolled to top
    expect(ensureCursorVisible(tall, 2, 0, 10)).toBe(2)
  })
})

describe('computeVisibleSlice', () => {
  it('slices exactly the items overlapping the viewport window', () => {
    const lineCounts = [3, 1, 4] // starts: 0, 3, 4
    const slice = computeVisibleSlice(lineCounts, 2, 4) // viewport [2, 6)
    expect(slice.startLine).toBe(2)
    expect(slice.endLine).toBe(6)
    expect(slice.items).toEqual([
      { index: 0, from: 2, to: 3 },
      { index: 1, from: 0, to: 1 },
      { index: 2, from: 0, to: 2 },
    ])
  })

  it('returns an empty item list when there is no content', () => {
    const slice = computeVisibleSlice([], 0, 10)
    expect(slice.items).toEqual([])
  })

  it('clamps the window when scrollTop would overflow the content', () => {
    const lineCounts = [5, 5]
    const slice = computeVisibleSlice(lineCounts, 100, 4)
    // total = 10, viewport = 4 -> clamped startLine = 6
    expect(slice.startLine).toBe(6)
    expect(slice.endLine).toBe(10)
  })
})
