// The presence of a `#token=...` fragment on load is itself the signal that
// this page was opened via Live Handoff (see ADR-pending: Live Handoff is a
// scoped exception to ADR 0001's no-backend stance). No other entry point
// ever produces this fragment, so no separate marker is needed.
export function readAndClearLiveHandoffToken(): string | undefined {
  const match = /^#token=([^&]+)$/.exec(location.hash)
  if (!match) return undefined
  const token = decodeURIComponent(match[1])
  history.replaceState(null, '', location.pathname + location.search)
  return token
}
