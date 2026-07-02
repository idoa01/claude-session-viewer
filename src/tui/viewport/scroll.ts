// Pure scroll-offset math for the Message Feed's manual viewport windowing.
// All offsets are measured in rendered terminal lines; `cursorIndex` refers to
// a block index in the flattened feed-item list (see feedItems.ts).

export function cumulativeStarts(lineCounts: number[]): number[] {
  const starts: number[] = []
  let offset = 0
  for (const count of lineCounts) {
    starts.push(offset)
    offset += count
  }
  return starts
}

export function totalLines(lineCounts: number[]): number {
  return lineCounts.reduce((sum, count) => sum + count, 0)
}

export function clampScrollTop(scrollTop: number, lineCounts: number[], viewportHeight: number): number {
  const total = totalLines(lineCounts)
  const maxScrollTop = Math.max(0, total - viewportHeight)
  return Math.max(0, Math.min(scrollTop, maxScrollTop))
}

export function clampCursorIndex(cursorIndex: number, itemCount: number): number {
  if (itemCount === 0) return 0
  return Math.max(0, Math.min(cursorIndex, itemCount - 1))
}

// Scrolls minimally so the block at cursorIndex is visible. If the block is
// taller than the viewport, aligns the viewport to the block's top.
export function ensureCursorVisible(
  lineCounts: number[],
  cursorIndex: number,
  scrollTop: number,
  viewportHeight: number
): number {
  if (lineCounts.length === 0) return 0
  const starts = cumulativeStarts(lineCounts)
  const index = clampCursorIndex(cursorIndex, lineCounts.length)
  const blockStart = starts[index]!
  const blockEnd = blockStart + lineCounts[index]!

  let next = scrollTop
  if (blockStart < next) {
    next = blockStart
  } else if (blockEnd - next > viewportHeight) {
    next = blockStart
  }
  return clampScrollTop(next, lineCounts, viewportHeight)
}

// Finds the item index whose rendered span contains the given line offset.
export function itemIndexAtLine(lineCounts: number[], line: number): number {
  if (lineCounts.length === 0) return 0
  const starts = cumulativeStarts(lineCounts)
  let result = 0
  for (let i = 0; i < starts.length; i++) {
    if (starts[i]! <= line) result = i
    else break
  }
  return result
}

export interface VisibleSlice {
  startLine: number
  endLine: number
  // For each visible item: its index, and the [from, to) line range within
  // that item's own rendered lines that falls inside the viewport.
  items: Array<{ index: number; from: number; to: number }>
}

export function sliceTextLines(text: string, from: number, to: number): string {
  return text.split('\n').slice(from, to).join('\n')
}

export function computeVisibleSlice(lineCounts: number[], scrollTop: number, viewportHeight: number): VisibleSlice {
  const total = totalLines(lineCounts)
  const startLine = clampScrollTop(scrollTop, lineCounts, viewportHeight)
  const endLine = Math.min(total, startLine + viewportHeight)
  const starts = cumulativeStarts(lineCounts)

  const items: VisibleSlice['items'] = []
  for (let i = 0; i < lineCounts.length; i++) {
    const blockStart = starts[i]!
    const blockEnd = blockStart + lineCounts[i]!
    if (blockEnd <= startLine || blockStart >= endLine) continue
    const from = Math.max(0, startLine - blockStart)
    const to = Math.min(lineCounts[i]!, endLine - blockStart)
    items.push({ index: i, from, to })
  }

  return { startLine, endLine, items }
}
