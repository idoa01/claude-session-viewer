type VersionGateDecision = 'advanced' | 'current' | 'stale' | 'unversioned'

interface VersionGate {
  accept(version: number): VersionGateDecision
  readonly latestSeenVersion: number
}

// Tracks the highest session version seen so far (from a WebSocket broadcast
// or an /active-session response header). Accepting a version is atomic:
// callers should never separately "check stale" and "record seen", because a
// broadcast must be recorded before the fetch it triggers can race older work.
export function createVersionGate(): VersionGate {
  let latestSeenVersion = -1

  return {
    accept(version: number): VersionGateDecision {
      if (!Number.isFinite(version)) return 'unversioned'
      if (version < latestSeenVersion) return 'stale'
      if (version === latestSeenVersion) return 'current'

      latestSeenVersion = version
      return 'advanced'
    },
    get latestSeenVersion() {
      return latestSeenVersion
    },
  }
}
