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

function getZone(yRatio) {
  if (yRatio < 0.33) return "crystal";
  if (yRatio < 0.66) return "pluck";
  return "sub";
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
  const [showPrompt, setShowPrompt] = useState(true);
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
  const [copyStatus, setCopyStatus] = useState("idle");
  const [guideVisible, setGuideVisible] = useState(true);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [graphVersion, setGraphVersion] = useState(0);

  const activeEdgeRef = useRef(null);
  const [activeEdge, setActiveEdge] = useState(null); // 'top' | 'bottom' | 'left' | 'right' | 'all' | null
  const edgeThreshold = 80;

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const cursorRef = useRef(null);
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
  const lastNoteTimeRef = useRef(0);
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
        fluidSimRef.current.init(canvasRef.current);
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

      const yRatio = clamp(mouseRef.current.y / Math.max(1, boundingRef.current.height), 0, 1);
      const zone = mouseRef.current.set ? getZone(yRatio) : "pluck";
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
    (clientX) => {
      if (!audioReadyRef.current || !boundingRef.current) return;

      const rect = boundingRef.current;
      const mouse = mouseRef.current;
      const yRatio = clamp(mouse.y / Math.max(1, rect.height), 0, 1);
      const zone = getZone(yRatio);
      const notes = scaleNotesRef.current[zone];

      if (!notes || !notes.length) return;

      if (Tone.now() - lastNoteTimeRef.current < 0.05) return;

      lastNoteTimeRef.current = Tone.now();
      setCurrentZone(zone);

      const xRatio = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
      const noteIndex = clamp(Math.floor(xRatio * (notes.length - 1)), 0, notes.length - 1);
      const note = notes[noteIndex];
      const synth = synthsRef.current[zone];

      if (!synth) return;

      const speed = clamp(mouse.vs, 0, 90);
      const bloom = 1 - speed / 90;
      const duration = 0.08 + bloom * 0.32;
      const velocity = 0.12 + (1 - yRatio) * 0.18 + bloom * 0.18;

      try {
        synth.triggerAttackRelease(note, duration, Tone.now(), velocity);
      } catch (error) {
        // Ignore transient audio errors.
      }

      injectSplat(mouse.x, mouse.y, mouse.x - mouse.lx, mouse.y - mouse.ly, zone);
    },
    [injectSplat]
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
    const zone = getZone(yRatio);
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
    setShowPrompt(false);
  }, [audioStarted, buildAudioGraph, currentMood, currentRoot, currentScale, rebuildNotes]);

  const applyMood = useCallback((key) => {
    setCurrentMood(key);
    setCurrentScale(MOODS[key].defaultScale);
    setCurrentRoot(MOODS[key].defaultRoot);
    setShowExperimentalScales(!SCALES[MOODS[key].defaultScale].safe);
    lastInteractionRef.current = Date.now();
  }, []);

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
    setGuideVisible(false);
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
    setGuideVisible(false);
  }, [audioStarted, startAudio, startDrone, stopDrone]);

  const finishPointer = useCallback(() => {
    pointerDownRef.current = false;
    if (!droneLatched) stopDrone();
  }, [droneLatched, stopDrone]);

  const onPointerDown = useCallback(
    async (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      pointerDownRef.current = true;
      lastInteractionRef.current = Date.now();
      setGuideVisible(false);
      updateMouse(event.clientX, event.clientY);
      if (event.pointerType === "mouse") setCursorVisible(true);
      if (!audioStarted) await startAudio();
      triggerNote(event.clientX);
      startDrone("touch");
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [audioStarted, startAudio, startDrone, triggerNote, updateMouse]
  );

  const onPointerMove = useCallback(
    (event) => {
      if (event.pointerType === "mouse") setCursorVisible(true);
      else setCursorVisible(false);
      lastInteractionRef.current = Date.now();
      updateMouse(event.clientX, event.clientY);
      setCurrentZone(
        getZone(clamp(mouseRef.current.y / Math.max(1, boundingRef.current?.height || 1), 0, 1))
      );

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

      if (audioReadyRef.current) {
        triggerNote(event.clientX);
        if (pointerDownRef.current || droneLatched) refreshDrone();
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
    if (!audioStarted) return;
    let cancelled = false;
    (async () => {
      await buildAudioGraph(currentMood);
      if (!cancelled && droneLatched) startDrone("latched");
    })();
    return () => {
      cancelled = true;
    };
  }, [audioStarted, buildAudioGraph, currentMood, droneLatched, startDrone]);

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
    if (!audioStarted || !guideVisible) return undefined;
    const timeoutId = window.setTimeout(() => setGuideVisible(false), 12000);
    return () => clearTimeout(timeoutId);
  }, [audioStarted, guideVisible]);

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
      <div className="mw-backdrop" />
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
          className="mw-cursor"
          style={{
            opacity: audioStarted && cursorVisible ? 1 : 0,
            boxShadow: `0 0 18px 4px ${colorWithAlpha(
              mood.zoneColors[currentZone],
              0.34
            )}, 0 0 40px 12px ${colorWithAlpha(mood.zoneColors[currentZone], 0.16)}`,
          }}
        />

        {guideVisible && audioStarted && (
          <div className="mw-guide">
            Move left for lower notes, right for brighter notes. Slow drags bloom longer tones.
          </div>
        )}

        {showPrompt && (
          <div className="mw-prompt-wrap">
            <div className="mw-card mw-prompt">
              <div className="mw-label">Ambient Instrument</div>
              <h2>Start with one sweep.</h2>
              <p>Drag anywhere to play. Hold on the field for a soft drone, or tap Flow for hands-free motion.</p>
              <button
                className="mw-button primary"
                onClick={(event) => {
                  event.stopPropagation();
                  startAudio();
                }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                Tap to Begin
              </button>
            </div>
          </div>
        )}
      </div>

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
          <button className="mw-edge-btn" onClick={copyLink}>
            {copyStatus === 'copied' ? 'Copied' : copyStatus === 'failed' ? 'Failed' : 'Share'}
          </button>
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
          font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
          background:
            radial-gradient(circle at 18% 18%, var(--halo), transparent 28%),
            radial-gradient(circle at 82% 24%, rgba(255,255,255,0.06), transparent 22%),
            linear-gradient(180deg, var(--bg-top) 0%, var(--bg-bottom) 100%);
        }
        .mw-backdrop {
          position: absolute;
          inset: -10%;
          background:
            radial-gradient(circle at 50% 42%, rgba(255,255,255,0.03), transparent 26%),
            linear-gradient(120deg, rgba(255,255,255,0.03), transparent 30%);
          filter: blur(12px);
          transform: scale(1.1);
          pointer-events: none;
        }
        .mw-stage { position: absolute; inset: 0; cursor: none; touch-action: none; }
        .mw-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
        .mw-cursor {
          position: absolute;
          top: 0;
          left: 0;
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.96);
          pointer-events: none;
          transition: opacity 0.25s ease, box-shadow 0.35s ease;
          transform: translate3d(-120px, -120px, 0);
        }
        .mw-guide {
          position: absolute;
          top: 126px;
          left: 50%;
          transform: translateX(-50%);
          max-width: min(560px, calc(100% - 40px));
          padding: 12px 18px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: rgba(8,15,24,0.66);
          backdrop-filter: blur(18px);
          color: var(--muted);
          font-size: 11px;
          text-align: center;
          letter-spacing: 0.04em;
          z-index: 10;
        }
        .mw-prompt-wrap {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          pointer-events: none;
          z-index: 20;
        }
        .mw-prompt {
          width: min(520px, 100%);
          padding: 26px;
          border-radius: 28px;
          text-align: center;
          pointer-events: auto;
          border: 1px solid var(--border);
          background: linear-gradient(180deg, rgba(255,255,255,0.06), var(--surface));
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          box-shadow: 0 26px 54px rgba(0,0,0,0.26);
        }
        .mw-prompt h2 {
          margin: 10px 0 8px;
          font-family: Georgia, "Times New Roman", serif;
          font-weight: 600;
          letter-spacing: 0.02em;
          font-size: clamp(32px, 6vw, 48px);
          line-height: 0.98;
        }
        .mw-prompt p {
          margin: 0 0 20px;
          color: var(--muted);
          line-height: 1.55;
          font-size: 13px;
        }
        .mw-prompt .mw-label {
          color: var(--muted);
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .mw-prompt .mw-button.primary {
          min-height: 48px;
          padding: 0 14px;
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05));
          color: var(--text);
          border: 1px solid var(--border);
          font: inherit;
          cursor: pointer;
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
      `}</style>
    </div>
  );
}
