# Responsive Calibration Matrix

## Scope
This matrix defines baseline viewport bands for `player-web` shell calibration across desktop and portrait usage.

## Core Bands

1. `16:9 desktop` (default)
- 1366x768
- 1600x900
- 1920x1080
- 2560x1440
- 3840x2160

2. `16:10 laptop`
- 1280x800
- 1440x900
- 1680x1050
- 1920x1200

3. `Ultrawide desktop`
- 2560x1080
- 3440x1440

4. `Portrait 9:16`
- 720x1280
- 1080x1920
- 1440x2560

5. `Mobile-like CSS viewport checks`
- 390x844
- 393x873
- 412x915
- 768x1024
- 820x1180

## What is Calibrated

1. `Board ownership`
- Board remains dominant center element.
- Board frame never clips behind footer.

2. `Rail ownership`
- Left/right rails scale on desktop bands.
- Rails collapse in portrait 9:16 and narrow widths.

3. `Footer ownership`
- Controls remain clickable and centered.
- Spin CTA lane remains visible above control cluster.

4. `Status ownership`
- Mini-stat strip overlays board and does not consume board height.

## Acceptance Criteria

1. `No crop`
- Right-side logo and board frame do not crop in 1080p, 1440p, ultrawide.

2. `No overlap`
- Footer controls never block active board center.

3. `No side-rail collision`
- Side rails do not overlap center board in any desktop band.

4. `Portrait viability`
- In 9:16, side rails are hidden and center board remains fully visible with usable controls.

5. `Scaling stability`
- Behavior remains consistent at Windows scaling 100%, 125%, 150%.

## Implemented CSS Bands

1. `main-board.css`
- Full HD / sub-Full HD desktop bands
- 16:10 laptop band
- 4K+ band
- Ultrawide (21:9+) band
- Portrait 9:16 band

2. `globals.css`
- Portrait rail collapse behavior independent of width-only breakpoints

## Next Suggested Pass

1. Add screenshot-based visual regression captures for each band.
2. Record per-band board frame occupancy ratio and footer clearance values.
3. Add one dedicated calibration pass for 2868x1320 (ultrawide laptop class).
