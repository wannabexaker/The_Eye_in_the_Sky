# Asset Pipeline

## Status
- Phase: `Phase 1 fake-money prototype art production`
- Last updated: `2026-03-16`
- Purpose: `Single source of truth for game art production, filenames, prompts, formats, and delivery status`

## Visual Direction
- Style: `dark premium occult`
- Tone: `sacred horror`, `celestial surveillance`, `forbidden temple in the sky`
- Palette:
  - `obsidian black`
  - `ash gray`
  - `muted gold`
  - `burnt ivory`
  - `deep crimson accents`
- Rendering rules:
  - premium, elegant, restrained
  - no childish casino look
  - no neon overload
  - no comedic fantasy
  - no watermarks
  - no embedded UI text unless requested

## Technical Rules
- Symbol and UI assets:
  - format: `PNG transparent` target, `SVG first-pass acceptable during prototype production`
  - color space: `sRGB`
  - centered composition
  - readable at small size
  - sharp silhouette
- Backgrounds:
  - format: `WEBP` or `JPG` for final painted versions
  - `SVG` allowed for prototype atmospheric backgrounds
- Naming:
  - lowercase
  - kebab-case
  - stable filenames referenced by UI

## Delivery Priority
1. symbol suite
2. wild symbol
3. meter icon
4. board frame
5. main background
6. bonus splash
7. logo
8. optional FX overlays

## Asset Manifest
| Status | Filename | Type | Target Size | Format | Prompt Summary |
|---|---|---|---|---|---|
| `done-svg-first-pass` | `symbol-ashen-sigil.svg` | low symbol | 1024x1024 | SVG | occult rune carved in ash-black stone with gold dust |
| `done-svg-first-pass` | `symbol-broken-halo.svg` | low symbol | 1024x1024 | SVG | cracked divine halo in worn gold |
| `done-svg-first-pass` | `symbol-ritual-dagger.svg` | low symbol | 1024x1024 | SVG | ceremonial obsidian dagger with engraved hilt |
| `done-svg-first-pass` | `symbol-sealed-scroll.svg` | low symbol | 1024x1024 | SVG | forbidden manuscript sealed in wax and thread |
| `done-svg-first-pass` | `symbol-seraphim-feather.svg` | high symbol | 1024x1024 | SVG | radiant feather with pale celestial fire |
| `done-svg-first-pass` | `symbol-burning-crown.svg` | high symbol | 1024x1024 | SVG | blackened gold crown with sacred flame |
| `done-svg-first-pass` | `symbol-ophidian-relic.svg` | high symbol | 1024x1024 | SVG | serpent relic in obsidian and aged gold |
| `done-svg-first-pass` | `symbol-celestial-gate.svg` | high symbol | 1024x1024 | SVG | radiant gate of black stone and divine gold |
| `done-svg-first-pass` | `symbol-seraphim-eye.svg` | special symbol | 1024x1024 | SVG | sacred eye relic with winged seraphic motif |
| `done-svg-first-pass` | `symbol-samsara.svg` | special symbol | 1024x1024 | SVG | mystical rebirth wheel with layered rings |
| `done-svg-first-pass` | `symbol-ouroboros.svg` | special symbol | 1024x1024 | SVG | ouroboros ring in sacred geometry |
| `done-svg-first-pass` | `symbol-panepoptis-ophthalmos.svg` | ultra-rare special | 1024x1024 | SVG | supreme all-seeing eye artifact |
| `done-svg-first-pass` | `symbol-wild.svg` | wild symbol | 1024x1024 | SVG | sacred star-eye wild mark |
| `done-svg-first-pass` | `meter-eye-core.svg` | UI icon | 512x512 | SVG | compact sacred eye emblem for meter |
| `done-svg-first-pass` | `frame-board-main.svg` | UI frame | 1600x1200 | SVG | black stone board frame with gold glyph inlay |
| `done-svg-first-pass` | `bg-main-temple-sky.svg` | background | 2560x1440 | SVG | forbidden temple floating in celestial storm |
| `done-svg-first-pass` | `logo-eye-in-the-sky.svg` | logo | 1600x600 | SVG | premium title mark with sacred eye motif |
| `done-svg-first-pass` | `bonus-sky-opens.svg` | bonus splash | 1920x1080 | SVG | celestial rupture and divine light beams over temple |
| `todo-painted` | `bonus-sky-opens.png` | bonus splash | 1920x1080 | PNG | celestial rupture and divine light beams over temple |
| `todo-painted` | `bg-main-temple-sky.webp` | painted background | 2560x1440 | WEBP | cinematic painted premium sky temple scene |
| `todo-painted` | `frame-board-main.png` | painted frame | 1600x1200 | PNG | high-detail painted stone board frame |
| `todo-painted` | `logo-eye-in-the-sky.png` | painted logo | 1600x600 | PNG | premium branded title mark |

## Notes
- Current asset batch is `SVG first-pass` suitable for immediate prototype integration.
- Final painted production assets should preserve silhouette, palette, and composition from these vectors.
- If external image generation is used later, these filenames and prompts remain canonical.
- Final painted assets should be dropped into the same public folders alongside the SVG versions under `apps/player-web/public/assets`.
