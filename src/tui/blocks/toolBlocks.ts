import chalk from 'chalk'
import { highlight } from 'cli-highlight'
import { Marked } from 'marked'
import { markedTerminal } from 'marked-terminal'
import { langFromPath } from '../../core/languages'
import type { ToolInteractionBlock } from '../../core/types/session'
import { sanitizeForTerminal } from './sanitize'

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

export function toolIcon(name: string): string {
  return TOOL_ICONS[name] ?? '🔧'
}

export function renderInputSummary(name: string, input: Record<string, unknown>): string {
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

// One marked-terminal instance per width, mirroring renderBlockLines.ts's
// text-block rendering (marked-terminal wraps prose to `width`).
const markedByWidth = new Map<number, Marked>()

function getMarked(width: number): Marked {
  let instance = markedByWidth.get(width)
  if (!instance) {
    instance = new Marked()
    instance.use(markedTerminal({ width, reflowText: true }) as Parameters<Marked['use']>[0])
    markedByWidth.set(width, instance)
  }
  return instance
}

export function renderMarkdown(text: string, width: number): string {
  const rendered = getMarked(width).parse(sanitizeForTerminal(text), { async: false })
  return rendered.replace(/\n+$/, '')
}

function highlightCode(code: string, language: string): string {
  try {
    return highlight(sanitizeForTerminal(code), { language })
  } catch {
    return sanitizeForTerminal(code)
  }
}

function renderBashBody(input: Record<string, unknown>): string {
  const command = String(input.command ?? '')
  const description = input.description ? String(input.description) : null
  const lines: string[] = []
  if (description) lines.push(chalk.dim(sanitizeForTerminal(description)))
  lines.push(highlightCode(command, 'bash'))
  return lines.join('\n')
}

function renderWriteBody(input: Record<string, unknown>): string {
  const filePath = String(input.file_path ?? '')
  const content = String(input.content ?? '')
  const lang = langFromPath(filePath)
  return [chalk.dim(sanitizeForTerminal(filePath)), highlightCode(content, lang)].join('\n')
}

function renderDiffSide(lines: string[], prefix: string, bg: (s: string) => string, lang: string): string {
  return lines
    .map(line => bg(`${prefix} ${highlightCode(line, lang)}`))
    .join('\n')
}

function renderEditBody(input: Record<string, unknown>): string {
  const filePath = String(input.file_path ?? '')
  const oldString = String(input.old_string ?? '')
  const newString = String(input.new_string ?? '')
  const lang = langFromPath(filePath)

  const parts = [chalk.dim(sanitizeForTerminal(filePath))]
  if (oldString !== '') {
    parts.push(renderDiffSide(oldString.split('\n'), '-', chalk.bgAnsi256(52), lang))
  }
  if (newString !== '') {
    parts.push(renderDiffSide(newString.split('\n'), '+', chalk.bgAnsi256(22), lang))
  }
  return parts.join('\n')
}

function renderAgentBody(input: Record<string, unknown>, width: number): string {
  const description = String(input.description ?? '')
  const prompt = String(input.prompt ?? '')
  const agentType = input.subagent_type ? String(input.subagent_type) : 'claude'

  const header = [chalk.cyan(`[${sanitizeForTerminal(agentType)}]`), description && chalk.dim(sanitizeForTerminal(description))]
    .filter(Boolean)
    .join(' ')
  const parts = [header]
  if (prompt) parts.push(renderMarkdown(prompt, width))
  return parts.join('\n')
}

interface Question {
  question: string
  header?: string
  multiSelect?: boolean
  options: Array<{ label: string; description?: string; preview?: string }>
}

// AskUserQuestion cycles between questions with Tab; `activeTab` is owned by
// the caller (viewport state), not this renderer, since it must survive
// across re-renders and participate in the line-count cache key.
function renderAskUserQuestionBody(input: Record<string, unknown>, activeTab: number): string {
  const questions = (input.questions as Question[] | undefined) ?? []
  if (questions.length === 0) return ''
  const index = Math.min(activeTab, questions.length - 1)
  const q = questions[index]!

  const parts: string[] = []
  if (questions.length > 1) {
    const tabs = questions
      .map((question, i) => {
        const label = question.header ?? `Question ${i + 1}`
        return i === index ? chalk.inverse(` ${label} `) : chalk.dim(` ${label} `)
      })
      .join('')
    parts.push(tabs)
  }
  if (q.header) parts.push(chalk.bold(sanitizeForTerminal(q.header)))
  parts.push(sanitizeForTerminal(q.question))
  if (q.multiSelect) parts.push(chalk.dim('[multi-select]'))
  for (const opt of q.options) {
    parts.push(`  • ${chalk.bold(sanitizeForTerminal(opt.label))}`)
    if (opt.description) parts.push(`    ${chalk.dim(sanitizeForTerminal(opt.description))}`)
    if (opt.preview) parts.push(sanitizeForTerminal(opt.preview).split('\n').map(l => `    ${l}`).join('\n'))
  }
  return parts.join('\n')
}

export interface ToolBlockRenderOptions {
  width: number
  activeTab: number
}

// Renders a tool block's body (everything below the header line): the
// tool-specific input view, plus the result (if any), honoring truncation.
// `resultExpanded` only affects the result's visibility, not the input view.
export function renderToolBlockBody(
  block: ToolInteractionBlock,
  resultExpanded: boolean,
  options: ToolBlockRenderOptions
): string {
  const parts: string[] = []
  switch (block.name) {
    case 'AskUserQuestion':
      if (Array.isArray(block.input.questions)) {
        parts.push(renderAskUserQuestionBody(block.input, options.activeTab))
      }
      break
    case 'Edit':
      parts.push(renderEditBody(block.input))
      break
    case 'Bash':
      parts.push(renderBashBody(block.input))
      break
    case 'Write':
      parts.push(renderWriteBody(block.input))
      break
    case 'Agent':
      parts.push(renderAgentBody(block.input, options.width))
      break
    case 'Read':
    case 'Skill':
      break
    default:
      parts.push(sanitizeForTerminal(JSON.stringify(block.input, null, 2)))
  }

  if (block.result) {
    parts.push(chalk.dim('↩ result') + (block.result.truncated ? chalk.dim(resultExpanded ? ' (expanded)' : ' (truncated, Enter to expand)') : ''))
    const content = sanitizeForTerminal(block.result.content)
    const isAgent = block.name === 'Agent'
    if (block.result.truncated && !resultExpanded) {
      const collapsed = content.slice(0, 600) + ' …'
      parts.push(isAgent ? renderMarkdown(collapsed, options.width) : collapsed)
    } else {
      parts.push(isAgent ? renderMarkdown(content, options.width) : content)
    }
  } else {
    parts.push(chalk.dim.italic('no result'))
  }

  return parts.join('\n')
}
