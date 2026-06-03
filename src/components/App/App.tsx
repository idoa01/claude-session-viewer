import { useState, useEffect } from 'react'
import type { FilterType } from '../../types/filter'
import type { Message } from '../../types/session'
import { useSessionLoader } from '../../hooks/useSessionLoader'
import { PageHeader } from '../PageHeader/PageHeader'
import { Sidebar } from '../Sidebar/Sidebar'
import { MessageFeed } from '../MessageFeed/MessageFeed'
import { EmptyState } from '../EmptyState/EmptyState'
import styles from './App.module.css'

export default function App() {
  const { state, loadFile } = useSessionLoader()
  const [filter, setFilter] = useState<FilterType>('all')

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

  return (
    <div className={styles.layout}>
      <PageHeader session={session} />
      <Sidebar session={session} filter={filter} onFilterChange={setFilter} />
      <main className={styles.main}>
        {state.status === 'loaded' ? (
          <MessageFeed messages={filteredMessages} />
        ) : (
          <EmptyState onFile={loadFile} />
        )}
      </main>
    </div>
  )
}
