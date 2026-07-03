import { describe, it, expect } from 'vitest'
import { createVersionGate } from './liveHandoffSync'

describe('createVersionGate', () => {
  it('accepts the first response regardless of version', () => {
    const gate = createVersionGate()
    expect(gate.isStale(0)).toBe(false)
  })

  it('rejects a response whose version is older than one already recorded', () => {
    const gate = createVersionGate()
    gate.recordSeen(2)
    expect(gate.isStale(1)).toBe(true)
  })

  it('accepts a response whose version is newer than the latest recorded', () => {
    const gate = createVersionGate()
    gate.recordSeen(1)
    expect(gate.isStale(2)).toBe(false)
  })

  it('drops a slow response for an old session that resolves after a newer one already landed (story 19)', () => {
    const gate = createVersionGate()
    // Simulates: user switches sessions twice in quick succession, and the
    // fetch triggered by the first switch (version 1) resolves after the
    // fetch triggered by the second switch (version 2) already landed.
    gate.recordSeen(2)
    expect(gate.isStale(1)).toBe(true)
    // The final displayed state must still reflect the last selection.
    expect(gate.latestSeenVersion).toBe(2)
  })

  it('never lowers latestSeenVersion once a higher version has been recorded', () => {
    const gate = createVersionGate()
    gate.recordSeen(3)
    gate.recordSeen(1)
    expect(gate.latestSeenVersion).toBe(3)
  })
})
