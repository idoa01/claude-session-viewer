import { useState, useEffect } from 'react'
import type { FilterType } from '../../types/filter'
import type { Message, ToolInteractionBlock } from '../../types/session'
import { useSessionLoader } from '../../hooks/useSessionLoader'
import { PageHeader } from '../PageHeader/PageHeader'
import { Sidebar } from '../Sidebar/Sidebar'
import { MessageFeed } from '../MessageFeed/MessageFeed'
import { EmptyState } from '../EmptyState/EmptyState'
import styles from './App.module.css'

type SortField = 'time' | 'price'
type SortDirection = 'asc' | 'desc'

export default function App() {
  const { state, loadFile } = useSessionLoader()
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortField, setSortField] = useState<SortField>('time')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection(field === 'price' ? 'desc' : 'asc')
    }
  }

  // Global drag-and-drop
  useEffect(() => {
    const onDragOver = (e: DragEvent) => e.preventDefault()
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer?.files[0]
      if (file) loadFile(file)
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [loadFile])

  const session = state.status === 'loaded' ? state.session : null

  // tool name → ordered list of message UUIDs that contain that tool
  const toolIndex: Record<string, string[]> = session
    ? session.messages.reduce<Record<string, string[]>>((acc, m) => {
        const names = new Set(
          m.blocks
            .filter((b): b is ToolInteractionBlock => b.type === 'tool_interaction')
            .map(b => b.name)
        )
        names.forEach(name => {
          if (!acc[name]) acc[name] = []
          acc[name].push(m.uuid)
        })
        return acc
      }, {})
    : {}

  function onNavigateTool(name: string, direction: 'prev' | 'next') {
    const uuids = toolIndex[name]
    if (!uuids || uuids.length === 0) return
    if (direction === 'next') {
      for (const uuid of uuids) {
        const el = document.getElementById(uuid)
        if (el && el.getBoundingClientRect().top > 1) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return
        }
      }
    } else {
      for (let i = uuids.length - 1; i >= 0; i--) {
        const el = document.getElementById(uuids[i])
        if (el && el.getBoundingClientRect().top < -1) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return
        }
      }
    }
  }

  const filteredMessages: Message[] = session
    ? session.messages.flatMap(m => {
        if (filter === 'user') return m.role === 'user' ? [m] : []
        if (filter === 'assistant') return m.role === 'assistant' ? [m] : []
        if (filter === 'tools') return m.blocks.some(b => b.type === 'tool_interaction') ? [m] : []
        if (filter === 'no-tools') {
          const blocks = m.blocks.filter(b => b.type !== 'tool_interaction')
          return blocks.length > 0 ? [{ ...m, blocks }] : []
        }
        return [m]
      })
    : []

  const sortedMessages = [...filteredMessages].sort((a, b) => {
    let delta: number
    if (sortField === 'price') {
      delta = (a.usage?.estimatedCost ?? 0) - (b.usage?.estimatedCost ?? 0)
    } else {
      delta = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    }
    return sortDirection === 'asc' ? delta : -delta
  })

  return (
    <div className={styles.layout}>
      <PageHeader session={session} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
      <Sidebar session={session} filter={filter} onFilterChange={setFilter} onNavigateTool={onNavigateTool} onLoadSession={loadFile} />
      <main className={styles.main}>
        {state.status === 'loaded' ? (
          <MessageFeed messages={sortedMessages} />
        ) : (
          <EmptyState onFile={loadFile} />
        )}
      </main>
    </div>
  )
}
