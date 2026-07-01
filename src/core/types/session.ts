export type Role = 'user' | 'assistant'

export interface TextBlock {
  type: 'text'
  text: string
}

export interface ToolInteractionBlock {
  type: 'tool_interaction'
  id: string
  name: string
  input: Record<string, unknown>
  result?: {
    content: string
    truncated: boolean
  }
}

export type Block = TextBlock | ToolInteractionBlock

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
  estimatedCost: number
}

export interface Message {
  uuid: string
  parentUuid: string | null
  role: Role
  timestamp: string
  cwd: string
  blocks: Block[]
  model?: string
  usage?: TokenUsage
}

export interface Session {
  sessionId: string
  project: string
  cwd: string
  aiTitle?: string
  firstTimestamp: string
  lastTimestamp: string
  messages: Message[]
  toolCounts: Record<string, number>
  userCount: number
  assistantCount: number
  models: string[]
  totalUsage: TokenUsage
}
