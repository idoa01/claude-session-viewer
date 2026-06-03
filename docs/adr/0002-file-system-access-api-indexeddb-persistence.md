# 0002 — File System Access API for session browser; IndexedDB handle persistence

**Status:** Accepted  
**Date:** 2026-06-03

## Context

The session browser needs access to `~/.claude/projects/` to enumerate sessions. A backend server could serve directory listings, but ADR 0001 rules out any backend. The alternative is the browser-native File System Access API (`showDirectoryPicker()`), which lets the app read a user-granted directory entirely in-browser.

The API grants access for the lifetime of the page only. On reload, the handle is lost unless persisted. The API supports storing a `FileSystemDirectoryHandle` in IndexedDB; on subsequent loads the browser can silently re-grant the permission (with at most a one-time confirmation prompt).

## Decision

Use the File System Access API with IndexedDB persistence. The granted `FileSystemDirectoryHandle` is written to IndexedDB after a successful pick. On every page load, `useSessionBrowser` attempts to restore the saved handle and re-request read permission silently. If permission is granted, the directory is scanned immediately with no user interaction. If the handle is stale or permission is denied, the hook falls back to the idle state and the user can pick again.

## Consequences

- No server code. Stays within the no-backend constraint of ADR 0001.
- Users only need to click "Browse sessions" once; subsequent page loads restore the directory automatically.
- Stale or revoked handles are handled silently — the hook catches errors and stays idle rather than surfacing them as errors.
- The IndexedDB surface is intentionally minimal: one database (`session-browser`), one object store (`handles`), one key (`root`).
