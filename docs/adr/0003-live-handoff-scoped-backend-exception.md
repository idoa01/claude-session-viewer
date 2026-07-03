# 0003 — Live Handoff: a scoped exception to ADR 0001's no-backend stance

**Status:** Accepted
**Date:** 2026-07-03

## Context

The TUI Viewer (`sesh`) needs a way to pop the session it's currently showing open in the Web Viewer, and keep that browser tab in sync as the user switches sessions in the terminal (see `PLAN.md`'s Live Handoff design). ADR 0001 established this repo as a pure-frontend, no-backend tool; this feature is the first thing that needs a server process to exist at all.

## Decision

Introduce a small in-process HTTP+WebSocket server, started by the TUI on first Live Handoff trigger (the `o` key), narrowing ADR 0001 rather than superseding it:

- **No dev server, no child process.** The Web Viewer is served from its pre-built static `dist/` (the existing `vite build` output), via `sirv`. Vite itself never runs at Live Handoff time.
- **One fixed data endpoint.** `GET /active-session` serves whatever session file the TUI currently considers active. There is no client-suppliable path or query parameter anywhere in this endpoint — the TUI is the sole writer of "what is active"; the browser is only ever a reader.
- **Loopback-only.** The server binds to `127.0.0.1` on an OS-assigned ephemeral port (`server.address().port` after binding to port `0`), never `0.0.0.0`.
- **Per-launch token auth.** A random token, held only in TUI process memory, is passed to the browser via the initial URL's fragment (`#token=...`), never a query string — fragments aren't sent in HTTP requests or `Referer` headers. The Web Viewer's bootstrap reads it once from `location.hash`, clears it via `history.replaceState`, and attaches it as a request header (`x-sesh-token`) on subsequent `/active-session` fetches. The WebSocket handshake carries the same token via the `Sec-WebSocket-Protocol` subprotocol field (browsers can't set arbitrary WS headers); the server validates it during the `upgrade` event and rejects the upgrade outright (HTTP 401, socket destroyed) on a mismatch, before any client is registered.
- **Lifetime tied to the TUI process.** The server starts on first `o` press, is reused on every subsequent trigger in the same TUI session (no second instance, no second tab), and is torn down when the TUI exits.

This is implemented in `src/tui/live-handoff/`. The Web Viewer's boot path (`src/web/hooks/useSessionLoader.ts`) detects handoff mode by the mere presence of a `#token=...` fragment on load — no other entry point ever produces that fragment — and uses it instead of ADR 0001's normal `/session.jsonl` fetch.

## Consequences

- This is the only server process anywhere in the repo, and it exists only while Live Handoff is active — it never starts otherwise, and `sesh`'s Session Browser/Message Feed work identically with or without it.
- It only ever serves two things: pre-built static assets, and one fixed data endpoint scoped to the TUI's own in-memory state. It is not a general-purpose backend and shouldn't grow into one.
- It's a local dev tool, not a hardened service: the token stops other local processes/users from casually hitting the endpoint by guessing the port; it does not defend against a determined local attacker with code execution, who already has filesystem access to the same session files regardless.
- Live Handoff depends on `dist/` being fresh relative to the source — `npm install`'s `prepare` hook rebuilds it, but there's no rebuild-on-every-`sesh`-launch check.
- Session-switch live update (broadcasting a new active session over the open WebSocket, with version-based staleness handling) is a separate, later slice on top of this server — see `claude-session-viewer-dxx.9`.
