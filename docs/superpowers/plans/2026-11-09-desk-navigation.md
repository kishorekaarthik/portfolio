# Desk Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the long-scroll portfolio into a hand-drawn desk home screen whose five objects open each section as a paper sheet sliding up over the desk.

**Architecture:** Progressive enhancement on the existing single `index.html`. Without JS nothing changes (long page). A new `assets/desk.js` adds `desk-mode` to `<html>`, reveals a desk of five `<a href="#id">` objects, hides sections, and runs a small hash router that shows one section at a time as a fixed-position "sheet" with injected chrome (close button, section bar, previous/next). New styles live in `assets/desk.css`. Tests drive headless Edge/Chrome over the DevTools protocol with zero npm dependencies.

**Tech Stack:** Plain HTML/CSS/JS (ES2017, no build), inline SVG, Node ≥22 built-ins only for tests (`node:test`, `node:http`, global `WebSocket`), Microsoft Edge or Google Chrome headless.

**Spec:** `docs/superpowers/specs/2026-11-09-desk-navigation-design.md`

## Global Constraints

- Static files only, served by GitHub Pages. No build step, no frameworks, no runtime npm dependencies.
- CSP meta tag in `index.html` must stay exactly: `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'; upgrade-insecure-requests`. No inline `<script>`, no `on*=` attributes, no external URLs for scripts/styles/fonts/images.
- Section ids are fixed and reused as hashes, in this order: `about`, `skills`, `scars`, `work`, `contact`. Labels: About, Skills, Hackathons, Work, Say hello.
- Desk object ↔ section: Notebook → `about`, Toolbox → `skills`, Corkboard → `scars`, Laptop → `work`, Coffee mug → `contact`.
- Without JS: desk not shown, hero unchanged, all sections visible as today.
- Visual style: ink lines, wobbly hand-drawn shapes, existing tokens (`--bg --ink --mute --faint --card --shirt --green`) and fonts (Gaegu / Patrick Hand / Space Grotesk). Dark mode via `:root[data-theme="dark"]`.
- Transitions snappy: each zoom/slide ≤ 450 ms. `prefers-reduced-motion: reduce` → opacity fades only, no transforms.
- Mobile breakpoint is the existing `max-width: 900px`.
- History: desk→sheet pushes; sheet→sheet replaces; ✕/Esc does `history.back()` if the current entry was pushed from the desk this visit, otherwise `replaceState` to the desk URL (pathname + search, no hash).
- Sheet is `role="region"` labelled by its `h2`; not a focus trap. Desk and hero are `inert` while a sheet is open.

## Review Focus

- Rapid double-click on a desk object (or clicking during an animation) → exactly one history entry, one sheet open. Test in Task 4.
- Browser Forward after Back → sheet reopens. Test in Task 3.
- Resizing across 900 px while a sheet is open → sheet stays open and readable, correct nav visible. Test in Task 5.
- In-content hash links (e.g. "The CyberShield project →" `href="#work"` inside the Hackathons sheet, logo `href="#top"`) → routed, not native-jumped; `#top` and unknown hashes show the desk. Test in Task 3.
- Theme toggle while a sheet is open → theme changes and persists after closing. Test in Task 5.

---

## File Structure

| File | Responsibility |
|---|---|
| `index.html` (modify) | Desk markup (inside `main#top`, right after `.hero`), `<link>` to `assets/desk.css`, `<script src="assets/desk.js">` after `main.js`. |
| `assets/desk.css` (create) | All desk-mode styles: desk, objects, compact hero, sheets, sheet chrome, animations, dark, mobile, reduced motion. Every rule scoped under `.desk-mode`. |
| `assets/desk.js` (create) | Enhancement bootstrap, sheet chrome injection, router, focus/inert management, animation state. |
| `assets/main.js` (unchanged) | Theme, story tabs, image fallback, email. |
| `tests/helpers/server.mjs` (create) | Static file server for the repo root. |
| `tests/helpers/browser.mjs` (create) | Minimal CDP client: launch headless Edge/Chrome, pages, eval, click, key press, wait, error capture. |
| `tests/desk.test.mjs` (create) | All behaviour tests. |
| `package.json` (create) | `{"private": true, "type": "module", "scripts": {"test": "node --test tests/"}}` — no dependencies. |

### Shared state contract (used by CSS and tests)

- `<html>` gets class `desk-mode` when JS runs.
- `<html data-desk-state="desk|opening|sheet|switching|closing">` — the router's current state; tests wait on `desk` / `sheet`.
- The open section has class `is-open`; every other `section.s` has the `hidden` attribute in desk mode.
- Desk container: `<nav class="desk" aria-label="Desk" hidden>`; objects: `<a class="desk-obj" href="#about" data-target="about">` (SVG + `<span class="desk-label hand">`).
- Injected per-section chrome: `.sheet-bar` (contains `button.sheet-close`, `nav.sheet-nav` with five `a[href="#id"]`, `button.sheet-tg`) at the top; `nav.sheet-pn` with `a.sheet-prev` / `a.sheet-next` at the bottom.

---

### Task 1: Test harness, branch, and baseline

**Files:**
- Create: `tests/helpers/server.mjs`, `tests/helpers/browser.mjs`, `tests/desk.test.mjs`, `package.json`

**Interfaces:**
- Produces:
  - `startServer(rootDir: string): Promise<{ url: string, close(): Promise<void> }>` — serves files with correct content types (`.html .js .css .woff2 .jpeg .png .svg`), 404 otherwise, refuses paths outside root; listens on `127.0.0.1` port 0.
  - `launchBrowser(): Promise<Browser>` — finds the executable from `process.env.BROWSER_PATH`, else `C:/Program Files/Google/Chrome/Application/chrome.exe`, `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`, `C:/Program Files/Microsoft/Edge/Application/msedge.exe`, `/usr/bin/google-chrome`, `/usr/bin/chromium`; launches `--headless=new --remote-debugging-port=0 --user-data-dir=<tmp> --no-first-run`; reads `DevToolsActivePort` from the profile dir; connects with global `WebSocket`.
  - `Browser.newPage(opts?: { width=1280, height=800, mobile=false, reducedMotion=false, js=true }): Promise<Page>` — creates a target, applies `Emulation.setDeviceMetricsOverride`, `Emulation.setEmulatedMedia` (`prefers-reduced-motion`), `Emulation.setScriptExecutionDisabled` when `js:false`; enables `Runtime` and `Log`.
  - `Page.goto(url): Promise<void>` (waits for `Page.loadEventFired`), `Page.eval(expr: string): Promise<any>` (`Runtime.evaluate`, `returnByValue`, `awaitPromise`; throws on exception), `Page.click(selector): Promise<void>` (real mouse press/release at the element's centre via `Input.dispatchMouseEvent`), `Page.press(key: 'Escape'|'Tab'|'Enter'): Promise<void>`, `Page.waitFor(expr: string, timeoutMs=3000): Promise<void>` (polls every 25 ms), `Page.resize(width, height)`, `Page.errors: string[]` (console `error`, uncaught exceptions, and `Log.entryAdded` with level `error` — this catches CSP violations), `Page.close()`. `Browser.close()` kills the process and removes the profile dir.

- [ ] **Step 1: Branch and commit pending work**

```bash
git checkout -b desk-navigation
git add .gitignore index.html assets/main.js assets/fonts docs/superpowers/specs
git commit -m "Harden site: CSP, self-hosted fonts, external JS; add desk navigation spec"
```

- [ ] **Step 2: Write helpers and `package.json` per the Interfaces block.**

- [ ] **Step 3: Write baseline tests in `tests/desk.test.mjs`** (one `before` starts server + browser, `after` closes both)

```js
test('page loads without console/CSP errors', async () => {
  const p = await browser.newPage(); await p.goto(url + '/');
  assert.deepEqual(p.errors, []);
});
test('without JS: long page, desk hidden, all sections visible', async () => {
  const p = await browser.newPage({ js: false }); await p.goto(url + '/');
  assert.equal(await p.eval(`document.documentElement.classList.contains('desk-mode')`), false);
  assert.equal(await p.eval(`[...document.querySelectorAll('section.s')].filter(s => s.offsetHeight > 0).length`), 5);
  assert.equal(await p.eval(`!document.querySelector('.desk') || document.querySelector('.desk').offsetHeight === 0`), true);
});
```

- [ ] **Step 4: Run** `npm test` — Expected: both PASS (desk doesn't exist yet; `.desk` null passes the third assertion). If the browser isn't found, the error must name `BROWSER_PATH`.

- [ ] **Step 5: Commit** `git add package.json tests && git commit -m "test: zero-dependency headless browser harness"`

---

### Task 2: Desk markup, desk mode bootstrap, compact hero, dark + mobile desk

**Files:**
- Modify: `index.html` (head: add `<link rel="stylesheet" href="assets/desk.css">` after fonts.css; `main#top`: insert `nav.desk` right after the `.hero` div; end of body: `<script src="assets/desk.js"></script>` after main.js)
- Create: `assets/desk.css`, `assets/desk.js`
- Test: `tests/desk.test.mjs`

**Interfaces:**
- Consumes: Task 1 helpers.
- Produces: the shared state contract above (`desk-mode`, `data-desk-state="desk"`, `.desk`, `.desk-obj[data-target]`, sections `hidden`). `desk.js` constant `SECTIONS = [{id:'about',label:'About'},{id:'skills',label:'Skills'},{id:'scars',label:'Hackathons'},{id:'work',label:'Work'},{id:'contact',label:'Say hello'}]`.

- [ ] **Step 1: Failing tests**

```js
for (const [w, h, name] of [[1280, 800, 'desktop'], [390, 844, 'phone']]) {
  test(`desk shows on first screen (${name})`, async () => {
    const p = await browser.newPage({ width: w, height: h, mobile: w < 900 }); await p.goto(url + '/');
    await p.waitFor(`document.documentElement.dataset.deskState === 'desk'`);
    assert.equal(await p.eval(`document.querySelectorAll('.desk-obj').length`), 5);
    assert.deepEqual(await p.eval(`[...document.querySelectorAll('.desk-obj')].map(a => a.dataset.target)`),
      ['about', 'skills', 'scars', 'work', 'contact']);
    // every object fully inside the first viewport, no scrolling
    assert.equal(await p.eval(`[...document.querySelectorAll('.desk-obj')].every(a => { const r = a.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.width >= 44 && r.height >= 44; })`), true);
    assert.equal(await p.eval(`[...document.querySelectorAll('section.s')].every(s => s.hidden)`), true);
    assert.equal(await p.eval(`document.querySelector('h1').textContent.trim()`), 'Kishore Kaarthik');
    assert.equal(await p.eval(`document.documentElement.scrollWidth <= innerWidth`), true);
    assert.deepEqual(p.errors, []);
  });
}
test('desk objects have accessible names matching section labels', async () => { /* each .desk-obj innerText or aria-label contains its label */ });
test('dark desk uses dark ink', async () => {
  const p = await browser.newPage(); await p.goto(url + '/');
  await p.eval(`document.getElementById('tg').click()`);
  assert.equal(await p.eval(`getComputedStyle(document.querySelector('.desk')).color`), 'rgb(242, 242, 238)');
});
```

- [ ] **Step 2: Run** `npm test` — Expected: new tests FAIL (`.desk-obj` count 0 / deskState undefined).

- [ ] **Step 3: Markup.** In `index.html` add `<nav class="desk" aria-label="Desk" hidden>` containing: one decorative `<svg class="desk-surface" aria-hidden="true">` (desk edge line, a lamp or plant if desired) and five `a.desk-obj` in section order, each = inline `<svg aria-hidden="true">` drawing (stroke `currentColor`, fills via CSS vars `--desk-yellow`, `--desk-blue`, `--desk-pink`, `--desk-cork`, `--desk-paper`) + `<span class="desk-label hand">` with the section label. Corkboard shows two pinned mini certificates; laptop screen shows `>_`; mug has steam. Drawing details are the builder's call.

- [ ] **Step 4: `assets/desk.js` bootstrap.** IIFE, `'use strict'`. On run: add `desk-mode` to `<html>`, remove `hidden` from `.desk`, set `hidden` on every `section.s`, set `data-desk-state="desk"`. (Router comes in Task 3.)

- [ ] **Step 5: `assets/desk.css`.** All selectors prefixed `.desk-mode`. Compact hero: `min-height:auto`, avatar ≈ 84 px, padding ≈ `2rem 2rem 0.5rem`, quote smaller; hide `.note` and decorative `.d` doodles that would overlap the desk. Desktop desk: `position:relative; width:min(1000px, 100%); height:calc(100vh - <hero height>)` style sizing (e.g. `aspect-ratio:16/9; max-height:calc(100svh - 15rem)`), objects absolutely positioned by percentage. Hover/focus-visible: small wiggle (`@keyframes deskWig`, rotate ±3°) + visible focus ring. `≤900px`: desk becomes a 2-column grid (mug spans both or centred), objects stack, labels always visible, fits 390×844 with the compact hero. Dark: redefine `--desk-*` fills under `:root[data-theme="dark"]` (muted, e.g. `color-mix` with `--card`), `.desk { color: var(--ink) }`. Footer stays visible under the desk.

- [ ] **Step 6: Run** `npm test` — Expected: all PASS.

- [ ] **Step 7: Screenshot check.** Add a non-test script `tests/shots.mjs` (uses helpers; writes `tests/shots/*.png`, gitignored) capturing desk at 1280×800 light/dark and 390×844 via `Page.captureScreenshot`. Look at them: style must match the existing doodles. Add `tests/shots/` to `.gitignore`.

- [ ] **Step 8: Commit** `git add index.html assets/desk.css assets/desk.js tests .gitignore && git commit -m "feat: hand-drawn desk home screen in desk mode"`

---

### Task 3: Sheets, router, focus and history

**Files:**
- Modify: `assets/desk.js`, `assets/desk.css`
- Test: `tests/desk.test.mjs`

**Interfaces:**
- Consumes: Task 2 state contract, `SECTIONS`.
- Produces (inside the IIFE; later tasks extend them):
  - `go(id: string|null, mode: 'push'|'replace')` — the only entry point for navigation from clicks. `id` null = desk.
  - `render(id: string|null, opts: {animate: boolean})` — makes the DOM match `id`; sets `data-desk-state`; idempotent.
  - `requestClose()` — implements the ✕/Esc rule.
  - `lastOpener: string|null` — id of the sheet last shown, used to return focus to its desk object.
  - History state objects: `{kk: 'sheet', fromDesk: boolean}`.

Behaviour to implement:
- Inject chrome into each section once at startup (Shared state contract). `.sheet-close` text "✕ back to desk". `.sheet-prev` "← {prev label}" / `.sheet-next` "{next label} →"; omit at the ends. Give each section `role="region"` and `aria-labelledby` = its `h2` (assign `id="sheet-title-{id}"`, `tabindex="-1"`).
- Click delegation on `document` for `a[href^="#"]`: target id in SECTIONS → `preventDefault()` and `go(id, currentlyOnDesk ? 'push' : 'replace')`; `#top` or `#` → `go(null…)` via `requestClose()` when a sheet is open, else nothing. Other hashes: leave alone. Ignore clicks with modifier keys or non-left button.
- `go(id,'push')`: `history.pushState({kk:'sheet', fromDesk:true}, '', '#'+id)`. `'replace'`: `history.replaceState({kk:'sheet', fromDesk: history.state?.fromDesk === true}, '', '#'+id)`. Then `render`.
- `requestClose()`: if `history.state?.fromDesk` → `history.back()`; else `history.replaceState(null, '', location.pathname + location.search)` then `render(null)`.
- `popstate` and `hashchange` → `render(idFromHash(), {animate:true})`. Startup → `render(idFromHash(), {animate:false})`. Unknown hash → desk.
- `render(id)`: open section gets `is-open`, others `hidden`; `.desk` and `.hero` get `inert` (removed on desk); `body.sheet-open` locks page scroll; sidebar `nav a[href="#id"]` gets `aria-current="page"` (removed elsewhere); focus moves to the sheet's `h2` when opening, and to `.desk-obj[data-target=lastOpener]` when returning to the desk. Sheet scrolls to top on open.
- `keydown` Escape while a sheet is open → `requestClose()`.
- CSS (no motion yet): `.desk-mode section.s.is-open` is `position:fixed; top:0; bottom:0; right:0; left:var(--sidebar-w); overflow:auto; background:var(--card)` with a paper edge/shadow, z-index above desk (below sidebar's 100 on desktop), content max-width as today. Desk behind fades to ~0.25 opacity. `.sheet-nav` and `.sheet-tg` hidden above 900 px.

- [ ] **Step 1: Failing tests**

```js
const state = `document.documentElement.dataset.deskState`;
test('click object opens its sheet and focuses its heading', async () => {
  const p = await page(); await p.click('.desk-obj[data-target="about"]');
  await p.waitFor(`${state} === 'sheet'`);
  assert.equal(await p.eval(`location.hash`), '#about');
  assert.equal(await p.eval(`document.getElementById('about').hidden`), false);
  assert.equal(await p.eval(`[...document.querySelectorAll('section.s')].filter(s => !s.hidden).length`), 1);
  assert.equal(await p.eval(`document.activeElement.id`), 'sheet-title-about');
  assert.equal(await p.eval(`document.querySelector('.desk').inert`), true);
  assert.equal(await p.eval(`document.querySelector('header.sidebar nav a[href="#about"]').getAttribute('aria-current')`), 'page');
});
test('next replaces history; Back returns to desk; Forward reopens', async () => {
  const p = await page(); const len0 = await p.eval(`history.length`);
  await p.click('.desk-obj[data-target="about"]'); await p.waitFor(`${state} === 'sheet'`);
  await p.click('#about .sheet-next'); await p.waitFor(`location.hash === '#skills' && ${state} === 'sheet'`);
  assert.equal(await p.eval(`history.length`), len0 + 1);
  await p.eval(`history.back()`); await p.waitFor(`${state} === 'desk'`);
  assert.equal(await p.eval(`location.hash`), '');
  assert.equal(await p.eval(`document.activeElement.dataset.target`), 'skills');
  await p.eval(`history.forward()`); await p.waitFor(`${state} === 'sheet' && location.hash === '#skills'`);
});
test('deep link opens directly; ✕ goes to desk without adding or leaving history', async () => {
  const p = await page('/#work'); await p.waitFor(`${state} === 'sheet'`);
  const len = await p.eval(`history.length`);
  await p.click('#work .sheet-close'); await p.waitFor(`${state} === 'desk'`);
  assert.equal(await p.eval(`location.hash`), ''); assert.equal(await p.eval(`history.length`), len);
  assert.equal(await p.eval(`location.pathname`), '/');
});
test('Escape closes the sheet', /* open contact from desk, press Escape, expect desk */);
test('in-content #work link switches sheet by replace', /* open scars, click '#scars a[href="#work"]', expect #work, history.length unchanged */);
test('#top and unknown hashes show the desk', /* goto '/#nope' → desk; open about, click '.logo' → desk */);
test('sidebar nav from desk pushes, from sheet replaces', /* click header nav a[href="#skills"] then a[href="#work"]; history.length = len0+1 */);
test('no console/CSP errors after a full tour', /* visit all five via next, close; p.errors empty */);
```

(`page(path='/')` = new page + goto + wait for `desk-mode`.)

- [ ] **Step 2: Run** `npm test` — Expected: new tests FAIL.
- [ ] **Step 3: Implement** per "Behaviour to implement".
- [ ] **Step 4: Run** `npm test` — Expected: all PASS.
- [ ] **Step 5: Commit** `git commit -am "feat: sheets with hash routing, history rules and focus management"` (add `assets/desk.*`, tests).

---

### Task 4: Zoom and slide animations, reduced motion, re-entrancy guard

**Files:**
- Modify: `assets/desk.js`, `assets/desk.css`
- Test: `tests/desk.test.mjs`

**Interfaces:**
- Consumes: `render`, `go`, `data-desk-state`.
- Produces: `render(id, {animate:true})` now passes through `opening` / `switching` / `closing` before settling; resolves state after `animationend`/`transitionend` with a 600 ms safety timeout.

Behaviour:
- Opening from desk: set `.desk` `transform-origin` to the clicked object's centre (from `getBoundingClientRect` relative to `.desk`), scale ≈1.15 and fade (≤200 ms), then sheet slides from `translateY(100%)` to 0 (≤300 ms, ease-out). Closing reverses. Sheet→sheet: quick cross-fade/slide-left (≤250 ms).
- Startup render and reduced motion: no transforms. Under `prefers-reduced-motion: reduce` use opacity-only fades (the existing global reduced-motion rule kills animations — scope desk fades so they still read as a fade, or switch instantly; either is fine as long as no transform runs).
- While state is `opening|switching|closing`, `go()` calls are queued as "latest wins" (only the final target is applied after the current transition); a second click on the same object does nothing (no extra history entry).

- [ ] **Step 1: Failing tests**

```js
test('double click on an object adds one history entry', async () => {
  const p = await page(); const len0 = await p.eval(`history.length`);
  await p.click('.desk-obj[data-target="work"]'); await p.click('.desk-obj[data-target="work"]');
  await p.waitFor(`${state} === 'sheet'`);
  assert.equal(await p.eval(`history.length`), len0 + 1);
});
test('opening animates through the opening state', async () => {
  const p = await page(); await p.click('.desk-obj[data-target="skills"]');
  assert.equal(await p.eval(`${state}`), 'opening'); await p.waitFor(`${state} === 'sheet'`, 1500);
});
test('reduced motion: no transform on desk or sheet while opening', async () => {
  const p = await page('/', { reducedMotion: true }); await p.click('.desk-obj[data-target="skills"]');
  await p.waitFor(`${state} === 'sheet'`, 1500);
  assert.equal(await p.eval(`getComputedStyle(document.querySelector('.desk')).transform`), 'none');
  assert.equal(await p.eval(`getComputedStyle(document.getElementById('skills')).transform`), 'none');
});
test('transitions finish within 1s', /* open+switch+close all reach settled states with waitFor timeout 1000 */);
```

- [ ] **Step 2: Run** — Expected: FAIL (state jumps straight to `sheet`; double click may push twice).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` — Expected: all PASS, including every Task 3 test unchanged.
- [ ] **Step 5: Commit** `git commit -am "feat: zoom-and-slide transitions with reduced-motion fallback"`

---

### Task 5: Phone sheet bar, theme toggle in sheet, resize behaviour

**Files:**
- Modify: `assets/desk.js`, `assets/desk.css`
- Test: `tests/desk.test.mjs`

**Interfaces:**
- Consumes: injected `.sheet-bar` (`.sheet-close`, `.sheet-nav`, `.sheet-tg`) from Task 3.
- Produces: final behaviour; no new functions required beyond a click handler on `.sheet-tg` that calls `document.getElementById('tg').click()` (single source of truth for theme lives in `main.js`).

Behaviour:
- `≤900px`: open sheet is `position:fixed; inset:0; z-index:200` (covers the non-fixed sidebar); `.sheet-bar` is sticky at the top showing "✕ desk", the five section links (current one `aria-current="page"`, horizontally scrollable if needed), and `.sheet-tg` (sun/moon icon, `aria-label` "Switch between light and dark mode"). `>900px`: sheet starts at `left: var(--sidebar-w)`; `.sheet-bar` shows only the close button.
- Resizing across 900 px with a sheet open keeps it open (pure CSS; no JS state tied to width).

- [ ] **Step 1: Failing tests**

```js
test('phone: sheet is full-screen with its own section bar', async () => {
  const p = await page('/#skills', { width: 390, height: 844, mobile: true }); await p.waitFor(`${state} === 'sheet'`);
  assert.equal(await p.eval(`document.getElementById('skills').getBoundingClientRect().left`), 0);
  assert.equal(await p.eval(`document.querySelector('#skills .sheet-nav').offsetHeight > 0`), true);
  await p.click('#skills .sheet-nav a[href="#work"]'); await p.waitFor(`location.hash === '#work' && ${state} === 'sheet'`);
});
test('desktop: sheet bar hides section links', async () => { /* 1280 wide, #skills .sheet-nav offsetHeight === 0, sheet left === 280 */ });
test('theme toggle in sheet works and persists after closing', async () => {
  const p = await page('/#work', { width: 390, height: 844, mobile: true }); await p.waitFor(`${state} === 'sheet'`);
  await p.click('#work .sheet-tg');
  assert.equal(await p.eval(`document.documentElement.dataset.theme`), 'dark');
  await p.click('#work .sheet-close'); await p.waitFor(`${state} === 'desk'`);
  assert.equal(await p.eval(`document.documentElement.dataset.theme`), 'dark');
});
test('resize across 900px keeps the sheet open', async () => {
  const p = await page('/#about'); await p.waitFor(`${state} === 'sheet'`);
  await p.resize(390, 844); assert.equal(await p.eval(`document.getElementById('about').getBoundingClientRect().left`), 0);
  await p.resize(1280, 800); assert.equal(await p.eval(`document.getElementById('about').getBoundingClientRect().left`), 280);
  assert.equal(await p.eval(`${state}`), 'sheet');
});
```

- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` — Expected: all PASS.
- [ ] **Step 5: Screenshots** via `node tests/shots.mjs`, extended to capture an open sheet at 1280×800 and 390×844 in light and dark; inspect for overlap, clipping, unreadable contrast.
- [ ] **Step 6: Commit** `git commit -am "feat: phone sheet bar and in-sheet theme toggle"`

---

### Task 6: Final verification

- [ ] **Step 1:** `npm test` — Expected: every test PASS, zero `p.errors`.
- [ ] **Step 2:** `node tests/shots.mjs` and review all screenshots (desk + one sheet; light/dark; desktop/phone).
- [ ] **Step 3:** Confirm the CSP meta tag is byte-identical to Global Constraints: `grep -c "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'; upgrade-insecure-requests" index.html` → `1`; `grep -cE ' on[a-z]+="' index.html` → `0`; `grep -c '<script>' index.html` → `0`.
- [ ] **Step 4:** Hand off to superpowers:finishing-a-development-branch (merging to `main` publishes to GitHub Pages, so that step needs the owner's go-ahead).
