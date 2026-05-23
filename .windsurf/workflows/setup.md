---
description: Set up the development environment for a new contributor or fresh clone
---

## Project Setup

### 1. Install dependencies

// turbo

```bash
npm install
```

### 2. Clone Superpowers skills framework

```bash
git clone https://github.com/obra/superpowers.git .superpowers
```

### 3. Verify dev server starts

// turbo

```bash
npm run dev
```

### 4. Run tests

// turbo

```bash
npm test
```

### Notes

- `.superpowers/` is git-ignored — each dev clones it locally
- `.windsurfrules` configures the AI agent to follow Superpowers methodology
- Implementation plans live in `docs/superpowers/plans/`
- Design specs live in `docs/superpowers/specs/`
