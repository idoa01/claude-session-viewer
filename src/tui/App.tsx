import { useEffect, useState } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { discoverSessions, type AvailableSessionEntry, type SessionEntry } from './session-discovery/discoverSessions'
import { SessionBrowser } from './views/SessionBrowser'
import { MessageFeed } from './views/MessageFeed'
import { useSession } from './hooks/useSession'
import { useTerminalSize } from './hooks/useTerminalSize'
import { useMouseMode } from './hooks/useMouseMode'
import { useLiveHandoff, type LiveHandoffStatus } from './live-handoff/useLiveHandoff'

const PROJECTS_ROOT = join(homedir(), '.claude', 'projects')
const SIDEBAR_WIDTH = 36

function directModeEntry(filePath: string): AvailableSessionEntry {
  return {
    status: 'available',
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
  | { status: 'selected'; entry: AvailableSessionEntry; entries: SessionEntry[] }

function SelectedSession({ entry, terminalWidth, terminalHeight, onExit, onLiveHandoff, handoffStatus }: {
  entry: AvailableSessionEntry
  terminalWidth: number
  terminalHeight: number
  onExit: () => void
  onLiveHandoff: () => void
  handoffStatus: LiveHandoffStatus
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const loadState = useSession(entry.filePath)

  useInput((input, key) => {
    if (loadState.status === 'error') {
      if (input === 'q' || key.escape) onExit()
      return
    }
    if (input === 's') setSidebarCollapsed(v => !v)
    if (input === 'o') onLiveHandoff()
  })

  const feedWidth = sidebarCollapsed ? terminalWidth : terminalWidth - SIDEBAR_WIDTH - 1
  const feedHeight = terminalHeight - 1 // reserve one row for the status line

  if (loadState.status === 'loading') {
    return <Text dimColor>Loading {entry.filePath}…</Text>
  }
  if (loadState.status === 'error') {
    return (
      <Box flexDirection="column">
        <Text color="red">Failed to load {entry.filePath}: {loadState.message}</Text>
        <Text dimColor>Esc/q back</Text>
      </Box>
    )
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
          screenOffset={{ x: sidebarCollapsed ? 0 : SIDEBAR_WIDTH + 1, y: 0 }}
        />
      </Box>
      <Text dimColor>
        j/k or wheel scroll line · Alt-j/k jump section · click toggle · Ctrl-F/B page · g/G top/bottom · Enter/Space expand · s sidebar · o handoff · Esc/q back
        {handoffStatus.state === 'active' && ` · live at ${handoffStatus.url}`}
        {handoffStatus.state === 'error' && ` · handoff failed: ${handoffStatus.message}`}
      </Text>
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
  const { status: handoffStatus, trigger: triggerLiveHandoff } = useLiveHandoff()
  useMouseMode()

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
        onLiveHandoff={() => triggerLiveHandoff(directModePath)}
        handoffStatus={handoffStatus}
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
        onLiveHandoff={() => triggerLiveHandoff(state.entry.filePath)}
        handoffStatus={handoffStatus}
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
      onLiveHandoff={entry => triggerLiveHandoff(entry.filePath)}
    />
  )
}
