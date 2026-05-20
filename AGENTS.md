# AGENTS.md — Value Tree Selection

## Quick Start

| Action | Command |
|--------|---------|
| Dev server | `ng serve` → `http://localhost:4200` |
| Build | `ng build` → output in `dist/` |
| Unit tests | `ng test` (Vitest via Angular CLI) |
| E2E tests | `npx playwright test` (runs Playwright directly; dev server auto-starts) |
| E2E (UI mode) | `npx playwright test --ui` |
| Format | `npx prettier --write "src/**/*.{ts,html,scss}"` |

## Architecture

Standalone Angular 21 app (single project, no library boundaries). All components use inline templates except `control-panel` which uses `templateUrl`. Styles are SCSS.

- **Entry point**: `src/main.ts` → `app.ts` (root component)
- **Core service**: `src/app/services/tree-service.ts` — singleton state manager (`providedIn: 'root'`). All reactive state flows through `BehaviorSubject` streams. Components subscribe to these; the service owns tree filtering, exclusion, and branch selection logic.
- **Data model**: `src/app/models/tree-node.ts` — `TreeNode` (recursive hierarchy) and `FlatNode` (search dropdown).
- **Sample data**: `src/app/data/sample-data.ts` — hardcoded tree structure used in production and tests.
- **Components** (all standalone):
  - `graph-canvas/` — D3-rendered tree visualization with context menu
  - `control-panel/` — sidebar with node search, depth slider, level toggles, branch checkboxes
  - `node-context-menu/` — floating menu on node click (Remove, Keep Path Only, Add Back Siblings)
- **State pattern**: TreeService broadcasts via RxJS observables; components are reactive consumers (no shared component state, no signals).

## Code Discovery

**Always use `cocoindex-code_search` (semantic code search) before reading files sequentially or running raw grep.** This tool searches by meaning across the entire codebase and finds implementations, patterns, and related code without needing exact file names or keywords. Use it for:

- Finding where a feature is implemented
- Understanding how components are wired together
- Locating related code before refactoring
- Searching for patterns (e.g., "behavior subject", "D3 zoom", "context menu")

Only read files directly after semantic search narrows the candidates, or when you need full file content (e.g., before editing).

## Testing

### Unit Tests
- Framework: **Bun:test** (via Vitest globals through Angular CLI)
- Location: `src/app/**/*.spec.ts` — colocated with source (e.g., `tree-service.spec.ts` alongside `tree-service.ts`)
- Run a single file: `ng test --include="src/app/services/tree-service.spec.ts"`
- Tests import from `bun:test` (`describe`, `test`, `expect`, `beforeEach`)
- Accessing private fields in tests: cast to `any` — `(service as any).excludedNodeIdsSubject`

### E2E Tests
- Framework: **Playwright** (`@playwright/test`)
- Location: `e2e/tests/`
- Config: `playwright.config.ts` — Chromium only, auto-spawns dev server on port 4200
- Node locators use `data-testid` attributes (pattern: `data-testid="node-{Name}"` for tree nodes)
- CI: 2 retries, 1 worker. Local: 0 retries, parallel workers

## Conventions

- **Import order**: Angular core → framework modules → third-party (d3, rxjs) → local relative paths
- **Component style**: Inline template + `styleUrls` for graph-canvas and node-context-menu; `templateUrl` + `styleUrls` for control-panel
- **Prettier**: 100 char print width, single quotes, Angular parser for HTML
- **Indentation**: 2 spaces (EditorConfig enforced)
- **Schematics**: `skipTests: true` on all generators — write tests manually
- **No barrel exports** — direct relative imports only

## Gotchas

- **Dev server is required for e2e** — Playwright config auto-spawns `npm run start` but manual runs need the server running first on port 4200
- **D3 rendering is async** — e2e assertions on tree nodes need `waitForSelector` with generous timeouts (15s for initial load, 5s for post-action renders)
- **Angular 21 Ivy compiler bug**: `@Input()` properties on `node-context-menu` can be silently dropped. Verify `@Input()` bindings are actually rendered by checking the compiled output or using direct service calls in e2e when the bug surfaces
- **TreeService state is mutable** — BehaviorSubjects hold `Set` instances that are mutated in-place before calling `.next()`. Tests that modify excluded IDs must account for shared mutable state between `beforeEach` cycles
