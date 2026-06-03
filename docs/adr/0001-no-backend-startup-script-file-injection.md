# 0001 — No backend; CLI file injection via startup script

**Status:** Accepted  
**Date:** 2026-06-02

## Context

The app needs to accept a `.jsonl` file via a CLI argument (`npm start -- --file=./session.jsonl`) so the UI opens pre-loaded without any user gesture. Vite's dev server is purely static — it has no request handler that can read CLI args at runtime.

The obvious alternative is a small Node/Express backend that reads the file on request and serves it as JSON. This is simple to build but introduces a server process, a port for the API, and a distinction between "frontend" and "backend" that doesn't otherwise exist in this tool.

## Decision

No backend. File injection is handled by a startup script (`scripts/start.js`) that:
1. Reads `--file` from `process.argv`.
2. Copies the target file to `public/session.jsonl`.
3. Spawns `vite` as a child process.

The React app always attempts `fetch('/session.jsonl')` on load. If the fetch succeeds, the Session is loaded automatically. If no file was provided (no CLI arg), the fetch 404s and the app renders the Empty State with the drag-and-drop prompt.

Drop mode bypasses the startup script entirely — the browser `FileReader` API reads the file directly into memory and the same parsing pipeline runs.

## Consequences

- Zero server code. The tool is a pure static frontend with a one-time file operation at startup.
- The startup script is a maintenance surface: if Vite's spawn API changes, it needs updating.
- Multiple simultaneous sessions are not supported without re-running `npm start`. Acceptable given the one-file-at-a-time constraint.
