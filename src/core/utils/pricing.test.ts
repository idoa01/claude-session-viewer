import { describe, it, expect } from 'vitest'
import { entryCost, formatCost, formatTokens } from './pricing'

describe('entryCost', () => {
  it('prices a known model using its base input/output/cache-read rates', () => {
    const usage = { input_tokens: 1_000_000, output_tokens: 1_000_000 }
    const cost = entryCost(usage, 'claude-sonnet-4-5', false)
    expect(cost).toBeCloseTo(3.0 + 15.0, 5)
  })

  it('matches model names case-insensitively', () => {
    const usage = { input_tokens: 1_000_000 }
    const cost = entryCost(usage, 'CLAUDE-SONNET-4-5-20260101', false)
    expect(cost).toBeCloseTo(3.0, 5)
  })

  it('falls back to default pricing for an unrecognized model', () => {
    const usage = { input_tokens: 1_000_000 }
    const cost = entryCost(usage, 'some-unknown-model', false)
    expect(cost).toBeCloseTo(3.0, 5)
  })

  it('applies the non-Bedrock cache-write multiplier (1.25x input price)', () => {
    const usage = { cache_creation_input_tokens: 1_000_000 }
    const cost = entryCost(usage, 'claude-sonnet-4-5', false)
    expect(cost).toBeCloseTo(3.0 * 1.25, 5)
  })

  it('applies the Bedrock cache-write multiplier (0.5x input price)', () => {
    const usage = { cache_creation_input_tokens: 1_000_000 }
    const cost = entryCost(usage, 'claude-sonnet-4-5', true)
    expect(cost).toBeCloseTo(3.0 * 0.5, 5)
  })

  it('prices cache-read tokens at the cache-read rate', () => {
    const usage = { cache_read_input_tokens: 1_000_000 }
    const cost = entryCost(usage, 'claude-sonnet-4-5', false)
    expect(cost).toBeCloseTo(0.3, 5)
  })

  it('treats missing usage fields as zero', () => {
    expect(entryCost({}, 'claude-sonnet-4-5', false)).toBe(0)
  })
})

describe('formatCost', () => {
  it('shows a floor marker below one cent', () => {
    expect(formatCost(0.001)).toBe('<$0.01')
  })

  it('formats amounts at or above one cent to two decimals', () => {
    expect(formatCost(0.01)).toBe('$0.01')
    expect(formatCost(12.345)).toBe('$12.35')
  })
})

describe('formatTokens', () => {
  it('leaves small counts unformatted', () => {
    expect(formatTokens(42)).toBe('42')
  })

  it('formats thousands with a k suffix', () => {
    expect(formatTokens(1_500)).toBe('1.5k')
  })

  it('formats millions with an M suffix', () => {
    expect(formatTokens(2_500_000)).toBe('2.5M')
  })
})
