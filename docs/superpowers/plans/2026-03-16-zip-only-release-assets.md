# Zip-Only Release Assets Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make GitHub releases publish only the packaged plugin zip file and no standalone asset files.

**Architecture:** Keep local build and packaging behavior unchanged. Limit the change to the GitHub release workflow so the release action uploads only the generated zip asset.

**Tech Stack:** GitHub Actions YAML, Vitest

---

## Chunk 1: Restrict release assets with TDD

### Task 1: Update release workflow asset selection

**Files:**
- Create: `tests/release-workflow.test.ts`
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Write the failing test**

Add a workflow test asserting that the release job uploads only `release/obsidian-terminal-*.zip`.

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `npm test -- release-workflow.test.ts`
Expected: FAIL because the workflow still lists standalone files.

- [ ] **Step 3: Write minimal implementation**

Edit `.github/workflows/release.yml` so `softprops/action-gh-release` receives only the zip glob in `with.files`.

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `npm test -- release-workflow.test.ts`
Expected: PASS

## Chunk 2: Verify no regressions

### Task 2: Run verification

**Files:**
- Verify: `.github/workflows/release.yml`
- Verify: all tests

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS
