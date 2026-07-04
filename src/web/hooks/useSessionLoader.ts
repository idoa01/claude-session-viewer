import { useState, useEffect, useCallback } from 'react'
import type { Session } from '../../core/types/session'
import { parseJsonl } from '../../core/utils/parseJsonl'
import { readAndClearLiveHandoffToken } from './useLiveHandoffToken'
import { createVersionGate } from './liveHandoffSync'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; session: Session }
  | { status: 'error'; message: string }

export function useSessionLoader() {
  const [state, setState] = useState<State>({ status: 'loading' })

  // On mount: either boot via Live Handoff (a `#token=...` fragment is present,
  // set by the TUI's handoff server — see src/tui/live-handoff) or fall back to
  // ADR 0001's normal CLI-mode fetch of /session.jsonl.
  useEffect(() => {
    const maybeToken = readAndClearLiveHandoffToken()
    if (maybeToken) {
      const token: string = maybeToken
      const versionGate = createVersionGate()

      function fetchActiveSession() {
        fetch('/active-session', { headers: { 'x-sesh-token': token } })
          .then(r => {
            if (!r.ok) throw new Error('no active session')
            const headerVersion = Number(r.headers.get('X-Session-Version'))
            return r.text().then(text => ({ text, version: headerVersion }))
          })
          .then(({ text, version }) => {
            if (versionGate.accept(version) === 'stale') return
            setState({ status: 'loaded', session: parseJsonl(text) })
          })
          .catch(() => setState({ status: 'idle' }))
      }

      // Fetch immediately so the tab shows whatever was active when it was
      // opened, rather than waiting for the *next* session switch to broadcast.
      fetchActiveSession()

      const ws = new WebSocket(`ws://${location.host}/`, [token])
      ws.onmessage = event => {
        const data = JSON.parse(event.data as string) as { version: number; sessionId: string | null }
        const decision = versionGate.accept(data.version)
        if (decision === 'stale' || decision === 'current') return
        fetchActiveSession()
      }
      return () => ws.close()
    }

    fetch('/session.jsonl')
      .then(r => {
        if (!r.ok) throw new Error('no file')
        return r.text()
      })
      .then(text => setState({ status: 'loaded', session: parseJsonl(text) }))
      .catch(() => setState({ status: 'idle' }))
  }, [])

  // Drop/pick handler
  const loadFile = useCallback((file: File) => {
    setState({ status: 'loading' })
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const text = e.target?.result as string
        setState({ status: 'loaded', session: parseJsonl(text) })
      } catch {
        setState({ status: 'error', message: 'Failed to parse file.' })
      }
    }
    reader.onerror = () => setState({ status: 'error', message: 'Failed to read file.' })
    reader.readAsText(file)
  }, [])

  return { state, loadFile }
}
