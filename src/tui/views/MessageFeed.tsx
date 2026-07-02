import { Box, Text, useInput } from 'ink'
import type { Message } from '../../core/types/session'
import { useMessageFeedViewport } from '../hooks/useMessageFeedViewport'
import { sliceTextLines } from '../viewport/scroll'
import { feedItemKey } from '../viewport/feedItems'

interface Props {
  messages: Message[]
  width: number
  height: number
  onExit: () => void
  isActive: boolean
}

const PAGE_LINES = 10

export function MessageFeed({ messages, width, height, onExit, isActive }: Props) {
  const viewport = useMessageFeedViewport(messages, width, height)

  useInput((input, key) => {
    if (!isActive) return
    if (input === 'q' || key.escape) {
      onExit()
      return
    }
    if (input === 'j' || key.downArrow) {
      viewport.moveCursor(1)
      return
    }
    if (input === 'k' || key.upArrow) {
      viewport.moveCursor(-1)
      return
    }
    if ((key.ctrl && input === 'f') || key.pageDown) {
      viewport.pageBy(PAGE_LINES)
      return
    }
    if ((key.ctrl && input === 'b') || key.pageUp) {
      viewport.pageBy(-PAGE_LINES)
      return
    }
    if (input === 'g') {
      viewport.jumpToTop()
      return
    }
    if (input === 'G') {
      viewport.jumpToBottom()
      return
    }
    if (key.return || input === ' ') {
      viewport.toggleExpandCursor()
      return
    }
  }, { isActive })

  if (messages.length === 0) {
    return (
      <Box width={width} height={height}>
        <Text dimColor>No messages in this session.</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" width={width} height={height}>
      {viewport.visible.map(({ item, index, from, to }) => {
        const lines = sliceTextLines(item.text, from, to)
        const isCursor = index === viewport.cursorIndex
        return (
          <Text key={`${feedItemKey(item)}:${from}`} inverse={isCursor}>
            {lines}
          </Text>
        )
      })}
    </Box>
  )
}
