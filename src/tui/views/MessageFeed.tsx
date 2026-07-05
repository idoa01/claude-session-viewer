import { Box, Text, useInput } from 'ink'
import type { Message } from '../../core/types/session'
import { useMessageFeedViewport } from '../hooks/useMessageFeedViewport'
import { useMouseInput } from '../hooks/useMouseInput'
import { sliceTextLines } from '../viewport/scroll'
import { feedItemKey } from '../viewport/feedItems'

interface ScreenOffset {
  x: number
  y: number
}

interface Props {
  messages: Message[]
  width: number
  height: number
  onExit: () => void
  isActive: boolean
  screenOffset?: ScreenOffset
}

const PAGE_LINES = 10
const WHEEL_LINES = 3

export function MessageFeed({ messages, width, height, onExit, isActive, screenOffset = { x: 0, y: 0 } }: Props) {
  const viewport = useMessageFeedViewport(messages, width, height)

  useInput((input, key) => {
    if (!isActive) return
    if (input === 'q' || key.escape) {
      onExit()
      return
    }
    // Alt/Meta-j / Alt/Meta-Down and Alt/Meta-k / Alt/Meta-Up jump between sections (blocks).
    if ((key.meta && input === 'j') || (key.meta && key.downArrow)) {
      viewport.moveCursor(1)
      return
    }
    if ((key.meta && input === 'k') || (key.meta && key.upArrow)) {
      viewport.moveCursor(-1)
      return
    }
    // Plain j/k and arrows scroll one rendered line at a time.
    if (input === 'j' || key.downArrow) {
      viewport.scrollBy(1)
      return
    }
    if (input === 'k' || key.upArrow) {
      viewport.scrollBy(-1)
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
    if (key.tab) {
      viewport.cycleTabCursor()
      return
    }
  }, { isActive })

  useMouseInput(event => {
    if (!isActive) return
    if (event.type === 'wheel-up') {
      viewport.scrollBy(-WHEEL_LINES)
      return
    }
    if (event.type === 'wheel-down') {
      viewport.scrollBy(WHEEL_LINES)
      return
    }
    if (event.type !== 'left-press') return

    const relativeX = event.x - screenOffset.x
    const relativeY = event.y - screenOffset.y
    if (relativeX < 0 || relativeX >= width || relativeY < 0 || relativeY >= height) return

    let row = 0
    for (const { index, from, to } of viewport.visible) {
      const lineCount = to - from
      if (relativeY >= row && relativeY < row + lineCount) {
        viewport.toggleExpandAt(index)
        return
      }
      row += lineCount
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
      {viewport.visible.map(({ item, from, to }) => {
        const lines = sliceTextLines(item.text, from, to)
        return (
          <Text key={`${feedItemKey(item)}:${from}`}>
            {lines}
          </Text>
        )
      })}
    </Box>
  )
}
