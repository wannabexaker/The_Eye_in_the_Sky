# player-web Index

## Purpose
Next.js player shell for the live game presentation, wallet simulation, overlays, and board controls.

## Structure
```text
app/
  layout.tsx
  page.tsx
  globals.css

components/
  board/         board renderer and board-local UI
  controls/      bottom machine bar and spin controls
  layout/        left/right shell rails
  modals/        wallet and shell overlays
  presentation/  win/bonus presentation system
  debug/         debug-only surfaces
  archive/       old or currently unused components kept for reference

hooks/
  gameplay/      controller hooks for play flow

lib/
  assets/        runtime asset manifests
  audio/         sound system
  presentation/  timing, particles, presentation types
  state/         Zustand UI state

public/assets/
  backgrounds/
  symbols/
  ui/
```

## Entry Points
- [page.tsx](app/page.tsx): shell composition
- [globals.css](app/globals.css): active shell styling
- [use-slot-machine.ts](hooks/gameplay/use-slot-machine.ts): gameplay controller
