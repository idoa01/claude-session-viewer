import { describe, it, expect } from 'vitest'
import { render } from 'ink-testing-library'
import stripAnsi from 'strip-ansi'
import { MessageFeed } from './MessageFeed'
import type { Message } from '../../core/types/session'

function makeMessage(uuid: string, text: string): Message {
  return {
    uuid,
    parentUuid: null,
    role: uuid.startsWith('u') ? 'user' : 'assistant',
    timestamp: '2026-01-01T00:00:00.000Z',
    cwd: '/tmp',
    blocks: [{ type: 'text', text }],
  }
}

// Ten short messages, one line of body each -> exactly two header+body lines
// per message once rendered, giving predictable scroll math.
function makeMessages(count: number): Message[] {
  return Array.from({ length: count }, (_, i) => makeMessage(`m${i}`, `message ${i}`))
}

// Ink batches raw stdin bytes behind a short internal flush timer before
// dispatching to useInput, so tests must yield back to the event loop after
// each keystroke rather than asserting synchronously.
function sleep(ms = 20): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function pressKeys(stdin: { write: (data: string) => void }, keys: string[]): Promise<void> {
  for (const key of keys) {
    stdin.write(key)
    await sleep()
  }
}

describe('MessageFeed', () => {
  it('renders messages within the viewport height, windowed', () => {
    const messages = makeMessages(20)
    const { lastFrame } = render(
      <MessageFeed messages={messages} width={40} height={6} onExit={() => {}} isActive={false} />
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('message 0')
    expect(frame).not.toContain('message 19')
  })

  it('scrolls down on j and brings later messages into view', async () => {
    const messages = makeMessages(20)
    const { stdin, lastFrame } = render(
      <MessageFeed messages={messages} width={40} height={6} onExit={() => {}} isActive />
    )
    await pressKeys(stdin, Array(30).fill('j'))
    const frame = lastFrame() ?? ''
    expect(frame).not.toContain('message 0')
  })

  it('scrolls down with the mouse wheel', async () => {
    const messages = makeMessages(20)
    const { stdin, lastFrame } = render(
      <MessageFeed messages={messages} width={40} height={6} onExit={() => {}} isActive />
    )
    await pressKeys(stdin, ['\x1b[<65;1;1M'])
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).not.toContain('message 0')
  })

  // With height=2 each message occupies the full viewport (1 header + 1 body line).
  // One j press scrolls one line: message 0 body is still visible.
  // Two j presses: message 0 is completely gone but message 1 body is not yet visible
  // (we are mid-block). This proves line-by-line movement, not whole-section jumping.
  it('j scrolls exactly one line, not a whole section', async () => {
    const messages = makeMessages(5)
    // height=2: viewport shows exactly one message (header + body) at a time
    const { stdin, lastFrame } = render(
      <MessageFeed messages={messages} width={40} height={2} onExit={() => {}} isActive />
    )
    // Before any scroll, message 0 header and body are visible
    expect(stripAnsi(lastFrame() ?? '')).toContain('message 0')

    // One j: scrollTop=1 → message 0 body still in view, header scrolled out
    await pressKeys(stdin, ['j'])
    expect(stripAnsi(lastFrame() ?? '')).toContain('message 0')

    // Two j presses: scrollTop=2 → message 0 entirely gone
    await pressKeys(stdin, ['j'])
    expect(stripAnsi(lastFrame() ?? '')).not.toContain('message 0')
  })

  // Alt-j section-jump behaviour is verified at the viewport layer in
  // useMessageFeedViewport (via moveCursor), and the keybinding dispatch
  // is covered by code inspection. The Ink testing library splits the
  // raw ESC sequence before useInput can detect key.meta, so we skip the
  // full-stack integration form of this test here.

  it('clamps scrolling at the bottom of the transcript (G jumps to end, further j is a no-op)', async () => {
    const messages = makeMessages(10)
    const { stdin, lastFrame } = render(
      <MessageFeed messages={messages} width={40} height={6} onExit={() => {}} isActive />
    )
    await pressKeys(stdin, ['G'])
    const atBottom = lastFrame()
    await pressKeys(stdin, ['j', 'j'])
    expect(lastFrame()).toBe(atBottom)
    expect(atBottom).toContain('message 9')
  })

  it('clamps scrolling at the top of the transcript (k at the top is a no-op)', async () => {
    const messages = makeMessages(10)
    const { stdin, lastFrame } = render(
      <MessageFeed messages={messages} width={40} height={6} onExit={() => {}} isActive />
    )
    const atTop = lastFrame()
    await pressKeys(stdin, ['k', 'k'])
    expect(lastFrame()).toBe(atTop)
    expect(atTop).toContain('message 0')
  })

  it('jumps to the top on g after scrolling down', async () => {
    const messages = makeMessages(20)
    const { stdin, lastFrame } = render(
      <MessageFeed messages={messages} width={40} height={6} onExit={() => {}} isActive />
    )
    await pressKeys(stdin, ['G', 'g'])
    expect(lastFrame() ?? '').toContain('message 0')
  })

  it('does not apply inverse (full-block highlight) when navigating with j/k', async () => {
    const messages = makeMessages(5)
    const { stdin, lastFrame } = render(
      <MessageFeed messages={messages} width={40} height={10} onExit={() => {}} isActive />
    )
    // Press j a few times; frames should never contain the SGR inverse code \x1b[7m
    await pressKeys(stdin, ['j', 'j', 'k'])
    const raw = lastFrame() ?? ''
    expect(raw).not.toContain('\x1b[7m')
  })

  it('calls onExit on q', async () => {
    const messages = makeMessages(3)
    let exited = false
    const { stdin } = render(
      <MessageFeed messages={messages} width={40} height={6} onExit={() => { exited = true }} isActive />
    )
    await pressKeys(stdin, ['q'])
    expect(exited).toBe(true)
  })

  it('re-windows without stale content when width changes (resize)', () => {
    const messages = makeMessages(5)
    const { rerender, lastFrame } = render(
      <MessageFeed messages={messages} width={80} height={10} onExit={() => {}} isActive={false} />
    )
    const wideFrame = lastFrame() ?? ''
    rerender(
      <MessageFeed messages={messages} width={20} height={10} onExit={() => {}} isActive={false} />
    )
    const narrowFrame = lastFrame() ?? ''
    expect(narrowFrame).not.toBe(wideFrame)
    expect(narrowFrame).toContain('message 0')
  })

  function makeToolMessage(uuid: string, block: Message['blocks'][number]): Message {
    return {
      uuid,
      parentUuid: null,
      role: 'assistant',
      timestamp: '2026-01-01T00:00:00.000Z',
      cwd: '/tmp',
      blocks: [block],
    }
  }

  it('renders an Edit block as a colored diff', () => {
    const messages = [
      makeToolMessage('a1', {
        type: 'tool_interaction',
        id: 't1',
        name: 'Edit',
        input: { file_path: '/a/b.ts', old_string: 'old line', new_string: 'new line' },
      }),
    ]
    const { lastFrame } = render(
      <MessageFeed messages={messages} width={80} height={20} onExit={() => {}} isActive={false} />
    )
    const text = stripAnsi(lastFrame() ?? '')
    expect(text).toContain('old line')
    expect(text).toContain('new line')
  })

  it('collapses a truncated tool result by default and expands it on Enter', async () => {
    const longContent = 'y'.repeat(1000)
    const messages = [
      makeToolMessage('a1', {
        type: 'tool_interaction',
        id: 't1',
        name: 'Bash',
        input: { command: 'echo' },
        result: { content: longContent, truncated: true },
      }),
    ]
    const { stdin, lastFrame } = render(
      <MessageFeed messages={messages} width={80} height={30} onExit={() => {}} isActive />
    )
    const collapsed = stripAnsi(lastFrame() ?? '').replace(/\s+/g, '')
    expect(collapsed).not.toContain(longContent)

    await pressKeys(stdin, ['\r'])
    const expanded = stripAnsi(lastFrame() ?? '').replace(/\s+/g, '')
    expect(expanded).toContain(longContent)
  })

  it('expands a truncated tool result by clicking the visible item', async () => {
    const longContent = 'z'.repeat(1000)
    const messages = [
      makeToolMessage('a1', {
        type: 'tool_interaction',
        id: 't1',
        name: 'Bash',
        input: { command: 'echo' },
        result: { content: longContent, truncated: true },
      }),
    ]
    const { stdin, lastFrame } = render(
      <MessageFeed messages={messages} width={80} height={30} onExit={() => {}} isActive />
    )
    const collapsed = stripAnsi(lastFrame() ?? '').replace(/\s+/g, '')
    expect(collapsed).not.toContain(longContent)

    await pressKeys(stdin, ['\x1b[<0;1;1M'])
    const expanded = stripAnsi(lastFrame() ?? '').replace(/\s+/g, '')
    expect(expanded).toContain(longContent)
  })

  it('cycles AskUserQuestion tabs with Tab', async () => {
    const messages = [
      makeToolMessage('a1', {
        type: 'tool_interaction',
        id: 't1',
        name: 'AskUserQuestion',
        input: {
          questions: [
            { question: 'Pick a color', header: 'Color', options: [{ label: 'red' }] },
            { question: 'Pick a size', header: 'Size', options: [{ label: 'small' }] },
          ],
        },
      }),
    ]
    const { stdin, lastFrame } = render(
      <MessageFeed messages={messages} width={80} height={20} onExit={() => {}} isActive />
    )
    expect(stripAnsi(lastFrame() ?? '')).toContain('Pick a color')

    await pressKeys(stdin, ['\t'])
    expect(stripAnsi(lastFrame() ?? '')).toContain('Pick a size')
  })
})
