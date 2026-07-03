import { readdir, stat } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { join } from 'node:path'
import pLimit from 'p-limit'
import { deriveProjectLabel } from '../../core/projectLabel'

export interface SessionEntry {
  sessionId: string
  filePath: string
  projectDirName: string
  projectLabel: string
  aiTitle: string | undefined
  lastModified: number
  error?: string
}

const SCAN_MAX_LINES = 50
const DISCOVERY_CONCURRENCY = 16

// Reads a bounded prefix of the file to find the ai-title line and the first
// cwd-bearing line, stopping once both are found — never runs the full
// parseJsonl pipeline just to build the session list. `hasValidJson` reports
// whether any scanned line parsed as JSON at all, so callers can flag empty
// or non-JSONL files as discovery-time errors without a second pass.
async function scanMetadata(
  filePath: string
): Promise<{ aiTitle?: string; cwd?: string; hasValidJson: boolean }> {
  const stream = createReadStream(filePath, { encoding: 'utf8' })
  const rl = createInterface({ input: stream })

  let aiTitle: string | undefined
  let cwd: string | undefined
  let hasValidJson = false
  let lineCount = 0

  try {
    for await (const line of rl) {
      lineCount++
      let obj: Record<string, unknown>
      try { obj = JSON.parse(line) } catch { continue }
      hasValidJson = true

      if (aiTitle === undefined && obj.type === 'ai-title' && typeof obj.aiTitle === 'string') {
        aiTitle = obj.aiTitle
      }
      if (cwd === undefined && typeof obj.cwd === 'string') {
        cwd = obj.cwd
      }

      if ((aiTitle !== undefined && cwd !== undefined) || lineCount >= SCAN_MAX_LINES) break
    }
  } finally {
    rl.close()
    stream.destroy()
  }

  return { aiTitle, cwd, hasValidJson }
}

async function discoverProjectSessions(
  projectDirName: string,
  projectDirPath: string,
  limit: ReturnType<typeof pLimit>
): Promise<SessionEntry[]> {
  let fileNames: string[]
  try {
    fileNames = (await readdir(projectDirPath)).filter(name => name.endsWith('.jsonl'))
  } catch {
    return []
  }

  return Promise.all(
    fileNames.map(fileName => limit(async (): Promise<SessionEntry> => {
      const sessionId = fileName.replace(/\.jsonl$/, '')
      const filePath = join(projectDirPath, fileName)

      let lastModified: number
      try {
        lastModified = (await stat(filePath)).mtimeMs
      } catch (e) {
        return {
          sessionId,
          filePath,
          projectDirName,
          projectLabel: deriveProjectLabel(projectDirName),
          aiTitle: undefined,
          lastModified: 0,
          error: e instanceof Error ? e.message : 'unreadable',
        }
      }

      try {
        const { aiTitle, cwd, hasValidJson } = await scanMetadata(filePath)
        return {
          sessionId,
          filePath,
          projectDirName,
          projectLabel: deriveProjectLabel(projectDirName, cwd),
          aiTitle,
          lastModified,
          error: hasValidJson ? undefined : 'no valid entries found',
        }
      } catch (e) {
        return {
          sessionId,
          filePath,
          projectDirName,
          projectLabel: deriveProjectLabel(projectDirName),
          aiTitle: undefined,
          lastModified,
          error: e instanceof Error ? e.message : 'unreadable',
        }
      }
    }))
  )
}

export async function discoverSessions(projectsRoot: string): Promise<SessionEntry[]> {
  let projectDirNames: string[]
  try {
    const dirents = await readdir(projectsRoot, { withFileTypes: true })
    projectDirNames = dirents.filter(d => d.isDirectory()).map(d => d.name)
  } catch {
    return []
  }

  const limit = pLimit(DISCOVERY_CONCURRENCY)
  const perProject = await Promise.all(
    projectDirNames.map(dirName => discoverProjectSessions(dirName, join(projectsRoot, dirName), limit))
  )

  const entries = perProject.flat()
  entries.sort((a, b) => b.lastModified - a.lastModified)
  return entries
}
