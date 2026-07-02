import { Marked } from 'marked'
import { markedTerminal } from 'marked-terminal'
import wrapAnsi from 'wrap-ansi'
import type { Block, Message } from '../../core/types/session'
import type { FeedItem } from './feedItems'

// One marked instance per rendering width, since marked-terminal wraps prose to `width`.
const markedByWidth = new Map<number, Marked>()

function getMarked(width: number): Marked {
  let instance = markedByWidth.get(width)
  if (!instance) {
    instance = new Marked()
    instance.use(markedTerminal({ width, reflowText: true }) as Parameters<Marked['use']>[0])
    markedByWidth.set(width, instance)
  }
  return instance
}

function renderTextBlock(text: string, width: number): string {
  const rendered = getMarked(width).parse(text, { async: false })
  return rendered.replace(/\n+$/, '')
}

function renderToolInteractionBlock(block: Block & { type: 'tool_interaction' }, expanded: boolean, width: number): string {
  const header = `⚙ ${block.name}`
  const inputPreview = JSON.stringify(block.input)
  const lines = [header, inputPreview]
  if (block.result) {
    const content = block.result.truncated && !expanded
      ? block.result.content.slice(0, 600) + ' …'
      : block.result.content
    lines.push(content)
  }
  return wrapAnsi(lines.join('\n'), width, { hard: true })
}

function formatHeader(message: Message, width: number): string {
  const role = message.role === 'user' ? 'User' : 'Claude'
  const time = message.timestamp ? new Date(message.timestamp).toISOString().slice(11, 19) : ''
  return wrapAnsi(`── ${role} · ${time} ──`, width, { hard: true })
}

// Renders a single feed item (a block, plus its message header if it's the
// first block of a message) to the plain terminal text it would occupy, given
// the current terminal width and whether it's expanded. Used both to display
// the item and to count how many lines it occupies for viewport windowing.
export function renderBlockText(item: FeedItem, width: number, expanded: boolean): string {
  const body = item.block.type === 'text'
    ? renderTextBlock(item.block.text, width)
    : renderToolInteractionBlock(item.block, expanded, width)
  return item.isFirstBlockOfMessage ? `${formatHeader(item.message, width)}\n${body}` : body
}

export function countLines(text: string): number {
  if (text.length === 0) return 0
  return text.split('\n').length
}
