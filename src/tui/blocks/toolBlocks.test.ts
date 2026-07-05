import { describe, it, expect } from 'vitest'
import chalk from 'chalk'
import stripAnsi from 'strip-ansi'
import { renderToolBlockBody, renderInputSummary, renderMarkdown } from './toolBlocks'
import type { ToolInteractionBlock } from '../../core/types/session'

// Force color output regardless of the test runner's TTY detection, since
// these tests assert on the actual ANSI codes chalk/cli-highlight produce.
chalk.level = 2

function block(overrides: Partial<ToolInteractionBlock>): ToolInteractionBlock {
  return { type: 'tool_interaction', id: 't1', name: 'Bash', input: {}, ...overrides }
}

describe('renderInputSummary', () => {
  it('summarizes a Bash command', () => {
    expect(renderInputSummary('Bash', { command: 'ls -la' })).toBe('ls -la')
  })
  it('summarizes an Edit by file path', () => {
    expect(renderInputSummary('Edit', { file_path: '/a/b.ts' })).toBe('/a/b.ts')
  })
})

describe('renderToolBlockBody', () => {
  it('renders an Edit block with old lines and new lines both present', () => {
    const b = block({
      name: 'Edit',
      input: { file_path: '/a/b.ts', old_string: 'const x = 1', new_string: 'const x = 2' },
    })
    const text = stripAnsi(renderToolBlockBody(b, false, { width: 80, activeTab: 0 }))
    expect(text).toContain('- const x = 1')
    expect(text).toContain('+ const x = 2')
  })

  it('colors Edit removed lines and added lines differently', () => {
    const b = block({
      name: 'Edit',
      input: { file_path: '/a/b.ts', old_string: 'old', new_string: 'new' },
    })
    const raw = renderToolBlockBody(b, false, { width: 80, activeTab: 0 })
    expect(raw).toContain('[48;5;52m') // removed-line background
    expect(raw).toContain('[48;5;22m') // added-line background
  })

  it('renders a Bash command with syntax highlighting applied', () => {
    const b = block({ name: 'Bash', input: { command: 'echo hi' } })
    const raw = renderToolBlockBody(b, false, { width: 80, activeTab: 0 })
    expect(stripAnsi(raw)).toContain('echo hi')
  })

  it('renders a Write block with the file path and syntax-highlighted content', () => {
    const b = block({ name: 'Write', input: { file_path: '/a/b.ts', content: 'const x = 1' } })
    const text = stripAnsi(renderToolBlockBody(b, false, { width: 80, activeTab: 0 }))
    expect(text).toContain('/a/b.ts')
    expect(text).toContain('const x = 1')
  })

  it('renders all AskUserQuestion questions with tab-cycling when there are multiple', () => {
    const b = block({
      name: 'AskUserQuestion',
      input: {
        questions: [
          { question: 'Pick a color', header: 'Color', options: [{ label: 'red' }, { label: 'blue' }] },
          { question: 'Pick a size', header: 'Size', options: [{ label: 'small' }, { label: 'large' }] },
        ],
      },
    })
    const tab0 = stripAnsi(renderToolBlockBody(b, false, { width: 80, activeTab: 0 }))
    const tab1 = stripAnsi(renderToolBlockBody(b, false, { width: 80, activeTab: 1 }))
    expect(tab0).toContain('Pick a color')
    expect(tab0).not.toContain('Pick a size')
    expect(tab1).toContain('Pick a size')
    expect(tab1).not.toContain('Pick a color')
  })

  it('renders an Agent block prompt through markdown', () => {
    const b = block({
      name: 'Agent',
      input: { subagent_type: 'Explore', description: 'find files', prompt: '**bold** prompt' },
    })
    const raw = renderToolBlockBody(b, false, { width: 80, activeTab: 0 })
    expect(stripAnsi(raw)).toContain('bold')
    expect(stripAnsi(raw)).toContain('find files')
  })

  it('collapses truncated results by default and expands on request', () => {
    const longContent = 'x'.repeat(1000)
    const b = block({ name: 'Bash', input: { command: 'echo' }, result: { content: longContent, truncated: true } })
    const collapsed = stripAnsi(renderToolBlockBody(b, false, { width: 80, activeTab: 0 }))
    const expanded = stripAnsi(renderToolBlockBody(b, true, { width: 80, activeTab: 0 }))
    expect(collapsed.length).toBeLessThan(expanded.length)
    expect(expanded).toContain(longContent)
  })

  it('falls back to a generic JSON view for unrecognized tools', () => {
    const b = block({ name: 'SomeOtherTool', input: { foo: 'bar' } })
    const text = stripAnsi(renderToolBlockBody(b, false, { width: 80, activeTab: 0 }))
    expect(text).toContain('"foo"')
    expect(text).toContain('"bar"')
  })

  it('shows "no result" when the block has no result', () => {
    const b = block({ name: 'Bash', input: { command: 'echo' } })
    const text = stripAnsi(renderToolBlockBody(b, false, { width: 80, activeTab: 0 }))
    expect(text).toContain('no result')
  })

  it('neutralizes raw ANSI/OSC escape sequences embedded in untrusted tool output', () => {
    const malicious = 'before\x1b]0;pwned\x07\x1b[2Jafter'
    const b = block({ name: 'Bash', input: { command: 'echo' }, result: { content: malicious, truncated: false } })
    const raw = renderToolBlockBody(b, false, { width: 80, activeTab: 0 })
    // Neither the OSC title-set nor the screen-clear sequence should survive verbatim.
    expect(raw).not.toContain('\x1b]0;pwned\x07')
    expect(raw).not.toContain('\x1b[2J')
    expect(stripAnsi(raw)).toContain('beforeafter')
  })

  it('neutralizes escape sequences embedded in tool input (e.g. a crafted Bash command)', () => {
    const b = block({ name: 'Bash', input: { command: 'echo hi\x1b]0;pwned\x07' } })
    const raw = renderToolBlockBody(b, false, { width: 80, activeTab: 0 })
    expect(raw).not.toContain('\x1b]0;pwned\x07')
  })
})

describe('renderMarkdown', () => {
  it('renders headings without a § section prefix', () => {
    const text = stripAnsi(renderMarkdown('# Hello', 80))
    expect(text).toContain('Hello')
    expect(text).not.toContain('§')
  })

  it('renders bold text with ANSI bold styling', () => {
    const raw = renderMarkdown('**important**', 80)
    // The plain text is present after stripping ANSI
    expect(stripAnsi(raw)).toContain('important')
    // Some ANSI styling should be present (bold = \x1b[1m or similar)
    expect(raw.length).toBeGreaterThan(stripAnsi(raw).length)
  })

  it('renders inline code with ANSI styling', () => {
    const raw = renderMarkdown('use `npm install`', 80)
    expect(stripAnsi(raw)).toContain('npm install')
    // Styled output should have ANSI codes around the code span
    expect(raw.length).toBeGreaterThan(stripAnsi(raw).length)
  })

  it('renders bullet lists with bullet characters', () => {
    const text = stripAnsi(renderMarkdown('- foo\n- bar', 80))
    expect(text).toContain('foo')
    expect(text).toContain('bar')
    // Some non-alphanumeric bullet marker should appear
    expect(text).toMatch(/[•\-*]\s*foo/)
  })

  it('renders fenced code blocks with the code content', () => {
    const md = '```js\nconsole.log("hi")\n```'
    const text = stripAnsi(renderMarkdown(md, 80))
    expect(text).toContain('console.log')
  })

  it('unescapes HTML entities in the output', () => {
    // marked encodes certain chars; with unescape:true they should come back
    const text = stripAnsi(renderMarkdown('A &amp; B', 80))
    expect(text).toContain('A & B')
  })

  it('strips trailing blank lines', () => {
    const result = renderMarkdown('hello', 80)
    expect(result).not.toMatch(/\n\s*$/)
  })
})
