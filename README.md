# Droplet Labs · Paths

> 🔗 **Live** — <https://evidex-cloud.github.io/>

The landing page for every Droplet Labs course. A single Three.js scene sits behind the page: a night sky over a sea of clouds, a river of stardust spiralling out of the 3D Droplet mark, and one glowing orb per course riding that river. Scrolling moves the camera from shot to shot.

Static site, no build step. Three.js 0.170 loads from jsDelivr via the import map in `index.html`.

## Files

| File | What it holds |
|---|---|
| `courses.js` | **All content.** Course list, colours, links, stats, and every line of EN / 中文 copy. |
| `index.html` | Page skeleton. Sections with `data-shot` are camera anchors. |
| `styles.css` | Night palette, glass panels, tilt cards, phone layout. |
| `search.js` | Course search: ranks every related path across names, subjects, tags, keywords and descriptions in both languages. |
| `main.js` | UI: language switch, search results, nav paths panel, journey cards, grid, counters, tilt, scroll state. |
| `scene.js` | The 3D world: sky, stars, clouds, river, Droplet mark, course orbs, bloom, scroll camera. |
| `assets/` | Droplet Labs logos and favicons (from `droplet-labs-v2/assets`). |
| `offline.js` | "Save all paths for offline" row at the bottom of the Paths menu: lists every file of the hub and each course (GitHub API, falls back to `offline-files.json`), caches them, re-saves only changed files. |
| `sw.js` | Service worker, registered only after a visitor saves. Serves saved files cache-first (refreshing them quietly when online) for the hub and every course under this origin. |
| `pwa-shell.js` | Home Screen app helpers: keeps same-site links inside the app and adds a small "All paths" button on course pages (injected by `sw.js`). No effect in a normal tab. |
| `manifest.webmanifest` | Web app manifest (Add to Home Screen). |
| `vendor/three/` | three.js 0.170 (MIT) and the addons the scene uses, served locally so the 3D page works offline. |
| `offline-files.json` | Fallback file list for offline saving; regenerate with `python tools/build-offline-list.py`. |

## Add a course

1. Open `courses.js` and copy one object in `courses`.
2. Change `id`, `color`, `name`, `subject`, `line`, `ask`, `stages / lessons / demos`, `tags`, `keywords`, `url`, and optionally `glyph` (24×24 stroke SVG; a droplet is used if omitted).
3. Save. The hero headline ("Eight paths…"), totals, search, river orbs, journey cards, grid, marquee, rail and footer all rebuild from the list. Array order is page order.

Set `showNext: false` to hide the "Next path" placeholder orb and card.

## Run locally

```
python tools/serve.py 8791
```

The launch config `droplet-labs-paths` in `C:\claude-projects\.claude\launch.json` does the same.

Debug query parameters (for screenshots): `?nl` skips the loader, `?snap` removes camera easing, `?at=<shot>` renders the page as if scrolled to that anchor (`hero`, `rise`, `course:<id>`, `overview`, `orbit`, `orbit2`, `labs`), `?lang=zh|en`. `?q=bitcoin` opens the page with that search already run (shareable).

## Offline (iPhone and elsewhere)

1. Open the site in Safari, Share → **Add to Home Screen**, then open it from the Home Screen (that app keeps its own storage).
2. Open the **Paths** menu and tap **Save all paths for offline** at the bottom (about 70 MB).
3. Test once in airplane mode before you rely on it.

Saved files are served from the cache first and refreshed in the background when online, so a new course version appears one visit later; **Check for updates** fetches only files whose git sha changed. **Remove** deletes the copy and the service worker.

To test the whole flow locally, `python tools/serve-pages.py 8797` serves the hub and every local course clone the way GitHub Pages does (`/<repo>/`). Add `?offlist=local` to save from `offline-files.json` instead of the GitHub API, and `?standalone` to see the Home Screen helpers in a normal tab.

