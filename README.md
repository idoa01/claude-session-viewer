# Claude Session Viewer

A local developer tool for visually browsing Claude Code session transcripts. Parses `.jsonl` files from `~/.claude/projects/` and renders them as a readable message feed with tool call inspection, diff views, and tool-type navigation.

## Features

- Browse all sessions in `~/.claude/projects/` via an in-browser directory picker (no server required)
- Filter sessions by title or project in the session picker
- Render text, tool calls, and tool results with syntax highlighting
- Diff view for file edits
- Navigate between occurrences of a given tool type (prev/next)

## Installation

```bash
npm install
```

Requires Node.js 18+ and a browser with the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) (Chrome/Edge/Arc).

## Running

### Browser mode (recommended)

```bash
npm run dev
```

Open the URL printed by Vite. Click **Browse Sessions** in the sidebar, navigate to `~/.claude/projects/`, and select it. The app remembers the directory across reloads.

### CLI mode

Load a specific `.jsonl` file directly at startup:

```bash
npm start -- --file=path/to/session.jsonl
```

The file is copied into `public/` and served automatically.

### Production build

```bash
npm run build
npm run preview
```
