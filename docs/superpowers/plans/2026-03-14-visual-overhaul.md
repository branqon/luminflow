# Visual Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Musical Waves from a glassmorphism card-based UI into a fully immersive fluid-canvas instrument where controls emerge from screen edges and each mood is a distinct visual world.

**Architecture:** A standalone WebGL fluid simulation (`fluid-sim.js`) replaces the 2D particle canvas. The React component (`musical-waves-v2.jsx`) is refactored to integrate the fluid sim, replace the dock/card UI with edge-emergent controls, and add a cinematic intro. Audio architecture (Tone.js) is untouched.

**Tech Stack:** React 18 (ESM via esm.sh), WebGL 2.0 (vanilla JS, no framework), Tone.js 15 (unchanged), Google Fonts (Playfair Display + Inter)

**Spec:** `docs/superpowers/specs/2026-03-14-visual-overhaul-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `fluid-sim.js` | **Create** | Standalone WebGL 2.0 fluid simulation class. GLSL shaders inlined as template literals. Exports `FluidSim` on `window`. |
| `musical-waves-v2.jsx` | **Rewrite** | Replace particle rendering with FluidSim integration. Replace dock/cards with edge-emergent UI. Add cinematic intro. Add cursor orb. Add watermark overlay. Add mood transition. |
| `index.html` | **Modify** | Add font preloads (Playfair Display, Inter). Add `<script src="fluid-sim.js">`. |
| `preview-entry.jsx` | **No change** | Entry point, just imports and renders the component. |
| `preview-app.js` | **Regenerate** | Pre-bundled copy of the app. `index.html` loads this file (not the JSX directly). After all changes, this must be regenerated. If no build script exists, manually copy the transpiled output or update `index.html` to load `preview-entry.jsx` as a module with JSX transform via esm.sh. |

---

## Chunk 1: Fluid Simulation Engine

### Task 1: Create WebGL fluid simulation foundation

**Files:**
- Create: `fluid-sim.js`

This task builds the core fluid sim — a Navier-Stokes-lite solver using WebGL 2.0 with FBOs.

**Primary reference:** Pavel Dobryakov's WebGL Fluid Simulation — https://github.com/PavelDoGreat/WebGL-Fluid-Simulation (MIT license). The `script.js` file in that repo contains the complete shader sources and simulation loop. Adapt and simplify into our `fluid-sim.js`, translating from WebGL 1.0 to WebGL 2.0 (GLSL 300 es). The key shaders to port are: advection, divergence, curl, vorticity, pressure, gradient subtract, splat, display, and bloom. Copy the shader GLSL source verbatim from the reference repo and update syntax (`attribute` → `in`, `varying` → `out`, `texture2D` → `texture`, add `#version 300 es`, explicit `out` variable for fragment output). Also port the FBO management, ping-pong swap logic, and fullscreen quad setup from the same file.

- [ ] **Step 1: Create fluid-sim.js with shader source strings**

Write the GLSL shader sources as template literal strings at the top of the file. Required shaders:
- `baseVertexShader` — fullscreen quad vertex shader
- `advectionShader` — moves dye/velocity through the velocity field
- `divergenceShader` — computes velocity field divergence
- `pressureShader` — iterative pressure solve (Jacobi)
- `gradientSubtractShader` — subtract pressure gradient from velocity
- `splatShader` — injects color/velocity at a point (cursor interaction)
- `curlShader` — computes vorticity for swirl effects
- `vorticityShader` — applies vorticity confinement force
- `displayShader` — renders the dye field to screen with bloom
- `bloomBlurShader` — separable Gaussian blur for bloom post-process
- `bloomFinalShader` — composites bloom with the base image

```javascript
// fluid-sim.js — WebGL 2.0 Fluid Simulation
// Reference: Pavel Dobryakov's WebGL Fluid Simulation (adapted)

'use strict';

const baseVertexShader = `#version 300 es
precision highp float;
in vec2 aPosition;
out vec2 vUv;
void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

// ... (all other shader strings follow this pattern)
```

Each shader should be complete and correct GLSL 300 es. The advection shader needs bilinear interpolation. The pressure solver needs ~20 Jacobi iterations. The splat shader should use a Gaussian falloff.

- [ ] **Step 2: Create FluidSim class with WebGL context setup**

Below the shaders, create the `FluidSim` class. The constructor takes no args. `init(canvas)` sets up the WebGL2 context, compiles all shaders, creates programs, and allocates FBOs.

```javascript
class FluidSim {
  constructor() {
    this.gl = null;
    this.programs = {};
    this.fbos = {};
    this.params = {};
    this.canvas = null;
    this.simWidth = 256;
    this.simHeight = 256;
  }

  init(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: false });
    if (!this.gl) throw new Error('WebGL 2 not supported');
    // compile shaders, create programs, create FBOs
    this._compileShaders();
    this._createFBOs();
    this._setupQuad();
  }
  // ...
}

window.FluidSim = FluidSim;
```

FBO pairs needed (double-buffered for ping-pong):
- `velocity` (RG16F, sim resolution)
- `pressure` (R16F, sim resolution)
- `dye` (RGBA16F, full canvas resolution for sharper color)
- `divergence` (R16F, sim resolution, single buffer)
- `curl` (R16F, sim resolution, single buffer)

Plus bloom FBOs if bloom is enabled:
- `bloomSource` (RGBA16F, half resolution)
- `bloomPing`/`bloomPong` (RGBA16F, half resolution)

- [ ] **Step 3: Implement simulation step methods**

Add the core simulation loop methods:

```javascript
step(dt) {
  this._advect(this.fbos.velocity, this.fbos.velocity, dt, this.params.viscosity);
  this._advect(this.fbos.dye, this.fbos.velocity, dt, this.params.dissipation);
  this._curl();
  this._vorticity(dt);
  this._divergence();
  this._pressure();
  this._gradientSubtract();
  this._display();
}
```

Each method binds the appropriate program, sets uniforms, binds input textures, renders to the target FBO, and swaps the ping-pong buffers.

- [ ] **Step 4: Implement splat injection**

```javascript
addSplat(x, y, dx, dy, color, radius) {
  // x, y in 0-1 UV space
  // dx, dy = pointer velocity (used for velocity injection)
  // color = [r, g, b] normalized 0-1
  // radius = splat size (from mood params)
  this._splat(this.fbos.velocity, x, y, dx * 0.15, dy * 0.15, radius);
  this._splat(this.fbos.dye, x, y, color[0], color[1], color[2], radius);
}
```

- [ ] **Step 5: Implement setMoodParams, resize, destroy**

```javascript
setMoodParams(params) {
  // params: { viscosity, diffusion, curl, pressure, splatRadius, dissipation, bloomIntensity, idleForce }
  this.params = { ...this.params, ...params };
}

resize(width, height) {
  this.canvas.width = width;
  this.canvas.height = height;
  // Recalculate sim resolution, recreate FBOs
  this._createFBOs();
}

destroy() {
  const gl = this.gl;
  if (!gl) return;
  // Delete all programs, textures, framebuffers
  Object.values(this.programs).forEach(p => gl.deleteProgram(p.program));
  // ... delete FBO textures and framebuffers
  this.gl = null;
}
```

- [ ] **Step 6: Implement bloom post-processing**

The bloom pass:
1. Render bright areas of the dye to `bloomSource` (threshold based on brightness)
2. Run separable Gaussian blur: horizontal to `bloomPing`, vertical to `bloomPong` (2-3 passes at decreasing resolution for wider blur)
3. In the display shader, composite the bloom texture additively with the base dye, scaled by `bloomIntensity`

Skip this pass entirely when `bloomIntensity` is 0 (graceful degradation).

- [ ] **Step 7: Verify fluid-sim.js loads and runs**

Open the app in the browser. Open DevTools console. Run:
```javascript
const sim = new FluidSim();
sim.init(document.querySelector('canvas'));
// Should not throw. Check gl context is valid.
console.log(sim.gl ? 'WebGL OK' : 'FAIL');
```

- [ ] **Step 8: Commit**

```bash
git add fluid-sim.js
git commit -m "feat: add WebGL fluid simulation engine"
```

---

## Chunk 2: Integration Foundation

### Task 2: Update index.html with fonts and fluid-sim script

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add font preloads and fluid-sim script tag**

Add to `<head>` before the importmap:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=block">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=block">
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap">
```

Add before the module script at the bottom of `<body>`:
```html
<script src="./fluid-sim.js"></script>
```

- [ ] **Step 2: Verify fonts load in browser**

Open DevTools > Network tab. Refresh. Confirm Playfair Display and Inter font files are loaded. Inspect an element with `font-family: 'Playfair Display'` in DevTools to confirm it renders.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add font preloads and fluid-sim script to index.html"
```

### Task 3: Expand MOODS config with fluid parameters

**Files:**
- Modify: `musical-waves-v2.jsx:72-226` (MOODS object)

- [ ] **Step 1: Add fluid params to each mood**

Add a `fluid` key to each mood in the MOODS object:

```javascript
// Inside stillWater:
fluid: {
  viscosity: 0.1,
  diffusion: 0.8,
  curl: 0.1,
  pressure: 0.6,
  splatRadius: 0.004,
  dissipation: 0.97,
  bloomIntensity: 0.3,
  idleForce: 0.05,
  idleMode: 'drift',     // gentle left-to-right current
  noteSplatScale: { crystal: 0.6, pluck: 1.0, sub: 1.8 }, // zone-specific bloom size multiplier
},

// Inside moonDrift:
fluid: {
  viscosity: 0.4,
  diffusion: 0.5,
  curl: 0.6,
  pressure: 0.5,
  splatRadius: 0.003,
  dissipation: 0.985,
  bloomIntensity: 0.5,
  idleForce: 0.1,
  idleMode: 'spiral',    // slow clockwise rotation from center
  noteSplatScale: { crystal: 0.5, pluck: 0.9, sub: 1.6 },
},

// Inside warmRain:
fluid: {
  viscosity: 0.7,
  diffusion: 0.3,
  curl: 0.2,
  pressure: 0.7,
  splatRadius: 0.005,
  dissipation: 0.96,
  bloomIntensity: 0.25,
  idleForce: 0.15,
  idleMode: 'rain',      // random droplets from top
  noteSplatScale: { crystal: 0.7, pluck: 1.1, sub: 2.0 },
},
```

- [ ] **Step 2: Verify app still loads without errors**

Open the app in browser. Confirm no console errors. The existing UI should still function — we haven't changed rendering yet.

- [ ] **Step 3: Commit**

```bash
git add musical-waves-v2.jsx
git commit -m "feat: add fluid simulation parameters to MOODS config"
```

### Task 4: Replace canvas rendering with FluidSim

**Files:**
- Modify: `musical-waves-v2.jsx`

This is the core integration — swap out the 2D particle canvas for the WebGL fluid sim.

- [ ] **Step 1: Replace dual canvas refs with single WebGL canvas ref**

In the component, remove `glowCanvasRef`. Rename `mainCanvasRef` to `canvasRef`. Remove `linesRef`, `lineXRef`, `lastLineRef`, `glowsRef`, `particlesRef` refs (these are all particle-system refs that are no longer needed).

Add a new ref:
```javascript
const fluidSimRef = useRef(null);
```

- [ ] **Step 2: Replace initSize and initLines with fluid sim init**

Remove the `initLines` function entirely. Modify `initSize` to also initialize/resize the fluid sim:

```javascript
const initSize = useCallback(() => {
  if (!stageRef.current) return;
  const rect = stageRef.current.getBoundingClientRect();
  boundingRef.current = rect;
  if (canvasRef.current) {
    if (!fluidSimRef.current) {
      fluidSimRef.current = new window.FluidSim();
      fluidSimRef.current.init(canvasRef.current);
    }
    fluidSimRef.current.resize(rect.width, rect.height);
    fluidSimRef.current.setMoodParams(themeRef.current.fluid);
  }
}, []);
```

- [ ] **Step 3: Replace movePoints and drawFrame with fluid step, and update tick**

Remove `movePoints` and `drawFrame` functions. Remove `movedPoint` helper. Replace `drawFrame` with:

```javascript
const lastFrameTimeRef = useRef(performance.now());

const drawFrame = useCallback(() => {
  const sim = fluidSimRef.current;
  if (!sim || !boundingRef.current) return;
  const now = performance.now();
  const dt = Math.min((now - lastFrameTimeRef.current) / 1000, 0.033); // cap at ~30fps min
  lastFrameTimeRef.current = now;
  sim.step(dt);
}, []);
```

**CRITICAL:** Also update the `tick` function (~line 904) to remove the `movePoints(time)` call and update its dependency array:

```javascript
const tick = useCallback(
  (time) => {
    const mouse = mouseRef.current;
    mouse.sx += (mouse.x - mouse.sx) * 0.12;
    mouse.sy += (mouse.y - mouse.sy) * 0.12;
    const dx = mouse.x - mouse.lx;
    const dy = mouse.y - mouse.ly;
    mouse.v = Math.hypot(dx, dy);
    mouse.vs += (mouse.v - mouse.vs) * 0.12;
    mouse.vs = clamp(mouse.vs, 0, 100);
    mouse.lx = mouse.x;
    mouse.ly = mouse.y;
    mouse.a = Math.atan2(dy, dx);

    drawFrame(); // no more movePoints call

    if (cursorRef.current) {
      const size = pointerDownRef.current ? 12 : activeEdge ? 6 : 8;
      cursorRef.current.style.transform = `translate3d(${mouse.sx - size}px, ${mouse.sy - size}px, 0)`;
    }

    rafRef.current = requestAnimationFrame(tick);
  },
  [drawFrame] // removed movePoints from deps
);
```

- [ ] **Step 4: Replace spawnParticles and glowLine with fluid splats**

Remove `spawnParticles` and `glowLine` functions. Create a new function that injects color into the fluid:

```javascript
const injectSplat = useCallback((x, y, dx, dy, zone) => {
  const sim = fluidSimRef.current;
  if (!sim || !boundingRef.current) return;
  const rect = boundingRef.current;
  const color = themeRef.current.zoneColors[zone].map(c => c / 255);
  const radius = themeRef.current.fluid.splatRadius;
  sim.addSplat(x / rect.width, 1.0 - y / rect.height, dx * 0.001, -dy * 0.001, color, radius);
}, []);
```

- [ ] **Step 5: Update triggerNote to use injectSplat instead of glowLine/spawnParticles**

In `triggerNote`, replace the calls to `glowLine(...)` and `spawnParticles(...)` with `injectSplat(...)`. The note index calculation needs to change since we no longer have line positions — use the mouse x position directly mapped to the scale:

```javascript
// Replace the line-position-based note selection with direct x-ratio mapping
const xRatio = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
const noteIndex = clamp(Math.floor(xRatio * (notes.length - 1)), 0, notes.length - 1);
```

Remove the `closest`/`distance`/`lastLineRef` logic. Replace the throttle with a time-based check using `lastNoteTimeRef` (already exists).

After triggering the note, inject a splat:
```javascript
injectSplat(mouse.x, mouse.y, mouse.x - mouse.lx, mouse.y - mouse.ly, zone);
```

- [ ] **Step 6: Update runFlowStep to use injectSplat**

Replace `glowLine(...)` and `spawnParticles(...)` calls in `runFlowStep` with `injectSplat(...)`. Use the existing noise-based position for splat coordinates.

- [ ] **Step 7: Update idle note effect to use injectSplat**

In the idle interval effect (the `useEffect` around line 1074), replace `glowLine(...)` with a splat at a random position.

- [ ] **Step 8: Update the JSX — single canvas, remove glow canvas**

In the JSX return, replace:
```jsx
<canvas ref={mainCanvasRef} className="mw-canvas" />
<canvas ref={glowCanvasRef} className="mw-canvas mw-canvas-glow" />
```
with:
```jsx
<canvas ref={canvasRef} className="mw-canvas" />
```

- [ ] **Step 9: Update resize handler and cleanup**

In the main setup `useEffect` (~line 1137):
- Remove `initLines()` call
- Keep `initSize()` (which now handles fluid sim init/resize)
- **Keep `noiseRef.current = createNoise2D()`** — this is still needed for flow mode cursor motion
- In cleanup, add `fluidSimRef.current?.destroy()`

- [ ] **Step 10: Update mood change to update fluid params and implement idle behavior**

Add a `useEffect` that updates fluid params when mood changes:
```javascript
useEffect(() => {
  fluidSimRef.current?.setMoodParams(mood.fluid);
}, [mood]);
```

Add an idle splat injector that runs per-frame in `drawFrame`, applying different patterns based on `idleMode`:
```javascript
// Inside drawFrame, after sim.step(dt):
const fluid = themeRef.current.fluid;
const idleColor = themeRef.current.zoneColors.pluck.map(c => c / 255 * 0.3);

if (fluid.idleMode === 'drift') {
  // Gentle left-to-right force
  sim.addSplat(0.1, 0.5, fluid.idleForce, 0, idleColor, 0.01);
} else if (fluid.idleMode === 'spiral') {
  // Slow clockwise push from center
  const t = performance.now() * 0.0005;
  const cx = 0.5 + Math.cos(t) * 0.2;
  const cy = 0.5 + Math.sin(t) * 0.2;
  sim.addSplat(cx, cy, Math.cos(t + Math.PI/2) * fluid.idleForce, Math.sin(t + Math.PI/2) * fluid.idleForce, idleColor, 0.008);
} else if (fluid.idleMode === 'rain') {
  // Random droplets from top (~every 30 frames)
  if (Math.random() < 0.033) {
    const rx = Math.random();
    sim.addSplat(rx, 0.95, 0, -fluid.idleForce * 2, idleColor, 0.006);
  }
}
```

Also update `injectSplat` to use per-zone `noteSplatScale` for differentiated note blooms:
```javascript
const injectSplat = useCallback((x, y, dx, dy, zone) => {
  const sim = fluidSimRef.current;
  if (!sim || !boundingRef.current) return;
  const rect = boundingRef.current;
  const fluid = themeRef.current.fluid;
  const color = themeRef.current.zoneColors[zone].map(c => c / 255);
  const scale = fluid.noteSplatScale?.[zone] || 1.0;
  const radius = fluid.splatRadius * scale;
  sim.addSplat(x / rect.width, 1.0 - y / rect.height, dx * 0.001, -dy * 0.001, color, radius);
}, []);
```

- [ ] **Step 11: Verify fluid rendering works**

Open the app. Click "Tap to Begin". Drag across the canvas. You should see fluid ink trails following your cursor. Notes should trigger color splats. Different moods should produce different fluid behavior.

- [ ] **Step 12: Commit**

```bash
git add musical-waves-v2.jsx
git commit -m "feat: replace 2D particle canvas with WebGL fluid simulation"
```

---

## Chunk 3: Edge-Emergent UI

### Task 5: Build edge-emergent control system

**Files:**
- Modify: `musical-waves-v2.jsx` (JSX + CSS)

Replace the header, dock, and zone row with edge-emergent controls.

- [ ] **Step 1: Add edge proximity state tracking**

Add a ref for edge tracking (NOT state — avoids re-render thrashing on every pointer move) and a state that updates only when the value changes:

```javascript
const activeEdgeRef = useRef(null);
const [activeEdge, setActiveEdge] = useState(null); // 'top' | 'bottom' | 'left' | 'right' | 'all' | null
const edgeThreshold = 80; // pixels from edge to trigger
```

Add edge detection to the pointer move handler. Compute which edge (if any) the cursor is near, compare to `activeEdgeRef.current`, and only call `setActiveEdge` when the value actually changes:

```javascript
// Inside onPointerMove, after updateMouse:
const rect = boundingRef.current;
if (rect) {
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
}
```

On touch, detect swipe-from-edge gestures (touchstart within 30px of edge, touchmove >20px inward).

- [ ] **Step 2: Create EdgeControls component sections in JSX**

Replace the `<header className="mw-header">` block and `<aside className="mw-dock">` block with four edge containers. **Do NOT remove the `mw-prompt-wrap` / `mw-prompt` JSX yet** — that's inside the `mw-stage` div (not the dock) and is still needed for audio start until Task 9 replaces it with the cinematic intro.

```jsx
{/* Bottom edge — Mood selector */}
<div className={`mw-edge mw-edge-bottom ${activeEdge === 'bottom' ? 'visible' : ''}`}>
  <div className="mw-edge-content">
    {Object.entries(MOODS).map(([key, preset]) => (
      <button
        key={key}
        className={`mw-edge-btn ${currentMood === key ? 'active' : ''}`}
        onClick={() => applyMood(key)}
        style={currentMood === key ? { borderColor: preset.border } : {}}
      >
        {preset.label}
      </button>
    ))}
  </div>
</div>

{/* Right edge — Pitch controls */}
<div className={`mw-edge mw-edge-right ${activeEdge === 'right' ? 'visible' : ''}`}>
  <div className="mw-edge-content">
    <select value={currentRoot} onChange={changeRoot} className="mw-edge-select">
      {ROOT_OPTIONS.map((root) => (
        <option key={root} value={root}>{root}</option>
      ))}
    </select>
    {visibleScaleKeys.map((key) => (
      <button
        key={key}
        className={`mw-edge-btn ${currentScale === key ? 'active' : ''}`}
        onClick={() => changeScale(key)}
      >
        {SCALES[key].label}
      </button>
    ))}
    <button
      className={`mw-edge-btn ${showExperimentalScales ? 'active' : ''}`}
      onClick={() => setShowExperimentalScales(v => !v)}
    >
      {showExperimentalScales ? 'Safe Only' : 'More Colors'}
    </button>
  </div>
</div>

{/* Left edge — Zone selector */}
<div className={`mw-edge mw-edge-left ${activeEdge === 'left' ? 'visible' : ''}`}>
  <div className="mw-edge-content">
    {Object.keys(ZONES).map((zone) => (
      <span
        key={zone}
        className={`mw-edge-glyph ${currentZone === zone ? 'active' : ''}`}
        style={currentZone === zone ? { color: colorWithAlpha(mood.zoneColors[zone], 1) } : {}}
      >
        {ZONES[zone].label}
      </span>
    ))}
  </div>
</div>

{/* Top edge — Scene toggles */}
<div className={`mw-edge mw-edge-top ${activeEdge === 'top' ? 'visible' : ''}`}>
  <div className="mw-edge-content">
    <button className={`mw-edge-btn ${flowEnabled ? 'active' : ''}`} onClick={toggleFlow}>
      Flow
    </button>
    <button className={`mw-edge-btn ${droneLatched ? 'active warm' : ''}`} onClick={toggleDrone}>
      Drone
    </button>
    <button className="mw-edge-btn" onClick={copyLink}>
      {copyStatus === 'copied' ? 'Copied' : copyStatus === 'failed' ? 'Failed' : 'Share'}
    </button>
  </div>
</div>
```

- [ ] **Step 3: Write edge CSS**

Replace the old card/dock/header CSS with edge styles:

```css
.mw-edge {
  position: absolute;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}
.mw-edge.visible {
  opacity: 1;
  pointer-events: auto;
}
/* Also make edges visible when any child has focus (keyboard nav) */
.mw-edge:focus-within {
  opacity: 1;
  pointer-events: auto;
}
.mw-edge-bottom {
  bottom: 0; left: 0; right: 0;
  height: 80px;
  padding: 0 20px 20px;
}
.mw-edge-top {
  top: 0; left: 0; right: 0;
  height: 80px;
  padding: 20px 20px 0;
}
.mw-edge-left {
  left: 0; top: 0; bottom: 0;
  width: 80px;
  padding: 0 0 0 20px;
  flex-direction: column;
}
.mw-edge-right {
  right: 0; top: 0; bottom: 0;
  width: 200px;
  padding: 0 20px 0 0;
  flex-direction: column;
}
.mw-edge-content {
  display: flex;
  gap: 10px;
  align-items: center;
}
.mw-edge-left .mw-edge-content,
.mw-edge-right .mw-edge-content {
  flex-direction: column;
}
.mw-edge-btn {
  min-height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(12px);
  color: var(--muted);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all 0.2s ease;
}
.mw-edge-btn:hover, .mw-edge-btn:focus-visible {
  color: var(--text);
  border-color: var(--border);
  background: rgba(255,255,255,0.08);
  outline: none;
}
.mw-edge-btn.active {
  color: var(--text);
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.2);
}
.mw-edge-btn.warm.active {
  border-color: rgba(255,200,145,0.36);
  color: rgba(255,233,206,0.96);
}
.mw-edge-select {
  min-height: 42px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(12px);
  color: var(--text);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 12px;
}
.mw-edge-glyph {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  transition: color 0.3s ease;
}
.mw-edge-glyph.active {
  animation: pulse-glow 2s ease-in-out infinite;
}
@keyframes pulse-glow {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}
```

- [ ] **Step 4: Remove old card/dock/header CSS**

Delete all the old `.mw-card`, `.mw-top-card`, `.mw-chip`, `.mw-chip-row`, `.mw-dock`, `.mw-header`, `.mw-zone-row`, `.mw-button`, `.mw-pill-row`, `.mw-field`, `.mw-field-row`, `.mw-note`, `.mw-guide`, `.mw-label` CSS rules.

- [ ] **Step 5: Verify edge controls work**

Open app. Move cursor to bottom edge — mood buttons should appear. Move to right — pitch controls. Left — zones. Top — Flow/Drone/Share. Moving to center should hide them all.

- [ ] **Step 6: Commit**

```bash
git add musical-waves-v2.jsx
git commit -m "feat: replace dock/cards with edge-emergent controls"
```

---

## Chunk 4: Watermark, Cursor & Typography

### Task 6: Add persistent watermark overlay

**Files:**
- Modify: `musical-waves-v2.jsx` (JSX + CSS)

- [ ] **Step 1: Add watermark JSX**

Inside the stage div, after the canvas, add:

```jsx
<div className={`mw-watermark ${activeEdge === 'bottom' || activeEdge === 'left' ? 'bright' : ''}`}
     style={{ color: mood.muted }}>
  <div className="mw-watermark-mood">{mood.label}</div>
  <div className="mw-watermark-info">
    {currentRoot} {SCALES[currentScale].label} &middot; {ZONES[currentZone].label}
  </div>
</div>
```

- [ ] **Step 2: Add watermark CSS**

```css
.mw-watermark {
  position: absolute;
  bottom: 24px;
  left: 24px;
  pointer-events: none;
  z-index: 5;
  mix-blend-mode: soft-light;
  opacity: 0.15;
  transition: opacity 0.5s ease;
}
/* Brighten watermark when nearby edges are active — controlled via JS
   by adding a 'mw-watermark-bright' class when bottom or left edge is active */
.mw-watermark.bright {
  opacity: 0.35;
}
.mw-watermark-mood {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 72px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.02em;
}
.mw-watermark-info {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 300;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-top: 8px;
}
```

- [ ] **Step 3: Verify watermark renders**

Open app. You should see the mood name in large faint serif text at lower-left, with key/scale/zone info beneath it.

- [ ] **Step 4: Commit**

```bash
git add musical-waves-v2.jsx
git commit -m "feat: add persistent watermark overlay with mood/key/scale/zone"
```

### Task 7: Upgrade cursor to fluid-reactive orb

**Files:**
- Modify: `musical-waves-v2.jsx` (cursor div + CSS)

- [ ] **Step 1: Update cursor CSS and state logic**

Track whether cursor is near an edge. Update the cursor element styling:

```css
.mw-cursor {
  position: absolute;
  top: 0; left: 0;
  width: 16px; height: 16px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 40%, transparent 70%);
  pointer-events: none;
  transition: width 0.25s ease, height 0.25s ease, opacity 0.25s ease;
  transform: translate3d(-120px, -120px, 0);
  filter: blur(0.5px);
}
.mw-cursor.playing {
  width: 24px; height: 24px;
}
.mw-cursor.edge {
  width: 12px; height: 12px;
  background: radial-gradient(circle, rgba(255,255,255,0.7) 0%, transparent 60%);
}
```

- [ ] **Step 2: Update cursor transform to account for size changes**

In the `tick` function, adjust the translate offset based on cursor state (centered on the orb).

- [ ] **Step 3: Add cursor className logic in JSX**

```jsx
<div
  ref={cursorRef}
  className={`mw-cursor ${pointerDownRef.current ? 'playing' : ''} ${activeEdge ? 'edge' : ''}`}
  style={{
    opacity: audioStarted && cursorVisible ? 1 : 0,
    boxShadow: activeEdge ? 'none' : `0 0 24px 6px ${colorWithAlpha(mood.zoneColors[currentZone], 0.4)}, 0 0 48px 16px ${colorWithAlpha(mood.zoneColors[currentZone], 0.15)}`,
  }}
/>
```

- [ ] **Step 4: Verify cursor changes**

Open app. Move cursor around — should see a soft glowing orb. Drag = larger. Near edge = smaller, white. Center = mood-colored glow.

- [ ] **Step 5: Commit**

```bash
git add musical-waves-v2.jsx
git commit -m "feat: upgrade cursor to fluid-reactive orb with state-based sizing"
```

### Task 8: Update all typography to new fonts

**Files:**
- Modify: `musical-waves-v2.jsx` (CSS)

- [ ] **Step 1: Replace font-family declarations**

In the `.mw-shell` rule, change:
```css
font-family: 'Inter', system-ui, sans-serif;
```

Update any remaining references to IBM Plex Mono / monospace. The serif font (`Playfair Display`) is only used on the watermark and intro — already handled.

- [ ] **Step 2: Verify typography**

Open app. All control text should render in Inter. Watermark mood name should render in Playfair Display.

- [ ] **Step 3: Commit**

```bash
git add musical-waves-v2.jsx
git commit -m "feat: update typography to Playfair Display + Inter"
```

---

## Chunk 5: Cinematic Intro & Mood Transitions

### Task 9: Build cinematic intro sequence

**Files:**
- Modify: `musical-waves-v2.jsx`

- [ ] **Step 1: Add intro state machine**

```javascript
// 'black' -> 'title' -> 'ripple' -> 'invite' -> 'playing'
const [introPhase, setIntroPhase] = useState('black');
```

Replace the `showPrompt` state with `introPhase`. The app starts in `'black'` and progresses through the phases on timers, with `'playing'` as the final state after user touch.

- [ ] **Step 2: Add intro phase progression**

```javascript
useEffect(() => {
  if (introPhase === 'black') {
    const id = setTimeout(() => setIntroPhase('title'), 1000);
    return () => clearTimeout(id);
  }
  if (introPhase === 'title') {
    const id = setTimeout(() => setIntroPhase('ripple'), 2000);
    return () => clearTimeout(id);
  }
  if (introPhase === 'ripple') {
    // Trigger a center splat on the fluid sim
    if (fluidSimRef.current && boundingRef.current) {
      const color = themeRef.current.zoneColors.pluck.map(c => c / 255);
      fluidSimRef.current.addSplat(0.5, 0.5, 0, 0.001, color, 0.01);
    }
    const id = setTimeout(() => setIntroPhase('invite'), 2000);
    return () => clearTimeout(id);
  }
}, [introPhase]);
```

- [ ] **Step 3: Handle returning users (URL params)**

```javascript
const initialStateRef = useRef(readInitialState());
const hasUrlParams = useRef(
  typeof window !== 'undefined' && window.location.search.includes('m=')
);

// In the intro effect, if hasUrlParams, skip to 'ripple' immediately
useEffect(() => {
  if (hasUrlParams.current && introPhase === 'black') {
    setIntroPhase('ripple');
  }
}, [introPhase]);
```

- [ ] **Step 4: Replace prompt JSX with intro phases**

Remove the old `mw-prompt-wrap` / `mw-prompt` JSX. Replace with:

```jsx
{introPhase !== 'playing' && (
  <div
    className="mw-intro"
    onClick={introPhase === 'invite' || introPhase === 'ripple' ? async (e) => {
      e.stopPropagation();
      await Tone.start();
      rebuildNotes(currentScale, currentRoot);
      await buildAudioGraph(currentMood);
      setAudioStarted(true);
      setIntroPhase('playing');
      // Trigger bloom at touch point
      if (fluidSimRef.current && boundingRef.current) {
        const rect = boundingRef.current;
        const color = themeRef.current.zoneColors.pluck.map(c => c / 255);
        fluidSimRef.current.addSplat(
          (e.clientX - rect.left) / rect.width,
          1 - (e.clientY - rect.top) / rect.height,
          0, 0, color, 0.015
        );
      }
    } : undefined}
  >
    {introPhase === 'title' && (
      <div className="mw-intro-title">
        <div className="mw-intro-label">Ambient Instrument</div>
        <h1>{mood.label}</h1>
        <p>{mood.tagline}</p>
      </div>
    )}
    {(introPhase === 'ripple' || introPhase === 'invite') && (
      <div className="mw-intro-invite">
        <p>Touch anywhere to begin</p>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 5: Add intro CSS**

```css
.mw-intro {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  cursor: pointer;
}
.mw-intro-title, .mw-intro-invite {
  text-align: center;
  animation: fade-in 1.5s ease forwards;
}
.mw-intro-title h1 {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(40px, 8vw, 80px);
  font-weight: 600;
  color: var(--text);
  margin: 12px 0 8px;
  line-height: 1;
  letter-spacing: 0.02em;
}
.mw-intro-title p {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
  color: var(--muted);
  letter-spacing: 0.06em;
}
.mw-intro-label {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.mw-intro-invite p {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
  color: var(--muted);
  letter-spacing: 0.08em;
  animation: pulse-soft 3s ease-in-out infinite;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pulse-soft {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
```

- [ ] **Step 6: Remove old prompt/guide code and update startAudio**

Remove `showPrompt` state, `guideVisible` state, and their associated `useEffect`s. Remove old prompt JSX and guide JSX.

**IMPORTANT:** Update the `startAudio` function to use `setIntroPhase('playing')` instead of `setShowPrompt(false)`:
```javascript
const startAudio = useCallback(async () => {
  if (audioStarted) return;
  await Tone.start();
  rebuildNotes(currentScale, currentRoot);
  await buildAudioGraph(currentMood);
  setAudioStarted(true);
  setIntroPhase('playing'); // was setShowPrompt(false)
}, [audioStarted, buildAudioGraph, currentMood, currentRoot, currentScale, rebuildNotes]);
```

This matters because `startAudio` is still called from `onPointerDown`, `toggleFlow`, and `toggleDrone` — not just the intro click handler.

**Also add the session-scoped first-hover hint** (replacing the guide tooltip):
```javascript
const [hintShown, setHintShown] = useState(
  typeof window !== 'undefined' && sessionStorage.getItem('mw-hint-shown') === '1'
);

// In the pointer move handler, when cursor first enters center area after audio starts:
if (audioStarted && !hintShown) {
  setHintShown(true);
  sessionStorage.setItem('mw-hint-shown', '1');
  // Show a brief hint that auto-dismisses after 4s
}
```

- [ ] **Step 7: Verify intro sequence**

Open app fresh (clear URL params). Should see: black screen → mood name fades in → fluid ripple → "Touch anywhere" → click → fluid bloom → playing.

With URL params (e.g., `?m=moonDrift&s=dorian&k=D`): should skip title, go straight to fluid + invite.

- [ ] **Step 8: Commit**

```bash
git add musical-waves-v2.jsx
git commit -m "feat: add cinematic intro sequence replacing modal prompt"
```

### Task 10: Build mood switching transition

**Files:**
- Modify: `musical-waves-v2.jsx`

- [ ] **Step 1: Add transition state**

```javascript
const [moodTransition, setMoodTransition] = useState(null); // null | 'draining' | 'dark' | 'flooding'
```

- [ ] **Step 2: Refactor applyMood to trigger transition**

**IMPORTANT:** The existing `buildAudioGraph` calls `disposeAudio()` as its first step, which immediately kills all sound. To keep audio playing through the drain phase, we must NOT call `buildAudioGraph` until the dark beat. Also, guard the existing `useEffect` (~line 1046) that auto-calls `buildAudioGraph` on `currentMood` change — add a check so it skips when a transition is active.

```javascript
const applyMood = useCallback(async (key) => {
  if (key === currentMood || moodTransition) return;
  setMoodTransition('draining');

  // Audio keeps playing during the drain phase (800ms)
  await new Promise(r => setTimeout(r, 800));
  setMoodTransition('dark');

  // NOW dispose old audio and rebuild during the dark beat
  // Update state first so buildAudioGraph uses new mood's settings
  setCurrentMood(key);
  setCurrentScale(MOODS[key].defaultScale);
  setCurrentRoot(MOODS[key].defaultRoot);
  setShowExperimentalScales(!SCALES[MOODS[key].defaultScale].safe);

  if (audioStarted) {
    await buildAudioGraph(key);
  }

  // Set new fluid params
  fluidSimRef.current?.setMoodParams(MOODS[key].fluid);

  setMoodTransition('flooding');
  // Center splat with new mood colors
  const color = MOODS[key].zoneColors.pluck.map(c => c / 255);
  fluidSimRef.current?.addSplat(0.5, 0.5, 0, 0, color, 0.02);

  await new Promise(r => setTimeout(r, 600));
  setMoodTransition(null);
  lastInteractionRef.current = Date.now();
}, [currentMood, moodTransition, audioStarted, buildAudioGraph]);
```

**Also update the existing `useEffect` (~line 1046) to skip when transition is active:**
```javascript
useEffect(() => {
  if (!audioStarted || moodTransition) return; // skip during transition
  let cancelled = false;
  (async () => {
    await buildAudioGraph(currentMood);
    if (!cancelled && droneLatched) startDrone("latched");
  })();
  return () => { cancelled = true; };
}, [audioStarted, buildAudioGraph, currentMood, droneLatched, moodTransition, startDrone]);
```
```

- [ ] **Step 3: Add transition visual overlay**

```jsx
{moodTransition && (
  <div className={`mw-transition mw-transition-${moodTransition}`} />
)}
{moodTransition === 'flooding' && (
  <div className="mw-transition-name">{mood.label}</div>
)}
```

```css
.mw-transition {
  position: absolute;
  inset: 0;
  z-index: 15;
  pointer-events: none;
}
.mw-transition-draining {
  animation: drain 0.8s ease-in forwards;
  background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.9) 100%);
}
.mw-transition-dark {
  background: rgba(0,0,0,0.95);
}
.mw-transition-flooding {
  animation: flood 0.6s ease-out forwards;
  background: radial-gradient(circle at center, transparent 60%, rgba(0,0,0,0.9) 100%);
}
.mw-transition-name {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(36px, 6vw, 64px);
  color: var(--text);
  z-index: 16;
  pointer-events: none;
  animation: fade-in 0.3s ease forwards;
}
@keyframes drain {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes flood {
  from { opacity: 1; }
  to { opacity: 0; }
}
```

- [ ] **Step 4: Verify mood transition**

Click a different mood in the bottom edge controls. Should see: fluid darkens from edges → brief black → new mood floods in from center with mood name flash.

- [ ] **Step 5: Commit**

```bash
git add musical-waves-v2.jsx
git commit -m "feat: add cinematic mood switching transition"
```

---

## Chunk 6: Flow Mode Visuals & Polish

### Task 11: Add phantom cursor for Flow mode

**Files:**
- Modify: `musical-waves-v2.jsx`

- [ ] **Step 1: Add phantom cursor element and animation**

When flow is active, render a second cursor element that follows the noise-based motion:

```jsx
{flowActive && (
  <div ref={phantomCursorRef} className="mw-cursor mw-cursor-phantom" style={{
    opacity: 0.6,
    boxShadow: `0 0 20px 5px ${colorWithAlpha(mood.zoneColors[currentZone], 0.25)}`,
  }} />
)}
```

```css
.mw-cursor-phantom {
  opacity: 0.6;
  animation: phantom-drift 4s ease-in-out infinite alternate;
}
@keyframes phantom-drift {
  from { filter: blur(1px); }
  to { filter: blur(2px); }
}
```

- [ ] **Step 2: Update flow mode to move phantom cursor and inject splats**

In `runFlowStep`, calculate a position using the existing noise function and update the phantom cursor's transform. Also inject a splat at that position.

- [ ] **Step 3: Add drone ring visual**

When drone is active, render a ring element at the drone latch position:

```jsx
{droneActive && dronePositionRef.current && (
  <div className="mw-drone-ring" style={{
    left: dronePositionRef.current.x,
    top: dronePositionRef.current.y,
    borderColor: colorWithAlpha(mood.zoneColors[currentZone], 0.3),
  }} />
)}
```

```css
.mw-drone-ring {
  position: absolute;
  width: 80px; height: 80px;
  border-radius: 50%;
  border: 1px solid;
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: breathe 3s ease-in-out infinite;
  z-index: 4;
}
@keyframes breathe {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
  50% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.7; }
}
```

Save drone position when latched:
```javascript
const dronePositionRef = useRef(null);
// In startDrone, save position:
dronePositionRef.current = { x: mouseRef.current.sx, y: mouseRef.current.sy };
```

- [ ] **Step 4: Verify flow phantom and drone ring**

Toggle Flow — phantom cursor should drift and paint the fluid. Toggle Drone — a breathing ring should appear at the cursor position.

- [ ] **Step 5: Commit**

```bash
git add musical-waves-v2.jsx
git commit -m "feat: add phantom cursor for flow mode and drone ring visual"
```

### Task 12: Accessibility and graceful degradation

**Files:**
- Modify: `musical-waves-v2.jsx` (CSS + JS)

- [ ] **Step 1: Add keyboard navigation**

Edge controls become visible on focus. Add `tabIndex={0}` to all edge buttons. When Tab is pressed and no edge is visible, reveal all edges:

```javascript
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      // Briefly reveal all edges so Tab can reach controls
      setActiveEdge('all');
      setTimeout(() => {
        if (!document.activeElement?.closest('.mw-edge')) setActiveEdge(null);
      }, 3000);
    }
    if (e.key === 'Escape') setActiveEdge(null);
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

Update CSS to show all edges when `activeEdge === 'all'`:
```css
/* Add 'all' as a visible state for each edge */
```

- [ ] **Step 2: Add prefers-reduced-motion support**

```css
@media (prefers-reduced-motion: reduce) {
  .mw-cursor, .mw-edge, .mw-transition, .mw-watermark, .mw-intro-title, .mw-intro-invite {
    transition: none !important;
    animation: none !important;
  }
}
```

In JS, detect reduced motion and disable fluid animation:
```javascript
const prefersReducedMotion = useRef(
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);
```

If true, skip `fluidSimRef.current.step()` in the tick function — render a static gradient instead.

- [ ] **Step 3: Add WebGL fallback detection**

In `initSize`, if `FluidSim` init fails (no WebGL), set a fallback flag:
```javascript
const [webglAvailable, setWebglAvailable] = useState(true);
```

If `webglAvailable` is false, keep the existing 2D particle system (would need to preserve that code path — for now, render a static gradient background as minimal fallback).

- [ ] **Step 4: Add responsive touch handling**

For mobile (touch), update edge reveal to use swipe-from-edge detection. Add `touchstart`/`touchmove` listeners that detect swipes originating within 30px of an edge.

- [ ] **Step 5: Verify accessibility**

Test: Tab through controls, Escape to hide, `prefers-reduced-motion` in DevTools emulation.

- [ ] **Step 6: Commit**

```bash
git add musical-waves-v2.jsx
git commit -m "feat: add keyboard nav, reduced motion, and graceful degradation"
```

---

## Chunk 7: Background & Cleanup

### Task 13: Remove old CSS and dead code

**Files:**
- Modify: `musical-waves-v2.jsx`

- [ ] **Step 1: Remove all unused CSS rules**

Delete any remaining old CSS rules: `.mw-backdrop`, `.mw-card`, `.mw-top-card`, `.mw-chip`, `.mw-dock`, `.mw-header`, `.mw-zone-row`, `.mw-button`, `.mw-pill-row`, `.mw-field`, `.mw-guide`, `.mw-prompt`, `.mw-prompt-wrap`, `.mw-label`, `.mw-note`, `.mw-canvas-glow`, and their responsive media query variants.

- [ ] **Step 2: Remove old backdrop div from JSX**

Remove `<div className="mw-backdrop" />` — the fluid canvas provides the visual background now.

- [ ] **Step 3: Remove unused JS functions and refs**

Remove: `initLines`, `movePoints`, `movedPoint`, `drawFrame` (old version), `spawnParticles`, `glowLine`, `linesRef`, `lineXRef`, `lastLineRef`, `glowsRef`, `particlesRef`.

- [ ] **Step 4: Update the shell background**

The `.mw-shell` background gradient should remain as a fallback behind the WebGL canvas (visible during intro black screen and transitions):

```css
.mw-shell {
  position: fixed;
  inset: 0;
  overflow: hidden;
  color: var(--text);
  font-family: 'Inter', system-ui, sans-serif;
  background: linear-gradient(180deg, var(--bg-top) 0%, var(--bg-bottom) 100%);
}
```

Remove the radial gradients — the fluid sim provides visual complexity now.

- [ ] **Step 5: Update responsive media queries**

Replace old media queries with edge-aware responsive adjustments:

```css
@media (max-width: 760px) {
  .mw-stage { cursor: default; }
  .mw-watermark-mood { font-size: 48px; }
  .mw-watermark-info { font-size: 11px; }
  .mw-edge-right { width: 160px; }
}
```

- [ ] **Step 6: Rebuild preview-app.js**

`index.html` loads `preview-app.js` (line 30), which is a pre-bundled copy. The JSX source files are NOT loaded directly. To make changes visible:

**Option A (recommended):** Change `index.html` to load the JSX directly via esm.sh's JSX transform:
```html
<script type="module" src="https://esm.sh/build/preview-entry.jsx"></script>
```
Or simpler — update the script src to use a local transpile approach. Since the project already uses esm.sh, add a JSX transform shim.

**Option B:** Manually regenerate `preview-app.js` by bundling with esbuild:
```bash
npx esbuild preview-entry.jsx --bundle --format=esm --jsx=automatic --outfile=preview-app.js --external:react --external:react-dom/client --external:tone
```

Test whichever approach: open the app and confirm all new features render.

- [ ] **Step 7: Final verification**

Open the app and test the complete flow:
1. Cinematic intro plays (black → title → ripple → invite)
2. Touch to begin — fluid bloom, audio starts
3. Drag around — fluid ink trails, notes play
4. Edge controls appear/disappear on hover
5. Switch moods — cinematic transition
6. Flow mode — phantom cursor paints
7. Drone — breathing ring
8. Share link works
9. Watermark shows mood/key/scale/zone
10. Mobile: swipe from edges works, cursor hidden

- [ ] **Step 8: Commit**

```bash
git add musical-waves-v2.jsx index.html fluid-sim.js
git commit -m "feat: complete visual overhaul — cleanup and polish"
```
