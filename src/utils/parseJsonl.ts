import type { Session, Message, Block, TextBlock, ToolInteractionBlock, TokenUsage } from '../types/session'
import { entryCost, type RawUsage } from './pricing'

// Strip Claude Code system wrapper tags from message text.
// - <command-args> and <command-name>: keep inner content (the actual user prompt / skill name)
// - Everything else (<command-message>, <local-command-caveat>, <system-reminder>, etc.): discard entirely
function cleanMessageText(text: string): string {
  return text
    .replace(/<command-name>([\s\S]*?)<\/command-name>/g, '**$1**')
    .replace(/<command-args>([\s\S]*?)<\/command-args>/g, '$1')
    .replace(/<[a-z][a-z0-9-]*(?:\s[^>]*)?>[\s\S]*?<\/[a-z][a-z0-9-]*>/g, '')
    .trim()
}

function extractToolResultText(content: unknown): string {
  if (Array.isArray(content)) {
    return (content as Record<string, unknown>[])
      .filter(c => c.type === 'text')
      .map(c => c.text as string)
      .join('\n')
  }
  return String(content ?? '')
}

export function parseJsonl(raw: string): Session {
  const lines = raw.trim().split('\n')
  const toolCounts: Record<string, number> = {}
  let sessionId = ''
  let cwd = ''
  let aiTitle = ''

  // First pass: collect raw messages
  type RawMessage = {
    uuid: string
    parentUuid: string | null
    role: 'user' | 'assistant'
    timestamp: string
    cwd: string
    content: Record<string, unknown>[]
    model?: string
    usage?: RawUsage
    isBedrock?: boolean
  }
  const rawMessages: RawMessage[] = []

  for (const line of lines) {
    let obj: Record<string, unknown>
    try { obj = JSON.parse(line) } catch { continue }

    if (!sessionId && obj.sessionId) sessionId = obj.sessionId as string
    if (!cwd && obj.cwd) cwd = obj.cwd as string
    if (obj.type === 'ai-title' && obj.aiTitle) { aiTitle = obj.aiTitle as string; continue }


    const type = obj.type as string
    if ((type !== 'user' && type !== 'assistant') || obj.isMeta) continue

    const msg = obj.message as { role: string; content: unknown; model?: string; id?: string; usage?: RawUsage }
    if (!msg) continue

    let content: Record<string, unknown>[]
    if (typeof msg.content === 'string') {
      const text = cleanMessageText(msg.content)
      if (!text) continue
      content = [{ type: 'text', text }]
    } else if (Array.isArray(msg.content)) {
      content = msg.content as Record<string, unknown>[]
    } else {
      continue
    }

    const rawMsg: RawMessage = {
      uuid: obj.uuid as string,
      parentUuid: (obj.parentUuid as string) ?? null,
      role: msg.role as 'user' | 'assistant',
      timestamp: obj.timestamp as string,
      cwd: (obj.cwd as string) ?? cwd,
      content,
    }

    if (msg.role === 'assistant') {
      rawMsg.model = msg.model
      rawMsg.usage = msg.usage
      rawMsg.isBedrock = typeof msg.id === 'string' && msg.id.startsWith('msg_bdrk_')
    }

    rawMessages.push(rawMsg)
  }

  // Build a map of tool_use_id → result for quick lookup
  const resultMap = new Map<string, { content: string; truncated: boolean }>()
  for (const rm of rawMessages) {
    if (rm.role !== 'user') continue
    for (const b of rm.content) {
      if (b.type !== 'tool_result') continue
      const text = extractToolResultText(b.content)
      resultMap.set(b.tool_use_id as string, {
        content: text,
        truncated: text.length > 600,
      })
    }
  }

  // Second pass: build final messages
  const messages: Message[] = []

  for (const rm of rawMessages) {
    if (rm.role === 'assistant') {
      const blocks: Block[] = []
      for (const b of rm.content) {
        if (b.type === 'text') {
          const text = (b.text as string).trim()
          if (text) blocks.push({ type: 'text', text } as TextBlock)
        } else if (b.type === 'tool_use') {
          const name = b.name as string
          toolCounts[name] = (toolCounts[name] ?? 0) + 1
          const id = b.id as string
          blocks.push({
            type: 'tool_interaction',
            id,
            name,
            input: b.input as Record<string, unknown>,
            result: resultMap.get(id),
          } as ToolInteractionBlock)
        }
      }
      if (blocks.length > 0) {
        let usage: TokenUsage | undefined
        if (rm.usage && rm.model) {
          const cost = entryCost(rm.usage, rm.model, rm.isBedrock ?? false)
          usage = {
            inputTokens: rm.usage.input_tokens ?? 0,
            outputTokens: rm.usage.output_tokens ?? 0,
            cacheReadTokens: rm.usage.cache_read_input_tokens ?? 0,
            cacheCreationTokens: rm.usage.cache_creation_input_tokens ?? 0,
            estimatedCost: cost,
          }
        }
        messages.push({ uuid: rm.uuid, parentUuid: rm.parentUuid, role: 'assistant', timestamp: rm.timestamp, cwd: rm.cwd, blocks, model: rm.model, usage })
      }
    } else {
      // User message: keep only non-tool_result blocks
      const blocks: Block[] = []
      for (const b of rm.content) {
        if (b.type === 'tool_result') continue
        if (b.type === 'text') {
          const text = cleanMessageText(b.text as string)
          if (text) blocks.push({ type: 'text', text } as TextBlock)
        }
      }
      if (blocks.length > 0) {
        messages.push({ uuid: rm.uuid, parentUuid: rm.parentUuid, role: 'user', timestamp: rm.timestamp, cwd: rm.cwd, blocks })
      }
    }
  }

  const timestamps = messages.map(m => m.timestamp).filter(Boolean).sort()
  const project = cwd ? cwd.split('/').filter(Boolean).pop() ?? '' : ''

  const modelsSet = new Set<string>()
  const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0 }
  for (const m of messages) {
    if (m.model) modelsSet.add(m.model)
    if (m.usage) {
      totalUsage.inputTokens += m.usage.inputTokens
      totalUsage.outputTokens += m.usage.outputTokens
      totalUsage.cacheReadTokens += m.usage.cacheReadTokens
      totalUsage.cacheCreationTokens += m.usage.cacheCreationTokens
      totalUsage.estimatedCost += m.usage.estimatedCost
    }
  }

  return {
    sessionId,
    project,
    cwd,
    aiTitle: aiTitle || undefined,
    firstTimestamp: timestamps[0] ?? '',
    lastTimestamp: timestamps[timestamps.length - 1] ?? '',
    messages,
    toolCounts,
    userCount: messages.filter(m => m.role === 'user').length,
    assistantCount: messages.filter(m => m.role === 'assistant').length,
    models: Array.from(modelsSet),
    totalUsage,
  }
}
