import { useEffect, useState } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { discoverSessions, type SessionEntry } from './session-discovery/discoverSessions'
import { SessionBrowser } from './views/SessionBrowser'
import { MessageFeed } from './views/MessageFeed'
import { useSession } from './hooks/useSession'
import { useTerminalSize } from './hooks/useTerminalSize'

const PROJECTS_ROOT = join(homedir(), '.claude', 'projects')
const SIDEBAR_WIDTH = 36

function directModeEntry(filePath: string): SessionEntry {
  return {
    sessionId: basename(filePath).replace(/\.jsonl$/, ''),
    filePath,
    projectDirName: '',
    projectLabel: '',
    aiTitle: undefined,
    lastModified: 0,
  }
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; entries: SessionEntry[] }
  | { status: 'selected'; entry: SessionEntry; entries: SessionEntry[] }

function SelectedSession({ entry, terminalWidth, terminalHeight, onExit }: {
  entry: SessionEntry
  terminalWidth: number
  terminalHeight: number
  onExit: () => void
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const loadState = useSession(entry.filePath)

  useInput(input => {
    if (input === 's') setSidebarCollapsed(v => !v)
  })

  const feedWidth = sidebarCollapsed ? terminalWidth : terminalWidth - SIDEBAR_WIDTH - 1
  const feedHeight = terminalHeight - 1 // reserve one row for the status line

  if (loadState.status === 'loading') {
    return <Text dimColor>Loading {entry.filePath}…</Text>
  }
  if (loadState.status === 'error') {
    return <Text color="red">Failed to load {entry.filePath}: {loadState.message}</Text>
  }

  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      <Box flexGrow={1}>
        {!sidebarCollapsed && (
          <Box width={SIDEBAR_WIDTH} flexDirection="column" marginRight={1}>
            <Text bold>{loadState.session.aiTitle ?? entry.sessionId.slice(0, 8)}</Text>
            <Text dimColor>{entry.projectLabel}</Text>
          </Box>
        )}
        <MessageFeed
          messages={loadState.session.messages}
          width={feedWidth}
          height={feedHeight}
          onExit={onExit}
          isActive
        />
      </Box>
      <Text dimColor>j/k scroll · Ctrl-F/B page · g/G top/bottom · Enter/Space expand · s sidebar · Esc/q back</Text>
    </Box>
  )
}

interface AppProps {
  directModePath?: string
}

export default function App({ directModePath }: AppProps) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const { columns, rows } = useTerminalSize()
  const { exit } = useApp()

  useEffect(() => {
    if (directModePath) return
    let cancelled = false
    discoverSessions(PROJECTS_ROOT).then(entries => {
      if (!cancelled) setState({ status: 'ready', entries })
    })
    return () => { cancelled = true }
  }, [directModePath])

  if (directModePath) {
    return (
      <SelectedSession
        entry={directModeEntry(directModePath)}
        terminalWidth={columns}
        terminalHeight={rows}
        onExit={() => exit()}
      />
    )
  }

  if (state.status === 'loading') {
    return <Text dimColor>Scanning {PROJECTS_ROOT}…</Text>
  }

  if (state.status === 'selected') {
    return (
      <SelectedSession
        entry={state.entry}
        terminalWidth={columns}
        terminalHeight={rows}
        onExit={() => setState({ status: 'ready', entries: state.entries })}
      />
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
      onSelect={entry => setState({ status: 'selected', entry, entries: state.entries })}
    />
  )
}
