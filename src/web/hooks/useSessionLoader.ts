import { useState, useEffect, useCallback } from 'react'
import type { Session } from '../../core/types/session'
import { parseJsonl } from '../../core/utils/parseJsonl'
import { readAndClearLiveHandoffToken } from './useLiveHandoffToken'

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
    const token = readAndClearLiveHandoffToken()
    if (token) {
      fetch('/active-session', { headers: { 'x-sesh-token': token } })
        .then(r => {
          if (!r.ok) throw new Error('no active session')
          return r.text()
        })
        .then(text => setState({ status: 'loaded', session: parseJsonl(text) }))
        .catch(() => setState({ status: 'idle' }))
      return
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
