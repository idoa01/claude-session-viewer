import { describe, it, expect, vi } from 'vitest'
import { LineCountCache } from './lineCountCache'
import * as renderModule from './renderBlockLines'
import type { FeedItem } from './feedItems'
import type { Message, TextBlock } from '../../core/types/session'

function makeItem(text: string, blockIndex = 0): FeedItem {
  const message: Message = {
    uuid: 'u1',
    parentUuid: null,
    role: 'assistant',
    timestamp: '2026-01-01T00:00:00.000Z',
    cwd: '/tmp',
    blocks: [],
  }
  const block: TextBlock = { type: 'text', text }
  return { message, block, blockIndex, isFirstBlockOfMessage: blockIndex === 0 }
}

describe('LineCountCache', () => {
  it('renders a block once and reuses the cached result on repeated gets', () => {
    const spy = vi.spyOn(renderModule, 'renderBlockText')
    const cache = new LineCountCache()
    const item = makeItem('hello')

    cache.get(item, 80, false)
    cache.get(item, 80, false)
    cache.get(item, 80, false)

    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it('re-renders when the expansion state differs', () => {
    const spy = vi.spyOn(renderModule, 'renderBlockText')
    const cache = new LineCountCache()
    const item = makeItem('hello')

    cache.get(item, 80, false)
    cache.get(item, 80, true)

    expect(spy).toHaveBeenCalledTimes(2)
    spy.mockRestore()
  })

  it('invalidates every entry when the width changes', () => {
    const spy = vi.spyOn(renderModule, 'renderBlockText')
    const cache = new LineCountCache()
    const itemA = makeItem('a')
    const itemB = makeItem('b', 1)

    cache.get(itemA, 80, false)
    cache.get(itemB, 80, false)
    expect(cache.size).toBe(2)

    cache.get(itemA, 100, false)
    expect(spy).toHaveBeenCalledTimes(3)
    expect(cache.size).toBe(1)
    spy.mockRestore()
  })

  it('does not re-render for different items sharing the same width and state', () => {
    const spy = vi.spyOn(renderModule, 'renderBlockText')
    const cache = new LineCountCache()
    const itemA = makeItem('a')
    const itemB = makeItem('b', 1)

    cache.get(itemA, 80, false)
    cache.get(itemB, 80, false)
    cache.get(itemA, 80, false)
    cache.get(itemB, 80, false)

    expect(spy).toHaveBeenCalledTimes(2)
    spy.mockRestore()
  })
})
