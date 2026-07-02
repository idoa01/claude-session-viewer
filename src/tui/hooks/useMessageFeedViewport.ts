import { useMemo, useState } from 'react'
import type { Message } from '../../core/types/session'
import { buildFeedItems, feedItemKey, type FeedItem } from '../viewport/feedItems'
import { LineCountCache } from '../viewport/lineCountCache'
import {
  clampCursorIndex,
  clampScrollTop,
  computeVisibleSlice,
  ensureCursorVisible,
  itemIndexAtLine,
  totalLines,
} from '../viewport/scroll'

export interface RenderedFeedItem extends FeedItem {
  text: string
  lineCount: number
}

export interface MessageFeedViewport {
  items: FeedItem[]
  visible: Array<{ item: RenderedFeedItem; index: number; from: number; to: number }>
  cursorIndex: number
  scrollTop: number
  totalLineCount: number
  cacheSize: number
  isExpanded: (item: FeedItem) => boolean
  moveCursor: (delta: number) => void
  pageBy: (deltaLines: number) => void
  jumpToTop: () => void
  jumpToBottom: () => void
  toggleExpandCursor: () => void
}

// Owns scroll offset, cursor position, and the block-expansion set for a
// Message Feed. `width` and `viewportHeight` should reflect the feed pane's
// actual rendered size (not the full terminal), so a sidebar collapse/resize
// changes windowing correctly.
export function useMessageFeedViewport(
  messages: Message[],
  width: number,
  viewportHeight: number
): MessageFeedViewport {
  const [cache] = useState(() => new LineCountCache())
  const [position, setPosition] = useState({ scrollTop: 0, cursorIndex: 0 })
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(new Set())

  const items = useMemo(() => buildFeedItems(messages), [messages])

  const isExpanded = (item: FeedItem) => expandedKeys.has(feedItemKey(item))

  const rendered: RenderedFeedItem[] = items.map(item => {
    const { text, lineCount } = cache.get(item, width, isExpanded(item))
    return { ...item, text, lineCount }
  })
  const lineCounts = rendered.map(r => r.lineCount)

  const clampedCursor = clampCursorIndex(position.cursorIndex, items.length)
  const clampedScrollTop = clampScrollTop(position.scrollTop, lineCounts, viewportHeight)

  // All updates read the previous position from React's functional-updater
  // argument rather than the values closed over above, so a burst of
  // synchronous keystrokes (batched into one React update) each advance
  // from the last queued state instead of all computing from the same stale snapshot.
  function moveCursor(delta: number) {
    setPosition(prev => {
      const nextCursor = clampCursorIndex(prev.cursorIndex + delta, items.length)
      const nextScrollTop = ensureCursorVisible(lineCounts, nextCursor, prev.scrollTop, viewportHeight)
      return { cursorIndex: nextCursor, scrollTop: nextScrollTop }
    })
  }

  function pageBy(deltaLines: number) {
    setPosition(prev => {
      const nextScrollTop = clampScrollTop(prev.scrollTop + deltaLines, lineCounts, viewportHeight)
      const nextCursor = clampCursorIndex(itemIndexAtLine(lineCounts, nextScrollTop), items.length)
      return { cursorIndex: nextCursor, scrollTop: nextScrollTop }
    })
  }

  function jumpToTop() {
    setPosition({ cursorIndex: 0, scrollTop: 0 })
  }

  function jumpToBottom() {
    setPosition({
      cursorIndex: clampCursorIndex(items.length - 1, items.length),
      scrollTop: clampScrollTop(totalLines(lineCounts), lineCounts, viewportHeight),
    })
  }

  function toggleExpandCursor() {
    const current = rendered[clampedCursor]
    if (!current) return
    const key = feedItemKey(current)
    setExpandedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const slice = computeVisibleSlice(lineCounts, clampedScrollTop, viewportHeight)
  const visible = slice.items.map(({ index, from, to }) => ({ item: rendered[index]!, index, from, to }))

  return {
    items,
    visible,
    cursorIndex: clampedCursor,
    scrollTop: clampedScrollTop,
    totalLineCount: totalLines(lineCounts),
    cacheSize: cache.size,
    isExpanded,
    moveCursor,
    pageBy,
    jumpToTop,
    jumpToBottom,
    toggleExpandCursor,
  }
}
