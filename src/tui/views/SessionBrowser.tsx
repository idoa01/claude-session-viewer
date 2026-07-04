import { useMemo, useState } from 'react'
import { Box, Text, useApp, useInput, useStdout } from 'ink'
import TextInput from 'ink-text-input'
import type { AvailableSessionEntry, SessionEntry } from '../session-discovery/discoverSessions'

interface Props {
  entries: SessionEntry[]
  onSelect: (entry: AvailableSessionEntry) => void
  onLiveHandoff?: (entry: AvailableSessionEntry) => void
}

function formatDate(ms: number): string {
  if (!ms) return ''
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function matchesQuery(entry: SessionEntry, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    (entry.aiTitle ?? '').toLowerCase().includes(q) ||
    entry.projectLabel.toLowerCase().includes(q) ||
    entry.sessionId.toLowerCase().includes(q)
  )
}

const LIST_ROWS_RESERVED = 6 // header + filter box + status line + margins

export function SessionBrowser({ entries, onSelect, onLiveHandoff }: Props) {
  const { exit } = useApp()
  const { stdout } = useStdout()
  const [query, setQuery] = useState('')
  const [filterFocused, setFilterFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filtered = useMemo(() => entries.filter(e => matchesQuery(e, query)), [entries, query])
  const clampedIndex = filtered.length === 0 ? 0 : Math.min(selectedIndex, filtered.length - 1)

  const visibleRows = Math.max(3, (stdout?.rows ?? 24) - LIST_ROWS_RESERVED)
  const windowStart = Math.max(0, Math.min(clampedIndex - Math.floor(visibleRows / 2), Math.max(0, filtered.length - visibleRows)))
  const windowEnd = Math.min(filtered.length, windowStart + visibleRows)
  const visible = filtered.slice(windowStart, windowEnd)

  useInput((input, key) => {
    if (filterFocused) {
      if (key.escape) setFilterFocused(false)
      return
    }

    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit()
      return
    }
    if (input === '/') {
      setFilterFocused(true)
      return
    }
    if (input === 'j' || key.downArrow) {
      if (filtered.length === 0) return
      setSelectedIndex(i => Math.min(filtered.length - 1, i + 1))
      return
    }
    if (input === 'k' || key.upArrow) {
      if (filtered.length === 0) return
      setSelectedIndex(i => Math.max(0, i - 1))
      return
    }
    if (key.return && filtered.length > 0) {
      const selected = filtered[clampedIndex]
      if (selected?.status === 'available') onSelect(selected)
      return
    }
    if (input === 'o' && filtered.length > 0) {
      const selected = filtered[clampedIndex]
      if (selected?.status === 'available') onLiveHandoff?.(selected)
    }
  }, { isActive: true })

  function handleFilterSubmit() {
    setFilterFocused(false)
    setSelectedIndex(0)
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>sesh</Text>
        <Text dimColor> — {filtered.length}/{entries.length} sessions</Text>
      </Box>
      <Box>
        <Text dimColor>/ </Text>
        <TextInput
          value={query}
          onChange={q => { setQuery(q); setSelectedIndex(0) }}
          onSubmit={handleFilterSubmit}
          focus={filterFocused}
          placeholder="filter by title, project, or session id…"
        />
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {filtered.length === 0 && (
          <Text dimColor>No sessions match "{query}"</Text>
        )}
        {visible.map((entry, i) => {
          const index = windowStart + i
          const isSelected = index === clampedIndex
          const title = entry.status === 'unavailable'
            ? `⚠ ${entry.error}`
            : entry.aiTitle ?? entry.sessionId.slice(0, 8)
          return (
            <Box key={entry.sessionId + entry.projectDirName}>
              <Text color={isSelected ? 'cyan' : undefined} inverse={isSelected}>
                {title}
              </Text>
              <Text dimColor> {entry.projectLabel} · {formatDate(entry.lastModified)}</Text>
            </Box>
          )
        })}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          {filterFocused ? 'Esc unfocus filter · Enter jump to first match' : 'j/k move · / filter · Enter open · o handoff · q quit'}
        </Text>
      </Box>
    </Box>
  )
}
