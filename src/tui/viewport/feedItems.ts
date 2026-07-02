import type { Block, Message } from '../../core/types/session'

// One scroll/cursor stop in the Message Feed: a single block, tagged with the
// message it belongs to so the header can be rendered above the message's first block.
export interface FeedItem {
  message: Message
  block: Block
  blockIndex: number
  isFirstBlockOfMessage: boolean
}

export function buildFeedItems(messages: Message[]): FeedItem[] {
  const items: FeedItem[] = []
  for (const message of messages) {
    message.blocks.forEach((block, blockIndex) => {
      items.push({ message, block, blockIndex, isFirstBlockOfMessage: blockIndex === 0 })
    })
  }
  return items
}

export function feedItemKey(item: FeedItem): string {
  return `${item.message.uuid}:${item.blockIndex}`
}
