# Desk navigation for the portfolio — design

Date: 2026-11-09
Status: draft, awaiting approval

## Why

The portfolio (`index.html`, hosted on GitHub Pages) is one long scrolling page. The owner
wants it to feel like it has separate pages, shown in a creative way, so that a visitor (mostly
recruiters) gets a memorable first moment instead of "just another scroll". The owner didn't
have a specific feeling in mind and asked for a recommendation; from four sketched concepts
(sketchbook, desk, journey map, doodle desktop) they chose **the desk**, and from two ways of
showing content they chose **a paper sheet that slides up over the desk**.

## What it is

- **Home = a hand-drawn desk.** Same doodle style as today: ink-black lines, slightly wobbly
  shapes, the Gaegu / Patrick Hand / Space Grotesk fonts already self-hosted in `assets/fonts/`.
  The existing hero content (avatar, name "Kishore Kaarthik", title "Software & Cybersecurity
  Engineer", the quote) sits above the desk **as a compact header band**, so the desk is visible
  on the first screen without scrolling (desktop and phone). Today's hero is `min-height: 100vh`;
  in desk mode it shrinks (smaller avatar, name and title on one or two lines, quote kept but
  smaller). This is the one deliberate restyle of existing content. Without JS, the hero stays
  as it is today.
- **Five objects on the desk, one per section:**

  | Object | Opens | Existing section id |
  |---|---|---|
  | Notebook | About (incl. interactive story + Education & Milestones) | `#about` |
  | Toolbox | Skills & Badges | `#skills` |
  | Corkboard with pinned certificates | Hackathons & Research | `#scars` |
  | Laptop | Things I built (Work) | `#work` |
  | Coffee mug | Say hello (contact) | `#contact` |

  Each object is labelled with a hand-written word so it's obvious what it opens. Hover (or
  keyboard focus) makes the object wiggle slightly.
- **Opening a page:** click an object → a short zoom toward that object → a paper sheet slides up
  over the desk, which fades and stays visible behind it. The sheet holds that section's
  **existing content and layout**, essentially as it looks today. No content is rewritten.
- **Closing:** a "✕ back to desk" control on the sheet, the `Esc` key, and the browser back
  button all return to the desk (reverse animation).
- **Moving between sheets:** the existing nav (About / Skills / Hackathons / Work / Say Hello +
  theme toggle) stays available while a sheet is open, and each sheet ends with "← previous /
  next →" links in the order above, so visitors don't have to return to the desk each time.
- **Deep links:** each sheet has its own URL hash, reusing the current ids (`#about`, `#skills`,
  `#scars`, `#work`, `#contact`). Loading the site with a hash opens that sheet directly (no zoom
  animation on first load). No hash = desk.
- **History rules:**
  - Desk → sheet *pushes* one history entry.
  - Sheet → sheet (via nav or previous/next) *replaces* the current entry, so the browser Back
    button always returns to the desk, never steps through sheets one by one.
  - "✕ back to desk" and `Esc`: if the sheet was opened from the desk in this visit, go
    `history.back()`; if the visitor arrived directly on a deep link (no desk entry behind it),
    *replace* the entry with the desk instead, so Back from there leaves the site as normal and
    "✕" never leaves the site.
  - Manually editing the hash or using forward/back fires the same open/close logic.

## Goals

- A recruiter's first view is the desk and feels distinctive, not like a template.
- Any section is reachable in one click from the desk and in one click from any other sheet.
- A shared link like `…/#work` lands directly on that content.
- The content stays as readable as it is today.

## Non-goals

- No rewriting or restyling of section content beyond what's needed to sit on a sheet (the
  hero is the one exception, see above).
- No object-themed page layouts (e.g. laptop screen showing app windows) — explicitly rejected
  in favour of the plain sheet.
- No analytics, cookies, or new third-party services.

## Anti-goals (would count as failure even if it "works")

- Visitors get lost or can't find how to get back / move on.
- Content becomes harder to read than today, or hidden behind fiddly interactions.
- The site breaks on phones.
- Any regression of the security hardening done earlier the same day (see Constraints).
- The desk looks like clip-art or a different visual style from the rest of the site.

## Constraints

- **Hosting:** GitHub Pages, static files only. Single page stays as `index.html`; no build
  step, no frameworks, no npm dependencies.
- **Security (already in place, must stay):** the page has a Content-Security-Policy meta tag:
  `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;
  font-src 'self'; base-uri 'none'; form-action 'none'; upgrade-insecure-requests`.
  Therefore: **no inline `<script>` and no inline event handlers (`onclick=` etc.)** — all JS
  goes in `assets/main.js`. Inline SVG and inline styles are fine. No external resources.
- **Without JavaScript** (and for search engines): all content must be present in the HTML and
  readable as a normal long page. The desk/sheet behaviour is an enhancement layered on top
  (e.g. JS adds a class to `<html>` that switches on the desk mode).
- **Dark mode** must keep working (`:root[data-theme="dark"]`, toggle `#tg`). The desk gets a
  dark "late-night desk" variant using the existing dark palette.
- **Reduced motion:** honour `prefers-reduced-motion: reduce` (the site already has a block for
  it) — replace zoom/slide with simple fades.
- **Keyboard & screen readers:** desk objects are real focusable controls (links to the hash)
  with accessible names; when a sheet opens, focus moves into it; when it closes, focus returns
  to the object that opened it; `Esc` closes. The sheet is **not a focus-trapping modal**: it's
  a labelled region (`role="region"` + `aria-labelledby` its heading), and focus can move freely
  between the sheet and the nav/theme toggle. The desk behind an open sheet is made `inert` so
  Tab never lands on hidden desk objects.
- **Nav while a sheet is open:** on desktop the existing sidebar stays visible and usable. On
  phones (where the sidebar isn't fixed and a full-screen sheet would cover it) the sheet has
  its own compact top bar: "✕ desk", the five section links, and the theme toggle.
- **Phones (the site already switches layout at `max-width: 900px`):** the wide desk becomes a
  narrower, taller desk with the objects stacked/arranged vertically, each with a large tap
  target and visible label. Sheets go full-screen.

## Decided by the owner

- Desk concept (B) for the home page.
- Paper sheet slides up over the desk (option 2), not object-themed pages.

## My calls (owner said "ok" to these as a summary, but they're mine)

- Hero content stays above the desk.
- Object ↔ section mapping in the table above.
- Persistent nav + previous/next links on sheets.
- Hash-based deep links reusing existing ids.
- Phone layout as a tall desk with stacked objects; full-screen sheets.
- No-JS fallback = current long page.
- Hero shrinks to a compact header band so the desk shows on the first screen.
- Sheet is a non-trapping region (sidebar stays keyboard-reachable); phones get a nav bar
  inside the sheet.
- History: desk→sheet pushes, sheet→sheet replaces, Back always returns to the desk; "✕" on a
  deep-linked arrival replaces with the desk rather than leaving the site.

## Left to the builder

- Exact drawing of the desk and objects (inline SVG, matching current doodle line style).
- Animation timings and easing (keep it snappy: roughly under half a second per transition).
- Whether the sidebar is restyled or left as-is, provided nav stays visible and usable.
- How the `story` tabs and image-missing fallback in `assets/main.js` are integrated.
- Small decorative extras on the desk (e.g. the existing floating doodles), as long as they
  don't compete with the five objects.
