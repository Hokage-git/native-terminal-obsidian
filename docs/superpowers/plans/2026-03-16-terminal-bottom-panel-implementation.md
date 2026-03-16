# Terminal Bottom Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the integrated terminal always open in Obsidian's bottom dock area instead of the right sidebar.

**Architecture:** Keep the existing terminal view, PTY session, and commands unchanged. Limit the behavior change to the plugin activation path so the workspace chooses a bottom leaf for new terminal views while still reusing an existing terminal leaf when present.

**Tech Stack:** TypeScript, Obsidian plugin API, Vitest

---

## Chunk 1: Update activation behavior with TDD

### Task 1: Change terminal leaf placement to the bottom dock

**Files:**
- Modify: `tests/main.test.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Write the failing test**

Add a test in `tests/main.test.ts` that expects `activateView()` to request a bottom leaf instead of a right leaf when no terminal leaf already exists.

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `npm test -- main.test.ts`
Expected: FAIL because the plugin still requests the right leaf.

- [ ] **Step 3: Write minimal implementation**

Update `src/main.ts` so `activateView()` reuses an existing terminal leaf and otherwise requests a bottom leaf from the workspace before setting the terminal view state.

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `npm test -- main.test.ts`
Expected: PASS

## Chunk 2: Verify no regressions

### Task 2: Run focused and full verification

**Files:**
- Verify: `tests/main.test.ts`
- Verify: all tests

- [ ] **Step 1: Run the targeted test suite**

Run: `npm test -- main.test.ts`
Expected: PASS

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: build completes successfully.
