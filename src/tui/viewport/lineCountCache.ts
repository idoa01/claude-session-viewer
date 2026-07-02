import { renderBlockText, countLines } from './renderBlockLines'
import { feedItemKey, type FeedItem } from './feedItems'

export interface CachedRender {
  text: string
  lineCount: number
}

// Caches each block's rendered text/line-count keyed by (terminal width, block
// content, expansion state), so scrolling never re-renders blocks that haven't
// changed. Resizing the terminal invalidates everything at once, since every
// entry's rendering depends on width.
export class LineCountCache {
  private width = -1
  private entries = new Map<string, CachedRender>()

  get(item: FeedItem, width: number, expanded: boolean): CachedRender {
    if (width !== this.width) {
      this.width = width
      this.entries.clear()
    }

    const key = `${feedItemKey(item)}:${expanded ? 1 : 0}`
    const cached = this.entries.get(key)
    if (cached) return cached

    const text = renderBlockText(item, width, expanded)
    const rendered: CachedRender = { text, lineCount: countLines(text) }
    this.entries.set(key, rendered)
    return rendered
  }

  get size(): number {
    return this.entries.size
  }
}
