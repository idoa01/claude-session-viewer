import { useCallback, useEffect, useRef, useState } from 'react'
import open from 'open'
import { startLiveHandoffServer, type LiveHandoffServer } from './server'
import { resolveDistDir } from './distDir'

export type LiveHandoffStatus =
  | { state: 'idle' }
  | { state: 'starting' }
  | { state: 'active'; url: string }
  | { state: 'error'; message: string }

export function useLiveHandoff() {
  const [status, setStatus] = useState<LiveHandoffStatus>({ state: 'idle' })
  const serverRef = useRef<LiveHandoffServer | null>(null)
  const startingRef = useRef<Promise<LiveHandoffServer> | null>(null)

  useEffect(() => {
    return () => {
      serverRef.current?.close()
    }
  }, [])

  const trigger = useCallback((filePath: string) => {
    if (serverRef.current) {
      serverRef.current.setActiveSession(filePath)
      return
    }
    if (startingRef.current) {
      startingRef.current.then(server => server.setActiveSession(filePath))
      return
    }

    setStatus({ state: 'starting' })
    const startPromise = startLiveHandoffServer(resolveDistDir())
    startingRef.current = startPromise

    startPromise
      .then(server => {
        serverRef.current = server
        server.setActiveSession(filePath)
        setStatus({ state: 'active', url: server.url })
        open(server.url).catch(() => {
          // Browser open failed (no default browser, `open` command missing, etc.) —
          // the server is still up, so the URL stays visible in the status for the
          // user to open manually (story 15).
        })
      })
      .catch((e: unknown) => {
        setStatus({ state: 'error', message: e instanceof Error ? e.message : 'Failed to start Live Handoff server' })
      })
      .finally(() => {
        startingRef.current = null
      })
  }, [])

  return { status, trigger }
}
