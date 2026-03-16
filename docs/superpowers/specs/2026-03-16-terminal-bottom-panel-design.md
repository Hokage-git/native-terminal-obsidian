# Terminal Bottom Panel Design

## Goal

Change the integrated terminal so it always opens in Obsidian's bottom dock area instead of the right sidebar.

## User Outcome

When the user clicks the ribbon icon or runs any terminal-related command, the terminal should appear as a bottom panel that reduces the height of the central workspace. This should feel like a native Obsidian panel, not a custom in-view layout hack.

## Scope

### In Scope

- Open the terminal view in the bottom workspace area
- Reuse the existing terminal leaf if it is already open
- Keep `Run Codex` and `Run Claude` targeting the same bottom terminal view
- Preserve the current terminal UI, PTY session, and settings behavior

### Out of Scope

- Adding a user setting for placement
- Supporting both right and bottom placement
- Reworking terminal rendering or process management
- DOM-level layout hacks outside Obsidian workspace APIs

## Recommended Approach

Use Obsidian's workspace leaf API to create the terminal view in the bottom dock area. The plugin should continue to register the same custom view type and should only change the leaf acquisition logic in the activation path.

This is preferable to any DOM manipulation because it preserves native Obsidian resizing, docking, and reveal behavior.

## Architecture Change

### `ObsidianTerminalPlugin.activateView`

Current behavior:

- find an existing terminal leaf
- otherwise create a right leaf

New behavior:

- find an existing terminal leaf
- otherwise create a bottom leaf
- set the terminal view state on that leaf
- reveal the leaf and return the `TerminalView`

No changes are required in:

- `TerminalView`
- `TerminalSession`
- `xterm` adapter
- settings persistence

## Data Flow

1. User triggers ribbon or command.
2. Plugin checks for an existing terminal leaf of the registered terminal view type.
3. If found, plugin reveals that leaf.
4. If not found, plugin requests a new bottom leaf from the workspace.
5. Plugin sets the terminal view state on that leaf.
6. Obsidian renders the terminal in the bottom dock area.

## Compatibility Strategy

Prefer a direct bottom-leaf workspace API if present in the current Obsidian runtime. If the API surface differs slightly by version, keep the compatibility handling local to `activateView()` and avoid introducing workspace-specific branching elsewhere in the codebase.

The implementation should not manipulate Obsidian layout DOM directly.

## Error Handling

- If the workspace cannot provide a bottom leaf through the expected API, fail narrowly in the activation path rather than corrupting layout state.
- Reuse any existing terminal leaf before attempting to create a new one, to avoid duplicates.

## Testing Strategy

### Automated

- update plugin activation tests to expect bottom leaf acquisition instead of right leaf acquisition
- verify an existing terminal leaf is still reused
- verify terminal commands continue to call `activateView()` and operate on the returned view

### Manual

- click the ribbon button and confirm the terminal opens below the editor
- run `Open integrated terminal` from the command palette and confirm the same placement
- run `Run Codex` and `Run Claude` and confirm the bottom panel is reused
- resize the panel vertically and confirm the editor area shrinks and expands above it

## Risk

The main risk is Obsidian workspace API variance around bottom leaf creation. This is contained to one method and should be validated with tests and a manual launch in Obsidian after implementation.
