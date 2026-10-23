# Architecture

DaFitMatch is a **build-free static application**. Pages are plain HTML that load classic
`<script>` files from `src/`. There is no bundler, package manager, or server-side code — any
static host will serve it, but a local HTTP server is required so `fetch()` of the catalogue works.

## Layers

```
                 ┌───────────────────────────────────────────────┐
   HTML pages    │ index.html   profile.html   recommendations.html │
                 └───────────────┬───────────────┬───────────────────┘
                                 │               │
   core            src/config.js │  src/core/auth.js  src/core/store.js
                                 │               │
   features        src/features/viewer/three-viewer.js
                   src/features/profile/profile.controller.js
                   src/features/recommendations/*.js
                                 │
   data            src/data/catalogue.json      assets/{brand,images,models}
```

| Layer      | Path                          | Responsibility                                            |
| ---------- | ----------------------------- | --------------------------------------------------------- |
| Config     | `src/config.js`               | `window.ENV` (Google client id, storage namespace, flags) |
| Core       | `src/core/auth.js`            | Google Sign-In + session; never fabricates a login        |
| Core       | `src/core/store.js`           | Per-user onboarding state + localStorage persistence      |
| Feature    | `features/viewer`             | three.js avatar + try-on preview                          |
| Feature    | `features/profile`            | Unified 3-step aesthetic + fit profile controller         |
| Feature    | `features/recommendations`    | Rules + engine + UI for ranking outfits                   |
| Data       | `src/data/catalogue.json`     | Outfit catalogue (single source of product data)          |

## The profile contract

The wizard writes a **structured aesthetic profile** plus a per-partner fit profile into
`DaFitMatchStore`. The unified page also stores the optional display name and gender on the fit
profile (`full_name`, `gender`). The aesthetic shape is defined by `blankAesthetic()` in
`src/core/store.js`:

```js
{
  preferred_styles: [],        // aesthetic ids
  preferred_colours: [],       // palette ids
  avoided_colours: [],         // palette ids
  pattern_preference: null,
  preferred_fit: null,
  preferred_silhouette: null,
  formality_preference: null,  // human label, e.g. 'Refined'
  experimentation_level: null,
  styling_priorities: [],
  excluded_garments: [],
  excluded_fabrics: [],
  exclusion_flags: [],
  preferred_footwear: [],
  wardrobe_reuse: null,
  optional_notes: null,
  refinement: { /* statement_style, layering_preference, trend_preference, ... */ }
}
```

On completion the wizard also publishes the profile on `window.DaFitMatchProfile` and dispatches a
`dafitmatch:profile-complete` event, so downstream code can consume it without touching the store.

### Persistence & identity

`store.js` keeps state under one localStorage key (`ENV.STORAGE_NAMESPACE`) containing a map of
**per-user** entries (`guest` or `user:<google-sub>`). On sign-in a guest draft is merged into the
user's profile; on sign-out the guest profile is loaded again. `store.on(fn)` subscribes to changes.

Auth is resolved defensively: `auth.js` declares a top-level `const AuthState`, which is a global
*lexical* binding rather than a `window` property, so `store.js` exposes it via `getAuth()`.

## The recommendation engine

`src/features/recommendations/` has three files with a clean separation:

1. **`recommendations.rules.js`** — declarative knowledge only: criterion weights, category
   formality, and the keyword vocabularies that map profile ids to text found in the catalogue.
   All vocabulary is derived from real catalogue values and wizard option ids; nothing is invented.
2. **`recommendations.engine.js`** — pure, deterministic scoring. Public API:

   ```js
   DaFitMatchRecommendations.recommend(profile, catalogue, options)
   //   -> { results, excluded, meta }
   DaFitMatchRecommendations.isProfileEmpty(profile)
   DaFitMatchRecommendations.flatten(catalogue)
   ```

3. **`recommendations.ui.js`** — fetches `catalogue.json`, reads the profile from the store, calls
   the engine, and renders cards, filters and the transparency ("filtered out") list.

### Scoring

Each outfit is flattened to a lower-cased **corpus** (name, style, category, items, colours) plus a
`formality` value from `CATEGORY_META`. Criteria are scored in `0..1` and combined by weight:

| Criterion        | Weight | Source                                   |
| ---------------- | ------ | ---------------------------------------- |
| Aesthetic        | 30     | `STYLE_KEYWORDS` vs corpus               |
| Colour           | 18     | `COLOUR_KEYWORDS` vs colours             |
| Formality        | 12     | distance from `FORMALITY_VALUES[label]`  |
| Fit & silhouette | 10     | `FIT_/SILHOUETTE_KEYWORDS`               |
| Pattern          | 8      | `PATTERN_KEYWORDS`                       |
| Priorities       | 12     | `PRIORITY_RULES` (keywords/category/…)   |
| Variety          | 10     | `EXPERIMENTATION_KEYWORDS`               |
| Comfort          | 10     | `COMFORT_/MOBILITY_KEYWORDS`             |
| Finishing touches| 8      | `REFINEMENT_KEYWORDS`                    |
| Footwear         | 6      | `FOOTWEAR_KEYWORDS`                      |

`score = round(weightedAverage * 100 − penalties)`, clamped to `0..100`. **Hard exclusions**
(`hardExclusion`) remove an outfit entirely and report a human reason; **penalties** lower the score
and attach warnings. When the profile is empty, criteria default to a neutral `0.5` and the UI shows
a prompt to complete the quiz.

Every result carries `score`, `breakdown` (per-criterion), `reasons` (top signals) and `warnings`
(exclusions/conflicts), so the UI can explain *why* each look matched.

## Conventions

- **No fabrication.** Auth, AI and product services are surfaced as demo/unavailable rather than
  faked. `DEMO_MODE` in config makes this explicit.
- **Additive wiring.** Cross-cutting concerns (e.g. the auth bridge in `store.js`) patch existing
  modules at runtime instead of editing them, preserving current behaviour.
- **Classic scripts + globals.** Each module is an IIFE exposing a single `window.DaFitMatch*`
  namespace; load order matters and is declared explicitly in each page.
- **Path stability.** Data/assets are referenced with relative paths (`src/...`, `assets/...`) so the
  site works from any sub-directory.
