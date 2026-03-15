# Luminflow — Design Document

## Overview

Luminflow is a browser-based ambient instrument for creating generative soundscapes. Users interact with a full-screen WebGL fluid canvas — left-click-hold and drag to play notes, right-click to latch a drone chord, and toggle Flow mode for hands-free auto-play. The UI uses edge-emergent controls that appear when the cursor approaches screen edges, keeping the canvas uncluttered during play.

## Tech Stack

- **React 18** via ESM importmap (esm.sh, no build step)
- **Tone.js 15** for audio synthesis and effects
- **WebGL 2.0** fluid simulation (custom `fluid-sim.js`, Navier-Stokes solver)
- **Google Fonts** — Playfair Display (headings/watermark) + Inter (controls)

## Architecture

| File | Responsibility |
|------|---------------|
| `index.html` | Entry point, font preloads, script tags, meta tags |
| `fluid-sim.js` | Standalone WebGL 2.0 fluid simulation class (`FluidSim`) |
| `musical-waves-v2.jsx` | Main React component — all UI, audio, and interaction logic |
| `preview-app.js` | Pre-bundled copy of the JSX (loaded by index.html) |
| `preview-entry.jsx` | Entry point that mounts the React component |

---

## Interaction Model

### Left-click-hold + drag = Play

- Notes only trigger while the left mouse button is held down
- Moving without clicking produces faint visual splats (no audio) — the fluid subtly responds to cursor presence
- Horizontal position (left → right) maps to pitch (low → high)
- Vertical position determines the zone: top = Crystal, middle = Pluck, bottom = Sub
- Slow drag = spaced melody, fast sweep = rapid arpeggios

### Right-click = Toggle Drone

- Right-click anywhere latches a drone chord at that position
- The drone stays locked at the right-click position — it does not follow the mouse
- A glowing, rippling ring marks the drone position
- Right-click again to release the drone
- The Drone button in the top edge panel is an alternative toggle

### Flow Mode (Auto-play)

- Toggle via the top edge panel
- A phantom cursor (60% opacity) drifts across the canvas, playing notes automatically
- Flow follows the mouse cursor by default
- Left-click pins the flow at that position — flow keeps playing there while you play notes freely elsewhere
- Click on the pinned flow position (within 40px) to unpin — flow follows mouse again
- Turning off Flow resets the pin

### Touch Devices

- Single finger touch + drag = play (same as left-click-hold)
- Two-finger tap = toggle drone (300ms debounce to distinguish from pinch-zoom)

---

## Zones

Three instrument zones arranged top-to-bottom, each with distinct audio character:

### Crystal (top third)

- **Synth**: Per-mood oscillator (fatsine/fmsine/sine), fast attack
- **Character**: Sparkly, bright, responsive
- **Min note gap**: 30ms — allows rapid runs and arpeggios
- **Velocity**: Driven by vertical position + drag speed bonus
- **Visual**: Small, bright, high-intensity splats
- **Octave range**: 4–6

### Pluck (middle third)

- **Synth**: Per-mood oscillator (triangle/fatsawtooth), medium attack (~40ms)
- **Character**: Warm, expressive, velocity-sensitive
- **Min note gap**: 80ms
- **Velocity**: Driven by vertical position. Drag speed modulates note *duration* — slow drags = longer legato notes, fast drags = short plucks
- **Visual**: Medium flowing ribbon splats
- **Octave range**: 3–5

### Sub (bottom third)

- **Synth**: Per-mood oscillator (sine/fatsine), slow attack (~150ms), sub-octave layer (60% velocity)
- **Character**: Heavy, deliberate, deep
- **Min note gap**: 200ms — each note is an event
- **Velocity**: Driven by vertical position only
- **Visual**: Large, slow-spreading deep pools
- **Octave range**: 1–3
- **Polyphony**: 10 (doubled due to sub-octave layer)

---

## Moods

Three mood presets, each a musically distinct world:

### Still Water (C Pentatonic)

- **Character**: Ethereal, spacious, meditative
- **Synths**: Fat detuned sines (crystal), triangle (pluck), pure sine (sub), fat sine drone
- **Effects**: Very long reverb (9.5s, 70% wet), heavy chorus shimmer, spacious delay (dotted quarter, 22% feedback)
- **Flow**: Slow (420ms interval), quiet (0.16 velocity), sustained quarter notes
- **Idle**: Ambient notes every 5.5s
- **Fluid**: Low viscosity, high diffusion, gentle drift idle
- **Palette**: Deep ocean blues, cyan, silver

### Moon Drift (D Dorian)

- **Character**: Mysterious, ghostly, echo-heavy
- **Synths**: FM sine with harmonics (crystal), detuned sawtooth (pluck), fat sine (sub), wide-spread fat sine drone
- **Effects**: Moderate reverb (6.5s), heavy delay feedback (35%), fast deep chorus (1.2Hz) for otherworldly shimmer
- **Flow**: Fast (200ms interval), eighth notes
- **Idle**: Ambient notes every 3.2s
- **Fluid**: Medium viscosity, high curl (spiral tendency), spiral idle
- **Palette**: Deep indigo/violet, lavender, silver-purple

### Warm Rain (A Natural Minor)

- **Character**: Intimate, earthy, direct
- **Synths**: Pure sine (crystal — soft raindrops), clean triangle (pluck — kalimba-like), pure sine (sub)
- **Effects**: Short reverb (3.5s, 30% wet), minimal delay, very low chorus, low filter (2200Hz)
- **Flow**: Quick (220ms interval), short 16th notes, punchy and rhythmic
- **Idle**: Ambient notes every 3.4s
- **Fluid**: High viscosity, low diffusion, rain idle (droplets from top)
- **Palette**: Deep amber/brown, warm orange, golden

---

## UI — Edge-Emergent Controls

No dock, no fixed panels. Controls live at screen edges and appear when the cursor approaches (~80px threshold). They fade in over 300ms with a subtle slide-in transform. Tab key reveals all edges for keyboard navigation. Escape hides them.

| Edge | Controls |
|------|----------|
| **Bottom** | Mood selector — Still Water, Moon Drift, Warm Rain |
| **Right** | Pitch — root key selector, scale buttons, "More Colors" toggle for experimental scales |
| **Left** | Zone selector — Crystal, Pluck, Sub (clickable buttons) |
| **Top** | Flow toggle, Drone toggle, Volume slider (dB), Share link |

All buttons have `aria-label` and `aria-pressed` attributes. Edge panels are `<nav>` elements with `aria-label`. Volume slider and key select have labels.

---

## Persistent Watermark

Lower-left corner, always visible at 15% opacity:
- Mood name in Playfair Display (72px, `mix-blend-mode: soft-light`)
- Key, scale, and zone in Inter (13px, uppercase)
- Brightens to 35% when the left edge panel is active

---

## Cinematic Intro

Phase-based state machine: `black` → `title` → `ripple` → `invite` → `playing`

1. **Black** (1s) — dark canvas
2. **Title** (2s) — "Luminflow" label, mood name, tagline fade in
3. **Ripple** (2s) — fluid bloom from center, simulation running at idle
4. **Invite** — "Touch anywhere to begin" pulses, entire screen is the trigger
5. **Playing** — audio starts, title dissolves, user is playing

Returning users (URL has `?m=` param) skip to the ripple phase.

---

## Mood Switching Transition

- Drain phase (800ms) — fluid darkens from edges, audio continues playing
- Dark beat — audio graph rebuilds, notes rebuilt synchronously before synths
- Flood phase (600ms) — new mood floods in from center with a color splat
- Mood name flashes center-screen (fade-in-out animation)

---

## Drone Ring Visual

A glowing, rippling indicator at the right-click position:
- 2px border in the latched zone's color (70% opacity)
- Triple-layer glow (24px, 60px, 100px spread) + inset glow
- Breathing animation (3s cycle, scales 1.0–1.08, opacity 0.6–1.0)
- Two ripple rings pulse outward (staggered 1.5s apart, scale to 1.8x, fade out)
- Size varies by zone: Crystal 50px, Pluck 80px, Sub 120px

---

## Cursor

A radial-gradient orb that adapts to state:
- **Idle**: 16px, soft glow in zone color, CSS margin centering
- **Playing** (left-click held): 24px, intensified glow
- **Near edge**: 12px, neutral white, no glow
- **Touch devices**: Hidden
- Smooth CSS transitions between states (`margin` handles centering)
- `will-change: transform` for GPU compositing

---

## Fluid Simulation

`fluid-sim.js` — standalone WebGL 2.0 Navier-Stokes solver:

- GLSL 300 es shaders inlined as template literals
- Double-buffered FBOs: velocity (RG16F), pressure (R16F), dye (RGBA16F)
- Bloom post-processing with prefilter, downsample blur chain, upsample accumulation
- Per-mood parameters: viscosity, diffusion, curl, pressure, splatRadius, dissipation, bloomIntensity, idleForce, idleMode

**Per-zone splat scaling:**
- Crystal: 0.5x radius, 1.4x intensity, 1.5x velocity (sharp bright points)
- Pluck: 1.0x (baseline flowing ribbons)
- Sub: 2.0x radius, 0.6x intensity, 0.5x velocity (wide deep pools)

**Idle modes per mood:**
- `drift` (Still Water) — gentle left-to-right current
- `spiral` (Moon Drift) — clockwise rotation from center
- `rain` (Warm Rain) — random droplets from top

**Graceful degradation:**
- Canvas sized at `devicePixelRatio` for HiDPI displays
- `webglTriedRef` prevents retry after init failure
- Fallback message shown when WebGL unavailable
- `prefers-reduced-motion` disables all animations

---

## Audio Architecture

All synths built per mood in `buildAudioGraph`. Signal chain:

```
Crystal PolySynth → Chorus → Delay → Reverb → Filter → Compressor → Limiter → Destination
Pluck PolySynth   → Delay  → (same chain)
Sub PolySynth     → Reverb → (same chain)
Drone PolySynth   → Reverb → (same chain)
```

- Each mood defines oscillator types, envelope parameters, and effects settings
- `await reverb.ready` before marking audio ready
- `audioStartingRef` prevents double-init on simultaneous triggers
- `moodTransitionRef` prevents double mood-switch race conditions
- Master volume controlled by `Tone.getDestination().volume`
- Sub zone triggers sub-octave layer (note one octave below at 60% velocity)

---

## URL State / Share Links

Parameters update in real-time via `history.replaceState`:
- `m` — mood key
- `s` — scale key
- `k` — root note
- `f=1` — flow enabled
- `x=1` — experimental scales visible

Share button copies the current URL to clipboard with visual "Copied" confirmation.

---

## Accessibility

- All buttons have `aria-label` and `aria-pressed`
- Edge panels are `<nav>` with `aria-label`
- Volume slider and key select have labels
- Tab reveals all edge panels via `:focus-within`
- Escape hides all panels
- `prefers-reduced-motion`: disables all transitions and animations
- Intro overlay has `role="button"`, `tabIndex`, keyboard activation (Enter/Space)
- WebGL fallback message when unavailable
