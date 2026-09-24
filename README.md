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
| `main.js` | UI: language switch, search, journey cards, grid, counters, tilt, scroll state. |
| `scene.js` | The 3D world: sky, stars, clouds, river, Droplet mark, course orbs, bloom, scroll camera. |
| `assets/` | Droplet Labs logos and favicons (from `droplet-labs-v2/assets`). |

## Add a course

1. Open `courses.js` and copy one object in `courses`.
2. Change `id`, `color`, `name`, `subject`, `line`, `ask`, `stages / lessons / demos`, `tags`, `keywords`, `url`, `repo`, and optionally `glyph` (24×24 stroke SVG; a droplet is used if omitted).
3. Save. The hero headline ("Seven paths…"), totals, search, river orbs, journey cards, grid, marquee, rail and footer all rebuild from the list. Array order is page order.

Set `showNext: false` to hide the "Next path" placeholder orb and card.

## Run locally

```
python tools/serve.py 8791
```

The launch config `droplet-labs-paths` in `C:\claude-projects\.claude\launch.json` does the same.

Debug query parameters (for screenshots): `?nl` skips the loader, `?snap` removes camera easing, `?at=<shot>` renders the page as if scrolled to that anchor (`hero`, `rise`, `course:<id>`, `overview`, `orbit`, `orbit2`, `labs`), `?lang=zh|en`.
