import { useState, useEffect, useCallback } from 'react'
import type { Session } from '../types/session'
import { parseJsonl } from '../utils/parseJsonl'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; session: Session }
  | { status: 'error'; message: string }

export function useSessionLoader() {
  const [state, setState] = useState<State>({ status: 'idle' })

  // Try fetching /session.jsonl on mount (CLI mode)
  useEffect(() => {
    setState({ status: 'loading' })
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
