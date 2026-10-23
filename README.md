<div align="center">

# DaFitMatch

AI-assisted personal styling platform that helps users discover an aesthetic, profile their
preferences, and get explainable outfit recommendations — with a 3D avatar preview and virtual
try-on. Everything runs in the browser; there is no backend and no build step.

## Features

- **Aesthetic discovery wizard** (`aesthetic.html`) — an 8-step, no-login-required quiz that
  captures a structured style profile (aesthetics, colours, fit, formality, exclusions, priorities).
- **Recommendation engine** (`recommendations.html`) — deterministic, explainable ranking of the
  catalogue against the saved profile, with reasons, warnings and a per-criterion breakdown.
- **3D playground** (`index.html`) — three.js avatar viewer plus try-on preview (`#playground-area`).
- **Google Sign-In** (optional) — when configured, profiles persist per user; otherwise everything
  is stored locally for the guest.

## Quick start

Any static file server works. For example, with Python:

   ```powershell
   python -m http.server 8000
   ```

- Open [http://localhost:8000/index.html](http://localhost:8000/index.html).

- The catalogue is fetched over HTTP, so do not open the HTML files directly with `file://`.

## Local settings

- Configuration is optional for guest browsing and local recommendations.
- To create local settings, copy the template:

```powershell
Copy-Item src/config.example.js src/config.js
```

2. Add the serving origin (e.g. `http://localhost:8000`) to the OAuth client's
   **Authorised JavaScript origins** in the Google Cloud console.

`src/config.js` is git-ignored. Without a real client ID the app runs fine in guest mode and the
sign-in dialog reports that Google Sign-In is not configured.

## Project layout

```
index.html                     Landing page + 3D playground
aesthetic.html                 Aesthetic discovery wizard (Page 3)
recommendations.html           Personalised recommendations
src/
  config.js                    Runtime config (git-ignored)
  config.example.js            Template for config.js
  core/
    auth.js                    Google Sign-In + session (no fabrication)
    store.js                   Shared, per-user onboarding store
  data/
    catalogue.json             Outfit catalogue
  features/
    aesthetic/                 Wizard controller
    viewer/                    three.js viewer
    recommendations/
      recommendations.rules.js   Weights + vocabulary + heuristics
      recommendations.engine.js  Deterministic scoring engine
      recommendations.ui.js      Recommendations page controller
assets/
  brand/                       Logos and hero imagery
  images/catalogue/            Outfit imagery
  images/try-on/               Try-on references
  models/                      ude (.glb) assets + README
docs/
  ARCHITECTURE.md              How the pieces fit together
tools/
  archive/                     Archived dev scripts & experimental pages
```

## How it fits together

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the data flow, the profile contract and how
the recommendation engine scores an outfit.

## Notes

- No frameworks, no bundler: plain HTML/CSS/Tailwind (CDN) and classic scripts.
- No personal data leaves the browser. Unavailable AI/product services are surfaced as
  "demo mode" — never as a successful live call.
