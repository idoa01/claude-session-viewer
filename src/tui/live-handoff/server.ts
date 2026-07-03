import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import sirv from 'sirv'
import { WebSocketServer, WebSocket } from 'ws'

export interface LiveHandoffServer {
  url: string
  port: number
  setActiveSession(filePath: string): void
  close(): Promise<void>
}

function generateToken(): string {
  return randomBytes(24).toString('base64url')
}

function readToken(req: IncomingMessage): string | undefined {
  const header = req.headers['x-sesh-token']
  return typeof header === 'string' ? header : undefined
}

export function startLiveHandoffServer(distDir: string): Promise<LiveHandoffServer> {
  const token = generateToken()
  let activeSessionPath: string | undefined
  let version = 0

  const serveStatic = sirv(distDir, { single: 'index.html', dev: false })

  const server: Server = createServer((req, res) => {
    const pathname = req.url ? new URL(req.url, 'http://localhost').pathname : '/'
    if (pathname === '/active-session') {
      handleActiveSession(req, res)
      return
    }
    serveStatic(req, res)
  })

  function handleActiveSession(req: IncomingMessage, res: ServerResponse) {
    if (readToken(req) !== token) {
      res.writeHead(401, { 'Content-Type': 'text/plain' })
      res.end('Unauthorized')
      return
    }
    // Read the version at the moment we serve, so the response header always
    // matches the state this particular response actually reflects — not the
    // version at request time, which could be stale if a broadcast races in.
    const responseVersion = version
    if (!activeSessionPath) {
      res.writeHead(404, { 'Content-Type': 'text/plain', 'X-Session-Version': String(responseVersion) })
      res.end('No active session')
      return
    }
    readFile(activeSessionPath, 'utf8')
      .then(text => {
        res.writeHead(200, {
          'Content-Type': 'application/x-ndjson',
          'X-Session-Version': String(responseVersion),
        })
        res.end(text)
      })
      .catch((e: unknown) => {
        res.writeHead(500, { 'Content-Type': 'text/plain', 'X-Session-Version': String(responseVersion) })
        res.end(e instanceof Error ? e.message : 'Failed to read session')
      })
  }

  const wss = new WebSocketServer({
    noServer: true,
    handleProtocols: (protocols: Set<string>) => (protocols.has(token) ? token : false),
  })

  server.on('upgrade', (req, socket, head) => {
    const protocolHeader = req.headers['sec-websocket-protocol']
    const offered = typeof protocolHeader === 'string'
      ? protocolHeader.split(',').map(p => p.trim())
      : []
    if (!offered.includes(token)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
      socket.destroy()
      return
    }
    wss.handleUpgrade(req, socket, head, ws => {
      wss.emit('connection', ws, req)
    })
  })

  wss.on('connection', ws => {
    ws.on('error', () => {})
  })

  function broadcast() {
    const payload = JSON.stringify({ version, sessionId: activeSessionPath ? basename(activeSessionPath) : null })
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(payload)
    }
  }

  return new Promise((resolvePromise, reject) => {
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address === null || typeof address === 'string') {
        reject(new Error('Failed to determine Live Handoff server port'))
        return
      }
      const { port } = address
      resolvePromise({
        url: `http://127.0.0.1:${port}/#token=${token}`,
        port,
        setActiveSession(filePath: string) {
          activeSessionPath = filePath
          version += 1
          broadcast()
        },
        close() {
          return new Promise<void>(resolveClose => {
            wss.close(() => {
              server.close(() => resolveClose())
            })
          })
        },
      })
    })
  })
}
