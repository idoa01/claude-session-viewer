# Session Viewer

A local developer tool for visually browsing Claude Code session transcripts stored as `.jsonl` files.

## Terms

### Session
A single Claude Code conversation recorded as a `.jsonl` file. Each line is a JSON object with a `type` field. A Session has a start timestamp, an end timestamp, a working directory, and a linear sequence of Messages.

### Message
A single turn in a Session. Has a `role` (either `user` or `assistant`), a timestamp, a parent UUID, and one or more Blocks.

### Block
A typed unit of content within a Message. Variants:
- **TextBlock** — prose or markdown text.
- **ToolCallBlock** — a tool invocation made by the assistant. Has a tool name and a JSON input payload.
- **ToolResultBlock** — the output returned to the assistant after a tool call. Paired to a ToolCallBlock by `tool_use_id`.

### Empty State
The state of the app when no Session has been loaded. The app shell (header, sidebar, main area) is visible but unpopulated. The main area shows a centered prompt to load a file.

### File Input
The mechanism by which a user supplies a Session to the app. Two modes:
- **CLI mode** — a `--file=<path>` argument passed at `npm start` time. The file is injected into the app at build/serve time via a Vite plugin shim.
- **Drop mode** — a drag-and-drop target or file-picker in the Empty State UI. Uses the browser's native `FileReader` API.
