# Obsidian Terminal Plugin Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop-only Obsidian plugin that embeds an interactive terminal panel backed by a PTY so the user can run local CLI tools like `codex` and `claude` inside Obsidian.

**Architecture:** The plugin uses an Obsidian `ItemView` to host an `xterm.js` terminal UI and a `TerminalSession` service to bridge the UI with a real shell process created through `node-pty`. A small settings layer controls shell selection, theme, and startup behavior while keeping the first version limited to one terminal session per view.

**Tech Stack:** TypeScript, Obsidian plugin API, xterm.js, @xterm/addon-fit, node-pty, Vitest, Vite

---

## Chunk 1: Scaffold and test core shell logic

### Task 1: Create plugin package and test tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `esbuild.config.mjs`
- Create: `manifest.json`

- [ ] **Step 1: Write the failing shell selection test**

Create `tests/terminal-shell.test.ts` with an assertion that imports a missing `resolveShellCommand` helper and checks Windows and Unix fallback behavior.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- terminal-shell.test.ts`
Expected: FAIL because the module does not exist yet.

- [ ] **Step 3: Write minimal package and build configuration**

Create the package metadata, scripts, TypeScript config, Vitest config, plugin manifest, and ignore rules needed to run tests and build the plugin.

- [ ] **Step 4: Implement minimal shell resolution module**

Create `src/terminal/shell.ts` with a `resolveShellCommand` function that picks the shell by platform and environment according to the design spec.

- [ ] **Step 5: Run the targeted test to verify it passes**

Run: `npm test -- terminal-shell.test.ts`
Expected: PASS

### Task 2: Add terminal session lifecycle tests

**Files:**
- Create: `src/terminal/session.ts`
- Create: `src/terminal/types.ts`
- Create: `tests/terminal-session.test.ts`

- [ ] **Step 1: Write the failing terminal session tests**

Add tests for:
- starting a PTY-backed session with cwd and shell command
- forwarding PTY output to a listener
- writing user input back to the PTY
- resizing the PTY
- disposing the process cleanly

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- terminal-session.test.ts`
Expected: FAIL because `TerminalSession` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `TerminalSession` with dependency injection for the PTY factory so tests can use a fake PTY object.

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `npm test -- terminal-session.test.ts`
Expected: PASS

## Chunk 2: Build the Obsidian view and settings

### Task 3: Add plugin settings behavior

**Files:**
- Create: `src/settings.ts`
- Create: `tests/settings.test.ts`

- [ ] **Step 1: Write the failing settings tests**

Cover:
- default settings values
- merging saved settings over defaults
- desktop/mobile guard value handling

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- settings.test.ts`
Expected: FAIL because the settings module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create settings types, defaults, and a helper to normalize loaded settings.

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `npm test -- settings.test.ts`
Expected: PASS

### Task 4: Add terminal view behavior

**Files:**
- Create: `src/terminal/view.ts`
- Create: `tests/terminal-view.test.ts`

- [ ] **Step 1: Write the failing terminal view tests**

Cover:
- rendering an unsupported message on mobile
- initializing terminal UI on desktop
- creating a session in the vault root
- forwarding PTY output into the terminal
- forwarding terminal input into the session

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- terminal-view.test.ts`
Expected: FAIL because `TerminalView` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `TerminalView` with constructor-injected factories for the terminal UI and session so the tests can use fakes without a real DOM-heavy terminal stack.

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `npm test -- terminal-view.test.ts`
Expected: PASS

### Task 5: Add settings tab behavior

**Files:**
- Create: `src/settings-tab.ts`
- Create: `tests/settings-tab.test.ts`

- [ ] **Step 1: Write the failing settings tab tests**

Cover:
- rendering controls for shell path and font size
- updating plugin settings on change

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- settings-tab.test.ts`
Expected: FAIL because the settings tab does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create a small Obsidian settings tab that updates plugin settings through a callback.

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `npm test -- settings-tab.test.ts`
Expected: PASS

## Chunk 3: Wire plugin entry point and production terminal adapter

### Task 6: Add plugin entry point behavior

**Files:**
- Create: `src/main.ts`
- Create: `tests/main.test.ts`

- [ ] **Step 1: Write the failing plugin tests**

Cover:
- loading settings on startup
- registering the terminal view
- adding command and ribbon action
- opening the terminal view

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- main.test.ts`
Expected: FAIL because the plugin entry point does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create the plugin class and registration code needed to satisfy the tests.

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `npm test -- main.test.ts`
Expected: PASS

### Task 7: Add real xterm and PTY adapter

**Files:**
- Create: `src/terminal/xterm-adapter.ts`
- Modify: `src/terminal/view.ts`
- Modify: `src/terminal/session.ts`

- [ ] **Step 1: Write the failing integration-oriented tests**

Add tests that verify the default desktop factories are wired when no fakes are supplied.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- terminal-view.test.ts main.test.ts`
Expected: FAIL because production factories are not wired.

- [ ] **Step 3: Write minimal implementation**

Create the `xterm.js` adapter and default PTY-backed session factory using `node-pty`, and update `TerminalView` to use them in production.

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `npm test -- terminal-view.test.ts main.test.ts`
Expected: PASS

## Chunk 4: Build, verify, and document

### Task 8: Add plugin README and usage notes

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

Document:
- what the plugin does
- desktop-only limitation
- dependency/build requirements for `node-pty`
- how to build and install into an Obsidian vault

- [ ] **Step 2: Review the README against the implemented behavior**

Check that commands, filenames, and limitations match the code.

### Task 9: Full verification

**Files:**
- Verify: `dist/main.js`
- Verify: all test files

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: build completes and emits the bundled plugin entry.

- [ ] **Step 3: Sanity-check manifest and build outputs**

Verify that `manifest.json` and the built bundle are present and aligned with the plugin name and id.
