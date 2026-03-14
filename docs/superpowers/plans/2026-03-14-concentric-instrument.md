# Concentric Instrument Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remap Musical Waves from horizontal band zones to concentric rings with angle-based pitch, left-click-to-play mechanics, right-click drone, per-zone audio character, and spiral flow mode.

**Architecture:** Replace `getZone(yRatio)` with radial `getZoneFromPosition(x, y, rect)`. Refactor `triggerNote` to use angle for scale degree and ring depth for octave. Split pointer handlers for left/right button. Update `injectSplat` with per-zone visual scaling. Rewrite `runFlowStep` with spiral path. Audio architecture (Tone.js synths + effects) stays the same.

**Tech Stack:** React 18 (ESM), Tone.js 15, WebGL fluid sim (unchanged)

**Spec:** `docs/superpowers/specs/2026-03-14-concentric-instrument-design.md`

---

## File Map

| File | Action | Changes |
|------|--------|---------|
| `musical-waves-v2.jsx` | **Modify** | Replace zone detection, refactor triggerNote, split pointer handlers, update injectSplat, rewrite runFlowStep, update drone, update cursor/drone-ring sizing, update synth params |
| `preview-app.js` | **Regenerate** | Rebuild after JSX changes |

All changes are in a single file. The fluid sim (`fluid-sim.js`) is untouched.

---

## Chunk 1: Zone Detection & Note Selection

### Task 1: Replace getZone with getZoneFromPosition

**Files:**
- Modify: `musical-waves-v2.jsx:272-276` (getZone function)

- [ ] **Step 1: Replace the getZone function**

Replace the existing `getZone(yRatio)` function (lines 272-276) with `getZoneFromPosition`:

```javascript
const NOTE_GAP = { crystal: 30, pluck: 80, sub: 200 }; // ms per zone

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

  const normalizedAngle = ((angle + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI);
  return { zone, angle: normalizedAngle, ringDepth };
}
```

- [ ] **Step 2: Update all getZone call sites to use getZoneFromPosition**

Search for all calls to `getZone(`. Each one uses `yRatio` — replace with `getZoneFromPosition(mouseRef.current.x, mouseRef.current.y, boundingRef.current)` and destructure the result. The main call sites are:

1. `triggerNote` (~line 679): `const zone = getZone(yRatio)` → will be fully rewritten in Task 2
2. `runFlowStep` (~line 723): `const zone = getZone(yRatio)` → will be rewritten in Task 5
3. `startDrone` (~line 646): `const zone = mouseRef.current.set ? getZone(yRatio) : "pluck"` → update to:
   ```javascript
   const pos = boundingRef.current
     ? getZoneFromPosition(mouseRef.current.x, mouseRef.current.y, boundingRef.current)
     : { zone: 'pluck', angle: 0, ringDepth: 0.5 };
   const zone = pos.zone;
   ```
4. `onPointerMove` (~line 925): `getZone(clamp(...))` → update to:
   ```javascript
   const pos = getZoneFromPosition(mouseRef.current.x, mouseRef.current.y, boundingRef.current);
   setCurrentZone(pos.zone);
   ```

For now, only update call sites 3 and 4 (startDrone and onPointerMove). Sites 1 and 2 are fully rewritten in later tasks.

- [ ] **Step 3: Commit**

```bash
git add musical-waves-v2.jsx
git commit -m "feat: replace horizontal zone detection with concentric rings"
```

---

## Chunk 2: Click Mechanics & Note Triggering

### Task 2: Rewrite triggerNote for concentric layout

**Files:**
- Modify: `musical-waves-v2.jsx` (triggerNote function)

- [ ] **Step 1: Add per-zone last-note-time tracking**

Replace the single `lastNoteTimeRef` with a per-zone tracker:
```javascript
const lastNoteTimeRef = useRef({ crystal: 0, pluck: 0, sub: 0 });
```

- [ ] **Step 2: Rewrite triggerNote**

The current `triggerNote(clientX)` uses x-ratio to select notes. Replace entirely with angle/ringDepth-based selection:

```javascript
const triggerNote = useCallback(
  (x, y) => {
    if (!audioReadyRef.current || !boundingRef.current) return;

    const rect = boundingRef.current;
    const pos = getZoneFromPosition(x, y, rect);
    const { zone, angle, ringDepth } = pos;
    const notes = scaleNotesRef.current[zone];
    if (!notes || !notes.length) return;

    // Per-zone throttle
    const now = Tone.now();
    if ((now - lastNoteTimeRef.current[zone]) * 1000 < NOTE_GAP[zone]) return;
    lastNoteTimeRef.current[zone] = now;

    setCurrentZone(zone);

    // Angle → scale degree, ringDepth → octave
    const scaleSize = SCALES[currentScale].intervals.length;
    const degree = Math.floor(angle * scaleSize) % scaleSize;
    const octaveRange = ZONES[zone].octaves[1] - ZONES[zone].octaves[0];
    const octave = Math.floor(ringDepth * (octaveRange + 0.99));
    const noteIndex = clamp(octave * scaleSize + degree, 0, notes.length - 1);
    const note = notes[noteIndex];

    const synth = synthsRef.current[zone];
    if (!synth) return;

    const mouse = mouseRef.current;
    const dragSpeed = mouse.vs;

    // Per-zone velocity and duration
    let velocity, duration;
    if (zone === 'crystal') {
      velocity = 0.15 + ringDepth * 0.25 + clamp(dragSpeed * 0.002, 0, 0.08);
      duration = 0.12;
    } else if (zone === 'pluck') {
      velocity = 0.12 + ringDepth * 0.23;
      duration = 0.1 + (1 - clamp(dragSpeed / 80, 0, 1)) * 0.4;
    } else {
      velocity = 0.10 + ringDepth * 0.18;
      duration = 0.3;
    }

    try {
      synth.triggerAttackRelease(note, duration, Tone.now(), velocity);
      // Sub-octave layer for Sub zone
      if (zone === 'sub') {
        const subOctaveIndex = clamp(noteIndex - scaleSize, 0, notes.length - 1);
        if (subOctaveIndex !== noteIndex) {
          synth.triggerAttackRelease(notes[subOctaveIndex], duration, Tone.now(), velocity * 0.6);
        }
      }
    } catch (error) {
      // Ignore transient audio errors.
    }

    // Visual feedback — zone-scaled splat
    injectSplat(x, y, mouse.x - mouse.lx, mouse.y - mouse.ly, zone);
  },
  [currentScale, injectSplat]
);
```

- [ ] **Step 3: Commit**

```bash
git add musical-waves-v2.jsx
git commit -m "feat: rewrite triggerNote with concentric angle/depth note selection"
```

### Task 3: Split pointer handlers for left-click play / right-click drone

**Files:**
- Modify: `musical-waves-v2.jsx` (onPointerDown, onPointerMove, onPointerUp)

- [ ] **Step 1: Refactor onPointerDown for left/right button split**

Update `onPointerDown` to handle left and right clicks differently:

```javascript
const onPointerDown = useCallback(
  async (event) => {
    event.preventDefault();
    lastInteractionRef.current = Date.now();
    updateMouse(event.clientX, event.clientY);
    if (event.pointerType === "mouse") setCursorVisible(true);

    if (!audioStarted) await startAudio();

    if (event.button === 2) {
      // Right-click: toggle drone
      if (droneLatched) {
        stopDrone();
        setDroneLatched(false);
      } else {
        setDroneLatched(true);
        startDrone("latched");
      }
      return;
    }

    if (event.button !== 0) return;

    // Left-click: start playing
    pointerDownRef.current = true;
    triggerNote(mouseRef.current.x, mouseRef.current.y);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  },
  [audioStarted, droneLatched, startAudio, startDrone, stopDrone, triggerNote, updateMouse]
);
```

- [ ] **Step 2: Update onPointerMove to gate notes on pointerDown**

```javascript
const onPointerMove = useCallback(
  (event) => {
    if (event.pointerType === "mouse") setCursorVisible(true);
    else setCursorVisible(false);
    lastInteractionRef.current = Date.now();
    updateMouse(event.clientX, event.clientY);

    if (!boundingRef.current) return;

    // Update zone from concentric position
    const pos = getZoneFromPosition(mouseRef.current.x, mouseRef.current.y, boundingRef.current);
    setCurrentZone(pos.zone);

    // Edge detection (existing)
    const rect = boundingRef.current;
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;
    let edge = null;
    if (my < edgeThreshold) edge = 'top';
    else if (my > rect.height - edgeThreshold) edge = 'bottom';
    else if (mx < edgeThreshold) edge = 'left';
    else if (mx > rect.width - edgeThreshold) edge = 'right';
    if (edge !== activeEdgeRef.current) {
      activeEdgeRef.current = edge;
      setActiveEdge(edge);
    }

    // Faint visual splat (no audio) when not clicking
    if (!pointerDownRef.current) {
      const sim = fluidSimRef.current;
      if (sim && rect) {
        const color = themeRef.current.zoneColors[pos.zone].map(c => c / 255 * 0.3);
        const radius = themeRef.current.fluid.splatRadius * 0.5;
        sim.addSplat(
          mouseRef.current.x / rect.width,
          1.0 - mouseRef.current.y / rect.height,
          (mouseRef.current.x - mouseRef.current.lx) * 0.0005,
          -(mouseRef.current.y - mouseRef.current.ly) * 0.0005,
          color, radius
        );
      }
      return;
    }

    // Left button held — trigger notes
    if (audioReadyRef.current) {
      triggerNote(mouseRef.current.x, mouseRef.current.y);
      if (droneLatched) refreshDrone();
    }
  },
  [droneLatched, refreshDrone, triggerNote, updateMouse]
);
```

- [ ] **Step 3: Remove drone toggling from onPointerDown's old path and finishPointer**

The old `onPointerDown` called `startDrone("touch")` on every left click. Remove that — drone is now right-click only (or the top-edge button). In `finishPointer`, remove the `if (!droneLatched) stopDrone()` line since drone is no longer tied to left-click release.

```javascript
const finishPointer = useCallback(() => {
  pointerDownRef.current = false;
}, []);
```

- [ ] **Step 4: Commit**

```bash
git add musical-waves-v2.jsx
git commit -m "feat: left-click to play, right-click to toggle drone"
```

---

## Chunk 3: Per-Zone Audio & Visual Character

### Task 4: Update synth parameters and injectSplat per zone

**Files:**
- Modify: `musical-waves-v2.jsx` (buildAudioGraph, injectSplat)

- [ ] **Step 1: Update pluck attack and sub polyphony in buildAudioGraph**

In `buildAudioGraph`, find the pluck synth constructor (~line 527) and change attack from `0.006` to `0.04`.

Find the sub synth constructor (~line 537) and change `maxPolyphony` from `3` to `6`, and change attack from `settings.subAttack` (which is ~0.09-0.1) to `0.15`.

- [ ] **Step 2: Update injectSplat with per-zone visual scaling**

Replace the current `injectSplat` with zone-aware scaling:

```javascript
const SPLAT_SCALE = {
  crystal: { radius: 0.5, intensity: 1.4, velocityMul: 1.5 },
  pluck:   { radius: 1.0, intensity: 1.0, velocityMul: 1.0 },
  sub:     { radius: 2.0, intensity: 0.6, velocityMul: 0.5 },
};

const injectSplat = useCallback((x, y, dx, dy, zone) => {
  const sim = fluidSimRef.current;
  if (!sim || !boundingRef.current) return;
  const rect = boundingRef.current;
  const fluid = themeRef.current.fluid;
  const color = themeRef.current.zoneColors[zone].map(c => c / 255);
  const scale = SPLAT_SCALE[zone] || SPLAT_SCALE.pluck;
  const noteScale = fluid.noteSplatScale?.[zone] || 1.0;
  const radius = fluid.splatRadius * scale.radius * noteScale;

  // Brighten/dim color based on zone intensity
  const adjustedColor = color.map(c => Math.min(c * scale.intensity, 1.0));

  sim.addSplat(
    x / rect.width,
    1.0 - y / rect.height,
    dx * 0.001 * scale.velocityMul,
    -dy * 0.001 * scale.velocityMul,
    adjustedColor,
    radius
  );
}, []);
```

- [ ] **Step 3: Update cursor size per zone**

In the `tick` function, where the cursor transform is set, update the offset to account for zone-based sizing. Add CSS classes or inline styles for zone-based cursor sizing:

```javascript
// In the tick function, compute cursor size from zone
const zoneSize = { crystal: 7, pluck: 8, sub: 10 }; // half of idle size
const size = pointerDownRef.current
  ? { crystal: 10, pluck: 12, sub: 15 }[currentZone] || 12
  : zoneSize[currentZone] || 8;
cursorRef.current.style.transform = `translate3d(${mouse.sx - size}px, ${mouse.sy - size}px, 0)`;
cursorRef.current.style.width = `${size * 2}px`;
cursorRef.current.style.height = `${size * 2}px`;
```

Note: `currentZone` is state, but `tick` uses a ref-based approach. To avoid stale closures, read zone from the latest mouse position inside tick:
```javascript
const curZone = boundingRef.current
  ? getZoneFromPosition(mouse.sx, mouse.sy, boundingRef.current).zone
  : 'pluck';
```

- [ ] **Step 4: Update drone ring size per zone**

Find the drone ring JSX (the `mw-drone-ring` div) and make width/height dynamic:
```jsx
{droneActive && dronePositionRef.current && (
  <div className="mw-drone-ring" style={{
    left: dronePositionRef.current.x,
    top: dronePositionRef.current.y,
    width: { crystal: 50, pluck: 80, sub: 120 }[currentZone],
    height: { crystal: 50, pluck: 80, sub: 120 }[currentZone],
    borderColor: colorWithAlpha(mood.zoneColors[currentZone], 0.3),
  }} />
)}
```

- [ ] **Step 5: Commit**

```bash
git add musical-waves-v2.jsx
git commit -m "feat: per-zone audio character, visual scaling, and cursor/drone sizing"
```

---

## Chunk 4: Drone & Flow Updates

### Task 5: Update getDroneChord for concentric model

**Files:**
- Modify: `musical-waves-v2.jsx` (getDroneChord function)

- [ ] **Step 1: Rewrite getDroneChord to use angle-based chord selection**

The current `getDroneChord` uses `xRatio` to pick a chord root. Replace with angle-based selection matching the concentric model:

```javascript
const getDroneChord = useCallback((zone) => {
  if (!boundingRef.current) return { chord: [], sig: "" };

  const notes = scaleNotesRef.current[zone];
  if (!notes || !notes.length) return { chord: [], sig: "" };

  const pos = getZoneFromPosition(mouseRef.current.x, mouseRef.current.y, boundingRef.current);
  const scaleSize = SCALES[currentScale].intervals.length;
  const degree = Math.floor(pos.angle * scaleSize) % scaleSize;
  const octaveRange = ZONES[zone].octaves[1] - ZONES[zone].octaves[0];
  const octave = Math.floor(pos.ringDepth * (octaveRange + 0.99));
  const idx = clamp(octave * scaleSize + degree, 0, notes.length - 1);

  const chord = [
    notes[idx],
    notes[clamp(idx + 2, 0, notes.length - 1)],
    notes[clamp(idx + 4, 0, notes.length - 1)],
  ].filter((note, index, list) => list.indexOf(note) === index);

  return { chord, sig: `${zone}:${chord.join("-")}` };
}, [currentScale]);
```

- [ ] **Step 2: Commit**

```bash
git add musical-waves-v2.jsx
git commit -m "feat: update drone chord selection for concentric layout"
```

### Task 6: Rewrite runFlowStep with spiral path

**Files:**
- Modify: `musical-waves-v2.jsx` (runFlowStep, flowRef initialization)

- [ ] **Step 1: Update flowRef initial state**

Find where `flowRef` is initialized and update:
```javascript
const flowRef = useRef({ intervalId: null, t: 0, direction: 1 });
```
Remove the old `step` and `direction` fields if they differ.

- [ ] **Step 2: Rewrite runFlowStep**

Replace the entire `runFlowStep` function:

```javascript
const runFlowStep = useCallback(() => {
  if (!audioReadyRef.current || !boundingRef.current) return;

  const rect = boundingRef.current;
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const r = Math.min(cx, cy);
  const t = flowRef.current.t;

  // Spiral position
  const spiralAngle = t * 0.06; // rotational speed
  let spiralRadius = 0.05 + (t * 0.003) * flowRef.current.direction;

  // Reverse at bounds
  if (spiralRadius > 0.95) flowRef.current.direction = -1;
  if (spiralRadius < 0.05) flowRef.current.direction = 1;
  spiralRadius = clamp(spiralRadius, 0.05, 0.95);

  // Noise for organic variation
  const noise = noiseRef.current;
  const noiseX = noise ? noise(t * 0.01, 0) * 0.08 : 0;
  const noiseY = noise ? noise(0, t * 0.01) * 0.08 : 0;

  const x = cx + Math.cos(spiralAngle) * spiralRadius * r + noiseX * r;
  const y = cy + Math.sin(spiralAngle) * spiralRadius * r + noiseY * r;

  flowRef.current.t += 1;

  // Detect zone and trigger note
  const pos = getZoneFromPosition(x, y, rect);
  const { zone } = pos;
  const notes = scaleNotesRef.current[zone];
  if (!notes || !notes.length) return;

  const scaleSize = SCALES[currentScale].intervals.length;
  const degree = Math.floor(pos.angle * scaleSize) % scaleSize;
  const octaveRange = ZONES[zone].octaves[1] - ZONES[zone].octaves[0];
  const octave = Math.floor(pos.ringDepth * (octaveRange + 0.99));
  const noteIndex = clamp(octave * scaleSize + degree, 0, notes.length - 1);

  const synth = synthsRef.current[zone];
  if (!synth) return;

  const activeMood = themeRef.current;

  try {
    synth.triggerAttackRelease(
      notes[noteIndex],
      activeMood.audio.flowDuration,
      Tone.now(),
      activeMood.audio.flowVelocity
    );
  } catch (error) {
    // Ignore transient audio errors.
  }

  setCurrentZone(zone);
  injectSplat(x, y, Math.cos(spiralAngle) * 2, Math.sin(spiralAngle) * 2, zone);

  // Update phantom cursor position
  if (phantomCursorRef.current) {
    phantomCursorRef.current.style.transform = `translate3d(${x - 8}px, ${y - 8}px, 0)`;
  }
}, [currentScale, injectSplat]);
```

- [ ] **Step 3: Update stopFlow to reset spiral state**

```javascript
const stopFlow = useCallback(() => {
  if (flowRef.current.intervalId) clearInterval(flowRef.current.intervalId);
  flowRef.current.intervalId = null;
  flowRef.current.t = 0;
  flowRef.current.direction = 1;
  setFlowActive(false);
}, []);
```

- [ ] **Step 4: Commit**

```bash
git add musical-waves-v2.jsx
git commit -m "feat: spiral flow mode through concentric rings"
```

---

## Chunk 5: Touch & Cleanup

### Task 7: Add two-finger drone toggle for touch devices

**Files:**
- Modify: `musical-waves-v2.jsx`

- [ ] **Step 1: Add touch event listener for two-finger drone**

Add a useEffect that listens for touch events:

```javascript
useEffect(() => {
  const stage = stageRef.current;
  if (!stage) return;

  let twoFingerTimeout = null;
  let twoFingerCancelled = false;

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      twoFingerCancelled = false;
      twoFingerTimeout = setTimeout(() => {
        if (!twoFingerCancelled) {
          // Toggle drone
          if (droneLatched) {
            stopDrone();
            setDroneLatched(false);
          } else {
            setDroneLatched(true);
            startDrone("latched");
          }
        }
      }, 300);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && twoFingerTimeout) {
      // If fingers move significantly, cancel drone toggle (it's a pinch)
      twoFingerCancelled = true;
      clearTimeout(twoFingerTimeout);
      twoFingerTimeout = null;
    }
  };

  const handleTouchEnd = () => {
    if (twoFingerTimeout) {
      clearTimeout(twoFingerTimeout);
      twoFingerTimeout = null;
    }
  };

  stage.addEventListener('touchstart', handleTouchStart, { passive: false });
  stage.addEventListener('touchmove', handleTouchMove);
  stage.addEventListener('touchend', handleTouchEnd);

  return () => {
    stage.removeEventListener('touchstart', handleTouchStart);
    stage.removeEventListener('touchmove', handleTouchMove);
    stage.removeEventListener('touchend', handleTouchEnd);
    if (twoFingerTimeout) clearTimeout(twoFingerTimeout);
  };
}, [droneLatched, startDrone, stopDrone]);
```

- [ ] **Step 2: Commit**

```bash
git add musical-waves-v2.jsx
git commit -m "feat: two-finger tap to toggle drone on touch devices"
```

### Task 8: Update idle notes and rebuild preview-app.js

**Files:**
- Modify: `musical-waves-v2.jsx` (idle note useEffect)
- Regenerate: `preview-app.js`

- [ ] **Step 1: Update idle note effect to use concentric positioning**

The idle note useEffect currently uses `idleStepRef` and linear note selection. Update it to pick a random position in the canvas and use `getZoneFromPosition` for zone/note selection:

```javascript
// Inside the idle interval callback:
const rx = Math.random() * rect.width;
const ry = Math.random() * rect.height;
const pos = getZoneFromPosition(rx, ry, rect);
const zone = pos.zone;
const notes = scaleNotesRef.current[zone];
if (!notes || !notes.length) return;

const scaleSize = SCALES[currentScale].intervals.length;
const degree = Math.floor(pos.angle * scaleSize) % scaleSize;
const octaveRange = ZONES[zone].octaves[1] - ZONES[zone].octaves[0];
const octave = Math.floor(pos.ringDepth * (octaveRange + 0.99));
const noteIndex = clamp(octave * scaleSize + degree, 0, notes.length - 1);

const synth = synthsRef.current[zone];
if (!synth) return;

try {
  synth.triggerAttackRelease(notes[noteIndex], 0.48, Tone.now(), 0.13);
} catch (error) {}

injectSplat(rx, ry, 0, 0, zone);
idleStepRef.current += 1;
```

- [ ] **Step 2: Rebuild preview-app.js**

```bash
npx esbuild preview-entry.jsx --bundle --format=esm --jsx=automatic --outfile=preview-app.js --external:react --external:"react/jsx-runtime" --external:"react-dom/client" --external:tone
```

- [ ] **Step 3: Final verification**

Open the app and test:
1. Move cursor without clicking — faint colored splats, no audio
2. Left-click-hold and drag from center outward — Crystal sparkles → Pluck ribbons → Sub booms
3. Right-click — drone latches at position with zone-sized ring
4. Right-click again — drone releases
5. Enable Flow — phantom cursor spirals through rings
6. Switch moods — fluid transition plays, zones still work
7. Check watermark shows correct zone name

- [ ] **Step 4: Commit**

```bash
git add musical-waves-v2.jsx preview-app.js
git commit -m "feat: update idle notes for concentric layout and rebuild"
```
