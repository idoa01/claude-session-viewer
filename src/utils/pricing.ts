// (input $/1M, output $/1M, cacheRead $/1M) — ordered most→least specific
const BASE_PRICING: Array<[string, [number, number, number]]> = [
  ['claude-opus-4-8',   [5.00, 25.00, 0.50]],
  ['claude-opus-4-7',   [5.00, 25.00, 0.50]],
  ['claude-opus-4-6',   [5.00, 25.00, 0.50]],
  ['claude-sonnet-4-6', [3.00, 15.00, 0.30]],
  ['claude-haiku-4-6',  [1.00,  5.00, 0.10]],
  ['claude-opus-4-5',   [5.00, 25.00, 0.50]],
  ['claude-sonnet-4-5', [3.00, 15.00, 0.30]],
  ['claude-haiku-4-5',  [1.00,  5.00, 0.10]],
]

const FALLBACK: [number, number, number] = [3.00, 15.00, 0.30]

export interface RawUsage {
  input_tokens?: number
  output_tokens?: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

export function entryCost(usage: RawUsage, model: string, isBedrock: boolean): number {
  const m = model.toLowerCase()
  const cacheWriteMultiplier = isBedrock ? 0.5 : 1.25
  const [ip, op, rp] = BASE_PRICING.find(([key]) => m.includes(key))?.[1] ?? FALLBACK
  const cp = ip * cacheWriteMultiplier
  const inp = usage.input_tokens ?? 0
  const out = usage.output_tokens ?? 0
  const cc  = usage.cache_creation_input_tokens ?? 0
  const cr  = usage.cache_read_input_tokens ?? 0
  return (inp * ip + out * op + cc * cp + cr * rp) / 1_000_000
}

export function formatCost(usd: number): string {
  if (usd < 0.01) return '<$0.01'
  return `$${usd.toFixed(2)}`
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}
