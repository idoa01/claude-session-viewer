import { useEffect, useState } from 'react'
import { readFile } from 'node:fs/promises'
import { parseJsonl } from '../../core/utils/parseJsonl'
import { validateJsonl } from '../../core/utils/validateJsonl'
import type { Session } from '../../core/types/session'

export type SessionLoadState =
  | { status: 'loading' }
  | { status: 'ready'; session: Session }
  | { status: 'error'; message: string }

function describeFailures(filePath: string, failures: { line: number; message: string }[]): string {
  const detail = failures.map(f => `line ${f.line}: ${f.message}`).join('; ')
  return `${filePath} has malformed content (${detail})`
}

export function useSession(filePath: string): SessionLoadState {
  // Tag each result with the filePath it was loaded for, so a filePath change
  // is reflected as 'loading' immediately (during render) instead of needing a
  // second effect-driven setState just to reset from a prior ready/error state.
  const [result, setResult] = useState<{ filePath: string; state: SessionLoadState }>({
    filePath,
    state: { status: 'loading' },
  })

  useEffect(() => {
    let cancelled = false
    readFile(filePath, 'utf8')
      .then(raw => {
        if (cancelled) return
        const failures = validateJsonl(raw)
        if (failures.length > 0) {
          setResult({ filePath, state: { status: 'error', message: describeFailures(filePath, failures) } })
          return
        }
        setResult({ filePath, state: { status: 'ready', session: parseJsonl(raw) } })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setResult({
          filePath,
          state: { status: 'error', message: e instanceof Error ? e.message : 'failed to load session' },
        })
      })
    return () => {
      cancelled = true
    }
  }, [filePath])

  return result.filePath === filePath ? result.state : { status: 'loading' }
}
