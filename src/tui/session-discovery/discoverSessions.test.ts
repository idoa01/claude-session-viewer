import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm, chmod, utimes } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { discoverSessions } from './discoverSessions'

function line(obj: unknown): string {
  return JSON.stringify(obj)
}

async function makeTempRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'sesh-discovery-'))
}

describe('discoverSessions', () => {
  const dirsToClean: string[] = []
  afterEach(async () => {
    await Promise.all(dirsToClean.splice(0).map(d => rm(d, { recursive: true, force: true })))
  })

  it('returns an empty list when the projects root does not exist', async () => {
    const root = join(tmpdir(), 'sesh-discovery-does-not-exist')
    expect(await discoverSessions(root)).toEqual([])
  })

  it('returns an empty list when the projects root has no project directories', async () => {
    const root = await makeTempRoot()
    dirsToClean.push(root)
    expect(await discoverSessions(root)).toEqual([])
  })

  it('extracts aiTitle and derives projectLabel from cwd in one scan', async () => {
    const root = await makeTempRoot()
    dirsToClean.push(root)
    const projectDir = join(root, 'Users-x-code-my-project')
    await mkdir(projectDir)
    const content = [
      line({ type: 'ai-title', aiTitle: 'Fix the login bug' }),
      line({ type: 'user', sessionId: 'sess-1', cwd: '/Users/x/code/my-project' }),
    ].join('\n')
    await writeFile(join(projectDir, 'sess-1.jsonl'), content)

    const entries = await discoverSessions(root)
    expect(entries).toHaveLength(1)
    expect(entries[0].sessionId).toBe('sess-1')
    expect(entries[0].aiTitle).toBe('Fix the login bug')
    expect(entries[0].projectLabel).toBe('code/my-project')
    expect(entries[0].error).toBeUndefined()
  })

  it('falls back to the encoded-directory-name split when no cwd line is found', async () => {
    const root = await makeTempRoot()
    dirsToClean.push(root)
    const projectDir = join(root, 'Users-x-code-my-project')
    await mkdir(projectDir)
    await writeFile(join(projectDir, 'sess-1.jsonl'), line({ type: 'ai-title', aiTitle: 'No cwd here' }))

    const entries = await discoverSessions(root)
    expect(entries[0].projectLabel).toBe('my/project')
  })

  it('disambiguates the hyphen-ambiguous case using cwd', async () => {
    const root = await makeTempRoot()
    dirsToClean.push(root)
    // Both of these encode to the same directory name.
    const projectDir = join(root, 'Users-x-code-my-cool-project')
    await mkdir(projectDir)
    await writeFile(
      join(projectDir, 'sess-1.jsonl'),
      line({ type: 'user', sessionId: 'sess-1', cwd: '/Users/x/code/my/cool-project' })
    )

    const entries = await discoverSessions(root)
    expect(entries[0].projectLabel).toBe('my/cool-project')
  })

  it('sorts entries by mtime, most recent first', async () => {
    const root = await makeTempRoot()
    dirsToClean.push(root)
    const projectDir = join(root, 'Users-x-code-my-project')
    await mkdir(projectDir)
    await writeFile(join(projectDir, 'old.jsonl'), line({ type: 'ai-title', aiTitle: 'Old' }))
    await writeFile(join(projectDir, 'new.jsonl'), line({ type: 'ai-title', aiTitle: 'New' }))
    const now = new Date()
    await utimes(join(projectDir, 'old.jsonl'), now, new Date(now.getTime() - 60_000))
    await utimes(join(projectDir, 'new.jsonl'), now, now)

    const entries = await discoverSessions(root)
    expect(entries.map(e => e.aiTitle)).toEqual(['New', 'Old'])
  })

  it('marks an unreadable file as a visible error entry instead of dropping it', async () => {
    const root = await makeTempRoot()
    dirsToClean.push(root)
    const projectDir = join(root, 'Users-x-code-my-project')
    await mkdir(projectDir)
    const filePath = join(projectDir, 'unreadable.jsonl')
    await writeFile(filePath, line({ type: 'ai-title', aiTitle: 'Secret' }))
    await chmod(filePath, 0o000)

    try {
      const entries = await discoverSessions(root)
      expect(entries).toHaveLength(1)
      expect(entries[0].sessionId).toBe('unreadable')
      expect(entries[0].error).toBeDefined()
    } finally {
      await chmod(filePath, 0o644)
    }
  })

  it('bounds concurrent file reads without dropping any entries across many files', async () => {
    const root = await makeTempRoot()
    dirsToClean.push(root)
    const projectDir = join(root, 'Users-x-code-my-project')
    await mkdir(projectDir)
    const fileCount = 40
    await Promise.all(
      Array.from({ length: fileCount }, (_, i) =>
        writeFile(join(projectDir, `sess-${i}.jsonl`), line({ type: 'ai-title', aiTitle: `Title ${i}` }))
      )
    )

    const entries = await discoverSessions(root)
    expect(entries).toHaveLength(fileCount)
  })
})
