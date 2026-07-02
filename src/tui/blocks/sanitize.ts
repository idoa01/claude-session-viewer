import stripAnsi from 'strip-ansi'

// Neutralizes control sequences in untrusted transcript content (Bash stdout,
// file content from Read/Write, etc.) before it reaches Ink's `Text` or a
// terminal syntax highlighter. Must run before any ANSI codes *we* generate
// (chalk/cli-highlight) are applied, so it never strips our own styling.
export function sanitizeForTerminal(text: string): string {
  // eslint-disable-next-line no-control-regex -- stripping raw control bytes is the point
  return stripAnsi(text).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
}
