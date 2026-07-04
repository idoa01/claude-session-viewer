import { describe, it, expect } from 'vitest'
import { createVersionGate } from './liveHandoffSync'

describe('createVersionGate', () => {
  it('accepts the first response regardless of version', () => {
    const gate = createVersionGate()
    expect(gate.accept(0)).toBe('advanced')
  })

  it('rejects a response whose version is older than one already recorded', () => {
    const gate = createVersionGate()
    gate.accept(2)
    expect(gate.accept(1)).toBe('stale')
  })

  it('accepts a response whose version is newer than the latest recorded', () => {
    const gate = createVersionGate()
    gate.accept(1)
    expect(gate.accept(2)).toBe('advanced')
  })

  it('records a broadcast version before the fetch it triggers resolves', () => {
    const gate = createVersionGate()
    expect(gate.accept(2)).toBe('advanced')
    expect(gate.latestSeenVersion).toBe(2)
  })

  it('distinguishes a duplicate version from a stale one', () => {
    const gate = createVersionGate()
    gate.accept(2)
    expect(gate.accept(2)).toBe('current')
    expect(gate.latestSeenVersion).toBe(2)
  })

  it('drops a slow response for an old session that resolves after a newer broadcast arrived (story 19)', () => {
    const gate = createVersionGate()
    // Simulates: user switches sessions twice in quick succession, and the
    // broadcast for the second switch (version 2) arrives before the fetch
    // triggered by the first switch (version 1) resolves.
    gate.accept(2)
    expect(gate.accept(1)).toBe('stale')
    // The final displayed state must still reflect the last selection.
    expect(gate.latestSeenVersion).toBe(2)
  })

  it('never lowers latestSeenVersion once a higher version has been recorded', () => {
    const gate = createVersionGate()
    gate.accept(3)
    gate.accept(1)
    expect(gate.latestSeenVersion).toBe(3)
  })
})
