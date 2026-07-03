// Tracks the highest session version seen so far (from a WebSocket broadcast
// or an /active-session response header) and decides whether a given
// response is stale — i.e. a slower fetch for an older session resolved
// after a newer one already landed (story 19).
export function createVersionGate() {
  let latestSeenVersion = -1

  return {
    isStale(version: number): boolean {
      return Number.isFinite(version) && version < latestSeenVersion
    },
    recordSeen(version: number): void {
      if (Number.isFinite(version) && version > latestSeenVersion) latestSeenVersion = version
    },
    get latestSeenVersion() {
      return latestSeenVersion
    },
  }
}
