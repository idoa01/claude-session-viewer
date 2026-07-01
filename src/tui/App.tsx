import { useEffect, useState } from 'react'
import { Box, Text } from 'ink'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { discoverSessions, type SessionEntry } from './session-discovery/discoverSessions'
import { SessionBrowser } from './views/SessionBrowser'

const PROJECTS_ROOT = join(homedir(), '.claude', 'projects')

type State =
  | { status: 'loading' }
  | { status: 'ready'; entries: SessionEntry[] }
  | { status: 'selected'; entry: SessionEntry }

export default function App() {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    discoverSessions(PROJECTS_ROOT).then(entries => {
      if (!cancelled) setState({ status: 'ready', entries })
    })
    return () => { cancelled = true }
  }, [])

  if (state.status === 'loading') {
    return <Text dimColor>Scanning {PROJECTS_ROOT}…</Text>
  }

  if (state.status === 'selected') {
    return (
      <Box flexDirection="column">
        <Text>Selected: {state.entry.aiTitle ?? state.entry.sessionId}</Text>
        <Text dimColor>{state.entry.filePath}</Text>
      </Box>
    )
  }

  if (state.entries.length === 0) {
    return (
      <Box flexDirection="column">
        <Text>No sessions found under {PROJECTS_ROOT}</Text>
        <Text dimColor>Run Claude Code at least once to create session transcripts.</Text>
      </Box>
    )
  }

  return (
    <SessionBrowser
      entries={state.entries}
      onSelect={entry => setState({ status: 'selected', entry })}
    />
  )
}
