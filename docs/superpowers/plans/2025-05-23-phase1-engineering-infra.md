# Phase 1: Engineering Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish testing, formatting, linting, and CI so core logic is regression-protected and code quality is enforced automatically.

**Architecture:** Vitest for unit tests on pure logic (`lib/`), Prettier + ESLint for formatting/linting, Husky + lint-staged for pre-commit hooks, GitHub Actions for CI pipeline.

**Tech Stack:** Vitest, Prettier, ESLint (eslint-config-prettier), Husky, lint-staged, GitHub Actions

---

## File Map

| Action | Path                                  | Responsibility                                 |
| ------ | ------------------------------------- | ---------------------------------------------- |
| Create | `vitest.config.ts`                    | Vitest configuration                           |
| Create | `__tests__/feature-extractor.test.ts` | Feature extraction unit tests                  |
| Create | `__tests__/matcher.test.ts`           | Match engine unit tests                        |
| Create | `__tests__/content-schema.test.ts`    | Hexagram content completeness                  |
| Create | `.prettierrc`                         | Prettier config                                |
| Create | `.prettierignore`                     | Files to skip formatting                       |
| Modify | `package.json`                        | Scripts + devDependencies + lint-staged config |
| Modify | `eslint.config.mjs`                   | Add prettier compat                            |
| Create | `.husky/pre-commit`                   | Git hook script                                |
| Create | `.github/workflows/ci.yml`            | CI pipeline                                    |

---

### Task 1: Install Vitest

**Files:**

- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 3: Add test scripts to package.json**

Add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify vitest runs (no tests yet)**

Run: `npx vitest run`
Expected: "No test files found" or similar (exit 0)

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest test runner"
```

---

### Task 2: Feature Extractor Tests

**Files:**

- Create: `__tests__/feature-extractor.test.ts`

- [ ] **Step 1: Write failing tests for extractFeatures**

```typescript
import { describe, it, expect } from 'vitest'
import { extractFeatures } from '@/lib/feature-extractor'

describe('extractFeatures', () => {
  describe('archetype extraction', () => {
    it('detects creating archetype from 创业', () => {
      const result = extractFeatures('我想创业，做自己的产品')
      expect(result.features.archetype).toBe('creating')
    })

    it('detects transforming archetype from 转型', () => {
      const result = extractFeatures('公司需要转型，从线下到线上')
      expect(result.features.archetype).toBe('transforming')
    })

    it('detects retreating archetype from 辞职', () => {
      const result = extractFeatures('我想辞职，离开这个公司')
      expect(result.features.archetype).toBe('retreating')
    })

    it('detects conflicting archetype from 冲突', () => {
      const result = extractFeatures('和合伙人发生了冲突，分歧很大')
      expect(result.features.archetype).toBe('conflicting')
    })
  })

  describe('phase extraction', () => {
    it('detects germinal phase from 还没开始', () => {
      const result = extractFeatures('项目还没开始，只是在计划中')
      expect(result.features.phase).toBe('germinal')
    })

    it('detects developing phase from 进行中', () => {
      const result = extractFeatures('项目进行中，已经做了三个月')
      expect(result.features.phase).toBe('developing')
    })
  })

  describe('scale extraction', () => {
    it('detects personal scale', () => {
      const result = extractFeatures('我自己一个人面对这个问题')
      expect(result.features.scale).toBe('personal')
    })

    it('detects organizational scale', () => {
      const result = extractFeatures('公司层面需要做战略调整')
      expect(result.features.scale).toBe('organizational')
    })
  })

  describe('risk extraction', () => {
    it('detects high risk', () => {
      const result = extractFeatures('这是一个重大决定，赌上了一切')
      expect(result.features.risk).toBe('high')
    })

    it('detects existential risk', () => {
      const result = extractFeatures('如果失败就破产了，生死存亡')
      expect(result.features.risk).toBe('existential')
    })
  })

  describe('keyword extraction', () => {
    it('extracts keywords from input', () => {
      const result = extractFeatures('我想创业，但是风险很高，是个重大决定')
      expect(result.keywords.length).toBeGreaterThan(0)
      expect(result.keywords).toContain('创业')
    })

    it('returns empty keywords for irrelevant text', () => {
      const result = extractFeatures('今天天气真好')
      expect(result.keywords).toHaveLength(0)
    })
  })

  describe('partial extraction', () => {
    it('only fills dimensions it can detect', () => {
      const result = extractFeatures('我想创业')
      expect(result.features.archetype).toBe('creating')
      // Other dimensions may or may not be filled
      // but should not have incorrect values
      expect(Object.keys(result.features).length).toBeGreaterThanOrEqual(1)
    })

    it('returns empty features for unrecognizable input', () => {
      const result = extractFeatures('啊啊啊啊啊')
      expect(Object.keys(result.features)).toHaveLength(0)
      expect(result.keywords).toHaveLength(0)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run __tests__/feature-extractor.test.ts`
Expected: All tests PASS (we're testing existing working code)

Note: Since the feature-extractor is already implemented, tests should pass immediately. This is acceptable — we are adding regression protection to existing code, not doing greenfield TDD.

- [ ] **Step 3: Commit**

```bash
git add __tests__/feature-extractor.test.ts
git commit -m "test: add feature-extractor unit tests"
```

---

### Task 3: Matcher Tests

**Files:**

- Create: `__tests__/matcher.test.ts`

- [ ] **Step 1: Write tests for matcher internals and matchHexagrams**

```typescript
import { describe, it, expect } from 'vitest'
import { matchHexagrams } from '@/lib/matcher'

describe('matchHexagrams', () => {
  describe('basic matching', () => {
    it('returns top N results', () => {
      const response = matchHexagrams({ situation: '我想创业，从零开始做一个新产品' }, 3)
      expect(response.matches).toHaveLength(3)
    })

    it('results are sorted by total score descending', () => {
      const response = matchHexagrams({ situation: '我想创业，刚开始筹备' })
      const scores = response.matches.map((m) => m.score.total)
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThanOrEqual(scores[i - 1])
      }
    })

    it('each match has valid score fields', () => {
      const response = matchHexagrams({ situation: '团队冲突很严重' })
      for (const match of response.matches) {
        expect(match.score.total).toBeGreaterThanOrEqual(0)
        expect(match.score.total).toBeLessThanOrEqual(1)
        expect(match.score.keyword).toBeGreaterThanOrEqual(0)
        expect(match.score.feature).toBeGreaterThanOrEqual(0)
        expect(match.score.theme).toBeGreaterThanOrEqual(0)
      }
    })

    it('each match has reasoning array', () => {
      const response = matchHexagrams({ situation: '创业初期很艰难' })
      for (const match of response.matches) {
        expect(Array.isArray(match.reasoning)).toBe(true)
        expect(match.reasoning.length).toBeGreaterThan(0)
      }
    })
  })

  describe('feature extraction integration', () => {
    it('extracts features and returns them', () => {
      const response = matchHexagrams({ situation: '我在公司当领导，想主动推进变革' })
      expect(response.extractedFeatures).toBeDefined()
      expect(response.extractedKeywords.length).toBeGreaterThan(0)
    })

    it('accepts pre-specified features', () => {
      const response = matchHexagrams({
        situation: '不确定下一步怎么走',
        features: { archetype: 'waiting', phase: 'germinal' },
      })
      expect(response.extractedFeatures.archetype).toBe('waiting')
      expect(response.extractedFeatures.phase).toBe('germinal')
    })
  })

  describe('scoring correctness', () => {
    it('qian (乾) ranks high for creating + leading scenarios', () => {
      const response = matchHexagrams({
        situation: '我要创业当老板，主动出击做大事，全力以赴',
      })
      const qianMatch = response.matches.find((m) => m.hexagram.number === 1)
      // 乾 should be in top 3 for this scenario
      const top3Numbers = response.matches.map((m) => m.hexagram.number)
      expect(top3Numbers).toContain(1)
    })

    it('zhun (屯) ranks high for creating + emerging + difficulty', () => {
      const response = matchHexagrams({
        situation: '创业初期非常艰难，刚开始什么都不顺利',
      })
      const top3Numbers = response.matches.map((m) => m.hexagram.number)
      expect(top3Numbers).toContain(3)
    })
  })

  describe('determinism', () => {
    it('same input produces same output', () => {
      const input = { situation: '我想辞职创业但是很犹豫' }
      const r1 = matchHexagrams(input)
      const r2 = matchHexagrams(input)
      expect(r1.matches.map((m) => m.hexagram.number)).toEqual(
        r2.matches.map((m) => m.hexagram.number),
      )
      expect(r1.matches.map((m) => m.score.total)).toEqual(r2.matches.map((m) => m.score.total))
    })
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run __tests__/matcher.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add __tests__/matcher.test.ts
git commit -m "test: add matcher engine unit tests"
```

---

### Task 4: Content Schema Tests

**Files:**

- Create: `__tests__/content-schema.test.ts`

- [ ] **Step 1: Write tests verifying all hexagrams meet schema requirements**

```typescript
import { describe, it, expect } from 'vitest'
import { ALL_HEXAGRAMS } from '@/content/hexagrams'

describe('Hexagram content schema validation', () => {
  it('ALL_HEXAGRAMS is not empty', () => {
    expect(ALL_HEXAGRAMS.length).toBeGreaterThan(0)
  })

  for (const hex of ALL_HEXAGRAMS) {
    describe(`${hex.number}. ${hex.name.chinese} (${hex.name.pinyin})`, () => {
      it('has valid number (1-64)', () => {
        expect(hex.number).toBeGreaterThanOrEqual(1)
        expect(hex.number).toBeLessThanOrEqual(64)
      })

      it('has complete name fields', () => {
        expect(hex.name.chinese).toBeTruthy()
        expect(hex.name.pinyin).toBeTruthy()
        expect(hex.name.english).toBeTruthy()
      })

      it('has trigrams', () => {
        expect(hex.trigrams.upper).toBeTruthy()
        expect(hex.trigrams.lower).toBeTruthy()
      })

      it('has valid 6-char binary', () => {
        expect(hex.binary).toMatch(/^[01]{6}$/)
      })

      it('has judgment with text and modernReading', () => {
        expect(hex.judgment.text).toBeTruthy()
        expect(hex.judgment.modernReading).toBeTruthy()
      })

      it('has image with text and modernReading', () => {
        expect(hex.image.text).toBeTruthy()
        expect(hex.image.modernReading).toBeTruthy()
      })

      it('has all situation dimensions', () => {
        expect(hex.features.archetype).toBeTruthy()
        expect(hex.features.phase).toBeTruthy()
        expect(hex.features.scale).toBeTruthy()
        expect(hex.features.power).toBeTruthy()
        expect(hex.features.agency).toBeTruthy()
        expect(hex.features.risk).toBeTruthy()
      })

      it('has keywords (at least 3)', () => {
        expect(hex.keywords.length).toBeGreaterThanOrEqual(3)
      })

      it('has themes (at least 2)', () => {
        expect(hex.themes.length).toBeGreaterThanOrEqual(2)
      })

      it('has appliesWhen (at least 2)', () => {
        expect(hex.appliesWhen.length).toBeGreaterThanOrEqual(2)
      })

      it('has antiPatterns (at least 1)', () => {
        expect(hex.antiPatterns.length).toBeGreaterThanOrEqual(1)
      })

      it('has exactly 6 yao', () => {
        expect(hex.yao).toHaveLength(6)
      })

      it('each yao has required fields', () => {
        for (const y of hex.yao) {
          expect(y.position).toBeGreaterThanOrEqual(1)
          expect(y.position).toBeLessThanOrEqual(6)
          expect(y.name).toBeTruthy()
          expect(y.text).toBeTruthy()
          expect(y.modernReading).toBeTruthy()
          expect(y.scenario).toBeTruthy()
          expect(y.actionable.length).toBeGreaterThan(0)
          expect(y.indicators.length).toBeGreaterThan(0)
        }
      })

      it('has cross-cultural parallels', () => {
        const p = hex.parallels
        const hasAny =
          (p.westernPhilosophy && p.westernPhilosophy.length > 0) ||
          (p.modernCases && p.modernCases.length > 0) ||
          (p.literature && p.literature.length > 0)
        expect(hasAny).toBe(true)
      })
    })
  }
})
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run __tests__/content-schema.test.ts`
Expected: All tests PASS (existing 3 hexagrams should be complete)

- [ ] **Step 3: Commit**

```bash
git add __tests__/content-schema.test.ts
git commit -m "test: add content schema validation tests"
```

---

### Task 5: Install and Configure Prettier

**Files:**

- Create: `.prettierrc`
- Create: `.prettierignore`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install prettier and eslint-config-prettier**

```bash
npm install -D prettier eslint-config-prettier
```

- [ ] **Step 2: Create .prettierrc**

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 3: Create .prettierignore**

```
node_modules/
.next/
coverage/
.superpowers/
package-lock.json
```

- [ ] **Step 4: Add format scripts to package.json**

Add to `"scripts"`:

```json
"format": "prettier --write .",
"format:check": "prettier --check ."
```

- [ ] **Step 5: Run format once to normalize codebase**

Run: `npm run format`
Expected: Files reformatted (shows list of changed files)

- [ ] **Step 6: Verify format check passes**

Run: `npm run format:check`
Expected: Exit 0, "All matched files use Prettier code style!"

- [ ] **Step 7: Commit**

```bash
git add .prettierrc .prettierignore package.json package-lock.json
git commit -m "chore: add prettier formatter"
git add -A
git commit -m "style: apply prettier formatting to codebase"
```

---

### Task 6: Update ESLint for Prettier Compat

**Files:**

- Modify: `eslint.config.mjs`

- [ ] **Step 1: Check current eslint config**

Read `eslint.config.mjs` to see existing structure.

- [ ] **Step 2: Add eslint-config-prettier to disable conflicting rules**

The exact edit depends on current config format. For flat config (ESLint 9):

```javascript
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/flatcompat'
import prettier from 'eslint-config-prettier'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [...compat.extends('next/core-web-vitals', 'next/typescript'), prettier]

export default eslintConfig
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore: add eslint-config-prettier to avoid conflicts"
```

---

### Task 7: Husky + lint-staged

**Files:**

- Modify: `package.json` (lint-staged config + prepare script)
- Create: `.husky/pre-commit`

- [ ] **Step 1: Install husky and lint-staged**

```bash
npm install -D husky lint-staged
```

- [ ] **Step 2: Add prepare script and lint-staged config to package.json**

Add to `"scripts"`:

```json
"prepare": "husky"
```

Add top-level key:

```json
"lint-staged": {
  "*.{ts,tsx,js,jsx}": ["prettier --write", "eslint --fix"],
  "*.{json,md,css}": ["prettier --write"]
}
```

- [ ] **Step 3: Initialize husky**

```bash
npx husky init
```

- [ ] **Step 4: Create pre-commit hook**

Write `.husky/pre-commit`:

```bash
npx lint-staged
```

- [ ] **Step 5: Test the hook works**

Make a trivial change (add empty line to a .ts file), stage it, commit:

```bash
git add -A
git commit -m "test: verify pre-commit hook"
```

Expected: lint-staged runs prettier and eslint on staged files before committing.

- [ ] **Step 6: Commit husky setup**

```bash
git add .husky/ package.json package-lock.json
git commit -m "chore: add husky + lint-staged pre-commit hooks"
```

---

### Task 8: GitHub Actions CI

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow file**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Format check
        run: npm run format:check

      - name: Test
        run: npm test

      - name: Build
        run: npm run build
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions pipeline (lint, typecheck, test, build)"
```

---

### Task 9: Full Verification

- [ ] **Step 1: Run all checks locally**

```bash
npm run lint
npm run typecheck
npm run format:check
npm test
npm run build
```

Expected: All 5 commands pass with exit 0.

- [ ] **Step 2: Verify test output is clean**

Run: `npm test`
Expected output:

```
✓ __tests__/feature-extractor.test.ts (X tests)
✓ __tests__/matcher.test.ts (X tests)
✓ __tests__/content-schema.test.ts (X tests)

Test Files  3 passed (3)
Tests       XX passed (XX)
```

- [ ] **Step 3: Final commit and push**

```bash
git push origin main
```

Verify GitHub Actions CI runs green.

---

## Self-Review Checklist

- [x] **Spec coverage**: All 5 spec components covered (Vitest, Prettier, ESLint update, Husky, CI)
- [x] **No placeholders**: Every step has complete code
- [x] **Type consistency**: All imports match actual exports (`extractFeatures`, `matchHexagrams`, `ALL_HEXAGRAMS`)
- [x] **Commands are exact**: All run commands shown with expected output
- [x] **YAGNI**: No coverage reporting, no E2E, no deployment
