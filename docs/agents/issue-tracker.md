# Issue tracker: Beads

Issues for this repo live as Beads issues. Use the `bd` CLI for all operations.

Run `bd prime` to understand important commands and workflows for AI agents.

## Conventions

- When you use `bd` use `--json` to get the details structured.
- Each issue (PRD or task) should have a title and description, descriptions should be in md format, use heredocs for multiline bodies.
- Each PRD needs to live inside one `epic` issue:
  - Use `--type epic` when creating the PRD level issue
  - Use
- Issues:
  - issues under the PRD level should be created with `--type bug|feature|task|epic|chore|decision`, the default should be `--type task`
  - issues under the PRD should be created with `--parent <epic-id>` with the id of the parent epic
  - give each issue a relevant priority with `-p <level>` with levels 0-4 or P0-P4, 0=highest) (default "2")
  - set issue dependencies with `--deps`. Dependencies in format 'type:id' or 'id' (e.g., 'discovered-from:bd-20,blocks:bd-15' or 'bd-20')
- When you need to understand what to do now, use `bd ready`
- When you start working on an issue, claim it.
- When you finsh to work on an issue, and you passed the acceptance, close it.

## When a skill says "publish to the issue tracker"

Create a Beads issue with `bd create`.

## When a skill says "fetch the relevant ticket"

Run `bd show <issue-id> --json`, and also `bd comments <issue-id> --json` if comment history matters.

## Mapping canonical triage roles to Beads

Beads is an AI-agent-first issue tracker so, by default, new issues are ready to be claimed by an AI agent through `bd ready`. Here's how the canonical triage roles map to beads issues:

| Canonical triage label     | Beads status         | Beads labels              | Description                              |
| -------------------------- | -------------------- | --------------------------| ---------------------------------------- |
| `needs-triage`             | Blocked              | `human`, `needs-triage`   | Maintainer needs to evaluate this issue  |
| `needs-info`               | Blocked              | `human`, `needs-info`     | Waiting on reporter for more information |
| `ready-for-agent`          | Open                 | None                      | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | Open                 | `human`                   | Requires human implementation            |
| `wontfix`                  | Closed               | `wont-fix`                | Will not be actioned                     |

Example: Add an issue that needs triaging: `bd create <id> --status blocked --add-label human,needs-triage`
