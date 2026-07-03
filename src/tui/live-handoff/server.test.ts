import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import WebSocket from 'ws'
import { startLiveHandoffServer, type LiveHandoffServer } from './server'

async function makeDistDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'sesh-handoff-dist-'))
  await writeFile(join(dir, 'index.html'), '<html>web viewer</html>')
  await mkdir(join(dir, 'assets'))
  await writeFile(join(dir, 'assets', 'app.js'), 'console.log("app")')
  return dir
}

function tokenFromUrl(url: string): string {
  const match = /#token=([^&]+)/.exec(url)
  if (!match) throw new Error('no token in url')
  return match[1]
}

describe('startLiveHandoffServer', () => {
  const servers: LiveHandoffServer[] = []
  const dirsToClean: string[] = []

  afterEach(async () => {
    await Promise.all(servers.splice(0).map(s => s.close()))
    await Promise.all(dirsToClean.splice(0).map(d => rm(d, { recursive: true, force: true })))
  })

  async function setup() {
    const dir = await makeDistDir()
    dirsToClean.push(dir)
    const server = await startLiveHandoffServer(dir)
    servers.push(server)
    return { dir, server, token: tokenFromUrl(server.url) }
  }

  it('binds to 127.0.0.1 with an OS-assigned port', async () => {
    const { server } = await setup()
    expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/#token=/)
    expect(server.port).toBeGreaterThan(0)
  })

  it('serves static assets from dist', async () => {
    const { server } = await setup()
    const res = await fetch(`http://127.0.0.1:${server.port}/assets/app.js`)
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('console.log')
  })

  it('never serves content from outside dist for a path-traversal attempt', async () => {
    const { server } = await setup()
    // fetch() itself normalizes `..` out of the URL before sending, so the
    // traversal has to be percent-encoded to actually reach the server as-is.
    // sirv resolves the path, sees it escapes `dist/`, and falls back to the
    // SPA's index.html (200) rather than ever reading /etc/passwd — that
    // fallback, not a particular status code, is the safety property.
    const res = await fetch(`http://127.0.0.1:${server.port}/%2e%2e/%2e%2e/%2e%2e/etc/passwd`)
    const body = await res.text()
    expect(body).not.toContain('root:')
    expect(body).toContain('web viewer')
  })

  it('falls back to index.html for unknown client routes (SPA fallback)', async () => {
    const { server } = await setup()
    const res = await fetch(`http://127.0.0.1:${server.port}/some/client/route`)
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('web viewer')
  })

  it('rejects /active-session without a valid token', async () => {
    const { server } = await setup()
    const res = await fetch(`http://127.0.0.1:${server.port}/active-session`)
    expect(res.status).toBe(401)
  })

  it('rejects /active-session with a wrong token', async () => {
    const { server } = await setup()
    const res = await fetch(`http://127.0.0.1:${server.port}/active-session`, {
      headers: { 'x-sesh-token': 'wrong-token' },
    })
    expect(res.status).toBe(401)
  })

  it('serves the TUI-designated active session with a valid token', async () => {
    const dir = await makeDistDir()
    dirsToClean.push(dir)
    const sessionDir = await mkdtemp(join(tmpdir(), 'sesh-handoff-session-'))
    dirsToClean.push(sessionDir)
    const sessionPath = join(sessionDir, 'session.jsonl')
    await writeFile(sessionPath, '{"type":"user"}\n')

    const server = await startLiveHandoffServer(dir)
    servers.push(server)
    const token = tokenFromUrl(server.url)
    server.setActiveSession(sessionPath)

    const res = await fetch(`http://127.0.0.1:${server.port}/active-session`, {
      headers: { 'x-sesh-token': token },
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('{"type":"user"}\n')
  })

  it('never accepts a client-supplied path for /active-session', async () => {
    const { server, token } = await setup()
    const res = await fetch(`http://127.0.0.1:${server.port}/active-session?path=/etc/passwd`, {
      headers: { 'x-sesh-token': token },
    })
    // No active session has been set via setActiveSession, so any client-supplied
    // path parameter must be ignored — the endpoint has no path input at all.
    expect(res.status).toBe(404)
  })

  it('rejects a WebSocket handshake without a valid subprotocol token', async () => {
    const { server } = await setup()
    const ws = new WebSocket(`ws://127.0.0.1:${server.port}/`, ['wrong-token'])
    await new Promise<void>((resolveTest, rejectTest) => {
      ws.on('open', () => rejectTest(new Error('should not have connected')))
      ws.on('error', () => resolveTest())
      ws.on('unexpected-response', () => resolveTest())
    })
  })

  it('accepts a WebSocket handshake with the valid subprotocol token', async () => {
    const { server, token } = await setup()
    const ws = new WebSocket(`ws://127.0.0.1:${server.port}/`, [token])
    await new Promise<void>((resolveTest, rejectTest) => {
      ws.on('open', () => {
        ws.close()
        resolveTest()
      })
      ws.on('error', rejectTest)
    })
  })

  it('includes a version header on /active-session that starts at 0', async () => {
    const dir = await makeDistDir()
    dirsToClean.push(dir)
    const sessionDir = await mkdtemp(join(tmpdir(), 'sesh-handoff-session-'))
    dirsToClean.push(sessionDir)
    const sessionPath = join(sessionDir, 'session.jsonl')
    await writeFile(sessionPath, '{"type":"user"}\n')

    const server = await startLiveHandoffServer(dir)
    servers.push(server)
    const token = tokenFromUrl(server.url)
    server.setActiveSession(sessionPath)

    const res = await fetch(`http://127.0.0.1:${server.port}/active-session`, {
      headers: { 'x-sesh-token': token },
    })
    expect(res.headers.get('x-session-version')).toBe('1')
  })

  it('broadcasts a version+sessionId event to connected clients on session switch', async () => {
    const { server, token } = await setup()
    const ws = new WebSocket(`ws://127.0.0.1:${server.port}/`, [token])
    await new Promise<void>((resolveOpen, rejectOpen) => {
      ws.on('open', () => resolveOpen())
      ws.on('error', rejectOpen)
    })

    const sessionDir = await mkdtemp(join(tmpdir(), 'sesh-handoff-session-'))
    dirsToClean.push(sessionDir)
    const sessionPath = join(sessionDir, 'session.jsonl')
    await writeFile(sessionPath, '{"type":"user"}\n')

    const message = new Promise<{ version: number; sessionId: string | null }>(resolveMessage => {
      ws.on('message', data => resolveMessage(JSON.parse(data.toString())))
    })
    server.setActiveSession(sessionPath)

    const event = await message
    expect(event.version).toBe(1)
    expect(event.sessionId).toBe('session.jsonl')
    ws.close()
  })

  it('increments the version on every subsequent session switch', async () => {
    const { server, token } = await setup()
    const sessionDir = await mkdtemp(join(tmpdir(), 'sesh-handoff-session-'))
    dirsToClean.push(sessionDir)
    const sessionPath = join(sessionDir, 'session.jsonl')
    await writeFile(sessionPath, '{"type":"user"}\n')

    server.setActiveSession(sessionPath)
    server.setActiveSession(sessionPath)

    const res = await fetch(`http://127.0.0.1:${server.port}/active-session`, {
      headers: { 'x-sesh-token': token },
    })
    expect(res.headers.get('x-session-version')).toBe('2')
  })
})
