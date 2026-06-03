import type { Session } from '../../types/session'
import type { FilterType } from '../../types/filter'
import { formatCost, formatTokens } from '../../utils/pricing'
import styles from './Sidebar.module.css'

interface Props {
  session: Session | null
  filter: FilterType
  onFilterChange: (f: FilterType) => void
  onNavigateTool: (name: string, direction: 'prev' | 'next') => void
}

const TOOL_ICONS: Record<string, string> = {
  Read: '📄',
  Bash: '⚡',
  Write: '✏️',
  AskUserQuestion: '❓',
  Skill: '🎯',
  Edit: '🔧',
  Agent: '🤖',
}

function getToolIcon(name: string): string {
  return TOOL_ICONS[name] ?? '🔧'
}

function formatTimestamp(ts: string): string {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

type FilterOption = { value: FilterType; label: string }
const FILTERS: FilterOption[] = [
  { value: 'all', label: 'All messages' },
  { value: 'user', label: 'User' },
  { value: 'assistant', label: 'Claude' },
  { value: 'tools', label: 'Tools only' },
  { value: 'no-tools', label: 'Hide tools' },
]

export function Sidebar({ session, filter, onFilterChange, onNavigateTool }: Props) {
  const totalTools = session
    ? Object.values(session.toolCounts).reduce((a, b) => a + b, 0)
    : 0

  const sortedTools = session
    ? Object.entries(session.toolCounts).sort((a, b) => b[1] - a[1])
    : []

  return (
    <aside className={styles.sidebar}>
      {/* Stats */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Stats</div>
        <div className={styles.kpiGrid}>
          <div className={styles.kpi}>
            <div className={styles.kpiValue}>{session ? session.messages.length : 0}</div>
            <div className={styles.kpiLabel}>Messages</div>
          </div>
          <div className={styles.kpi}>
            <div className={styles.kpiValue}>{session ? session.assistantCount : 0}</div>
            <div className={styles.kpiLabel}>AI turns</div>
          </div>
          <div className={styles.kpi}>
            <div className={styles.kpiValue}>{session ? session.userCount : 0}</div>
            <div className={styles.kpiLabel}>User turns</div>
          </div>
          <div className={styles.kpi}>
            <div className={styles.kpiValue}>{totalTools}</div>
            <div className={styles.kpiLabel}>Tool calls</div>
          </div>
        </div>
      </div>

      {/* Cost & Tokens */}
      {session && session.totalUsage.estimatedCost > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>
            Cost · {session.models.join(', ')}
          </div>
          <div className={styles.costCard}>
            <div className={styles.costRow}>
              <span className={styles.costLabel}>Est. cost</span>
              <span className={styles.costValue}>{formatCost(session.totalUsage.estimatedCost)}</span>
            </div>
            <div className={styles.costRow}>
              <span className={styles.costLabel}>Input</span>
              <span className={styles.costMuted}>{formatTokens(session.totalUsage.inputTokens)}</span>
            </div>
            <div className={styles.costRow}>
              <span className={styles.costLabel}>Output</span>
              <span className={styles.costMuted}>{formatTokens(session.totalUsage.outputTokens)}</span>
            </div>
            <div className={styles.costRow}>
              <span className={styles.costLabel}>Cache read</span>
              <span className={styles.costMuted}>{formatTokens(session.totalUsage.cacheReadTokens)}</span>
            </div>
            <div className={styles.costRow}>
              <span className={styles.costLabel}>Cache write</span>
              <span className={styles.costMuted}>{formatTokens(session.totalUsage.cacheCreationTokens)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Duration */}
      {session && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Duration</div>
          <div className={styles.durationCard}>
            <div className={styles.durationRow}>
              <span>Start</span>
              <span className={styles.durationTime}>{formatTimestamp(session.firstTimestamp)}</span>
            </div>
            <div className={styles.gradientBar} />
            <div className={styles.durationRow}>
              <span>End</span>
              <span className={styles.durationTime}>{formatTimestamp(session.lastTimestamp)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tools Used */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Tools Used</div>
        {sortedTools.length === 0 ? (
          <div className={styles.empty}>No tools yet</div>
        ) : (
          <div className={styles.toolList}>
            {sortedTools.map(([name, count]) => (
              <div key={name} className={styles.toolItem}>
                <span className={styles.toolIcon}>{getToolIcon(name)}</span>
                <span className={styles.toolName}>{name}</span>
                <span className={styles.toolNav}>
                  <button
                    className={styles.toolNavBtn}
                    onClick={() => onNavigateTool(name, 'prev')}
                    title={`Previous ${name}`}
                  >↑</button>
                  <button
                    className={styles.toolNavBtn}
                    onClick={() => onNavigateTool(name, 'next')}
                    title={`Next ${name}`}
                  >↓</button>
                </span>
                <span className={styles.toolCount}>{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Filter</div>
        <div className={styles.filterGroup}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              className={`${styles.filterBtn} ${filter === f.value ? styles.filterBtnActive : ''}`}
              onClick={() => onFilterChange(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
