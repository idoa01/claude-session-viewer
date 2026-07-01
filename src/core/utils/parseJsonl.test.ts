import { describe, it, expect } from 'vitest'
import { parseJsonl } from './parseJsonl'

function line(obj: unknown): string {
  return JSON.stringify(obj)
}

describe('parseJsonl', () => {
  it('extracts sessionId, cwd, and aiTitle', () => {
    const raw = [
      line({ type: 'ai-title', aiTitle: 'Fix the login bug' }),
      line({
        type: 'user',
        uuid: 'u1',
        parentUuid: null,
        sessionId: 'sess-1',
        cwd: '/Users/dev/my-project',
        timestamp: '2026-01-01T00:00:00Z',
        message: { role: 'user', content: 'hello' },
      }),
    ].join('\n')

    const session = parseJsonl(raw)
    expect(session.sessionId).toBe('sess-1')
    expect(session.cwd).toBe('/Users/dev/my-project')
    expect(session.aiTitle).toBe('Fix the login bug')
    expect(session.project).toBe('my-project')
  })

  it('skips unparseable lines rather than throwing', () => {
    const raw = [
      'not valid json {{{',
      line({
        type: 'user',
        uuid: 'u1',
        parentUuid: null,
        sessionId: 'sess-1',
        cwd: '/tmp',
        timestamp: '2026-01-01T00:00:00Z',
        message: { role: 'user', content: 'hello' },
      }),
    ].join('\n')

    const session = parseJsonl(raw)
    expect(session.messages).toHaveLength(1)
    expect(session.messages[0].blocks).toEqual([{ type: 'text', text: 'hello' }])
  })

  it('skips isMeta entries and non-user/assistant types', () => {
    const raw = [
      line({ type: 'summary', uuid: 's1' }),
      line({
        type: 'user',
        uuid: 'u1',
        parentUuid: null,
        isMeta: true,
        sessionId: 'sess-1',
        timestamp: '2026-01-01T00:00:00Z',
        message: { role: 'user', content: 'meta message' },
      }),
      line({
        type: 'user',
        uuid: 'u2',
        parentUuid: 'u1',
        sessionId: 'sess-1',
        timestamp: '2026-01-01T00:00:01Z',
        message: { role: 'user', content: 'real message' },
      }),
    ].join('\n')

    const session = parseJsonl(raw)
    expect(session.messages).toHaveLength(1)
    expect(session.messages[0].blocks).toEqual([{ type: 'text', text: 'real message' }])
  })

  it('pairs tool_use with its tool_result via tool_use_id', () => {
    const raw = [
      line({
        type: 'assistant',
        uuid: 'a1',
        parentUuid: 'u1',
        sessionId: 'sess-1',
        timestamp: '2026-01-01T00:00:00Z',
        message: {
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'tool-1', name: 'Bash', input: { command: 'ls' } }],
        },
      }),
      line({
        type: 'user',
        uuid: 'u2',
        parentUuid: 'a1',
        sessionId: 'sess-1',
        timestamp: '2026-01-01T00:00:01Z',
        message: {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'tool-1', content: 'file1.txt' }],
        },
      }),
    ].join('\n')

    const session = parseJsonl(raw)
    expect(session.messages).toHaveLength(1)
    const block = session.messages[0].blocks[0]
    expect(block).toMatchObject({
      type: 'tool_interaction',
      id: 'tool-1',
      name: 'Bash',
      result: { content: 'file1.txt', truncated: false },
    })
    expect(session.toolCounts).toEqual({ Bash: 1 })
  })

  it('marks a tool result over 600 characters as truncated but keeps the full text', () => {
    const longOutput = 'x'.repeat(601)
    const raw = [
      line({
        type: 'assistant',
        uuid: 'a1',
        parentUuid: null,
        sessionId: 'sess-1',
        timestamp: '2026-01-01T00:00:00Z',
        message: {
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'tool-1', name: 'Read', input: {} }],
        },
      }),
      line({
        type: 'user',
        uuid: 'u2',
        parentUuid: 'a1',
        sessionId: 'sess-1',
        timestamp: '2026-01-01T00:00:01Z',
        message: {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'tool-1', content: longOutput }],
        },
      }),
    ].join('\n')

    const session = parseJsonl(raw)
    const block = session.messages[0].blocks[0]
    expect(block).toMatchObject({ type: 'tool_interaction' })
    if (block.type !== 'tool_interaction') throw new Error('expected tool_interaction')
    expect(block.result?.truncated).toBe(true)
    expect(block.result?.content).toHaveLength(601)
  })

  it('does not truncate a tool result at exactly 600 characters', () => {
    const output = 'x'.repeat(600)
    const raw = [
      line({
        type: 'assistant',
        uuid: 'a1',
        parentUuid: null,
        sessionId: 'sess-1',
        timestamp: '2026-01-01T00:00:00Z',
        message: {
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'tool-1', name: 'Read', input: {} }],
        },
      }),
      line({
        type: 'user',
        uuid: 'u2',
        parentUuid: 'a1',
        sessionId: 'sess-1',
        timestamp: '2026-01-01T00:00:01Z',
        message: {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'tool-1', content: output }],
        },
      }),
    ].join('\n')

    const session = parseJsonl(raw)
    const block = session.messages[0].blocks[0]
    if (block.type !== 'tool_interaction') throw new Error('expected tool_interaction')
    expect(block.result?.truncated).toBe(false)
  })

  it('extracts tool_result text from an array-shaped content payload', () => {
    const raw = [
      line({
        type: 'assistant',
        uuid: 'a1',
        parentUuid: null,
        sessionId: 'sess-1',
        timestamp: '2026-01-01T00:00:00Z',
        message: {
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'tool-1', name: 'Read', input: {} }],
        },
      }),
      line({
        type: 'user',
        uuid: 'u2',
        parentUuid: 'a1',
        sessionId: 'sess-1',
        timestamp: '2026-01-01T00:00:01Z',
        message: {
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: 'tool-1',
            content: [{ type: 'text', text: 'line one' }, { type: 'text', text: 'line two' }],
          }],
        },
      }),
    ].join('\n')

    const session = parseJsonl(raw)
    const block = session.messages[0].blocks[0]
    if (block.type !== 'tool_interaction') throw new Error('expected tool_interaction')
    expect(block.result?.content).toBe('line one\nline two')
  })

  it('drops tool_result blocks from user messages, keeping only text', () => {
    const raw = [
      line({
        type: 'user',
        uuid: 'u1',
        parentUuid: null,
        sessionId: 'sess-1',
        timestamp: '2026-01-01T00:00:00Z',
        message: {
          role: 'user',
          content: [
            { type: 'tool_result', tool_use_id: 'tool-1', content: 'irrelevant here' },
            { type: 'text', text: 'the actual reply' },
          ],
        },
      }),
    ].join('\n')

    const session = parseJsonl(raw)
    expect(session.messages[0].blocks).toEqual([{ type: 'text', text: 'the actual reply' }])
  })

  it('strips known system wrapper tags but keeps command-name/command-args content', () => {
    const raw = line({
      type: 'user',
      uuid: 'u1',
      parentUuid: null,
      sessionId: 'sess-1',
      timestamp: '2026-01-01T00:00:00Z',
      message: {
        role: 'user',
        content: '<command-name>deploy</command-name><command-args>prod</command-args><system-reminder>ignore me</system-reminder>',
      },
    })

    const session = parseJsonl(raw)
    expect(session.messages[0].blocks).toEqual([{ type: 'text', text: '**deploy**prod' }])
  })

  it('computes total usage and cost across assistant messages', () => {
    const raw = [
      line({
        type: 'assistant',
        uuid: 'a1',
        parentUuid: null,
        sessionId: 'sess-1',
        timestamp: '2026-01-01T00:00:00Z',
        message: {
          role: 'assistant',
          model: 'claude-sonnet-4-5',
          content: [{ type: 'text', text: 'first' }],
          usage: { input_tokens: 100, output_tokens: 50 },
        },
      }),
      line({
        type: 'assistant',
        uuid: 'a2',
        parentUuid: 'a1',
        sessionId: 'sess-1',
        timestamp: '2026-01-01T00:00:01Z',
        message: {
          role: 'assistant',
          model: 'claude-sonnet-4-5',
          content: [{ type: 'text', text: 'second' }],
          usage: { input_tokens: 200, output_tokens: 100 },
        },
      }),
    ].join('\n')

    const session = parseJsonl(raw)
    expect(session.totalUsage.inputTokens).toBe(300)
    expect(session.totalUsage.outputTokens).toBe(150)
    expect(session.totalUsage.estimatedCost).toBeGreaterThan(0)
    expect(session.models).toEqual(['claude-sonnet-4-5'])
    expect(session.assistantCount).toBe(2)
  })

  it('returns an empty session for empty input', () => {
    const session = parseJsonl('')
    expect(session.messages).toEqual([])
    expect(session.sessionId).toBe('')
    expect(session.firstTimestamp).toBe('')
    expect(session.lastTimestamp).toBe('')
  })
})
