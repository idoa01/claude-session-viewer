import { useState } from 'react'
import type { ToolInteractionBlock as ToolInteractionBlockType } from '../../types/session'
import styles from './ToolInteractionBlock.module.css'

const TOOL_ICONS: Record<string, string> = {
  Read: '📄',
  Bash: '⚡',
  Write: '✏️',
  Edit: '🔧',
  AskUserQuestion: '❓',
  Skill: '🎯',
  Agent: '🤖',
  WebFetch: '🌐',
  WebSearch: '🔍',
  TodoWrite: '📝',
  Grep: '🔎',
}

// ── Tool-specific input renderers ──────────────────────────────────────────

function renderInput(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'Bash':
      return String(input.command ?? '')
    case 'Read': {
      const path = String(input.file_path ?? '')
      const offset = input.offset != null ? `:${input.offset}` : ''
      const limit = input.limit != null ? `+${input.limit}` : ''
      return `${path}${offset}${limit}`
    }
    case 'Write':
    case 'Edit':
      return String(input.file_path ?? '')
    case 'WebFetch':
    case 'WebSearch':
      return String(input.url ?? input.query ?? '')
    case 'Grep':
      return [input.pattern, input.path].filter(Boolean).join(' in ')
    case 'Skill':
      return String(input.skill ?? '')
    case 'Agent':
      return String(input.description ?? input.prompt ?? '').slice(0, 120)
    default:
      return ''
  }
}

// ── AskUserQuestion ────────────────────────────────────────────────────────

interface QuestionOption {
  label: string
  description?: string
  preview?: string
}

interface Question {
  question: string
  header?: string
  multiSelect?: boolean
  options: QuestionOption[]
}

function AskUserQuestionBody({ input }: { input: Record<string, unknown> }) {
  const questions = input.questions as Question[]
  const [activeTab, setActiveTab] = useState(0)
  const q = questions[activeTab]

  return (
    <div className={styles.auqBlock}>
      {questions.length > 1 && (
        <div className={styles.tabs}>
          {questions.map((question, i) => (
            <button
              key={i}
              className={`${styles.tab} ${i === activeTab ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(i)}
            >
              {question.header ?? `Question ${i + 1}`}
            </button>
          ))}
        </div>
      )}
      <div className={styles.questionBody}>
        {questions.length === 1 && q.header && (
          <div className={styles.questionHeader}>{q.header}</div>
        )}
        <div className={styles.questionText}>{q.question}</div>
        {q.multiSelect && <div className={styles.multiSelectBadge}>multi-select</div>}
        <div className={styles.optionList}>
          {q.options.map((opt, oi) => (
            <div key={oi} className={styles.option}>
              <div className={styles.optionLabel}>{opt.label}</div>
              {opt.description && <div className={styles.optionDesc}>{opt.description}</div>}
              {opt.preview && <pre className={styles.optionPreview}>{opt.preview}</pre>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  block: ToolInteractionBlockType
}

export function ToolInteractionBlock({ block }: Props) {
  const isAuq = block.name === 'AskUserQuestion' && Array.isArray(block.input.questions)
  const [open, setOpen] = useState(isAuq)
  const icon = TOOL_ICONS[block.name] ?? '🔧'
  const summary = renderInput(block.name, block.input)

  return (
    <div className={styles.block}>
      <div className={styles.header} onClick={() => setOpen(o => !o)}>
        <span className={styles.icon}>{icon}</span>
        <span className={styles.name}>{block.name}</span>
        {summary && <span className={styles.summary}>{summary}</span>}
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>▼</span>
      </div>
      {open && (
        <div className={styles.body}>
          {isAuq
            ? <AskUserQuestionBody input={block.input} />
            : <pre>{JSON.stringify(block.input, null, 2)}</pre>
          }
          {block.result && (
            <div className={styles.result}>
              <div className={styles.resultLabel}>
                ↩ Result{block.result.truncated ? '' : ''}
                {block.result.truncated && <span className={styles.truncatedTag}>truncated</span>}
              </div>
              <pre>{block.result.content}</pre>
            </div>
          )}
          {!block.result && (
            <div className={styles.noResult}>no result</div>
          )}
        </div>
      )}
    </div>
  )
}
