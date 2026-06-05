import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { langFromPath } from '../../config/languages'
import type { ToolInteractionBlock as ToolInteractionBlockType } from '../../types/session'
import styles from './ToolInteractionBlock.module.css'
import textStyles from './TextBlock.module.css'

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

// ── AgentBlock ─────────────────────────────────────────────────────────────

function AgentBlock({ input }: { input: Record<string, unknown> }) {
  const description = String(input.description ?? '')
  const prompt = String(input.prompt ?? '')
  const agentType = input.subagent_type ? String(input.subagent_type) : 'claude'

  return (
    <div className={styles.bashBlock}>
      <div className={styles.bashDescription}>
        <span className={styles.agentType}>{agentType}</span>
        {description && <span>{description}</span>}
      </div>
      {prompt && (
        <div className={styles.agentPrompt}>
          <div className={textStyles.text}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{prompt}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

// ── WriteBlock ─────────────────────────────────────────────────────────────

function WriteBlock({ input }: { input: Record<string, unknown> }) {
  const filePath = String(input.file_path ?? '')
  const content = String(input.content ?? '')
  const lang = langFromPath(filePath)

  return (
    <div className={styles.bashBlock}>
      <div className={styles.bashDescription}>{filePath}</div>
      <SyntaxHighlighter
        language={lang}
        style={diffTheme as never}
        customStyle={{ margin: 0, padding: '10px 12px', background: 'transparent', overflowX: 'auto' }}
        PreTag="div"
      >
        {content}
      </SyntaxHighlighter>
    </div>
  )
}

// ── BashBlock ──────────────────────────────────────────────────────────────

function BashBlock({ input }: { input: Record<string, unknown> }) {
  const command = String(input.command ?? '')
  const description = input.description ? String(input.description) : null

  return (
    <div className={styles.bashBlock}>
      {description && <div className={styles.bashDescription}>{description}</div>}
      <SyntaxHighlighter
        language="bash"
        style={diffTheme as never}
        customStyle={{ margin: 0, padding: '10px 12px', background: 'transparent', overflowX: 'auto' }}
        PreTag="div"
      >
        {command}
      </SyntaxHighlighter>
    </div>
  )
}

// ── EditDiff ───────────────────────────────────────────────────────────────

const diffTheme: Record<string, React.CSSProperties> = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...(oneDark['pre[class*="language-"]'] as React.CSSProperties),
    background: 'transparent',
    margin: 0,
    padding: 0,
    fontSize: '12px',
    lineHeight: '1.6',
  },
  'code[class*="language-"]': {
    ...(oneDark['code[class*="language-"]'] as React.CSSProperties),
    background: 'transparent',
    fontSize: '12px',
    lineHeight: '1.6',
  },
}

function EditDiff({ input }: { input: Record<string, unknown> }) {
  const filePath = String(input.file_path ?? '')
  const oldString = String(input.old_string ?? '')
  const newString = String(input.new_string ?? '')
  const lang = langFromPath(filePath)

  const oldLines = oldString.split('\n')
  const newLines = newString.split('\n')

  function DiffLines({ lines, prefix, bg }: { lines: string[]; prefix: string; bg: string }) {
    const code = lines.map(l => `${prefix} ${l}`).join('\n')
    return (
      <div style={{ background: bg }}>
        <SyntaxHighlighter
          language={lang}
          style={diffTheme as never}
          customStyle={{ margin: 0, padding: '0 12px', background: 'transparent', overflowX: 'auto' }}
          PreTag="div"
          wrapLines
          lineProps={(_lineNumber: number) => ({
            style: { display: 'block', whiteSpace: 'pre' },
          })}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    )
  }

  return (
    <div className={styles.editDiff}>
      <div className={styles.diffHeader}>
        <span className={styles.diffHeaderPath}>{filePath}</span>
      </div>
      <div className={styles.diffBody}>
        {oldLines.length > 0 && oldString !== '' && (
          <DiffLines lines={oldLines} prefix="-" bg="rgba(239,68,68,0.08)" />
        )}
        {newLines.length > 0 && newString !== '' && (
          <DiffLines lines={newLines} prefix="+" bg="rgba(74,222,128,0.08)" />
        )}
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
  const isEdit = block.name === 'Edit'
  const isBash = block.name === 'Bash'
  const isWrite = block.name === 'Write'
  const isAgent = block.name === 'Agent'
  const isInputless = block.name === 'Read' || block.name === 'Skill'
  const [open, setOpen] = useState(isAuq || isEdit || isAgent)
  const [resultExpanded, setResultExpanded] = useState(false)
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
            : isEdit
              ? <EditDiff input={block.input} />
              : isBash
                ? <BashBlock input={block.input} />
                : isWrite
                  ? <WriteBlock input={block.input} />
                  : isAgent
                    ? <AgentBlock input={block.input} />
                    : isInputless
                      ? null
                      : <pre>{JSON.stringify(block.input, null, 2)}</pre>
          }
          {block.result && (
            <div className={styles.result}>
              <div className={styles.resultLabel}>
                ↩ Result
                {block.result.truncated && (
                  <button
                    className={styles.truncatedTag}
                    onClick={e => { e.stopPropagation(); setResultExpanded(v => !v) }}
                  >
                    {resultExpanded ? 'truncate' : 'truncated'}
                  </button>
                )}
              </div>
              {isAgent
                ? (
                  <div className={`${styles.agentResult} ${block.result.truncated && !resultExpanded ? styles.resultTruncated : ''}`}>
                    <div className={textStyles.text}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.result.content}</ReactMarkdown>
                    </div>
                  </div>
                )
                : (
                  <pre className={block.result.truncated && !resultExpanded ? styles.resultTruncated : undefined}>
                    {block.result.content}
                  </pre>
                )
              }
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
