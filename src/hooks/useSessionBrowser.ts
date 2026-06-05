import { useState, useCallback, useEffect } from 'react'

export interface SessionEntry {
  fileHandle: FileSystemFileHandle
  sessionId: string
  projectDirName: string
  projectLabel: string
  aiTitle: string | undefined
  lastModified: number
}

const IDB_DB_NAME = 'session-browser'
const IDB_STORE = 'handles'
const IDB_KEY = 'root'

function decodeProjectLabel(dirName: string): string {
  const parts = dirName.split('-').filter(Boolean)
  return parts.slice(-2).join('/')
}

async function extractAiTitle(fileHandle: FileSystemFileHandle): Promise<string | undefined> {
  const file = await fileHandle.getFile()
  const text = await file.text()
  for (const line of text.split('\n')) {
    if (!line.includes('"ai-title"')) continue
    try {
      const obj = JSON.parse(line)
      if (obj.type === 'ai-title' && obj.aiTitle) return obj.aiTitle as string
    } catch { /* skip */ }
  }
  return undefined
}

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(handle, IDB_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function loadHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY)
    req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle) ?? null)
    req.onerror = () => reject(req.error)
  })
}

async function scanDirectory(rootHandle: FileSystemDirectoryHandle): Promise<SessionEntry[]> {
  const entries: SessionEntry[] = []

  for await (const [projectDirName, projectHandle] of rootHandle.entries()) {
    if (projectHandle.kind !== 'directory') continue
    const projectLabel = decodeProjectLabel(projectDirName)

    for await (const [fileName, fileHandle] of (projectHandle as FileSystemDirectoryHandle).entries()) {
      if (fileHandle.kind !== 'file') continue
      if (!fileName.endsWith('.jsonl')) continue

      const sessionId = fileName.replace('.jsonl', '')
      const file = await (fileHandle as FileSystemFileHandle).getFile()
      const aiTitle = await extractAiTitle(fileHandle as FileSystemFileHandle)

      entries.push({
        fileHandle: fileHandle as FileSystemFileHandle,
        sessionId,
        projectDirName,
        projectLabel,
        aiTitle,
        lastModified: file.lastModified,
      })
    }
  }

  entries.sort((a, b) => b.lastModified - a.lastModified)
  return entries
}

type BrowserState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; entries: SessionEntry[] }
  | { status: 'error'; message: string }

export function useSessionBrowser() {
  const [state, setState] = useState<BrowserState>({ status: 'idle' })
  const [showInstructions, setShowInstructions] = useState(false)

  // On mount, try to restore a previously saved handle
  useEffect(() => {
    let cancelled = false
    async function restore() {
      try {
        const saved = await loadHandle()
        if (!saved || cancelled) return

        // Re-request permission silently; if denied the user will need to pick again
        type PermissionableHandle = FileSystemDirectoryHandle & {
          requestPermission: (opts: { mode: string }) => Promise<PermissionState>
        }
        const permission = await (saved as PermissionableHandle).requestPermission({ mode: 'read' })
        if (permission !== 'granted' || cancelled) return

        setState({ status: 'loading' })
        const entries = await scanDirectory(saved)
        if (!cancelled) setState({ status: 'ready', entries })
      } catch {
        // Stale or revoked handle — silently stay idle
      }
    }
    restore()
    return () => { cancelled = true }
  }, [])

  const openPicker = useCallback(async () => {
    setShowInstructions(false)
    if (!('showDirectoryPicker' in window)) {
      setState({ status: 'error', message: 'File System Access API not supported in this browser.' })
      return
    }
    let rootHandle: FileSystemDirectoryHandle
    try {
      rootHandle = await (window as Window & typeof globalThis & {
        showDirectoryPicker: (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle>
      }).showDirectoryPicker({ mode: 'read' })
    } catch {
      // User cancelled
      return
    }

    setState({ status: 'loading' })
    try {
      await saveHandle(rootHandle)
      const entries = await scanDirectory(rootHandle)
      setState({ status: 'ready', entries })
    } catch (e) {
      setState({ status: 'error', message: String(e) })
    }
  }, [])

  const promptPicker = useCallback(() => {
    setShowInstructions(true)
  }, [])

  const dismissInstructions = useCallback(() => {
    setShowInstructions(false)
  }, [])

  return { state, showInstructions, promptPicker, openPicker, dismissInstructions }
}
