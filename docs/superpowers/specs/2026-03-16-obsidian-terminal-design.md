# Obsidian Terminal Plugin Design

## Goal

Create an Obsidian desktop plugin that provides an embedded interactive terminal panel similar to the VS Code terminal, so the user can run tools like `codex` and `claude` directly inside Obsidian.

## Scope

### In Scope for v1

- Desktop-only Obsidian plugin
- Embedded interactive terminal panel inside Obsidian
- Real shell session backed by a PTY
- Cross-platform support for Windows, macOS, and Linux
- Default working directory set to the current vault root
- Basic terminal features:
  - input and output
  - ANSI colors
  - resize handling
  - configurable font size and theme
  - configurable shell path
- Single terminal session per terminal view
- Command palette action and ribbon button to open the terminal

### Out of Scope for v1

- Mobile support
- Multiple tabs or split terminals
- Built-in installation of `codex`, `claude`, or shell tools
- Full VS Code feature parity
- Guaranteed compatibility with every fullscreen TUI application

## User Experience

The plugin adds a terminal view that can be opened from the command palette or ribbon. When opened, it starts a shell in the current vault directory. The user interacts with it like a normal terminal and can launch `codex`, `claude`, or any other CLI already installed on the system.

If the plugin is loaded on mobile, it does not attempt to run a shell and instead shows a clear desktop-only message.

## Recommended Technical Approach

Use:

- `xterm.js` for terminal rendering in the Obsidian view
- `@xterm/addon-fit` for resizing the terminal to the panel
- `node-pty` for running a real shell through a pseudo-terminal

This approach is the closest match to the VS Code terminal model and is the only realistic option for interactive CLI tools that expect a TTY.

## Architecture

### `TerminalPlugin`

Responsibilities:

- load and save plugin settings
- register the custom terminal view
- register commands and ribbon action
- open or reveal the terminal panel

### `TerminalView`

Responsibilities:

- extend Obsidian `ItemView`
- create and destroy the terminal UI
- host the `xterm.js` instance
- connect terminal events to the backend session
- react to layout changes and trigger fit/resize

### `TerminalSession`

Responsibilities:

- choose the shell executable for the current platform
- spawn a PTY-backed shell process
- write terminal input to the PTY
- forward PTY output back to the terminal UI
- resize PTY rows and columns when the view changes size
- stop the process cleanly when the view closes

### `TerminalSettingsTab`

Responsibilities:

- expose settings for shell path, font size, cursor style, and theme
- validate settings where practical

## Platform Strategy

### Windows

Shell selection order:

1. `pwsh.exe`
2. `powershell.exe`
3. `cmd.exe`

### macOS and Linux

Shell selection order:

1. `$SHELL` from environment, if present
2. `zsh`
3. `bash`
4. `sh`

The plugin should always start the shell in the current vault root unless the user overrides the working directory in settings later.

## Data Flow

1. User opens the terminal view.
2. `TerminalView` creates the `xterm.js` instance.
3. `TerminalView` asks `TerminalSession` to start a shell PTY.
4. User keystrokes from `xterm.js` are sent to `TerminalSession`.
5. `TerminalSession` writes them into the PTY.
6. PTY output is sent back to `TerminalView`.
7. `TerminalView` writes the output into `xterm.js`.
8. On resize, `TerminalView` recalculates rows and columns and sends them to `TerminalSession`.

## Error Handling

- If Obsidian is running on mobile, render a non-interactive unsupported message.
- If the shell executable cannot be found, render a clear error with the shell path that failed.
- If the PTY process exits, show an exit message in the terminal and allow reopening a fresh session.
- If terminal initialization fails, keep the view alive and show a recoverable error state instead of crashing the plugin.

## Security Model

The plugin executes local shell commands with the user's own permissions. It does not sandbox commands. This is acceptable because the plugin is explicitly intended to act as a local terminal. The README and settings description should state this clearly.

## Testing Strategy

### Automated

- plugin load and unload smoke tests
- settings serialization tests
- shell selection logic tests
- terminal session lifecycle tests where feasible

### Manual

- open terminal from command palette
- verify shell starts in vault root
- run `pwd` or `Get-Location`
- run `echo hello`
- resize the panel and verify the terminal remains usable
- launch `codex`
- launch `claude`

## Main Risk

The primary technical risk is `node-pty` compatibility with the Electron runtime used by Obsidian. This must be validated during implementation and build setup. Without PTY support, the terminal will not behave like a real integrated terminal.

## Implementation Direction

Build the plugin as a desktop-only Obsidian plugin with a single integrated terminal view backed by `xterm.js` and `node-pty`. Optimize for a stable first version that supports normal shell usage and CLI agents like `codex` and `claude`, rather than trying to match all VS Code terminal features.
