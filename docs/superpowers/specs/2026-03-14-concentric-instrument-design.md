# Musical Waves — Concentric Instrument Refinement

## Overview

Refine Musical Waves into a more playable, expressive instrument by reorganizing the canvas into concentric zones, adding intentional click-to-play mechanics, and giving each zone a distinct audio and visual character. The fluid canvas stays unified — zones reveal themselves through color and feel, not boundaries.

## Design Principles

- **Intentional play**: Notes only trigger on left-click-hold + drag, not passive mouse movement
- **Distinct zones**: Crystal, Pluck, and Sub feel like genuinely different instruments
- **Unified canvas**: No visual zone boundaries — color and response tell you where you are
- **Radial expressiveness**: Angle = scale degree, distance = octave/velocity

---

## 1. Concentric Zone Layout

Replace horizontal band zone detection with concentric rings centered on the canvas.

### Zone mapping (by distance from center)

Distance is measured from the canvas center as a ratio of the shortest screen dimension (so the zones form circles, not ellipses on wide screens):

| Zone | Distance range | Character |
|------|---------------|-----------|
| **Crystal** | 0% – 30% | Bright, sparkly core |
| **Pluck** | 30% – 65% | Expressive mid ring |
| **Sub** | 65% – 100%+ | Heavy, deep outer ring |

### Pitch mapping within each zone

- **Angle** = scale degree. 12 o'clock (top) = root note. Clockwise sweep ascends through the available notes in that zone's range. A full rotation covers all notes.
- **Ring depth** (0–1 within the zone's ring) = octave + velocity. Inner edge of ring = lower octave, quieter. Outer edge = higher octave, louder.

### Implementation

Replace `getZone(yRatio)` with `getZoneFromPosition(x, y)`:

```
function getZoneFromPosition(x, y, rect) {
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const radius = Math.min(cx, cy);
  const dx = x - cx;
  const dy = y - cy;
  const distance = Math.hypot(dx, dy);
  const ratio = distance / radius;
  const angle = Math.atan2(dx, -dy); // 0 = top, clockwise positive

  let zone, ringDepth;
  if (ratio < 0.30) {
    zone = 'crystal';
    ringDepth = ratio / 0.30;
  } else if (ratio < 0.65) {
    zone = 'pluck';
    ringDepth = (ratio - 0.30) / 0.35;
  } else {
    zone = 'sub';
    ringDepth = Math.min((ratio - 0.65) / 0.35, 1.0);
  }

  return { zone, angle, ringDepth };
}
```

Note selection uses angle to pick the scale degree and ringDepth to select octave within the zone's range.

**Angle normalization** (0 = top/12 o'clock, 1 = full clockwise rotation):
```
const normalizedAngle = ((angle + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI);
```
Where `angle` comes from `Math.atan2(dx, -dy)` (range [-PI, PI], 0 = top).

**Note selection formula:** Each zone has a set of notes built from `buildScaleNotes(scale, root, octLow, octHigh)`. The notes are split into scale degrees (notes within one octave) and octaves (the range). Angle selects the scale degree, ringDepth selects the octave:
```
const scaleSize = SCALES[currentScale].intervals.length; // e.g., 5 for pentatonic
const degree = Math.floor(normalizedAngle * scaleSize) % scaleSize;
const octaveRange = zone.octaves[1] - zone.octaves[0]; // e.g., 2 for Crystal (4-6)
const octave = zone.octaves[0] + Math.floor(ringDepth * (octaveRange + 0.99));
const noteIndex = (octave - zone.octaves[0]) * scaleSize + degree;
const clampedIndex = clamp(noteIndex, 0, notes.length - 1);
```

---

## 2. Click Mechanics

### Left mouse button (hold + drag to play)

- Notes only trigger while the left button is held down AND the cursor moves to a new pitch position
- Moving without clicking produces only faint visual splats (low opacity, no audio) — the fluid responds to cursor presence but doesn't play
- Slow drag = spaced melody, fast sweep = rapid arpeggios
- Releasing the button stops note triggering immediately
- The `onPointerDown` handler starts the play state, `onPointerMove` triggers notes only while `pointerDownRef.current` is true, `onPointerUp` ends it

### Right mouse button (click to toggle drone)

- Right-click anywhere latches a drone chord based on the current zone and cursor position
- Right-click again to release the drone
- The drone ring visual appears at the latch position
- Playing with left-click over an active drone is the core experience
- The Drone button in the top edge still exists as an alternative toggle
- Context menu suppression is already implemented (`onContextMenu`)

### Implementation changes

- `onPointerDown`: Check `event.button`. If 0 (left), set `pointerDownRef.current = true` and trigger first note. If 2 (right), toggle drone.
- `onPointerMove`: Only call `triggerNote` if `pointerDownRef.current` is true. Always update cursor position and inject faint visual splats.
- Remove automatic note triggering from pointer movement without button held.

### Touch devices

- Single finger touch + drag = play (equivalent to left-click-hold). This already works via pointer events (`pointerdown` with `event.pointerType === 'touch'` sets `pointerDownRef`).
- Two-finger tap = toggle drone. Implement via Touch Events: listen for `touchstart`, and if `event.touches.length === 2`, call `event.preventDefault()` (to suppress pinch-zoom) and toggle drone. Use a short debounce (~300ms) to distinguish from pinch gestures — if a `touchmove` with significant distance occurs before the debounce expires, cancel the drone toggle.

### Flow mode

- Stays as a toggle in the top edge controls
- The phantom cursor follows a spiral path: starts at center (Crystal), spirals outward through Pluck to Sub, then spirals back inward. Repeats.
- Uses the noise function to add organic variation to the spiral path
- Notes trigger along the spiral path as before, but now zone transitions happen naturally as the spiral crosses ring boundaries

---

## 3. Per-Zone Audio Character

Each zone feels like a genuinely different instrument with distinct attack, decay, note density, and velocity response.

### Crystal (center core)

- **Synth**: Fatsine with shimmer + subtle pitch vibrato for bell-like quality
- **Attack**: Near-instant (~18ms, existing)
- **Decay**: Short, sparkly — notes appear and vanish quickly
- **Min note gap**: 30ms — allows rapid runs and arpeggios
- **Velocity mapping**: ringDepth controls velocity (0.15–0.40 range). Fast drag adds a brightness boost.
- **Octave range**: 4–6 (existing)

### Pluck (mid ring)

- **Synth**: Triangle oscillator, warmer tone. Slightly longer attack for more body.
- **Attack**: ~40ms (increase from current 6ms). Hardcode `attack: 0.04` in the pluck synth constructor (it's currently hardcoded at `0.006`; no per-mood parameterization needed since pluck attack doesn't vary by mood).
- **Decay**: Medium — notes ring out with sustain
- **Min note gap**: 80ms — expressive but not spammy
- **Velocity mapping**: ringDepth controls velocity (0.12–0.35 range). Drag speed modulates note duration (Pluck only) — slow drags produce longer notes (up to 0.5s), fast drags produce short plucks (0.1s). Other zones use fixed durations.
- **Octave range**: 3–5 (existing)

### Sub (outer ring)

- **Synth**: Sine + sub-octave layer. Slow, heavy attack with long release.
- **Attack**: ~150ms — notes bloom into existence
- **Decay**: Very long — notes sustain and fade slowly
- **Min note gap**: 200ms — each note is a deliberate event
- **Velocity mapping**: ringDepth controls velocity (0.10–0.28 range). Each note carries weight regardless of speed.
- **Octave range**: 1–3 (existing)

### Synth modifications

The sub-octave layer for the Sub zone is implemented by triggering two notes simultaneously: the selected note at the computed velocity, and the note one octave below it at 60% of that velocity. Increase the Sub synth's `maxPolyphony` from 3 to 6 to accommodate the double-triggering alongside long release tails.

---

## 4. Visual Feedback

### Unified canvas — no boundaries

The fluid canvas stays seamless. No concentric circles, rings, or zone markers are drawn. The zones reveal themselves entirely through the colors painted when you play and the feel of the response.

### Zone color injection

- Crystal splats use the mood's `zoneColors.crystal` (e.g., cyan/ice for Still Water)
- Pluck splats use the mood's `zoneColors.pluck` (e.g., blue for Still Water)
- Sub splats use the mood's `zoneColors.sub` (e.g., dark blue for Still Water)
- Idle fluid behavior stays as-is (drift/spiral/rain) using neutral pluck color at low intensity

### Splat character per zone

| Property | Crystal | Pluck | Sub |
|----------|---------|-------|-----|
| Splat radius | Small (0.5x base) | Medium (1.0x base) | Large (2.0x base) |
| Color intensity | High (bright) | Medium | Low (deep, spread) |
| Injection velocity | Fast (sharp points) | Medium (flowing ribbons) | Slow (expanding pools) |

### Mouse movement without click

When the cursor moves without left button held, inject very faint splats (10% of normal intensity, using the current zone's color). The fluid subtly responds to cursor presence — you can see which zone you're hovering in by the faint color — but no audio plays.

### Cursor orb per zone

- Glow color matches zone color (already partially implemented)
- **Idle size** (hovering without click): 14px in Crystal, 16px in Pluck, 20px in Sub
- **Playing size** (left-click held): 20px in Crystal, 24px in Pluck, 30px in Sub
- Transition between sizes uses the existing CSS `transition: width 0.25s ease, height 0.25s ease` — smooth when crossing zone boundaries

### Drone ring per zone

- Crystal drone: small tight ring (50px), fast breathing animation
- Pluck drone: medium ring (80px, existing)
- Sub drone: large ring (120px), very slow breathing

---

## 5. Flow Mode — Spiral Path

Replace the current noise-based linear motion with a spiral path through the concentric rings.

### Spiral behavior

Archimedean spiral with linear radius growth. State is stored in `flowRef.current`:

```
flowRef.current = {
  intervalId: null,
  t: 0,          // continuous time parameter, incremented each step
  direction: 1,  // 1 = expanding outward, -1 = contracting inward
};
```

Each `runFlowStep` call:
```
const t = flowRef.current.t;
const speed = 0.02; // radians per step
const radiusGrowth = 0.003; // radius expansion per step

// Base spiral position
let spiralAngle = t * speed * 3; // ~3 rotations per full sweep
let spiralRadius = t * radiusGrowth * flowRef.current.direction;

// Clamp radius to 0.05–0.95 and reverse direction at bounds
if (spiralRadius > 0.95) { flowRef.current.direction = -1; }
if (spiralRadius < 0.05) { flowRef.current.direction = 1; }
spiralRadius = clamp(spiralRadius, 0.05, 0.95);

// Add noise for organic variation
const noise = noiseRef.current;
const noiseX = noise(t * 0.01, 0) * 0.08;
const noiseY = noise(0, t * 0.01) * 0.08;

// Convert to canvas coordinates
const cx = rect.width / 2;
const cy = rect.height / 2;
const r = Math.min(cx, cy);
const x = cx + (Math.cos(spiralAngle) * spiralRadius * r) + noiseX * r;
const y = cy + (Math.sin(spiralAngle) * spiralRadius * r) + noiseY * r;

flowRef.current.t += 1;
```

The `flowInterval` (from mood audio config) controls how frequently `runFlowStep` is called via `setInterval`, which determines note density. The spiral movement speed is independent — it's the `speed` and `radiusGrowth` constants above.

### Visual

- The phantom cursor still renders at 60% opacity
- Its glow color shifts as it crosses zone boundaries
- The spiral path paints a beautiful trail of shifting colors through the fluid

---

## Technical Considerations

### Coordinate math

- All zone detection uses distance from canvas center divided by `Math.min(width/2, height/2)`
- Angle computation uses `Math.atan2(dx, -dy)` where dx/dy are relative to center, giving 0 at top and increasing clockwise
- Angle is normalized to 0–1 for note mapping: `((angle + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI)` — this correctly gives 0 at 12 o'clock, 0.25 at 3 o'clock, 0.5 at 6 o'clock, 0.75 at 9 o'clock

### Note selection

See the formula in Section 1 ("Note selection formula"). Angle selects scale degree, ringDepth selects octave within the zone's range. These combine to index into the zone's pre-built note array.

### Velocity formula per zone

Replace the current universal velocity formula with per-zone calculations:
```
// Crystal: ringDepth + speed bonus
velocity = 0.15 + ringDepth * 0.25 + clamp(dragSpeed * 0.002, 0, 0.08);

// Pluck: ringDepth + speed affects duration not velocity
velocity = 0.12 + ringDepth * 0.23;
duration = 0.1 + (1 - clamp(dragSpeed / 80, 0, 1)) * 0.4; // slow = longer

// Sub: ringDepth only, deliberate
velocity = 0.10 + ringDepth * 0.18;
```

### Trigger throttling per zone

Replace the single `lastNoteTimeRef` with per-zone minimum gaps:
```
const NOTE_GAP = { crystal: 30, pluck: 80, sub: 200 }; // ms
```

### Changes to existing code

- `getZone(yRatio)` → `getZoneFromPosition(x, y, rect)` — returns `{ zone, angle, ringDepth }`
- `triggerNote(clientX)` → `triggerNote(x, y)` — uses position for both zone detection and note selection
- `onPointerDown` — split left/right button behavior
- `onPointerMove` — only trigger notes when `pointerDownRef.current` is true (do NOT check `event.button` on move events — it's unreliable). Always inject faint visual splats regardless.
- `runFlowStep` — spiral path instead of linear noise
- `injectSplat` — scale radius and intensity per zone
- `getDroneChord` — replace xRatio-based chord selection with angle-based selection using `getZoneFromPosition`. The drone chord root is determined by the angle at the right-click position, same formula as note selection.
- `startDrone` — replace `getZone(yRatio)` with `getZoneFromPosition(x, y, rect)` for zone detection
- Sub synth — trigger sub-octave layer alongside main note, increase maxPolyphony to 6

### No audio architecture changes

The existing Tone.js synth setup (crystal/pluck/sub PolySynths + effects chain) stays exactly the same. The only changes are to trigger timing, velocity mapping, and the sub-octave double-trigger. No new synths or effects needed.

### Migration

- The `ZONES` constant keeps its structure (octave ranges are still used)
- All mood audio params stay the same
- Share link URL params continue to work
- The zone watermark indicator updates based on the new concentric detection
