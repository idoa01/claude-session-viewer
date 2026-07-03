export interface JsonlParseFailure {
  /** 1-indexed line number within the raw file */
  line: number
  message: string
}

/**
 * Strict, line-aware pass over raw .jsonl content, used only for error reporting.
 * parseJsonl stays permissive (skips bad lines silently) for normal rendering;
 * this reports the first `maxFailures` unparseable non-blank lines instead.
 */
export function validateJsonl(raw: string, maxFailures = 5): JsonlParseFailure[] {
  const lines = raw.split('\n')
  const failures: JsonlParseFailure[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') continue

    try {
      JSON.parse(line)
    } catch (e) {
      failures.push({ line: i + 1, message: e instanceof Error ? e.message : 'invalid JSON' })
      if (failures.length >= maxFailures) break
    }
  }

  return failures
}
