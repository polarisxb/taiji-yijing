# Phase 1: Engineering Infrastructure Design

## Goal

Establish testing, formatting, linting, and CI foundations so that core logic is protected by regression tests and code quality is enforced automatically.

## Context

- **Project**: 太极 · 易经决策框架 (Next.js 15 + React 19 + TypeScript + Tailwind 4)
- **Team**: Solo developer + AI-assisted
- **Hosting**: GitHub
- **Current state**: MVP v0.1, zero tests, no CI, no git hooks

## Architecture

```
Developer Local                     GitHub
┌─────────────────────┐           ┌──────────────────┐
│  Code changes        │  push     │  CI Pipeline     │
│       ↓             │ ───────→  │  lint            │
│  git commit         │           │  typecheck       │
│    ↓ (husky)        │           │  test            │
│  lint-staged        │           │  build           │
│  (prettier+eslint)  │           └──────────────────┘
└─────────────────────┘
```

## Components

### 1. Testing — Vitest

- **Why Vitest**: Native ESM, zero-config TypeScript, fast, Jest-compatible API
- **Scope**: Core logic only (`lib/matcher.ts`, `lib/feature-extractor.ts`, content schema validation)
- **Not in scope**: UI components, E2E, API route integration tests

**Test directory structure:**

```
__tests__/
├── matcher.test.ts           — Match engine scoring & ranking
├── feature-extractor.test.ts — Feature extraction from Chinese text
└── content-schema.test.ts    — Hexagram content field completeness
```

**Dependencies:**

- `vitest` (test runner)
- `@vitest/coverage-v8` (coverage reporting, optional)

### 2. Formatting — Prettier

- **Config**: `.prettierrc`
- **Rules**: 2-space indent, single quotes, trailing commas, 100 print width, no semicolons
- **Ignore**: `.prettierignore` (node_modules, .next, coverage, .superpowers)

**Dependencies:**

- `prettier`
- `eslint-config-prettier` (disable ESLint rules that conflict)

### 3. Linting — ESLint (existing, enhanced)

- Already has `eslint` + `eslint-config-next`
- Add `eslint-config-prettier` to disable formatting conflicts
- Keep existing Next.js rules as-is

### 4. Git Hooks — Husky + lint-staged

- **Hook**: `pre-commit`
- **Action**: Run Prettier + ESLint on staged files only
- **Config**: `lint-staged` section in `package.json`

**Dependencies:**

- `husky`
- `lint-staged`

### 5. CI — GitHub Actions

- **Trigger**: push to `main`, pull requests
- **Steps**: install → lint → typecheck → test → build
- **File**: `.github/workflows/ci.yml`
- **Node version**: 20.x

### 6. Package.json Scripts

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "prepare": "husky"
}
```

## Out of Scope (YAGNI)

- Component / E2E testing (UI still evolving)
- Auto-deploy (manual for now)
- Docker / containerization
- Monorepo tooling
- Pre-push hooks (CI catches what pre-commit misses)

## Success Criteria

1. `npm test` runs and passes with coverage of matcher + feature-extractor
2. `npm run format:check` passes with no diffs
3. `git commit` auto-formats staged files via husky
4. GitHub Actions CI runs on push and reports green
5. `npm run build` succeeds in CI
