## Agent skills

### Issue tracker

Issues live in Beads; use the `bd` CLI. See `docs/agents/issue-tracker.md`.

**Mandatory rules — apply in every session, regardless of which skill is running:**

1. **Session start**: Run `bd prime` before doing any issue tracker work. Do not skip this even if the session feels like a continuation.
2. **Before working on an issue**: Claim it in the tracker before writing any code or making any changes.
3. **After completing an issue**: Close it in the tracker immediately. Do not batch closures to the end of a session.
4. **PRD-level issues are epics**: Every PRD-level issue must be created as an epic. Sub-issues must reference their parent epic.
5. **Closing an epic**: Close the parent epic only after every issue under it is closed. Before closing, verify that no child issue is in any non-closed state (ready, in-progress, blocked, or otherwise open). If the state of any child is unclear, display the current child issue states and ask the user for directions before proceeding.
6. **One issue per session**: Pick up exactly one issue per session. Once closed, stop — report what was done and any non-obvious decisions or complications, then go silent. See `docs/agents/issue-tracker.md` for the full stop-and-report format.

### Triage labels

Default label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
