import { useState } from 'react'
import type { Session } from '../../types/session'
import styles from './PageHeader.module.css'

type SortField = 'time' | 'price'
type SortDirection = 'asc' | 'desc'

interface Props {
  session: Session | null
  filePath?: string
  sortField: SortField
  sortDirection: SortDirection
  onSort: (field: SortField) => void
}

function formatDuration(firstTimestamp: string, lastTimestamp: string): string {
  if (!firstTimestamp || !lastTimestamp) return ''
  const start = new Date(firstTimestamp).getTime()
  const end = new Date(lastTimestamp).getTime()
  const diffMs = end - start
  if (isNaN(diffMs) || diffMs < 0) return ''
  const totalMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function formatDatetime(timestamp: string): string {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  const ss = String(d.getUTCSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} UTC`
}

export function PageHeader({ session, filePath, sortField, sortDirection, onSort }: Props) {
  const [showPath, setShowPath] = useState(false)
  const arrow = sortDirection === 'asc' ? '↓' : '↑'
  const sessionTitle = session?.aiTitle ?? (session ? `Claude Code Session — ${session.project}` : 'Session Viewer')
  const fileName = filePath ? filePath.split('/').pop() ?? filePath : undefined
  const title = showPath && fileName ? fileName : sessionTitle

  return (
    <header className={styles.header}>
      <div className={styles.logo}>🤖</div>
      <div className={styles.titleGroup}>
        <div className={styles.titleRow}>
          <h1 title={showPath && filePath ? filePath : undefined}>{title}</h1>
          {filePath && (
            <button
              className={styles.titleToggle}
              onClick={() => setShowPath(v => !v)}
              title={showPath ? 'Show session title' : 'Show file path'}
            >
              {showPath ? '✕' : '📁'}
            </button>
          )}
        </div>
        {session && <p>{session.cwd}</p>}
      </div>
      {session && (
        <div className={styles.chips}>
          <div className={styles.chip}>
            <span className={styles.dot} />
            {formatDatetime(session.firstTimestamp)}
          </div>
          {session.firstTimestamp && session.lastTimestamp && (
            <div className={styles.chip}>
              ⏱ {formatDuration(session.firstTimestamp, session.lastTimestamp)}
            </div>
          )}
          <div className={styles.chip}>
            🗂 {session.project}
          </div>
        </div>
      )}
      {session && (
        <div className={styles.sortControls}>
          <button
            className={`${styles.sortBtn} ${sortField === 'time' ? styles.sortBtnActive : ''}`}
            onClick={() => onSort('time')}
          >
            Time {sortField === 'time' ? arrow : ''}
          </button>
          <button
            className={`${styles.sortBtn} ${sortField === 'price' ? styles.sortBtnActive : ''}`}
            onClick={() => onSort('price')}
          >
            Price {sortField === 'price' ? arrow : ''}
          </button>
        </div>
      )}
    </header>
  )
}
