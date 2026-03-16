# Obsidian Terminal

Embedded desktop terminal panel for Obsidian with PTY-backed shell sessions. The plugin is intended for running local CLI tools such as `codex` and `claude` directly inside an Obsidian side panel, similar to the VS Code terminal.

## Features

- Interactive terminal panel inside Obsidian
- PTY-backed shell session via `node-pty`
- Terminal UI rendered with `xterm.js`
- Cross-platform shell detection for Windows, macOS, and Linux
- Starts in the current vault root by default
- Simple settings for shell path and terminal font size
- Command palette actions for `Run Codex` and `Run Claude`
- Theme mode with `Auto`, `Dark`, and `Light`, where `Auto` follows the active Obsidian theme

## Limitations

- Desktop only
- First version provides one terminal session per view
- `codex`, `claude`, and other CLIs must already be installed and available on your system
- `node-pty` must build successfully for the Electron/Node runtime used on your machine

## Development

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Build the plugin bundle:

```bash
npm run build
```

## Installing Into Obsidian

1. Build the project.
2. Copy these files into your vault plugin folder:

- `manifest.json`
- `dist/main.js` as `main.js`
- `dist/terminal-helper.js` as `terminal-helper.js`
- `styles.css`

```text
<vault>/.obsidian/plugins/obsidian-terminal/
```

3. Enable the plugin in Obsidian community plugins settings.

The installed folder should look like this:

```text
<vault>/.obsidian/plugins/obsidian-terminal/manifest.json
<vault>/.obsidian/plugins/obsidian-terminal/main.js
<vault>/.obsidian/plugins/obsidian-terminal/terminal-helper.js
<vault>/.obsidian/plugins/obsidian-terminal/styles.css
```

## Release Artifact

For release downloads, package the plugin folder contents as:

```text
obsidian-terminal/
  manifest.json
  main.js
  terminal-helper.js
  styles.css
```

## Security

This plugin runs local shell commands with your user permissions. It does not sandbox terminal processes.
