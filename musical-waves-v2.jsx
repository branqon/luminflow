import React, { useState, useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";

function createNoise2D() {
  const perm = new Uint8Array(512);
  const grad = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (let i = 0; i < 256; i += 1) perm[i] = i;
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i += 1) perm[i + 256] = perm[i];

  const dot = (g, x, y) => g[0] * x + g[1] * y;
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);

  return (x, y) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);

    return lerp(
      lerp(
        dot(grad[perm[perm[X] + Y] % 8], xf, yf),
        dot(grad[perm[perm[X + 1] + Y] % 8], xf - 1, yf),
        u
      ),
      lerp(
        dot(grad[perm[perm[X] + Y + 1] % 8], xf, yf - 1),
        dot(grad[perm[perm[X + 1] + Y + 1] % 8], xf - 1, yf - 1),
        u
      ),
      v
    );
  };
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const SCALES = {
  pentatonic: { intervals: [0, 2, 4, 7, 9], label: "Pentatonic", safe: true },
  dorian: { intervals: [0, 2, 3, 5, 7, 9, 10], label: "Dorian", safe: true },
  minor: { intervals: [0, 2, 3, 5, 7, 8, 10], label: "Natural Minor", safe: true },
  phrygian: { intervals: [0, 1, 3, 5, 7, 8, 10], label: "Phrygian", safe: false },
  wholeTone: { intervals: [0, 2, 4, 6, 8, 10], label: "Whole Tone", safe: false },
};

const SAFE_SCALE_KEYS = Object.keys(SCALES).filter((key) => SCALES[key].safe);
const EXPERIMENTAL_SCALE_KEYS = Object.keys(SCALES).filter((key) => !SCALES[key].safe);
const ROOT_OPTIONS = NOTE_NAMES;

const ZONES = {
  crystal: { octaves: [4, 6], label: "Crystal" },
  pluck: { octaves: [3, 5], label: "Pluck" },
  sub: { octaves: [1, 3], label: "Sub" },
};

const MOODS = {
  stillWater: {
    label: "Still Water",
    tagline: "cool, clear, and very forgiving",
    defaultScale: "pentatonic",
    defaultRoot: "C",
    background: ["#061420", "#102c45"],
    halo: "rgba(106, 197, 255, 0.26)",
    surface: "rgba(8, 20, 34, 0.74)",
    border: "rgba(162, 220, 255, 0.16)",
    text: "rgba(231, 245, 255, 0.94)",
    muted: "rgba(183, 208, 227, 0.62)",
    baseHue: 205,
    hueSwing: 16,
    hueDrift: 7,
    baseSaturation: 72,
    baseLightness: 72,
    baseAlpha: 0.13,
    zoneColors: {
      crystal: [172, 225, 255],
      pluck: [130, 182, 255],
      sub: [106, 151, 216],
    },
    flowPattern: [0, 2, 4, 2, 1, 3],
    idlePattern: [0, 3, 1, 4],
    audio: {
      reverbDecay: 7.2,
      reverbWet: 0.56,
      delayTime: "8n.",
      feedback: 0.17,
      delayWet: 0.12,
      chorusFrequency: 0.65,
      chorusDepth: 0.32,
      chorusWet: 0.18,
      filterFrequency: 3000,
      crystalVolume: -22,
      crystalAttack: 0.018,
      crystalRelease: 2.5,
      pluckVolume: -18,
      pluckRelease: 1.45,
      subVolume: -18,
      subAttack: 0.09,
      subRelease: 3,
      droneVolume: -25,
      droneAttack: 1.9,
      droneRelease: 4.6,
      flowInterval: 300,
      flowVelocity: 0.22,
      flowDuration: "8n",
      idleEvery: 4300,
    },
    fluid: {
      viscosity: 0.1,
      diffusion: 0.8,
      curl: 0.1,
      pressure: 0.6,
      splatRadius: 0.004,
      dissipation: 0.97,
      bloomIntensity: 0.3,
      idleForce: 0.05,
      idleMode: 'drift',
      noteSplatScale: { crystal: 0.6, pluck: 1.0, sub: 1.8 },
    },
  },
  moonDrift: {
    label: "Moon Drift",
    tagline: "airy and nocturnal with a little shimmer",
    defaultScale: "dorian",
    defaultRoot: "D",
    background: ["#080916", "#1b2136"],
    halo: "rgba(190, 166, 255, 0.22)",
    surface: "rgba(13, 14, 29, 0.76)",
    border: "rgba(198, 182, 255, 0.14)",
    text: "rgba(242, 237, 255, 0.95)",
    muted: "rgba(200, 194, 226, 0.62)",
    baseHue: 245,
    hueSwing: 14,
    hueDrift: 9,
    baseSaturation: 60,
    baseLightness: 74,
    baseAlpha: 0.12,
    zoneColors: {
      crystal: [214, 210, 255],
      pluck: [176, 162, 255],
      sub: [134, 138, 214],
    },
    flowPattern: [0, 1, 3, 4, 2, 1],
    idlePattern: [0, 2, 4, 1],
    audio: {
      reverbDecay: 8.1,
      reverbWet: 0.6,
      delayTime: "4n",
      feedback: 0.2,
      delayWet: 0.15,
      chorusFrequency: 0.9,
      chorusDepth: 0.42,
      chorusWet: 0.28,
      filterFrequency: 3300,
      crystalVolume: -23,
      crystalAttack: 0.02,
      crystalRelease: 2.9,
      pluckVolume: -19,
      pluckRelease: 1.7,
      subVolume: -19,
      subAttack: 0.1,
      subRelease: 3.2,
      droneVolume: -26,
      droneAttack: 2.1,
      droneRelease: 5,
      flowInterval: 250,
      flowVelocity: 0.24,
      flowDuration: "8n",
      idleEvery: 3900,
    },
    fluid: {
      viscosity: 0.4,
      diffusion: 0.5,
      curl: 0.6,
      pressure: 0.5,
      splatRadius: 0.003,
      dissipation: 0.985,
      bloomIntensity: 0.5,
      idleForce: 0.1,
      idleMode: 'spiral',
      noteSplatScale: { crystal: 0.5, pluck: 0.9, sub: 1.6 },
    },
  },
  warmRain: {
    label: "Warm Rain",
    tagline: "soft, earthy, and a little more grounded",
    defaultScale: "minor",
    defaultRoot: "A",
    background: ["#14120f", "#2d3027"],
    halo: "rgba(255, 190, 118, 0.2)",
    surface: "rgba(23, 20, 16, 0.74)",
    border: "rgba(255, 205, 143, 0.14)",
    text: "rgba(255, 245, 229, 0.95)",
    muted: "rgba(227, 206, 180, 0.62)",
    baseHue: 34,
    hueSwing: 12,
    hueDrift: 6,
    baseSaturation: 64,
    baseLightness: 76,
    baseAlpha: 0.11,
    zoneColors: {
      crystal: [181, 232, 214],
      pluck: [255, 196, 129],
      sub: [202, 133, 95],
    },
    flowPattern: [0, 2, 1, 4, 2, 3],
    idlePattern: [0, 1, 3, 2],
    audio: {
      reverbDecay: 6,
      reverbWet: 0.48,
      delayTime: "8n",
      feedback: 0.14,
      delayWet: 0.1,
      chorusFrequency: 0.42,
      chorusDepth: 0.22,
      chorusWet: 0.12,
      filterFrequency: 2600,
      crystalVolume: -24,
      crystalAttack: 0.022,
      crystalRelease: 2.1,
      pluckVolume: -18,
      pluckRelease: 1.3,
      subVolume: -17,
      subAttack: 0.1,
      subRelease: 3.1,
      droneVolume: -24,
      droneAttack: 1.7,
      droneRelease: 4.2,
      flowInterval: 285,
      flowVelocity: 0.22,
      flowDuration: "8n",
      idleEvery: 4600,
    },
    fluid: {
      viscosity: 0.7,
      diffusion: 0.3,
      curl: 0.2,
      pressure: 0.7,
      splatRadius: 0.005,
      dissipation: 0.96,
      bloomIntensity: 0.25,
      idleForce: 0.15,
      idleMode: 'rain',
      noteSplatScale: { crystal: 0.7, pluck: 1.1, sub: 2.0 },
    },
  },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function colorWithAlpha(color, alpha) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

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

function buildScaleNotes(scaleKey, rootKey, octLow, octHigh) {
  const rootIndex = NOTE_NAMES.indexOf(rootKey);
  const notes = [];

  for (let oct = octLow; oct <= octHigh; oct += 1) {
    for (const semi of SCALES[scaleKey].intervals) {
      const name = NOTE_NAMES[(rootIndex + semi + NOTE_NAMES.length) % NOTE_NAMES.length];
      notes.push(`${name}${oct}`);
    }
  }

  return notes;
}

function readInitialState() {
  const fallback = MOODS.stillWater;

  if (typeof window === "undefined") {
    return {
      mood: "stillWater",
      scale: fallback.defaultScale,
      root: fallback.defaultRoot,
      flowEnabled: false,
      showExperimental: false,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const mood = MOODS[params.get("m")] ? params.get("m") : "stillWater";
  const scale = SCALES[params.get("s")] ? params.get("s") : MOODS[mood].defaultScale;
  const root = ROOT_OPTIONS.includes(params.get("k")) ? params.get("k") : MOODS[mood].defaultRoot;

  return {
    mood,
    scale,
    root,
    flowEnabled: params.get("f") === "1",
    showExperimental: params.get("x") === "1" || !SCALES[scale].safe,
  };
}

export default function MusicalWavesV2() {
  const initialStateRef = useRef(readInitialState());

  const [audioStarted, setAudioStarted] = useState(false);
  const [introPhase, setIntroPhase] = useState('black');
  // Phases: 'black' -> 'title' -> 'ripple' -> 'invite' -> 'playing'
  const [currentMood, setCurrentMood] = useState(initialStateRef.current.mood);
  const [currentScale, setCurrentScale] = useState(initialStateRef.current.scale);
  const [currentRoot, setCurrentRoot] = useState(initialStateRef.current.root);
  const [currentZone, setCurrentZone] = useState("pluck");
  const [droneLatched, setDroneLatched] = useState(false);
  const [droneActive, setDroneActive] = useState(false);
  const [flowEnabled, setFlowEnabled] = useState(initialStateRef.current.flowEnabled);
  const [flowActive, setFlowActive] = useState(false);
  const [showExperimentalScales, setShowExperimentalScales] = useState(
    initialStateRef.current.showExperimental
  );
  const [moodTransition, setMoodTransition] = useState(null); // null | 'draining' | 'dark' | 'flooding'
  const [volume, setVolume] = useState(-12); // dB, range -40 to 0
  const [copyStatus, setCopyStatus] = useState("idle");
  const [cursorVisible, setCursorVisible] = useState(false);
  const [graphVersion, setGraphVersion] = useState(0);
  const [webglAvailable, setWebglAvailable] = useState(true);

  const activeEdgeRef = useRef(null);
  const [activeEdge, setActiveEdge] = useState(null); // 'top' | 'bottom' | 'left' | 'right' | 'all' | null
  const edgeThreshold = 80;

  const hasUrlParams = useRef(
    typeof window !== 'undefined' && window.location.search.includes('m=')
  );

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const cursorRef = useRef(null);
  const phantomCursorRef = useRef(null);
  const dronePositionRef = useRef(null);
  const boundingRef = useRef(null);
  const fluidSimRef = useRef(null);
  const lastFrameTimeRef = useRef(performance.now());

  const audioReadyRef = useRef(false);
  const synthsRef = useRef({});
  const droneSynthRef = useRef(null);
  const fxRef = useRef({});
  const scaleNotesRef = useRef({});
  const flowRef = useRef({ intervalId: null, step: 0, direction: 1 });
  const droneNoteRef = useRef(null);
  const droneSigRef = useRef("");
  const droneChangeRef = useRef(0);
  const pointerDownRef = useRef(false);
  const noiseRef = useRef(null);
  const rafRef = useRef(null);
  const lastNoteTimeRef = useRef({ crystal: 0, pluck: 0, sub: 0 });
  const themeRef = useRef(MOODS[initialStateRef.current.mood]);
  const idleStepRef = useRef(0);
  const lastInteractionRef = useRef(Date.now());
  const mouseRef = useRef({
    x: -120,
    y: -120,
    lx: -120,
    ly: -120,
    sx: -120,
    sy: -120,
    v: 0,
    vs: 0,
    a: 0,
    set: false,
  });

  const mood = MOODS[currentMood];
  const visibleScaleKeys = showExperimentalScales
    ? [...SAFE_SCALE_KEYS, ...EXPERIMENTAL_SCALE_KEYS]
    : SAFE_SCALE_KEYS;

  useEffect(() => {
    themeRef.current = mood;
  }, [mood]);

  useEffect(() => {
    fluidSimRef.current?.setMoodParams(mood.fluid);
  }, [mood]);

  useEffect(() => {
    Tone.getDestination().volume.value = volume;
  }, [volume]);

  const rebuildNotes = useCallback((scaleKey, rootKey) => {
    scaleNotesRef.current = {
      crystal: buildScaleNotes(scaleKey, rootKey, ...ZONES.crystal.octaves),
      pluck: buildScaleNotes(scaleKey, rootKey, ...ZONES.pluck.octaves),
      sub: buildScaleNotes(scaleKey, rootKey, ...ZONES.sub.octaves),
    };
  }, []);

  const stopDrone = useCallback(() => {
    if (!droneSynthRef.current || !droneNoteRef.current) {
      setDroneActive(false);
      droneSigRef.current = "";
      return;
    }

    try {
      droneSynthRef.current.triggerRelease(droneNoteRef.current);
    } catch (error) {
      // Ignore release failures while rebuilding.
    }

    droneNoteRef.current = null;
    droneSigRef.current = "";
    setDroneActive(false);
  }, []);

  const stopFlow = useCallback(() => {
    if (flowRef.current.intervalId) clearInterval(flowRef.current.intervalId);
    flowRef.current.intervalId = null;
    flowRef.current.step = 0;
    flowRef.current.direction = 1;
    setFlowActive(false);
  }, []);

  const disposeAudio = useCallback(() => {
    stopFlow();
    stopDrone();
    audioReadyRef.current = false;

    const nodes = [
      ...Object.values(synthsRef.current),
      droneSynthRef.current,
      ...Object.values(fxRef.current),
    ];

    nodes.forEach((node) => {
      if (!node) return;
      try {
        node.releaseAll?.();
      } catch (error) {
        // Ignore release failures.
      }
      try {
        node.dispose?.();
      } catch (error) {
        // Ignore already disposed nodes.
      }
    });

    synthsRef.current = {};
    droneSynthRef.current = null;
    fxRef.current = {};
  }, [stopDrone, stopFlow]);

  const buildAudioGraph = useCallback(
    async (moodKey) => {
      const settings = MOODS[moodKey].audio;

      disposeAudio();

      const limiter = new Tone.Limiter(-7).toDestination();
      const compressor = new Tone.Compressor({
        threshold: -24,
        ratio: 2.2,
        attack: 0.03,
        release: 0.28,
      }).connect(limiter);
      const filter = new Tone.Filter({
        type: "lowpass",
        frequency: settings.filterFrequency,
        rolloff: -12,
        Q: 0.35,
      }).connect(compressor);
      const reverb = new Tone.Reverb({
        decay: settings.reverbDecay,
        wet: settings.reverbWet,
      }).connect(filter);
      const delay = new Tone.FeedbackDelay({
        delayTime: settings.delayTime,
        feedback: settings.feedback,
        wet: settings.delayWet,
      }).connect(reverb);
      const chorus = new Tone.Chorus({
        frequency: settings.chorusFrequency,
        delayTime: 3.2,
        depth: settings.chorusDepth,
        wet: settings.chorusWet,
      })
        .start()
        .connect(delay);

      const crystal = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 5,
        voice: Tone.Synth,
        options: {
          oscillator: { type: "fatsine", spread: 18, count: 3 },
          envelope: {
            attack: settings.crystalAttack,
            decay: 0.42,
            sustain: 0.08,
            release: settings.crystalRelease,
          },
          volume: settings.crystalVolume,
        },
      }).connect(chorus);

      const pluck = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 5,
        voice: Tone.Synth,
        options: {
          oscillator: { type: "triangle" },
          envelope: {
            attack: 0.006,
            decay: 0.24,
            sustain: 0.03,
            release: settings.pluckRelease,
          },
          volume: settings.pluckVolume,
        },
      }).connect(delay);

      const sub = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 3,
        voice: Tone.Synth,
        options: {
          oscillator: { type: "sine" },
          envelope: {
            attack: settings.subAttack,
            decay: 0.55,
            sustain: 0.26,
            release: settings.subRelease,
          },
          volume: settings.subVolume,
        },
      }).connect(reverb);

      const drone = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 4,
        voice: Tone.Synth,
        options: {
          oscillator: { type: "sine" },
          envelope: {
            attack: settings.droneAttack,
            decay: 1.1,
            sustain: 0.78,
            release: settings.droneRelease,
          },
          volume: settings.droneVolume,
        },
      }).connect(reverb);

      synthsRef.current = { crystal, pluck, sub };
      droneSynthRef.current = drone;
      fxRef.current = { limiter, compressor, filter, reverb, delay, chorus };
      audioReadyRef.current = true;
      setGraphVersion((value) => value + 1);
    },
    [disposeAudio]
  );

  const initSize = useCallback(() => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    boundingRef.current = rect;
    if (canvasRef.current) {
      if (!fluidSimRef.current) {
        fluidSimRef.current = new window.FluidSim();
        const success = fluidSimRef.current.init(canvasRef.current);
        if (!success) {
          setWebglAvailable(false);
          fluidSimRef.current = null;
        }
      }
      fluidSimRef.current.resize(rect.width, rect.height);
      fluidSimRef.current.setMoodParams(themeRef.current.fluid);
    }
  }, []);

  const updateMouse = useCallback((clientX, clientY) => {
    if (!boundingRef.current) return;

    const rect = boundingRef.current;
    const mouse = mouseRef.current;
    mouse.x = clamp(clientX - rect.left, 0, rect.width);
    mouse.y = clamp(clientY - rect.top, 0, rect.height);

    if (!mouse.set) {
      mouse.sx = mouse.x;
      mouse.sy = mouse.y;
      mouse.lx = mouse.x;
      mouse.ly = mouse.y;
      mouse.set = true;
    }
  }, []);

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

  const getDroneChord = useCallback((zone) => {
    if (!boundingRef.current) return { chord: [], sig: "" };

    const notes = scaleNotesRef.current[zone];
    if (!notes || !notes.length) return { chord: [], sig: "" };

    const xRatio = clamp(mouseRef.current.x / Math.max(1, boundingRef.current.width), 0, 1);
    const base = zone === "sub" ? 0.08 : zone === "pluck" ? 0.18 : 0.28;
    const travel = zone === "sub" ? 2 : 4;
    const idx = clamp(Math.floor(notes.length * base + xRatio * travel), 0, notes.length - 1);
    const chord = [
      notes[idx],
      notes[clamp(idx + 2, 0, notes.length - 1)],
      notes[clamp(idx + 4, 0, notes.length - 1)],
    ].filter((note, index, list) => list.indexOf(note) === index);

    return { chord, sig: `${zone}:${chord.join("-")}` };
  }, []);

  const startDrone = useCallback(
    (source = "latched") => {
      if (!audioReadyRef.current || !boundingRef.current || !droneSynthRef.current) return;

      const pos = boundingRef.current
        ? getZoneFromPosition(mouseRef.current.x, mouseRef.current.y, boundingRef.current)
        : { zone: 'pluck', angle: 0, ringDepth: 0.5 };
      const zone = pos.zone;
      const { chord, sig } = getDroneChord(zone);

      if (!chord.length || sig === droneSigRef.current) return;

      try {
        if (droneNoteRef.current) droneSynthRef.current.triggerRelease(droneNoteRef.current);
        droneSynthRef.current.triggerAttack(chord, Tone.now(), source === "touch" ? 0.18 : 0.24);
        droneNoteRef.current = chord;
        droneSigRef.current = sig;
        droneChangeRef.current = Tone.now();
        setCurrentZone(zone);
        setDroneActive(true);
        dronePositionRef.current = { x: mouseRef.current.sx, y: mouseRef.current.sy };
      } catch (error) {
        // Ignore transient audio errors.
      }
    },
    [getDroneChord]
  );

  const refreshDrone = useCallback(() => {
    if (!droneActive || Tone.now() - droneChangeRef.current < 0.32) return;
    startDrone(droneLatched ? "latched" : "touch");
  }, [droneActive, droneLatched, startDrone]);

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

      // Angle -> scale degree, ringDepth -> octave
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

      // Visual feedback
      injectSplat(x, y, mouse.x - mouse.lx, mouse.y - mouse.ly, zone);
    },
    [currentScale, injectSplat]
  );

  const runFlowStep = useCallback(() => {
    if (!audioReadyRef.current || !boundingRef.current) return;

    const activeMood = themeRef.current;
    const rect = boundingRef.current;
    const xRatio = mouseRef.current.set
      ? clamp(mouseRef.current.x / Math.max(1, rect.width), 0, 1)
      : 0.5 + Math.sin(Date.now() * 0.00025) * 0.18;
    const yRatio = mouseRef.current.set
      ? clamp(mouseRef.current.y / Math.max(1, rect.height), 0, 1)
      : 0.48 + Math.sin(Date.now() * 0.00018) * 0.08;
    const zone = getZoneFromPosition(mouseRef.current.x, mouseRef.current.y, boundingRef.current).zone;
    const notes = scaleNotesRef.current[zone];

    if (!notes || !notes.length) return;

    const pattern = activeMood.flowPattern;
    const step = flowRef.current.step % pattern.length;
    const offset = pattern[step] * flowRef.current.direction;
    const anchor = clamp(Math.floor(xRatio * (notes.length - 1)), 0, notes.length - 1);
    const noteIndex = clamp(anchor + offset, 0, notes.length - 1);
    const synth = synthsRef.current[zone];

    if (!synth) return;

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
    injectSplat(
      xRatio * rect.width,
      yRatio * rect.height,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      zone
    );

    if (phantomCursorRef.current && boundingRef.current) {
      const px = rect.width * xRatio;
      const py = rect.height * yRatio;
      phantomCursorRef.current.style.transform = `translate3d(${px - 8}px, ${py - 8}px, 0)`;
    }

    if (step === pattern.length - 1) flowRef.current.direction *= -1;
    flowRef.current.step += 1;
  }, [injectSplat]);


  const drawFrame = useCallback(() => {
    const sim = fluidSimRef.current;
    if (!sim || !boundingRef.current) return;
    const now = performance.now();
    const dt = Math.min((now - lastFrameTimeRef.current) / 1000, 0.033);
    lastFrameTimeRef.current = now;
    sim.step(dt);

    // Idle behavior per mood
    const fluid = themeRef.current.fluid;
    const idleColor = themeRef.current.zoneColors.pluck.map(c => c / 255 * 0.3);
    if (fluid.idleMode === 'drift') {
      sim.addSplat(0.1, 0.5, fluid.idleForce, 0, idleColor, 0.01);
    } else if (fluid.idleMode === 'spiral') {
      const t = performance.now() * 0.0005;
      const cx = 0.5 + Math.cos(t) * 0.2;
      const cy = 0.5 + Math.sin(t) * 0.2;
      sim.addSplat(cx, cy, Math.cos(t + Math.PI/2) * fluid.idleForce, Math.sin(t + Math.PI/2) * fluid.idleForce, idleColor, 0.008);
    } else if (fluid.idleMode === 'rain') {
      if (Math.random() < 0.033) {
        const rx = Math.random();
        sim.addSplat(rx, 0.95, 0, -fluid.idleForce * 2, idleColor, 0.006);
      }
    }
  }, []);

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

      drawFrame();

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${mouse.sx - 5}px, ${mouse.sy - 5}px, 0)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [drawFrame]
  );

  const startAudio = useCallback(async () => {
    if (audioStarted) return;
    await Tone.start();
    rebuildNotes(currentScale, currentRoot);
    await buildAudioGraph(currentMood);
    setAudioStarted(true);
    setIntroPhase('playing');
  }, [audioStarted, buildAudioGraph, currentMood, currentRoot, currentScale, rebuildNotes]);

  const applyMood = useCallback(async (key) => {
    if (key === currentMood || moodTransition) return;
    setMoodTransition('draining');

    // Audio keeps playing during the drain phase (800ms)
    await new Promise(r => setTimeout(r, 800));
    setMoodTransition('dark');

    // NOW dispose old audio and rebuild during the dark beat
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

  const changeScale = useCallback((key) => {
    setCurrentScale(key);
    if (!SCALES[key].safe) setShowExperimentalScales(true);
    lastInteractionRef.current = Date.now();
  }, []);

  const changeRoot = useCallback((event) => {
    setCurrentRoot(event.target.value);
    lastInteractionRef.current = Date.now();
  }, []);

  const copyLink = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus("copied");
    } catch (error) {
      setCopyStatus("failed");
    }
  }, []);

  const toggleFlow = useCallback(async () => {
    if (!audioStarted) await startAudio();
    setFlowEnabled((value) => !value);
    lastInteractionRef.current = Date.now();
  }, [audioStarted, startAudio]);

  const toggleDrone = useCallback(async () => {
    if (!audioStarted) await startAudio();
    setDroneLatched((value) => {
      const next = !value;
      if (next) startDrone("latched");
      else if (!pointerDownRef.current) stopDrone();
      return next;
    });
    lastInteractionRef.current = Date.now();
  }, [audioStarted, startAudio, startDrone, stopDrone]);

  const finishPointer = useCallback(() => {
    pointerDownRef.current = false;
  }, []);

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

      // Edge detection
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

      // Faint visual splat when not clicking (no audio)
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

  const onPointerUp = useCallback(
    (event) => {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      finishPointer();
    },
    [finishPointer]
  );

  const onPointerLeave = useCallback(() => {
    if (!pointerDownRef.current) {
      setCursorVisible(false);
    }
  }, []);

  useEffect(() => {
    rebuildNotes(currentScale, currentRoot);
  }, [currentScale, currentRoot, rebuildNotes]);

  useEffect(() => {
    if (!audioStarted || moodTransition) return;
    let cancelled = false;
    (async () => {
      await buildAudioGraph(currentMood);
      if (!cancelled && droneLatched) startDrone("latched");
    })();
    return () => {
      cancelled = true;
    };
  }, [audioStarted, buildAudioGraph, currentMood, droneLatched, moodTransition, startDrone]);

  useEffect(() => {
    if (!audioStarted || !audioReadyRef.current) return;
    if (droneLatched || droneActive) startDrone(droneLatched ? "latched" : "touch");
  }, [audioStarted, currentRoot, currentScale, droneActive, droneLatched, startDrone]);

  useEffect(() => {
    if (!audioStarted || !flowEnabled || !audioReadyRef.current) {
      stopFlow();
      return undefined;
    }
    stopFlow();
    flowRef.current.intervalId = window.setInterval(runFlowStep, mood.audio.flowInterval);
    setFlowActive(true);
    return () => stopFlow();
  }, [audioStarted, flowEnabled, graphVersion, mood.audio.flowInterval, runFlowStep, stopFlow]);

  useEffect(() => {
    if (!audioStarted || !audioReadyRef.current) return undefined;

    const intervalId = window.setInterval(() => {
      if (!audioReadyRef.current || flowEnabled || droneActive) return;
      if (Date.now() - lastInteractionRef.current < 7000) return;

      const zone = ["sub", "pluck", "crystal"][idleStepRef.current % 3];
      const notes = scaleNotesRef.current[zone];
      const pattern = themeRef.current.idlePattern;
      if (!notes || !notes.length) return;

      const noteIndex = clamp(
        Math.floor(notes.length * 0.22) + pattern[idleStepRef.current % pattern.length],
        0,
        notes.length - 1
      );
      const synth = synthsRef.current[zone];
      if (!synth) return;

      try {
        synth.triggerAttackRelease(notes[noteIndex], 0.48, Tone.now(), 0.13);
      } catch (error) {
        // Ignore transient audio errors.
      }

      const rect = boundingRef.current;
      if (rect) {
        const rx = Math.random() * rect.width;
        const ry = Math.random() * rect.height;
        injectSplat(rx, ry, 0, 0, zone);
      }
      idleStepRef.current += 1;
    }, mood.audio.idleEvery);

    return () => clearInterval(intervalId);
  }, [audioStarted, droneActive, flowEnabled, injectSplat, graphVersion, mood.audio.idleEvery]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("m", currentMood);
    params.set("s", currentScale);
    params.set("k", currentRoot);
    if (flowEnabled) params.set("f", "1");
    else params.delete("f");
    if (showExperimentalScales) params.set("x", "1");
    else params.delete("x");
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, [currentMood, currentScale, currentRoot, flowEnabled, showExperimentalScales]);

  useEffect(() => {
    if (copyStatus === "idle") return undefined;
    const timeoutId = window.setTimeout(() => setCopyStatus("idle"), 1800);
    return () => clearTimeout(timeoutId);
  }, [copyStatus]);

  useEffect(() => {
    if (introPhase === 'black') {
      if (hasUrlParams.current) {
        setIntroPhase('ripple');
        return;
      }
      const id = setTimeout(() => setIntroPhase('title'), 1000);
      return () => clearTimeout(id);
    }
    if (introPhase === 'title') {
      const id = setTimeout(() => setIntroPhase('ripple'), 2000);
      return () => clearTimeout(id);
    }
    if (introPhase === 'ripple') {
      // Trigger a center splat on the fluid sim
      if (fluidSimRef.current) {
        const color = themeRef.current.zoneColors.pluck.map(c => c / 255);
        fluidSimRef.current.addSplat(0.5, 0.5, 0, 0.001, color, 0.01);
      }
      const id = setTimeout(() => setIntroPhase('invite'), 2000);
      return () => clearTimeout(id);
    }
  }, [introPhase]);

  useEffect(() => {
    noiseRef.current = createNoise2D();
    initSize();

    const handleResize = () => {
      initSize();
    };

    window.addEventListener("resize", handleResize);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fluidSimRef.current?.destroy();
    };
  }, [initSize, tick]);

  useEffect(() => {
    return () => disposeAudio();
  }, [disposeAudio]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        setActiveEdge('all');
        activeEdgeRef.current = 'all';
      }
      if (e.key === 'Escape') {
        setActiveEdge(null);
        activeEdgeRef.current = null;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className="mw-shell"
      style={{
        "--bg-top": mood.background[0],
        "--bg-bottom": mood.background[1],
        "--halo": mood.halo,
        "--surface": mood.surface,
        "--border": mood.border,
        "--text": mood.text,
        "--muted": mood.muted,
      }}
    >
      <div
        ref={stageRef}
        className="mw-stage"
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={finishPointer}
        onPointerLeave={onPointerLeave}
      >
        <canvas ref={canvasRef} className="mw-canvas" />

        <div
          ref={cursorRef}
          className={`mw-cursor ${pointerDownRef.current ? 'playing' : ''} ${activeEdge ? 'edge' : ''}`}
          style={{
            opacity: audioStarted && cursorVisible ? 1 : 0,
            boxShadow: activeEdge ? 'none' : `0 0 24px 6px ${colorWithAlpha(mood.zoneColors[currentZone], 0.4)}, 0 0 48px 16px ${colorWithAlpha(mood.zoneColors[currentZone], 0.15)}`,
          }}
        />

        {flowActive && (
          <div ref={phantomCursorRef} className="mw-cursor mw-cursor-phantom" style={{
            opacity: 0.6,
            boxShadow: `0 0 20px 5px ${colorWithAlpha(mood.zoneColors[currentZone], 0.25)}`,
          }} />
        )}

        {droneActive && dronePositionRef.current && (
          <div className="mw-drone-ring" style={{
            left: dronePositionRef.current.x,
            top: dronePositionRef.current.y,
            borderColor: colorWithAlpha(mood.zoneColors[currentZone], 0.3),
          }} />
        )}

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
      </div>

      {moodTransition && (
        <div className={`mw-transition mw-transition-${moodTransition}`} />
      )}
      {moodTransition === 'flooding' && (
        <div className="mw-transition-name">{mood.label}</div>
      )}

      {/* Bottom edge — Mood selector */}
      <div className={`mw-edge mw-edge-bottom ${activeEdge === 'bottom' || activeEdge === 'all' ? 'visible' : ''}`}>
        <div className="mw-edge-content">
          {Object.entries(MOODS).map(([key, preset]) => (
            <button key={key} className={`mw-edge-btn ${currentMood === key ? 'active' : ''}`}
              onClick={() => applyMood(key)}>
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right edge — Pitch controls */}
      <div className={`mw-edge mw-edge-right ${activeEdge === 'right' || activeEdge === 'all' ? 'visible' : ''}`}>
        <div className="mw-edge-content">
          <select value={currentRoot} onChange={changeRoot} className="mw-edge-select">
            {ROOT_OPTIONS.map((root) => (<option key={root} value={root}>{root}</option>))}
          </select>
          {visibleScaleKeys.map((key) => (
            <button key={key} className={`mw-edge-btn ${currentScale === key ? 'active' : ''}`}
              onClick={() => changeScale(key)}>
              {SCALES[key].label}
            </button>
          ))}
          <button className={`mw-edge-btn ${showExperimentalScales ? 'active' : ''}`}
            onClick={() => setShowExperimentalScales(v => !v)}>
            {showExperimentalScales ? 'Safe Only' : 'More Colors'}
          </button>
        </div>
      </div>

      {/* Left edge — Zone selector */}
      <div className={`mw-edge mw-edge-left ${activeEdge === 'left' || activeEdge === 'all' ? 'visible' : ''}`}>
        <div className="mw-edge-content">
          {Object.keys(ZONES).map((zone) => (
            <span key={zone} className={`mw-edge-glyph ${currentZone === zone ? 'active' : ''}`}
              style={currentZone === zone ? { color: colorWithAlpha(mood.zoneColors[zone], 1) } : {}}>
              {ZONES[zone].label}
            </span>
          ))}
        </div>
      </div>

      {/* Top edge — Scene toggles */}
      <div className={`mw-edge mw-edge-top ${activeEdge === 'top' || activeEdge === 'all' ? 'visible' : ''}`}>
        <div className="mw-edge-content">
          <button className={`mw-edge-btn ${flowEnabled ? 'active' : ''}`} onClick={toggleFlow}>Flow</button>
          <button className={`mw-edge-btn ${droneLatched ? 'active warm' : ''}`} onClick={toggleDrone}>Drone</button>
          <label className="mw-volume">
            <input
              type="range"
              min={-40}
              max={0}
              step={1}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="mw-volume-slider"
            />
          </label>
          <button className="mw-edge-btn" onClick={copyLink}>
            {copyStatus === 'copied' ? 'Copied' : copyStatus === 'failed' ? 'Failed' : 'Share'}
          </button>
        </div>
      </div>

      <div className={`mw-watermark ${activeEdge === 'bottom' || activeEdge === 'left' ? 'bright' : ''}`}
           style={{ color: mood.muted }}>
        <div className="mw-watermark-mood">{mood.label}</div>
        <div className="mw-watermark-info">
          {currentRoot} {SCALES[currentScale].label} &middot; {ZONES[currentZone].label}
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; min-height: 100%; }
        .mw-shell {
          position: fixed;
          inset: 0;
          overflow: hidden;
          color: var(--text);
          font-family: 'Inter', system-ui, sans-serif;
          background: linear-gradient(180deg, var(--bg-top) 0%, var(--bg-bottom) 100%);
        }
        .mw-stage { position: absolute; inset: 0; cursor: none; touch-action: none; }
        .mw-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
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
        .mw-cursor-phantom {
          opacity: 0.6;
          filter: blur(1.5px);
        }
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
        .mw-edge.visible, .mw-edge:focus-within {
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
        .mw-volume {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        .mw-volume-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 80px;
          height: 3px;
          background: rgba(255,255,255,0.15);
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .mw-volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgba(255,255,255,0.7);
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .mw-volume-slider::-webkit-slider-thumb:hover {
          background: rgba(255,255,255,0.95);
        }
        .mw-volume-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgba(255,255,255,0.7);
          border: none;
          cursor: pointer;
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
        @media (prefers-reduced-motion: reduce) {
          .mw-cursor, .mw-edge, .mw-transition, .mw-watermark,
          .mw-intro-title, .mw-intro-invite, .mw-drone-ring, .mw-cursor-phantom {
            transition: none !important;
            animation: none !important;
          }
        }
        @media (max-width: 760px) {
          .mw-stage { cursor: default; }
          .mw-watermark-mood { font-size: 48px; }
          .mw-watermark-info { font-size: 11px; }
          .mw-edge-right { width: 160px; }
          .mw-intro-title h1 { font-size: clamp(32px, 6vw, 56px); }
        }
      `}</style>
    </div>
  );
}
