import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useSessionBrowser } from '../../hooks/useSessionBrowser'
import type { SessionEntry } from '../../hooks/useSessionBrowser'
import styles from './SessionBrowser.module.css'

interface Props {
  onSelect: (file: File) => void
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const PROJECTS_PATH = '~/.claude/projects'

export function SessionBrowser({ onSelect }: Props) {
  const { state, showInstructions, promptPicker, openPicker, dismissInstructions } = useSessionBrowser()
  const [copied, setCopied] = useState(false)
  const [selected, setSelected] = useState<SessionEntry | null>(null)
  const [open, setOpen] = useState(true)
  const [query, setQuery] = useState('')

  async function handleSelect(entry: SessionEntry) {
    const file = await entry.fileHandle.getFile()
    setSelected(entry)
    setOpen(false)
    onSelect(file)
  }

  function handleCopy() {
    navigator.clipboard.writeText(PROJECTS_PATH).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const modal = showInstructions && createPortal(
    <div className={styles.overlay} onClick={dismissInstructions}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalTitle}>Select your Claude projects folder</div>
        <p className={styles.modalBody}>
          In the folder picker that opens, navigate to and select:
        </p>
        <div className={styles.modalPathRow}>
          <code className={styles.modalPath}>{PROJECTS_PATH}</code>
          <button className={styles.copyBtn} onClick={handleCopy} title="Copy path">
            {copied ? '✓' : '⎘'}
          </button>
        </div>
        <p className={styles.modalHint}>
          Tip: press <kbd className={styles.kbd}>⌘ Shift G</kbd> in the picker, then paste.
        </p>
        <div className={styles.modalActions}>
          <button className={styles.modalCancel} onClick={dismissInstructions}>Cancel</button>
          <button className={styles.modalConfirm} onClick={openPicker}>Open folder picker</button>
        </div>
      </div>
    </div>,
    document.body
  )

  // Collapsed pill shown after a session has been selected
  const collapsedBar = selected && !open && (
    <button className={styles.collapsedBtn} onClick={() => setOpen(true)}>
      <span className={styles.collapsedTitle}>
        {selected.aiTitle ?? <span className={styles.noTitle}>{selected.sessionId.slice(0, 8)}</span>}
      </span>
      <span className={styles.collapsedChevron}>▾</span>
    </button>
  )

  return (
    <div className={styles.root}>
      {modal}

      {/* Collapsed state */}
      {collapsedBar}

      {/* Expanded state */}
      {open && (
        <>
          {state.status === 'idle' && (
            <button className={styles.browseBtn} onClick={promptPicker}>
              Browse Sessions
            </button>
          )}
          {state.status === 'loading' && (
            <div className={styles.status}>Scanning sessions…</div>
          )}
          {state.status === 'error' && (
            <div className={styles.error}>{state.message}</div>
          )}
          {state.status === 'ready' && (
            <>
              <div className={styles.header}>
                <span>{state.entries.length} sessions</span>
                <div className={styles.headerActions}>
                  {selected && (
                    <button className={styles.rePickBtn} onClick={() => setOpen(false)}>▴ collapse</button>
                  )}
                  <button className={styles.rePickBtn} onClick={promptPicker}>re-pick</button>
                </div>
              </div>
              <input
                className={styles.search}
                type="search"
                placeholder="Filter sessions…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <div className={styles.list}>
                {state.entries.filter(entry => {
                  if (!query) return true
                  const q = query.toLowerCase()
                  return (entry.aiTitle ?? '').toLowerCase().includes(q) || entry.projectLabel.toLowerCase().includes(q)
                }).map(entry => (
                  <button
                    key={entry.sessionId}
                    className={`${styles.entry} ${selected?.sessionId === entry.sessionId ? styles.entryActive : ''}`}
                    onClick={() => handleSelect(entry)}
                  >
                    <div className={styles.title}>
                      {entry.aiTitle ?? <span className={styles.noTitle}>{entry.sessionId.slice(0, 8)}</span>}
                    </div>
                    <div className={styles.meta}>
                      <span className={styles.project}>{entry.projectLabel}</span>
                      <span className={styles.date}>{formatDate(entry.lastModified)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
