import { describe, expect, it } from 'vitest'
import { render } from 'ink-testing-library'
import { SessionBrowser } from './SessionBrowser'
import type { AvailableSessionEntry } from '../session-discovery/discoverSessions'

function makeEntry(index: number): AvailableSessionEntry {
  return {
    status: 'available',
    sessionId: `session-${index}`,
    filePath: `/tmp/session-${index}.jsonl`,
    projectDirName: `project-${index}`,
    projectLabel: `project ${index}`,
    aiTitle: `Session ${index}`,
    lastModified: index,
  }
}

function sleep(ms = 20): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function pressKeys(stdin: { write: (data: string) => void }, keys: string[]): Promise<void> {
  for (const key of keys) {
    stdin.write(key)
    await sleep()
  }
}

describe('SessionBrowser mouse support', () => {
  it('moves selection with the mouse wheel', async () => {
    const entries = Array.from({ length: 5 }, (_, i) => makeEntry(i))
    let selected: AvailableSessionEntry | undefined
    const { stdin } = render(
      <SessionBrowser entries={entries} onSelect={entry => { selected = entry }} />
    )

    await pressKeys(stdin, ['\x1b[<65;1;1M', '\r'])

    expect(selected?.sessionId).toBe('session-1')
  })

  it('selects a visible row on click without opening it', async () => {
    const entries = Array.from({ length: 5 }, (_, i) => makeEntry(i))
    let selected: AvailableSessionEntry | undefined
    const { stdin } = render(
      <SessionBrowser entries={entries} onSelect={entry => { selected = entry }} />
    )

    // Row 6 in SGR coordinates becomes zero-based y=5, which maps to visible
    // list row 2 because the list starts at zero-based terminal row 3.
    await pressKeys(stdin, ['\x1b[<0;1;6M'])
    expect(selected).toBeUndefined()

    await pressKeys(stdin, ['\r'])
    expect(selected?.sessionId).toBe('session-2')
  })
})
