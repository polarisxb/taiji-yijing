---
name: testing-app-locally
description: Use when end-to-end testing this Next.js app in a browser (e.g., after adding a UI component or changing a consult flow). Covers dev server bootstrap, deterministic mode, hexagram-matching caveats, and DOM-order assertions.
---

# Testing this app locally (browser e2e)

## Bootstrap

```bash
npm install   # husky activates via prepare hook
npm run dev   # http://localhost:3000
```

If the dev server is slow to start the first time, that's the Next 15 turbopack warmup. Subsequent reloads are fast.

To run only the headless suites without a browser: `npm run typecheck && npm run lint && npm test && npm run build`. All four must pass before declaring the PR ready.

## Deterministic vs AI mode

The consult page has a mode switcher above the textarea: **AI / 经典 / 筮问卦**. For e2e UI tests that need stable results, **always switch to `经典` (classic)** before submitting. AI mode streams LLM output which is non-deterministic and slow; classic mode runs a pure keyword/embedding matcher that returns identical output for identical input.

The `筮问卦` mode randomly selects a hexagram — useful for demos, useless for testing.

## Preset → hexagram matching is NOT fixed by name

The sample presets ("公司刚拿到种子轮", "被推上高位", etc.) are textareas auto-filled with situation prose. The matcher then runs against that prose. The rank-1 hexagram depends on which keywords currently exist in `content/hexagrams/*.ts` — add a new hexagram with the right keywords and any preset can flip its rank-1.

**Implication for testing:** never write a test plan that hardcodes "the rank-1 will be 乾". Instead:

1. Submit the situation.
2. Read whichever hexagram landed as rank-1 from the rendered card.
3. Run the test logic against THAT hexagram's content.

The algorithm is hexagram-agnostic (scoring, tiebreak, cross-yao threshold) so the test still proves the feature works. Hexagrams with full content currently: **乾 (id=1), 坤 (id=2), 屯 (id=3)** — if rank-1 is anything else, the card will have no `yao` content and inline questionnaires will be empty.

## Direct hexagram detail pages

- `/hexagram/1` → 乾
- `/hexagram/2` → 坤
- `/hexagram/3` → 屯

These are the only IDs with full content. Other IDs render placeholder sections.

## MatchCard rank gating

`components/MatchCard.tsx` gates expensive / opinionated sub-features behind `rank === 1`. When verifying "a feature only shows in the top match", expand rank-2 and rank-3 cards and confirm the feature is absent — don't trust just "it's there in card 1".

## DOM-order assertions for layout

When verifying "X sits between A and B", DON'T rely only on visual scrolling — the DOM order is the source of truth and survives styling tweaks. Check the rendered HTML directly:

```
<section> 按 (SituationMapping) </section>
<section> 阶段定位 (YaoLocator) </section>
<section> 六爻·事之六阶 (YaoTimeline) </section>
```

If you're using a browser inspector tool, look for the order of `<section>` children inside the page's main container.

## Common stale-render gotcha

After navigating to a new URL (e.g. typing into the address bar), the first screenshot may briefly show the previous page's DOM while React/Next.js hydrates. Wait ~1s and re-screenshot if the content looks wrong. This is a render-timing artifact, not a bug.

## Test recording

When recording a browser test session:

- Maximize the browser window first: `sudo apt-get install -y wmctrl 2>/dev/null; wmctrl -r :ACTIVE: -b add,maximized_vert,maximized_horz`. Do NOT use `xdotool key super+Up` (tiles to half-screen on Ubuntu's default WM).
- Annotate every test boundary with `annotate_recording`: `setup` for preconditions, `test_start` for each `It should ...` test, `assertion` with `passed`/`failed`/`untested` for each meaningful checkpoint.
- Keep assertions consolidated — one annotation per meaningful state change, not per individual checkbox.

## Devin Secrets Needed

None. The app runs entirely with local content and a local matcher in classic mode. The only secret in the repo is `DEEPSEEK_API_KEY` for AI mode — not required for any e2e test that uses classic mode.
