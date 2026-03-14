# Musical Waves — Visual Overhaul Design

## Overview

A comprehensive visual overhaul of Musical Waves transforming it from a glassmorphism card-based UI into a fully immersive, organic instrument where the canvas IS the interface. The approach is "Liquid Canvas" — controls emerge from screen edges as luminous elements, a WebGL fluid simulation replaces the particle canvas, and each mood becomes a completely different visual world.

## Design Principles

- **Organic/immersive**: UI dissolves into the experience, never feels bolted on
- **Persistent but integrated**: Key info (mood, key, scale) stays visible as part of the art
- **Each mood = a different world**: Unique fluid physics, textures, colors, idle behavior
- **Dramatic reveal**: The intro is a cinematic moment, not a dialog box

---

## 1. Fluid Canvas Rendering

Replace the current particle/wave canvas with a WebGL fluid simulation using fragment shaders. The fluid reacts to pointer movement — dragging creates flowing trails of color that dissipate over time like ink in water.

### How it works

- Velocity field tracks pointer motion and feeds into a Navier-Stokes-lite solver (advection, diffusion, pressure)
- Color is injected at the cursor position based on the current zone:
  - Crystal: bright, high-frequency splashes
  - Pluck: mid-tone ribbons
  - Sub: deep, slow-spreading pools
- The fluid continuously evolves even without input — slow ambient currents keep it alive
- Notes trigger visual "blooms" at the cursor — a burst of color/light that syncs with the sound's attack and decay

### Per-mood fluid behavior

**Still Water**
- Slow, glassy ripples with caustic light patterns
- Low viscosity, high diffusion
- Colors spread gently and linger
- Cursor feels like dragging a finger through still water

**Moon Drift**
- Swirling, nebula-like ink clouds
- Medium viscosity, spiral vortex tendencies
- Colors twist and curl
- Cursor leaves comet-like trails

**Warm Rain**
- Droplet impacts creating expanding concentric rings
- Higher viscosity, colors pool and bloom outward
- Idle rain drops fall from random positions

### Glow layer

A second rendering pass produces a bloom/glow effect (screen blend mode) that halos around bright fluid areas, similar in purpose to the current `mw-canvas-glow` but driven by the fluid simulation's brightness values.

---

## 2. Controls — Edge-Emergent UI

No dock, no fixed cards. Controls live at the edges of the screen and emerge when the cursor moves toward them. During active play in the center, they are invisible.

### Edge zones

| Edge | Controls | Behavior |
|------|----------|----------|
| **Bottom** | Mood selector | Three fluid-styled pills: Still Water, Moon Drift, Warm Rain. Each previews its color palette. Selecting triggers a full-screen fluid transition. |
| **Right** | Pitch controls | Key selector, scale buttons, and an experimental scales toggle ("More Colors") as a vertical strip. Current key/scale glow brighter. Changes send a ripple from the right edge. Toggling "More Colors" reveals Phrygian and Whole Tone alongside the safe scales. |
| **Left** | Zone selector | Crystal / Pluck / Sub as luminous glyphs. Active zone pulses softly. Can also auto-switch by vertical cursor position (existing behavior). |
| **Top** | Scene toggles | Flow, Drone, and Share Link buttons. Flow label undulates when active. Drone emits steady glow when active. Share Link copies URL to clipboard with brief "Copied" confirmation. |

### Interaction model

- Controls fade in over ~300ms when cursor enters the edge zone (~80px from edge), fade out when cursor leaves
- On touch devices: swipe from any edge reveals that edge's controls; auto-dismiss after 3s of inactivity
- During Flow mode (hands-free): a single tap anywhere reveals all edges briefly

### Persistent info

The current mood name, key, scale, and **active zone** are rendered as faint watermark text in the lower-left corner — always visible at ~15% opacity, part of the canvas aesthetic. They subtly brighten when their corresponding edge controls are active. The zone indicator updates in real-time as the cursor moves vertically or the zone is manually changed.

---

## 3. Typography & Visual Identity

### Font pairing

- **Headings / mood names**: Elegant serif — Playfair Display or similar. Used for mood name watermark, intro screen title, and large display text.
- **Labels / controls**: Clean geometric sans — Inter or DM Sans. Small, light weight, generous letter-spacing. Used for edge controls, zone labels, status text.

### Text rendering

- All persistent text (watermark mood name, key, scale) rendered directly on the WebGL canvas or as absolutely-positioned HTML with `mix-blend-mode: soft-light` — embedded in the fluid, not floating above it
- Text color derived from the mood's palette at low opacity — never pure white
- Mood name watermark: ~72px, ~12-15% opacity, lower-left position

### Spacing

Generous throughout. Controls have wide padding, large hit targets, and breathe. The screen is mostly canvas — UI elements occupy the edges only when summoned.

---

## 4. Cinematic Intro Sequence

Replace the current modal with a full-screen cinematic reveal.

### The sequence

1. **Black screen** (~1s) — App loads to a completely dark canvas.
2. **Mood name** — Fades in center-screen in the serif font, large, elegant, low opacity. e.g. "Still Water." Tagline appears beneath: "cool, clear, and very forgiving."
3. **First ripple** — A single fluid bloom originates from center, slow, luminous, expanding outward. This step is purely visual — no audio plays yet (browsers require a user gesture to unlock AudioContext). The fluid sim is now running at idle with slow ambient currents.
4. **Invitation** — Text transitions to: "Touch anywhere to begin." The entire screen is the trigger.
5. **First touch** — User touches/clicks. AudioContext starts, a filtered drone fades in over ~1s to establish atmosphere. Title text dissolves into the fluid (letters break apart into particles that join the flow). A bloom erupts from the touch point. They are now playing.

### Mood switching transition

- Current fluid drains toward edges over ~800ms
- During drain, the existing audio continues playing (old audio graph is still active)
- Brief dark beat (~200ms) — audio graph rebuild (`buildAudioGraph`) happens during this pause
- New mood's palette floods in from center once the audio graph is ready
- Mood name flashes briefly center-screen
- If audio rebuild takes longer than ~200ms, extend the dark beat to match — never start new visuals before audio is ready

### Returning users

If the URL has mood/key/scale params (share link), skip steps 1-2 and go straight to the invitation with the fluid already active.

---

## 5. Cursor & Interaction Feedback

### Cursor

Replace the 10px white dot with a fluid-reactive orb:

| State | Appearance |
|-------|------------|
| **Idle/hovering** | Small (~16px), soft glow in mood's accent color |
| **Dragging/playing** | Expands (~24px), glow intensifies, short luminous trail feeding into fluid sim |
| **Near an edge** | Shifts to neutral white, shrinks slightly — signals "UI" space |
| **Touch devices** | Hidden (finger is the cursor) |

### Note feedback

- Each note trigger sends a radial pulse outward from the cursor
- Diameter and duration matched to the note's length and zone:
  - Crystal: tight bright flash
  - Sub: wide slow bloom
- Pulse color matches zone color from the mood palette
- Multiple rapid notes create overlapping rings — visual polyphony

### Drone feedback

- When drone is active, a steady, slowly breathing ring of light stays in place on the canvas at the latch position
- The fluid flows around and through the ring
- Ring color matches the drone note's zone

### Flow mode visual

- An autonomous phantom cursor drifts across the canvas following the existing noise-based motion path
- Same orb treatment but at ~60% opacity — a ghostly presence painting the fluid on its own

---

## 6. Per-Mood Worlds

### Still Water

- **Palette**: Deep ocean blues, cool cyan accents, silver highlights
- **Fluid**: Low viscosity, high diffusion. Slow glassy ripples. Caustic light patterns shimmer.
- **Idle**: Gentle currents drift left to right, like a still pond with faint breeze
- **Note blooms**: Concentric ripples radiating outward, like stones in water
- **Drone ring**: Soft cyan pool of light, ripples passing through
- **Edge controls tint**: Cool blue-white

### Moon Drift

- **Palette**: Deep indigo/violet, lavender accents, silver-purple highlights
- **Fluid**: Medium viscosity, spiral vortex tendencies. Nebula ink swirls.
- **Idle**: Slow clockwise rotation from center, like a galaxy spinning
- **Note blooms**: Comet-like bursts that spiral outward with curving tails
- **Drone ring**: Softly pulsing violet halo, ink swirling around it
- **Edge controls tint**: Lavender-white

### Warm Rain

- **Palette**: Deep amber/brown, warm orange accents, golden highlights
- **Fluid**: Higher viscosity, colors pool and stay close. Droplet physics.
- **Idle**: Raindrops from random top positions, each creating expanding ring on impact
- **Note blooms**: Splashing impact rings, warmer and wider than Still Water
- **Drone ring**: Warm golden glow, rain rings passing through
- **Edge controls tint**: Warm amber-white

---

## Technical Considerations

### Rendering Architecture

- **Single WebGL 2.0 canvas** handles the entire fluid simulation using multiple framebuffer objects (FBOs) for the simulation passes (velocity, pressure, divergence, dye/color)
- The glow/bloom effect is a post-processing pass within the same WebGL context — render the fluid to an FBO, apply a blur shader pass, then composite with additive blending to the screen. No second canvas needed.
- The current two `<canvas>` elements (2D context) are replaced by one `<canvas>` element with a `webgl2` context
- Target 60fps on modern hardware

### Fluid Simulation Integration

The project has no build step — all dependencies load via ESM importmap from `esm.sh`. The fluid simulation will be authored as a **separate vanilla JS file** (`fluid-sim.js`) loaded via `<script>` tag in `index.html`.

**Strategy:**
- Use Pavel Dobryakov's WebGL fluid simulation as a reference/starting point, adapted and simplified into a single `fluid-sim.js` file in the project root
- GLSL shaders are inlined as template literal strings within `fluid-sim.js`
- The module exports a `FluidSim` class that the React component instantiates, passing in the canvas element
- The class exposes methods: `init(canvas)`, `setMoodParams(params)`, `addSplat(x, y, dx, dy, color, radius)`, `step()`, `resize()`, `destroy()`
- The React component calls `addSplat()` on pointer move and `step()` in the animation loop

### Fluid Parameters Per Mood

The MOODS config expands with numeric fluid parameters (all values on 0.0–1.0 scale unless noted):

| Parameter | Still Water | Moon Drift | Warm Rain | Description |
|-----------|-------------|------------|-----------|-------------|
| `viscosity` | 0.1 | 0.4 | 0.7 | Resistance to flow (higher = thicker) |
| `diffusion` | 0.8 | 0.5 | 0.3 | How quickly color spreads |
| `curl` | 0.1 | 0.6 | 0.2 | Vorticity / swirl tendency |
| `pressure` | 0.6 | 0.5 | 0.7 | Pressure iteration strength |
| `splatRadius` | 0.004 | 0.003 | 0.005 | Size of color injection (ratio of canvas) |
| `dissipation` | 0.97 | 0.985 | 0.96 | How long color lingers (closer to 1 = longer) |
| `bloomIntensity` | 0.3 | 0.5 | 0.25 | Glow pass strength |
| `idleForce` | 0.05 | 0.1 | 0.15 | Strength of ambient currents when idle |

These are starting values — expect iterative tuning during implementation.

### Font Loading

- Load Playfair Display and Inter via `<link rel="preload">` in `index.html` to avoid FOUT during the cinematic intro
- Use `font-display: block` for the serif font (the intro sequence depends on it rendering correctly)
- Use `font-display: swap` for the sans font (controls can flash briefly without issue)
- Fallbacks: Playfair Display → Georgia → serif; Inter → system-ui → sans-serif

### Graceful Degradation

| Tier | Condition | Behavior |
|------|-----------|----------|
| **Full** | WebGL 2.0, 4+ cores | Full fluid sim at 256x256, bloom pass, all effects |
| **Reduced** | WebGL 2.0, <4 cores or frame time >20ms | Sim resolution drops to 128x128, bloom disabled |
| **Minimal** | WebGL 1.0 only | Simplified shader (advection + dye only, no pressure solve), 128x128, no bloom |
| **Fallback** | No WebGL | Keep current 2D canvas particle system as-is — the visual overhaul degrades to the existing experience with the new UI layout and typography |

Detection: check `canvas.getContext('webgl2')` first, fall back to `webgl`, then to `2d`. Monitor frame time over the first 60 frames and downshift tier if average exceeds 20ms.

### Accessibility

- Edge controls are standard DOM `<button>` and `<select>` elements — screen readers can access them
- **Keyboard navigation**: Tab cycles through all edge controls (they become visible when focused). Escape hides them. A keyboard shortcut (e.g., `?` or `Tab`) reveals all edges simultaneously.
- **`prefers-reduced-motion`**: When active, disable fluid animation (render a static gradient per mood instead), disable cursor trail/bloom animations, and use instant transitions instead of animated ones. Controls still function identically.
- All interactive elements retain visible focus indicators

### Guide Text

The current guide tooltip ("Move left for lower notes...") is removed. The cinematic intro provides the onboarding moment. For users who need a reminder, a brief help hint appears the first time they hover near an edge (e.g., "drag to play" near center, "hover edges for controls") — shown once per session via sessionStorage flag.

### Canvas Resize

On window resize:
- The WebGL canvas dimensions update to match the new viewport
- Framebuffer textures are reallocated at the new resolution (or sim resolution, if decoupled)
- Current fluid state is lost on resize — a fresh idle animation begins. This is acceptable because resize events are infrequent during play.

### Architecture

- `fluid-sim.js` — new file, standalone WebGL fluid simulation class (~300-500 lines)
- `musical-waves-v2.jsx` — refactored: particle rendering code replaced with FluidSim integration, dock/card UI replaced with edge-emergent controls, intro sequence rewritten
- `index.html` — add font preloads, add `<script src="fluid-sim.js">` tag
- Edge UI is pure CSS + pointer tracking — no new framework dependencies

### Migration

- Current particle rendering code in the animation loop is fully replaced
- Tone.js audio architecture stays the same — no audio changes
- MOODS config structure expands but doesn't break existing fields (audio params untouched)
- Share link URL params continue to work (reading and writing)
