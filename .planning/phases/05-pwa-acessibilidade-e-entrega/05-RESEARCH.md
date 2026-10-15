# Phase 5: PWA, Acessibilidade e Entrega - Research

**Researched:** 2026-10-15
**Domain:** Angular 21 PWA/service worker, WCAG 2.1 AA auditing, Tailwind v4 theming, delivery documentation (README/.spec.md/Figma)
**Confidence:** HIGH (PWA mechanics, contrast math, codebase inventory) / MEDIUM (SVG→PNG library choice, desktop breakpoint call)

## Summary

This phase adds zero new product capability — it wraps the functionally complete app (Phases 1-4, confirmed done on disk, see Project State note below) into a gradeable deliverable: installable PWA, WCAG 2.1 AA accessibility, and consolidated documentation. CONTEXT.md has already locked nearly every architectural decision (D-01 through D-18); this research exists to verify those decisions against current reality and fill the two gaps CONTEXT.md explicitly left open: the SVG→PNG dependency question (D-04) and the desktop breakpoint question (D-12).

Both gaps are now resolved with evidence. For D-04: `ng add @angular/pwa` is confirmed to require real PNG icons (192×192, 512×512, plus a separate maskable 512×512) — Lighthouse installability checks for PNG specifically, SVG-in-manifest is not reliably supported across engines, and this project's `jsdom` devDependency **cannot** rasterize SVG (verified empirically: `HTMLCanvasElement.getContext('2d')` throws "Not implemented... without installing the canvas npm package"). A new devDependency is unavoidable; `@resvg/resvg-js` is the best fit (zero runtime deps, prebuilt binaries, Rust-based, used only in a build-time script, never shipped to the browser bundle). This must be added to `docs/sdd.md` §2 in the same commit as D-01 requires for `@angular/service-worker`.

For D-12 (desktop breakpoint): the current codebase is 100% `max-w-md` with zero breakpoint variants anywhere in `src/app`. The rubric (ID2) explicitly names "celulares, tablets e desktops." A defensible middle path exists: keep `max-w-md` as the *content* constraint (forms and cards genuinely read better narrow) but widen the **page shell** at `lg:` breakpoints so desktop isn't a narrow centered column on an otherwise empty screen — e.g., centering the existing `max-w-md` content inside a wider canvas with visual breathing room, without redesigning any component. This satisfies "adapts to desktop" without inventing a multi-column desktop-only layout the project doesn't need.

The contrast math (done by hand below with the oklch→linear-sRGB→relative-luminance pipeline, cross-checked against WCAG formulas) confirms what CONTEXT.md suspected: `--ring` in the light theme is **2.59:1 against white — fails WCAG 1.4.11's 3:1 non-text contrast minimum**. The dark theme's `--ring` (4.18:1) passes. This is a concrete, numeric defect the plan must fix, not a hypothesis to re-verify.

**Primary recommendation:** Follow CONTEXT.md's D-01 through D-18 exactly as decided; resolve D-04 with `@resvg/resvg-js` as a new devDependency (documented in SDD §2 in the same commit); resolve D-12 by widening the shell, not the components; fix `--ring` light-theme contrast as part of D-06/D-11d token work, backed by the computed ratios in this document.

## Project State Note (not part of this phase's scope, but blocks planning if ignored)

**Phase 4 is complete on disk**, despite `.planning/ROADMAP.md` line 229 showing "2/5" and STATE.md's frontmatter showing `completed_phases: 4` with `status: verifying`. Verified directly:
- All 5 plan files (`04-01` through `04-05`) have matching `-PLAN.md`, `-SUMMARY.md` present, plus `04-VERIFICATION.md` and `deferred-items.md`.
- `git log` shows full execution history for all 5 plans through commit `d88f4ba docs(phase-04): complete phase execution`.
- `@defer` blocks exist in both `dashboard.page.html:13` (`on viewport`) and `draw-result.page.html:29` (`on interaction`) — confirms CONTEXT.md's note that ID8 is already covered twice.
- `REQUIREMENTS.md`'s own phase traceability table (lines 217-226) marks all 10 DRAW-* rows "Completo."

**Conclusion for the planner:** Phase 5 can proceed on the assumption that all 10 screens listed in D-09 exist and are feature-complete. The ROADMAP's "2/5" progress line is a stale artifact that should be corrected (likely during this phase's own transition/closure, not as blocking work) — flag it, don't block on it.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**PWA e comportamento offline (UI-03, UI-04, UI-05 · ID3, ID12)**
- **D-01:** Use `ng add @angular/pwa` completo, installing `@angular/service-worker` pinned to line 21. Must add `@angular/service-worker` to `docs/sdd.md` §2 in the same commit.
- **D-02:** Offline state is a global fixed banner at the top of `authenticated-layout.page.html`, above the existing `<header>`. PT-BR text like "Você está offline. Algumas ações podem falhar." Appears on disconnect, disappears on reconnect. Does NOT disable write buttons (deferred to v2) and does NOT use a full-screen takeover.
- **D-03:** Connection status lives in a `ConnectivityService` (`@Injectable({providedIn:'root'})`, `inject()`-consumed), with a private `_online = signal(navigator.onLine)` exposed readonly, and `window` `'online'`/`'offline'` listeners writing to it via `effect()` (this IS the RA3-ID12 demonstration — REQUIREMENTS.md line 127 maps ID12→UI-05 exactly this way). Do NOT use `toSignal()`/`fromEvent` (would duplicate ID24, which is already delivered by HolidayService/API-04). Do NOT put the signal directly in the layout component. **Mechanical gate:** `npm run check:no-rxjs-state` fails CI on `BehaviorSubject`/`new Subject` in `src/app`.
- **D-04:** PWA icons are generated by a committed script in `scripts/` from a custom SVG (gift/ribbon theme matching UTF-Secret identity), not the Angular placeholder icons. **Researcher must verify SVG→PNG conversion dependency question** (see Resolution below — a new devDependency is required and justified).
- **D-05:** `theme_color` = pine-green, `background_color` = light, both in literal hex, identical in `manifest.webmanifest` and `<meta name="theme-color">` in `index.html`. Document in README that the manifest doesn't accept `oklch()`/`var()` — values must be hand-synced with `styles.css`. `background_color` paints the splash screen.

**Design System e identidade visual (ID4, ID29)**
- **D-06:** Adopt a sober Christmas palette: `--primary` becomes dark pine-green, `--destructive` stays red, a gold/red accent appears at highlight points (reveal card, Christmas counter). Rest of UI stays neutral — thematic without becoming a Christmas card.
- **D-07:** The `:root.dark` block (currently dead code — nothing adds the `.dark` class) switches its selector to `@media (prefers-color-scheme: dark)`, following OS preference. No toggle, no signal, no localStorage. **Direct consequence:** contrast audit (D-10) must cover both themes, and D-06's palette needs both theme versions.
- **D-08:** Design System documented in README as a token table + component inventory: each color token (variable name, oklch value, hex equivalent, where used), the typography/spacing scale actually used, `--radius`, and the list of incorporated Spartan components (`hlmBtn`, `hlmCard`, `hlmInput`, `hlmLabel`) with where each appears. No visual swatches (GitHub doesn't render inline CSS). Not split between README and `.spec.md` — ID29 names the README specifically.

**Acessibilidade e responsividade (UI-06 · ID2)**
- **D-09:** Audit covers all 10 existing screens, same rigor: `login`, `register`, `dashboard`, `create-group`, `join-group`, `group-view`, `manage-group`, `draw-result`, `authenticated-layout` (header + D-02 banner), `christmas-countdown.card`.
- **D-10:** Audit is static (Claude) + human checkpoint with Lighthouse: (1) Claude audits the 10 templates by reading (labels, aria, heading order, semantics, touch targets, keyboard nav) and calculates contrast mathematically from oklch tokens, in both themes, fixing what's found; (2) user runs Lighthouse + DevTools at 320px and pastes results; (3) evidence becomes a document in the same format as `docs/draw-privacy-verification.md`.
- **D-11:** Four corrections enter this phase:
  - (a) `lang="pt-BR"` in `index.html` (currently `lang="en"` — WCAG 3.1.1 violation). Also replace `<title>AmigoSecreto</title>` with the real product name (UTF-Secret).
  - (b) Skip link "Pular para o conteúdo" at the start of `authenticated-layout`, visible only on focus, pointing to `<main>`. WCAG 2.4.1.
  - (c) `aria-live` on the offline banner (D-02) and loading states ("Carregando...", "Sorteando..."). Extends the existing pattern (`role="alert"` in 6 screens, `role="status"` in countdown) — don't invent new ARIA vocabulary.
  - (d) Reinforced visible focus + ~44px touch targets. **Critical point:** `--ring` oklch(0.708 0 0) against white background is suspected to fail WCAG 1.4.11's 3:1 non-text contrast — must be recalculated deliberately in both themes with the new palette. Also verify `size="sm"` buttons hit ~44px target at 320px.
- **D-12 (open question for researcher — resolved below):** ID2 mentions "celulares, tablets e desktops" but everything today is locked to `max-w-md`. Must evaluate and justify in writing whether `max-w-md` is defensible as deliberate mobile-first choice or whether the layout deserves a breakpoint above it. This is a rubric-reading decision, not user preference.

**Documentação de entrega (ENG-07, ENG-09, UI-07 · ID1, ID29, ID30)**
- **D-13:** README becomes self-sufficient: vision/core value, actors, summarized user stories, business rules, **ER diagram in Mermaid** (copied from `docs/sdd.md` §3.2 — GitHub renders it), **Design System** (D-08), stack, how to run, deploy link, prototype link — with links to `prd.md`/`sdd.md` for detail. Accepted cost: the ER diagram now lives in two files (README + SDD §3.2), must stay in sync. Do NOT turn README into an index-only that just links out (ID29 names the README as the actual location) and do NOT empty out `docs/prd.md` (CLAUDE.md declares it source of truth; earlier CONTEXT.md files cite its sections by number).
- **D-14:** README carries the **full rubric table (RA1-RA8, IDs 1-32)** with: ID, summarized requirement, `[x]` status, and a **pointer to where the indicator is proven** (`file:line` or evidence document). Examples given: ID8 → `dashboard.page.html:13` and `draw-result.page.html` (`@defer` block); ID22 → `core/interceptors/error.interceptor.ts`; ID32 → `core/draw-algorithm.spec.ts`; DRAW-10/privacy → `docs/draw-privacy-verification.md`. Base already exists in `.planning/REQUIREMENTS.md` lines 113-149 (translation, not new work). **Order constraint: this table can only be written at the END of the phase** — several indicators (ID1, ID2, ID3-PWA, ID4, ID29, ID30) only become markable after this phase's own work completes.
- **D-15:** `.spec.md` (ENG-09/ID30) describes the real system rigorously: each Standalone component (inputs via `input()`, outputs, signals, responsibility) and each Service (dependencies via `inject()`, methods, state in signals). **Includes an honest process note:** the prior specification ID30 asks for ("before source code generation") did genuinely exist — in the GSD artifacts (`.planning/phases/*/XX-CONTEXT.md` and `XX-PLAN.md`), committed before each implementation, with git history proving the order. This is true and defensible — do NOT write as if the spec preceded code in this very file (git log would contradict it in two clicks).
- **D-16:** Prototype produced in Stitch, exported/refined in Figma, published with a public Figma link in the README. Matches ID1 literally ("gerados via Stitch e refinados no Figma") and stays coherent with the Figma MCP that `docs/sdd.md` §1.2 already declares mandatory.
- **D-17 — IMPORTANT ORDER INVERSION:** The prototype is the SOURCE of the Design System, not a record of what already exists. D-06's palette comes FROM the prototype. Reconciliation: Claude applies D-06's palette as provisional NOW; the plan must include an explicit reconciliation task for when the prototype is ready — adjust tokens to match, rewrite the README's Design System table (D-08), and revalidate contrast (D-10/D-11d). Accepted risk: if the final palette diverges significantly, the contrast audit needs to be redone.
- **D-18:** Claude produces `docs/prototype-brief.md` — a prompt script, screen by screen, for the user to feed into Stitch. For each of the 10 D-09 screens: purpose, the real PT-BR texts already in the code, element hierarchy, states (empty/error/loading), and the navigation map between frames.

### Claude's Discretion
- Exact oklch values of the Christmas palette (pine-green, accents) in both themes, as long as they pass D-10/D-11d contrast and are documented per D-08.
- The base SVG icon design and the concrete mechanism of the generation script (D-04), as long as the new-dependency question is resolved and justified (see Resolution below).
- Exact text of the offline banner, skip link, and `aria-live` messages, respecting PT-BR UI convention.
- Structure of sections and filename of the audit evidence document (D-10), following the format of `docs/draw-privacy-verification.md`.
- Name and location of `.spec.md` (root vs `docs/`), and its internal organization.
- How the phase is split into plans and their order, respecting D-14's order constraint (rubric table last) and D-17's reconciliation task.
- `ngsw-config.json` caching strategy and whether the app exposes a "new version available" notice via `SwUpdate` — not discussed, left to researcher/planner discretion.

### Deferred Ideas (OUT OF SCOPE)
- Light/dark theme toggle with `ThemeService`, signal, and `localStorage` persistence, with a header button. Would demonstrate signal+`effect()` a second time, but no requirement asks for it, and would double the contrast audit. D-07 delivers dark mode without this, via `prefers-color-scheme`. → Future phase/v2.
- Automated accessibility testing with `axe-core` as a CI gate. More robust technically, but it's a dependency outside SDD §2 table, and no requirement asks for automated a11y testing. → v2.
- Blocking write buttons (create group, save wishlist, draw) while offline. More correct as a product than just D-02's banner, but would spread the connectivity signal across many screens. → v2.
- "New version available" prompt via `SwUpdate` after a deploy. Not discussed; left to researcher/planner discretion if it fits without bloating the phase.
- Navigable prototype published as a Claude Artifact (raised by user, rejected as the UI-07 deliverable because ID1 evaluates Stitch/Figma usage specifically) — could exist as a complement, never as the delivery artifact.

**Debts from other phases surfaced during discussion (not this phase's tasks, but must happen before the oral defense):**
- Production test data cleanup — group "Teste2" (`9e0b6421-23e6-43d2-bbcd-3e162e08c4ef`) and users `bruno-teste4@exemplo.com`/`carla-teste4@exemplo.com`, created during DRAW-10 verification. Tracked in STATE.md and `04-sorteio-e-revela-o/deferred-items.md`.
- `03-HUMAN-UAT.md` pending (320px check + two-account end-to-end script) — **the 320px part is naturally absorbed by D-10's checkpoint**; the planner should reuse the same browser session instead of asking the user for two separate ones.
- Residual `signUp` fragility (Supabase "Confirm email" must stay disabled) — registered in Phase 2's `deferred-items.md`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-03 | `manifest.webmanifest` with icons, `theme_color`, `background_color`, `display: standalone` | `ng add @angular/pwa` confirmed to generate exactly this; icon size/purpose requirements verified (192/512 PNG + separate maskable 512); hex-vs-oklch limitation documented |
| UI-04 | App installable as PWA (Lighthouse/DevTools verified) | Confirmed PNG icons are a hard Lighthouse requirement, not optional; SVG-only manifest icons are NOT reliably supported — this blocks a no-new-dependency path (D-04 resolved) |
| UI-05 | Offline state shows visual feedback | `ConnectivityService` pattern verified against existing `auth.service.ts`/`supabase-client.service.ts` conventions; `effect()` usage confirmed as the correct, non-duplicative RA3-ID12 demonstration |
| UI-06 | WCAG 2.1 AA on main flows (contrast, focus, labels, keyboard nav) | Computed real contrast ratios for all relevant tokens in both themes (see Common Pitfalls); confirms `--ring` light-theme failure with exact numbers; inventoried existing `role="alert"`/`role="status"`/`aria-label` usage across all 10 screens |
| UI-07 | Navigable Figma prototype with public link in README | D-16/D-17/D-18 fully specified in CONTEXT.md; no additional research needed beyond confirming Figma MCP is already documented in SDD §1.2 |
| ENG-07 | README consolidates PRD (ER diagram in Mermaid + design system) | Verified `docs/sdd.md` §3.2 Mermaid ER diagram exists and is copy-pasteable; verified `docs/prd.md` content to consolidate (vision, actors, user stories, business rules) |
| ENG-09 | `.spec.md` documenting Standalone components and Services | Inventoried every component/service file in `src/app` (see Architecture Patterns); verified `docs/sdd.md` §4/§5.1-5.3 as direct source material |
</phase_requirements>

## Standard Stack

### Core (already locked, no changes except one addition)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@angular/service-worker` | `^21.2.0` (pin to match rest of Angular) | Service worker registration, `ngsw-config.json` consumption | Official Angular package, only path to full Lighthouse PWA installability (D-01, locked) |

### Supporting (new addition this phase — researcher-resolved)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@resvg/resvg-js` | latest (verify via `npm view @resvg/resvg-js version` at implementation time) | SVG→PNG rasterization for the icon-generation script (D-04) | devDependency only, used exclusively by a build-time Node script in `scripts/`; never imported by application code or shipped to the browser bundle |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@resvg/resvg-js` | `sharp` | Both require a new devDependency; `sharp` needs libvips (larger native footprint, more OS-specific prebuild variance); `@resvg/resvg-js` is zero-dependency Rust/napi-rs with prebuilt binaries and is purpose-built for SVG rendering rather than general image processing — better justified for a single-purpose icon script |
| `@resvg/resvg-js` | `svg2png-wasm` | Pure WASM, zero native binary — plausible alternative if `@resvg/resvg-js`'s prebuilt binaries prove unavailable for the dev/CI platform; keep as fallback, not primary choice |
| New devDependency | Manifest with SVG-only icons (no PNG, no new dependency) | **Rejected by evidence:** Lighthouse and the installability spec require 192×192 and 512×512 PNG icons; SVG-in-manifest support is inconsistent across engines (iOS Safari, some Android launchers don't honor it). This path would not satisfy ROADMAP success criterion 1 ("confirmado pelo Lighthouse... sem erros de manifest") |
| New devDependency | jsdom-based rasterization (already installed) | **Rejected by direct test:** `jsdom`'s `HTMLCanvasElement.getContext('2d')` throws `Not implemented... without installing the canvas npm package` — verified by running it in this exact project. jsdom cannot rasterize without an additional native `canvas` package, which is not meaningfully "free" compared to `@resvg/resvg-js` |

**Installation (at implementation time, in the plan's own task):**
```bash
npm install -D @angular/service-worker@21 @resvg/resvg-js
npx ng add @angular/pwa
```

**Version verification:** Before writing the final Standard Stack table in `docs/sdd.md` §2, confirm current versions:
```bash
npm view @angular/service-worker version
npm view @resvg/resvg-js version
```
`@angular/service-worker` MUST match the pinned `^21.x` line already used by `@angular/core`/`@angular/cdk` elsewhere in `package.json` — do not let `ng add` pull a different major/minor.

## Architecture Patterns

### Current Project Structure (verified on disk, 2026-10-15)
```
src/
├── app/
│   ├── app.config.ts                     # 4 providers today; provideServiceWorker() becomes the 5th
│   ├── app.routes.ts
│   ├── core/
│   │   ├── draw-algorithm.ts / .spec.ts
│   │   ├── draw-error-messages.ts / .spec.ts
│   │   ├── auth-error-messages.ts
│   │   ├── join-error-messages.ts / .spec.ts
│   │   ├── dias-ate-natal.ts / .spec.ts
│   │   ├── models/group.model.ts
│   │   ├── guards/ (auth.guard, admin.guard, member.guard — each with .spec.ts)
│   │   ├── resolvers/ (group.resolver, draw-result.resolver — each with .spec.ts)
│   │   ├── interceptors/error.interceptor.ts
│   │   └── services/
│   │       ├── supabase-client.service.ts   # injectable + mockable pattern to copy
│   │       ├── auth.service.ts              # private signal + computed() pattern to copy
│   │       ├── group.service.ts
│   │       ├── holiday.service.ts           # toSignal() precedent (already delivers ID24)
│   │       └── draw.service.ts
│   │                                        # ConnectivityService (D-03) goes here, new file
│   ├── features/
│   │   ├── auth/login/, auth/register/      # 2 screens
│   │   ├── shell/authenticated-layout.page.{ts,html}  # banner + skip link target
│   │   ├── dashboard/dashboard.page + christmas-countdown.card  # 2 screens (counted as 1 in D-09's list + separately)
│   │   ├── group/
│   │   │   ├── group-layout/, create/, view/, manage/ (+ participant-row), join/
│   │   └── draw/result/
│   └── shared/components/, shared/pipes/    # both empty (.gitkeep only) — no reusable components yet
├── environments/
└── styles.css                              # Tailwind v4 CSS-first, Spartan preset, :root + :root.dark tokens
```

**10 screens for the D-09 audit, mapped to real files:**
1. `features/auth/login/login.page.html`
2. `features/auth/register/register.page.html`
3. `features/dashboard/dashboard.page.html`
4. `features/dashboard/christmas-countdown.card.html`
5. `features/group/create/create-group.page.html`
6. `features/group/join/join-group.page.html`
7. `features/group/view/group-view.page.html`
8. `features/group/manage/manage-group.page.html` (+ `participant-row.html`)
9. `features/draw/result/draw-result.page.html`
10. `features/shell/authenticated-layout.page.html`

### Pattern 1: Service with private signal + effect() for connectivity (D-03)
**What:** `ConnectivityService` exposes a readonly signal derived from a private writable one, with `effect()` wiring `window` event listeners to mutate it — the precedent is `auth.service.ts`'s session-signal pattern, but `effect()` is the new element this service specifically demonstrates.
**When to use:** Any time a signal must react to a side-effecting event source outside Angular's own change detection (browser events, not RxJS streams).
**Example (sketch, following the project's established DI/signal conventions — verify exact file shape of `auth.service.ts` before writing the real code):**
```typescript
// Source: pattern inferred from src/app/core/services/auth.service.ts (private signal + computed())
import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly _online = signal(navigator.onLine);
  readonly online = this._online.asReadonly();

  constructor() {
    effect((onCleanup) => {
      const goOnline = () => this._online.set(true);
      const goOffline = () => this._online.set(false);
      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);
      onCleanup(() => {
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
      });
    });
  }
}
```
Note: registering DOM listeners is a side effect, which is exactly what RA3-ID12 wants demonstrated "for safe reactive side effect handling" — but confirm during planning whether the project's effect() usage elsewhere (if any) uses `onCleanup` already, to stay consistent with existing style. `auth.service.ts` should be read in full before finalizing this service's shape (not yet read in this research pass — flagged as a planning-time verification, not a blocker).

### Pattern 2: Offline banner in authenticated-layout (D-02)
**What:** A conditionally-rendered banner above the existing `<header>`, driven by `@if (!connectivity.online())`.
**Current `authenticated-layout.page.html` structure (verified in full above):**
```html
<div class="flex min-h-dvh flex-col">
  <header class="border-b"> ... </header>
  <main class="mx-auto w-full max-w-md flex-1 p-4">
    <router-outlet />
  </main>
</div>
```
The banner and skip link both insert into this exact structure — no restructuring needed. Skip link goes first (before the banner, so it's the very first focusable element); banner goes between skip link and `<header>`.

### Pattern 3: Skip link (D-11b)
**What:** Visually hidden until focused, jumps to `<main>`.
```html
<!-- Tailwind v4: sr-only + focus:not-sr-only is the idiomatic pattern, already available
     via Tailwind's default utility classes (no custom CSS needed) -->
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-4">
  Pular para o conteúdo
</a>
```
Requires adding `id="main-content"` to the existing `<main>` element.

### Anti-Patterns to Avoid
- **Writing `.dark` class toggling logic anywhere:** D-07 locked `prefers-color-scheme` media query only — any JS that adds/removes a `.dark` class contradicts the decision and reintroduces the "dead code" problem in a different form.
- **Using `toSignal(fromEvent(...))` for connectivity:** explicitly rejected in D-03/DISCUSSION-LOG Q3 — would duplicate the ID24 demonstration already delivered by `HolidayService`.
- **Treating `role="alert"` and `aria-live="polite"` as interchangeable:** `role="alert"` implies `aria-live="assertive"` implicitly — for loading states ("Carregando...") that are not urgent interruptions, prefer `role="status"` (already used in the countdown card) or explicit `aria-live="polite"`, not `role="alert"` everywhere.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Service worker registration & caching strategy | A manual `navigator.serviceWorker.register()` + hand-written cache logic | `@angular/service-worker` + `ngsw-config.json` + `provideServiceWorker()` | Official, tested against Angular's build output hashing; hand-rolling risks stale-cache bugs that are exactly what graders test for with Lighthouse |
| WCAG contrast ratio calculation | Eyeballing colors or using only a browser's rendered appearance | The oklch→linear-sRGB→relative-luminance formula (reproduced in this document) or a contrast checker fed the computed hex equivalents | oklch values don't map linearly to perceived contrast; must convert to sRGB space first — doing this by eye or assuming "it looks fine" is how the project got its current `--ring` failure in the first place |
| SVG→PNG icon rasterization | A hand-written PNG encoder, jsdom hacks, or shelling out to an OS-level tool like ImageMagick (not in any container/CI guarantee) | `@resvg/resvg-js` as a devDependency, in a committed script | Deterministic, portable, versioned, doesn't depend on CI runner having system packages installed |

**Key insight:** This phase is dense with "looks right but is numerically wrong" risks (contrast, manifest fields) — the pattern that wins is computing/verifying mechanically wherever a number is involved, not trusting visual inspection, which is exactly D-10's chosen audit method.

## Common Pitfalls

### Pitfall 1: `--ring` fails WCAG 1.4.11 in light theme (CONFIRMED, not hypothetical)
**What goes wrong:** Keyboard focus indicator contrast is legally/rubric-required to be ≥3:1 against adjacent colors (WCAG 1.4.11 Non-text Contrast). The current light-theme `--ring: oklch(0.708 0 0)` against `--background: oklch(1 0 0)` computes to **2.59:1** — below the 3:1 minimum.
**Why it happens:** The Spartan default palette ships all tokens at chroma 0 (pure grayscale), and grayscale focus rings are a common un-audited default across design systems.
**How to avoid:** When D-06/D-11d choose new `--ring` values for the Christmas palette, verify against this formula (exact numbers below) rather than assuming "it's just the theme color, should be fine."
**Warning signs:** Any `--ring`, `--border`, or other UI-chrome token with contrast <3:1 against its most common background.

**Full computed contrast table (verified 2026-10-15, formula validated against standard WCAG relative-luminance math):**

| Token | Light theme value | vs. background (white) | Light result | Dark theme value | vs. background (near-black) | Dark result |
|-------|---|---|---|---|---|---|
| `--foreground` | `oklch(0.145 0 0)` | 19.79:1 | PASS (AAA) | `oklch(0.985 0 0)` | 18.96:1 | PASS (AAA) |
| `--ring` | `oklch(0.708 0 0)` | **2.59:1** | **FAIL (needs ≥3:1)** | `oklch(0.556 0 0)` | 4.18:1 | PASS |
| `--destructive` | `oklch(0.577 0.245 27.325)` | 4.76:1 | PASS (AA normal text, ≥4.5:1) | `oklch(0.704 0.191 22.216)` | 6.89:1 | PASS |
| `--muted-foreground` | `oklch(0.556 0 0)` | 4.73:1 | PASS (AA normal text) | `oklch(0.708 0 0)` | 7.63:1 | PASS |
| `--border` | `oklch(0.922 0 0)` | 1.26:1 | N/A (decorative, not text/focus) | — | — | — |

**Action required:** The new Christmas-themed `--ring` (both light and dark) MUST be verified at ≥3:1 before being committed. Recommend keeping the dark-theme `--ring` approach (meaningfully darker/more saturated than background) rather than the light theme's near-white-on-white default.

### Pitfall 2: Lighthouse PWA installability needs PNG icons, not SVG
**What goes wrong:** Teams sometimes assume a single scalable SVG icon satisfies the manifest, since SVG scales perfectly and is "modern." It does not satisfy Lighthouse or cross-browser installability checks.
**Why it happens:** `manifest.webmanifest`'s `icons` array nominally accepts any MIME type per spec, but Chrome/Lighthouse's installability heuristic specifically checks for a 192×192 and a 512×512 PNG; iOS Safari and various Android launchers don't reliably honor SVG manifest icons at all.
**How to avoid:** Generate real PNG icons (192×192 any-purpose, 512×512 any-purpose, AND a separate 512×512 maskable PNG with artwork inside the center ~80%/409×409 safe zone — do not reuse the same 512 PNG for both `any` and `maskable` purposes, that's a known Lighthouse warning).
**Warning signs:** Lighthouse PWA audit flagging "Manifest doesn't have a maskable icon" or "no icon of the right size."

### Pitfall 3: `jsdom` cannot rasterize SVG (confirmed by direct test in this project)
**What goes wrong:** Assuming the already-installed `jsdom` devDependency can be pressed into service for icon generation, avoiding a new dependency.
**Why it happens:** `jsdom` implements the DOM API surface but deliberately stubs `HTMLCanvasElement.getContext()` — it is not a rendering engine.
**How to avoid:** Verified directly in this repo: `canvas.getContext('2d')` throws `Error: Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package`. Treat this as settled, not something to re-attempt — go straight to `@resvg/resvg-js`.

### Pitfall 4: Service worker caching stale builds in dev / during iterative phase work
**What goes wrong:** Once `provideServiceWorker` is enabled, a previously-cached build can mask new changes during local testing, making it look like edits aren't taking effect.
**Why it happens:** Angular's service worker is explicitly designed to NOT fetch network updates until the next app launch after a new version is detected (safe-update semantics), and `ng serve` dev builds should have the SW disabled anyway.
**How to avoid:** Confirm `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode() })` — the Angular-standard pattern — is what `ng add @angular/pwa` wires up, matching `app.config.ts`'s existing commented-provider style. Only test SW behavior against a production build (`ng build` + a static file server or the real Vercel deploy), never `ng serve`.

### Pitfall 5: CI's secret-grep could appear to be a concern for service worker/dist artifacts — verified NOT an issue
**What goes wrong (hypothetical, raised in CONTEXT.md's canonical_refs):** Worry that `@angular/service-worker`'s build output in `dist/` might trip `check:no-secrets`.
**Why it doesn't happen:** Inspected `.github/workflows/ci.yml` directly — the check is a literal string grep for `service_role|sb_secret_|SERVICE_ROLE` in `src/` and `dist/`. Service worker artifacts (`ngsw-worker.js`, `ngsw.json`, manifest, icons) contain no such strings under normal circumstances. This is a non-issue; no special handling needed, but worth a smoke-check after the first PWA build (`npm run build && npm run check:no-secrets` locally) as cheap insurance.

### Pitfall 6: `vercel.json` has no headers block — manifest MIME type risk is low but unverified
**What goes wrong:** Some static hosts serve `.webmanifest` files with an incorrect `Content-Type`, which some installability checks penalize.
**Why it happens:** Vercel's static file serving generally infers correct MIME types for common extensions including `.webmanifest`, but this project's `vercel.json` (shown below) has no explicit `headers` configuration, only a SPA rewrite.
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/amigo-secreto/browser",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
**How to avoid:** No code change needed preemptively — Vercel's default MIME inference for `.webmanifest` is reliable as of current platform behavior (MEDIUM confidence, not independently verified against Vercel's live docs this session). If the Lighthouse checkpoint (D-10 step 2) flags a manifest MIME warning, the fix is a `headers` block in `vercel.json` setting `Content-Type: application/manifest+json` for `/manifest.webmanifest`. Flag as a conditional task, not a committed one — don't add complexity the human checkpoint might prove unnecessary.

## Code Examples

### `provideServiceWorker` registration (matches existing `app.config.ts` commenting style)
```typescript
// Source: https://angular.dev/ecosystem/service-workers/getting-started (official docs)
import { provideServiceWorker } from '@angular/service-worker';
import { isDevMode } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    // ...existing 4 providers...
    // D-01 / RA1-ID3: service worker ativo apenas em produção; ng build gera ngsw-worker.js
    // e o registro é o que faz o Lighthouse marcar o app como instalável de fato.
    provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode() }),
  ],
};
```

### Manifest shape `ng add @angular/pwa` generates (to be customized per D-05/D-04)
```json
{
  "name": "UTF-Secret",
  "short_name": "UTF-Secret",
  "theme_color": "#0b3d2e",
  "background_color": "#fafafa",
  "display": "standalone",
  "scope": "/",
  "start_url": "/",
  "icons": [
    { "src": "icons/icon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icons/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "icons/icon-512x512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
Hex values above are illustrative placeholders only — D-06/Claude's Discretion picks the real pine-green/light values; must exactly match `<meta name="theme-color">` in `index.html` per D-05.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `NgModule`-based service worker registration (`ServiceWorkerModule.register(...)`) | `provideServiceWorker()` functional provider | Angular 15+ standalone APIs, now the only documented path in Angular 21 docs | Already the only option consistent with this project's zero-NgModule constraint — no decision needed, just use it |
| Manual `navigator.onLine` polling | `online`/`offline` window events (used here) | Long-standing, not a recent change | Confirms D-03's approach is still the idiomatic one, not outdated |

**Deprecated/outdated:** None identified specific to this phase's stack — Angular 21's service worker API surface (`provideServiceWorker`) is stable and matches what was fetched from official docs this session (angular.dev, not a cached/stale mirror).

## Open Questions

1. **Exact `@resvg/resvg-js` current published version**
   - What we know: It exists, is actively maintained, zero-dependency, Rust+napi-rs based.
   - What's unclear: Exact current semver — not pinned during this research pass to avoid staleness; must run `npm view @resvg/resvg-js version` at implementation time.
   - Recommendation: Planner's task for D-04 should include the `npm view` check as its first step, before `npm install`.

2. **Desktop breakpoint treatment (D-12) — concrete Tailwind classes**
   - What we know: `max-w-md` (28rem/448px) is used everywhere; ID2 names desktops explicitly; no component redesign is in scope per CONTEXT.md's phase boundary ("nenhuma tela nova").
   - What's unclear: Whether the fix should be per-screen (`lg:max-w-2xl` on each page's wrapper) or centralized (wrap `<main>` in `authenticated-layout` with a `lg:` wider container, leaving unauthenticated screens like login/register possibly still narrow by design since they're single-form screens where narrow is arguably correct even on desktop).
   - Recommendation: Treat the authenticated shell (`authenticated-layout.page.html`'s `<main>`) as the single point of change for the group/dashboard/draw screens; evaluate login/register separately since they're outside that shell and a narrow centered form is a defensible desktop pattern for those two specifically. Document the written justification (CONTEXT.md requires it) directly in the audit evidence document (D-10) or README, not just in a commit message.

3. **Whether `SwUpdate` "new version available" prompt is worth the scope**
   - What we know: CONTEXT.md leaves this fully to researcher/planner discretion; not discussed with the user at all.
   - What's unclear: Whether it meaningfully helps the oral defense or is scope creep for a project presented once to a banca (not a long-lived production app with iterative users hitting stale caches).
   - Recommendation: Skip it. The project is graded once, by a banca who will load the app fresh; a stale-cache update prompt has no audience in that scenario. Document this reasoning briefly if the plan omits it, so it reads as a decision rather than an oversight.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Icon-generation script, build | ✓ | v22.14.0 | — |
| npm | Package install | ✓ | 10.9.2 (per `packageManager` field) | — |
| `jsdom` | NOT usable for rasterization (see Pitfall 3) | ✓ (installed) | 28.1.0 | N/A — confirmed unusable for this specific need, `@resvg/resvg-js` is the real dependency |
| `@resvg/resvg-js` | PWA icon generation (D-04) | ✗ (not yet installed) | — | `svg2png-wasm` as a secondary option if prebuilt binaries are unavailable on the dev machine/CI runner |
| `@angular/service-worker` | PWA installability (D-01) | ✗ (not yet installed) | — | None — this is the only path to full Lighthouse installability; no fallback accepted per D-01's own reasoning |
| Lighthouse / Chrome DevTools | D-10 human checkpoint | Assumed available on user's machine (standard Chrome feature) | — | — |
| Vercel production deploy | ROADMAP success criterion 1 (app must be live to audit) | ✓ (already deployed per Phase 1 ENG-05) | — | — |

**Missing dependencies with no fallback:**
- `@angular/service-worker` — required, no substitute, already decided (D-01).

**Missing dependencies with fallback:**
- `@resvg/resvg-js` — primary choice; `svg2png-wasm` is the documented fallback if binary installation fails in CI/dev environment.

## Validation Architecture

> `.planning/config.json` was not found during this research pass via the standard inventory — proceeding under the default assumption that `workflow.nyquist_validation` is enabled (absent key = enabled per instructions). If a plan author finds the key explicitly set to `false`, this section can be skipped.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via `@angular/build:unit-test`, Angular 21+ default) |
| Config file | None dedicated — builder-integrated per `angular.json`'s `"test": { "builder": "@angular/build:unit-test" }` |
| Quick run command | `ng test --watch=false --include=<glob>` (confirmed working pattern from Phase 2 STATE.md note: "ng test's Vitest builder rejects --run") |
| Full suite command | `npm test` (aliases to `ng test`, CI runs `npm test --passWithNoTests`) |

### Phase Requirements → Test Map

Most of this phase's requirements are visual/structural/documentation deliverables, not business-logic behaviors — so the majority are legitimately **manual-only** (Lighthouse audit, visual inspection, README content review), which is consistent with D-10's own chosen validation method (static audit + human checkpoint, not automated tests). A few have genuine unit-testable surface:

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-05 | `ConnectivityService` reflects `online`/`offline` events correctly | unit | `ng test --watch=false --include=**/connectivity.service.spec.ts` | ❌ Wave 0 — service doesn't exist yet |
| UI-03/UI-04 | Manifest file is valid JSON with required fields | manual (Lighthouse) | — | N/A — not unit-testable, inherently a build-artifact + browser check |
| UI-06 | Contrast ratios meet WCAG AA | manual-only, justified | Computed by hand in this document; no test framework asserts color contrast in this stack and adding one (e.g., `axe-core`) is explicitly deferred to v2 per CONTEXT.md | N/A |
| UI-06 | Skip link / aria-live present in templates | could be a lightweight template-presence test, but CONTEXT.md's D-10 explicitly chose static read-through audit over automation | manual (code read) | — | — |
| ENG-07/ENG-09/UI-07 | Documentation content correctness | manual-only (inherently non-executable) | — | — |

### Sampling Rate
- **Per task commit:** `ng test --watch=false --include=<glob-for-touched-spec>` for `ConnectivityService` only (the one genuinely new unit of logic this phase introduces).
- **Per wave merge:** `npm test` (full suite) to confirm no regression in the 30+ existing `.spec.ts` files across guards/resolvers/services/algorithms.
- **Phase gate:** Full suite green, plus the D-10 human Lighthouse checkpoint, before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `src/app/core/services/connectivity.service.spec.ts` — covers UI-05 / RA3-ID12 (mock `window` online/offline events, assert signal value)
- [ ] No new fixtures or framework install needed — Vitest is already fully configured project-wide.

*(No other gaps: all other phase deliverables are documentation/manual-audit in nature, consistent with D-10's explicit choice not to add `axe-core` or similar automated a11y tooling this phase.)*

## Sources

### Primary (HIGH confidence)
- `angular.dev/ecosystem/service-workers/getting-started` — fetched directly this session; confirmed `ng add @angular/pwa` file generation list, `provideServiceWorker()` standalone signature, and the `enabled: !isDevMode()` pattern.
- Direct codebase inspection (this session): `src/index.html`, `src/styles.css`, `src/app/app.config.ts`, `src/app/features/shell/authenticated-layout.page.html`, `angular.json`, `package.json`, `vercel.json`, `.github/workflows/ci.yml`, full `src/app` file tree via `find`.
- Direct empirical test (this session): `node -e` script confirming `jsdom`'s `getContext('2d')` throws "Not implemented... without installing the canvas npm package" in this exact project's `node_modules`.
- Direct computation (this session): oklch→linear-sRGB→relative-luminance→WCAG-contrast-ratio pipeline run against every token in `src/styles.css`'s `:root` and `:root.dark` blocks.
- `.planning/phases/05-pwa-acessibilidade-e-entrega/05-CONTEXT.md` and `05-DISCUSSION-LOG.md` — authoritative locked decisions.
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md` — project requirement/traceability/history source of truth.
- `docs/prd.md`, `docs/sdd.md`, `docs/checklist.md` — specs and grading rubric, read in full.

### Secondary (MEDIUM confidence)
- WCAG icon/manifest requirement claims (192×192 + 512×512 PNG mandatory, maskable must be separate file) — cross-referenced across multiple independent web sources (allsvgicons.com, logofoundry.app, toolsdock.io) that agree on the specifics; not fetched from the W3C spec or web.dev directly this session, so flagged MEDIUM rather than HIGH despite strong agreement.
- `@resvg/resvg-js` vs `sharp` tradeoffs (zero-dependency, prebuilt binaries, Rust/napi-rs) — WebSearch-sourced from GitHub project pages and comparison articles; not independently verified via `npm view` in this session (left as an Open Question / implementation-time task).
- Vercel's default MIME-type handling for `.webmanifest` — not independently verified against Vercel's live documentation this session; flagged explicitly as unverified in Pitfall 6, with a low-cost conditional mitigation path.

### Tertiary (LOW confidence)
- None used as load-bearing claims in this document — all WebSearch findings that mattered to a Standard Stack or Pitfall claim were either cross-verified (manifest icon requirements, multiple sources agreeing) or verified empirically (jsdom canvas limitation, contrast math), or explicitly flagged as MEDIUM/open where they weren't.

## Metadata

**Confidence breakdown:**
- Standard stack (PWA/service worker mechanics): HIGH — official Angular docs fetched directly this session, matches codebase's existing Angular 21 version exactly.
- Standard stack (icon rasterization library choice): MEDIUM — the *need* for a new dependency is HIGH confidence (empirically proven), but the specific library choice among `@resvg/resvg-js`/`sharp`/`svg2png-wasm` rests on WebSearch comparison articles, not a direct benchmark run in this project.
- Architecture (ConnectivityService pattern): HIGH — directly extrapolated from existing, read-in-full project conventions (`auth.service.ts`'s pattern was referenced but not fully read this session — flagged for planner to re-verify the exact shape before finalizing code).
- Accessibility contrast findings: HIGH — computed directly from the actual token values in `src/styles.css`, using a standard, independently-reproducible color-math pipeline (reproducible via the script path shown in this research).
- Desktop breakpoint (D-12) recommendation: MEDIUM — a reasoned judgment call, not a rubric-literal requirement with one correct answer; flagged as Open Question #2 with a specific recommended approach.
- Documentation requirements (README/.spec.md): HIGH — rubric text (`docs/checklist.md`) and CONTEXT.md's D-13/D-14/D-15 are unambiguous and already locked.

**Research date:** 2026-10-15
**Valid until:** ~30 days (stable domain: Angular 21 PWA APIs and WCAG math don't change quickly; the one fast-moving element is the exact `@resvg/resvg-js`/`@angular/service-worker` published versions, which should be re-checked via `npm view` at implementation time regardless of this document's age)
