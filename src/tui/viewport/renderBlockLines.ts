import wrapAnsi from 'wrap-ansi'
import chalk from 'chalk'
import type { Block, Message } from '../../core/types/session'
import type { FeedItem } from './feedItems'
import { toolIcon, renderInputSummary, renderToolBlockBody, renderMarkdown } from '../blocks/toolBlocks'

function renderTextBlock(text: string, width: number): string {
  return renderMarkdown(text, width)
}

function renderToolInteractionBlock(
  block: Block & { type: 'tool_interaction' },
  expanded: boolean,
  width: number,
  activeTab: number
): string {
  const icon = toolIcon(block.name)
  const summary = renderInputSummary(block.name, block.input)
  const header = summary ? `${icon} ${chalk.bold(block.name)} ${chalk.dim(summary)}` : `${icon} ${chalk.bold(block.name)}`
  const body = renderToolBlockBody(block, expanded, { width, activeTab })
  return wrapAnsi([header, body].join('\n'), width, { hard: true })
}

function formatHeader(message: Message, width: number): string {
  const role = message.role === 'user' ? 'User' : 'Claude'
  const time = message.timestamp ? new Date(message.timestamp).toISOString().slice(11, 19) : ''
  return wrapAnsi(`── ${role} · ${time} ──`, width, { hard: true })
}

// Renders a single feed item (a block, plus its message header if it's the
// first block of a message) to the plain terminal text it would occupy, given
// the current terminal width, whether it's expanded, and (for AskUserQuestion
// blocks) which question tab is active. Used both to display the item and to
// count how many lines it occupies for viewport windowing.
export function renderBlockText(item: FeedItem, width: number, expanded: boolean, activeTab = 0): string {
  const body = item.block.type === 'text'
    ? renderTextBlock(item.block.text, width)
    : renderToolInteractionBlock(item.block, expanded, width, activeTab)
  return item.isFirstBlockOfMessage ? `${formatHeader(item.message, width)}\n${body}` : body
}

export function countLines(text: string): number {
  if (text.length === 0) return 0
  return text.split('\n').length
}
