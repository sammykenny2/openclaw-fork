# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Also read `AGENTS.md` for detailed repository guidelines, multi-agent safety rules, and maintainer conventions.

## Build, Test, and Lint Commands

```bash
pnpm install                  # Install dependencies (pnpm required)
pnpm build                    # Full build (a2ui bundle + tsdown + plugin SDK dts + build info)
pnpm tsgo                     # TypeScript type-check only
pnpm check                    # Run all checks: format:check + tsgo + lint
pnpm lint                     # Oxlint (Rust-based, type-aware)
pnpm lint:fix                 # Oxlint autofix + format
pnpm format                   # Oxfmt (Rust-based formatter)

# Testing (Vitest + V8 coverage)
pnpm test                     # Unit + integration tests (parallel runner)
pnpm test:coverage            # With V8 coverage (70% threshold)
pnpm test:e2e                 # End-to-end tests (vitest.e2e.config.ts)
pnpm test:live                # Live API tests (requires OPENCLAW_LIVE_TEST=1)
pnpm test:watch               # Vitest watch mode

# Run a single test file
npx vitest run src/path/to/file.test.ts

# Dev
pnpm openclaw ...             # Run CLI in dev mode
pnpm gateway:dev              # Gateway with auto-reload (skips channels)
pnpm gateway:watch            # Gateway with file watching
pnpm ui:dev                   # Vite dev server for Control UI

# Pre-PR validation
pnpm build && pnpm check && pnpm test
```

## Architecture Overview

OpenClaw is a **multi-channel personal AI assistant gateway** — a WebSocket control plane that routes messages between messaging channels and an AI agent runtime.

```
Messaging Channels (WhatsApp/Telegram/Slack/Discord/Signal/iMessage/Teams/Matrix/...)
                             |
                   Gateway (WebSocket server, ws://127.0.0.1:18789)
                             |
              +--------------+--------------+
              |              |              |
        Pi Agent Runtime  Session Store  Channel Router
        (RPC mode)        (SQLite/JSON)  (routing rules)
              |
        +-----+------+--------+
        |     |      |        |
      Models Tools  Hooks  Sandbox
      (OAuth)       (SDK)  (Docker)
```

### Key Source Modules (`src/`)

- **`gateway/`** — WebSocket server, auth, RPC dispatch, config hot-reload, control UI serving
- **`agents/`** — Pi agent runner (RPC), model selection/failover, OAuth rotation, context compaction, tool definitions, bash execution
- **`channels/`** — Unified channel interface (`dock.ts`), allowlists, reactions, command gating
- **Channel implementations** — `telegram/`, `discord/`, `slack/`, `signal/`, `imessage/`, `web/` (WhatsApp via Baileys)
- **`config/`** — YAML/JSON5 config loading/merging, session store (SQLite + JSON)
- **`cli/`** — Commander.js command tree, dependency injection (`createDefaultDeps`)
- **`commands/`** — Individual CLI command implementations
- **`plugins/`** + **`plugin-sdk/`** — Plugin discovery/loading and public SDK
- **`media/`** — Image/audio/video processing pipeline
- **`browser/`** — Playwright-based web automation
- **`infra/`** — Errors, env normalization, paths, port detection, runtime guards
- **`logging/`** — Structured logging (tslog), console capture

### Extensions (`extensions/`)

pnpm workspace packages for channel plugins and features (35+ extensions). Each has its own `package.json`. Keep plugin-only deps in the extension, not root. Runtime resolves `openclaw/plugin-sdk` via jiti alias.

### Control UI (`ui/`)

Vite + Lit web components. Uses **legacy decorators** (`@state()`, `@property()`) — `experimentalDecorators: true`, `useDefineForClassFields: false` in tsconfig.

### Native Apps (`apps/`)

- `macos/` — Swift/SwiftUI menubar app
- `ios/` — Swift/SwiftUI
- `android/` — Kotlin/Jetpack Compose

## Coding Conventions

- **TypeScript ESM**, strict mode. Avoid `any`.
- Formatting/linting enforced by Oxfmt + Oxlint — run `pnpm check` before commits.
- Naming: **OpenClaw** (product/docs), `openclaw` (CLI/package/config keys).
- Keep files under ~500 LOC (guideline, not hard limit); refactor when it improves clarity.
- Tests colocated: `*.test.ts` next to source, `*.e2e.test.ts` for E2E, `*.live.test.ts` for live API tests.
- Commits: use `scripts/committer "<msg>" <file...>` (avoids manual `git add`). Concise, action-oriented messages (e.g., `CLI: add verbose flag`).
- CLI progress: use `src/cli/progress.ts`; don't hand-roll spinners.
- Tool schema guardrails: no `Type.Union` in tool inputs; use `stringEnum`/`optionalStringEnum`. No `anyOf`/`oneOf`/`allOf`. Top-level must be `type: "object"` with `properties`.
- SwiftUI: prefer `@Observable` + `@Bindable` over `ObservableObject`/`@StateObject`.
- Never update the Carbon dependency. Patched dependencies (`pnpm.patchedDependencies`) must use exact versions.

## Multi-Agent Safety

- Do **not** create/drop `git stash`, switch branches, or modify `.worktrees/*` unless explicitly requested.
- Keep unrelated WIP untouched; avoid cross-cutting state changes.
- Scope commits to your changes only (unless told "commit all").
- Lint/format-only diffs: auto-resolve without asking.

## Version Locations

`package.json` (CLI), `apps/android/app/build.gradle.kts`, `apps/ios/Sources/Info.plist`, `apps/macos/Sources/OpenClaw/Resources/Info.plist`. Do not change version numbers without explicit consent.

## Docs (`docs/`)

Mintlify-based. Internal links: root-relative, no `.md` extension (e.g., `[Config](/configuration)`). `docs/zh-CN/**` is generated — do not edit unless explicitly asked.
