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

  const stageRef = useRef(null);
  const mainCanvasRef = useRef(null);
  const glowCanvasRef = useRef(null);
  const cursorRef = useRef(null);
  const boundingRef = useRef(null);

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
  const linesRef = useRef([]);
  const lineXRef = useRef([]);
  const lastLineRef = useRef(-1);
  const lastNoteTimeRef = useRef(0);
  const glowsRef = useRef([]);
  const particlesRef = useRef([]);
  const timeRef = useRef(0);
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
    [mainCanvasRef, glowCanvasRef].forEach((ref) => {
      if (!ref.current) return;
      ref.current.width = rect.width;
      ref.current.height = rect.height;
    });
  }, []);

  const initLines = useCallback(() => {
    if (!boundingRef.current) return;

    const { width, height } = boundingRef.current;
    const xGap = 12;
    const yGap = 8;
    const totalLines = Math.ceil((width + 220) / xGap);
    const totalPoints = Math.ceil((height + 40) / yGap);
    const xStart = (width - xGap * totalLines) / 2;
    const yStart = (height - yGap * totalPoints) / 2;

    linesRef.current = [];
    lineXRef.current = [];

    for (let line = 0; line < totalLines; line += 1) {
      const x = xStart + xGap * line;
      const points = [];
      lineXRef.current.push(x);

      for (let point = 0; point < totalPoints; point += 1) {
        points.push({
          x,
          y: yStart + yGap * point,
          wave: { x: 0, y: 0 },
          cursor: { x: 0, y: 0, vx: 0, vy: 0 },
        });
      }

      linesRef.current.push(points);
    }
  }, []);

  const spawnParticles = useCallback((x, y, color, count) => {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.35 + Math.random() * 1.6;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.2,
        life: 1,
        color,
        size: 1 + Math.random() * 2,
      });
    }
  }, []);

  const glowLine = useCallback((lineIndex, zone, intensity = 1) => {
    glowsRef.current.push({ lineIndex, zone, intensity });
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
      const positions = lineXRef.current;
      const mouse = mouseRef.current;
      const yRatio = clamp(mouse.y / Math.max(1, rect.height), 0, 1);
      const zone = getZone(yRatio);
      const notes = scaleNotesRef.current[zone];

      if (!notes || !notes.length) return;

      let closest = -1;
      let distance = Infinity;

      for (let i = 0; i < positions.length; i += 1) {
        const nextDistance = Math.abs(clamp(clientX - rect.left, 0, rect.width) - positions[i]);
        if (nextDistance < distance) {
          distance = nextDistance;
          closest = i;
        }
      }

      if (closest === lastLineRef.current || distance > 16) return;
      if (Tone.now() - lastNoteTimeRef.current < 0.05) return;

      lastLineRef.current = closest;
      lastNoteTimeRef.current = Tone.now();
      setCurrentZone(zone);

      const noteIndex = clamp(
        Math.floor((closest / Math.max(1, positions.length - 1)) * (notes.length - 1)),
        0,
        notes.length - 1
      );
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

      glowLine(closest, zone, 1.1 + bloom * 0.5);
      spawnParticles(positions[closest], mouse.y, themeRef.current.zoneColors[zone], 3 + Math.floor(speed * 0.05));
    },
    [glowLine, spawnParticles]
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
    const lineIndex = clamp(
      Math.floor((noteIndex / Math.max(1, notes.length - 1)) * (lineXRef.current.length - 1)),
      0,
      lineXRef.current.length - 1
    );
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
    glowLine(lineIndex, zone, 0.85);

    if (lineXRef.current[lineIndex] !== undefined) {
      spawnParticles(
        lineXRef.current[lineIndex],
        rect.height * (0.24 + Math.random() * 0.5),
        activeMood.zoneColors[zone],
        2
      );
    }

    if (step === pattern.length - 1) flowRef.current.direction *= -1;
    flowRef.current.step += 1;
  }, [glowLine, spawnParticles]);

  const movePoints = useCallback((time) => {
    const noise = noiseRef.current;
    if (!noise) return;

    const mouse = mouseRef.current;
    timeRef.current = time;

    linesRef.current.forEach((points) => {
      points.forEach((point) => {
        const drift = noise((point.x + time * 0.015) * 0.004, (point.y + time * 0.01) * 0.003) * 11;
        point.wave.x = Math.cos(drift) * 16;
        point.wave.y = Math.sin(drift) * 8;

        const dx = point.x - mouse.sx;
        const dy = point.y - mouse.sy;
        const distance = Math.hypot(dx, dy);
        const influence = Math.max(190, mouse.vs * 1.4);

        if (distance < influence) {
          const strength = 1 - distance / influence;
          const force = Math.cos(distance * 0.0015) * strength;
          point.cursor.vx += Math.cos(mouse.a) * force * influence * mouse.vs * 0.00036;
          point.cursor.vy += Math.sin(mouse.a) * force * influence * mouse.vs * 0.00036;
        }

        point.cursor.vx += -point.cursor.x * 0.012;
        point.cursor.vy += -point.cursor.y * 0.012;
        point.cursor.vx *= 0.935;
        point.cursor.vy *= 0.935;
        point.cursor.x = clamp(point.cursor.x + point.cursor.vx, -55, 55);
        point.cursor.y = clamp(point.cursor.y + point.cursor.vy, -55, 55);
      });
    });
  }, []);

  const movedPoint = useCallback((point, includeCursor = true) => {
    return {
      x: point.x + point.wave.x + (includeCursor ? point.cursor.x : 0),
      y: point.y + point.wave.y + (includeCursor ? point.cursor.y : 0),
    };
  }, []);

  const drawFrame = useCallback(() => {
    const mainCtx = mainCanvasRef.current?.getContext("2d");
    const glowCtx = glowCanvasRef.current?.getContext("2d");
    if (!mainCtx || !glowCtx || !boundingRef.current) return;

    const theme = themeRef.current;
    const { width, height } = boundingRef.current;
    const lines = linesRef.current;
    const glows = glowsRef.current;
    const t = timeRef.current * 0.0002;

    mainCtx.clearRect(0, 0, width, height);
    glowCtx.clearRect(0, 0, width, height);

    for (let i = glows.length - 1; i >= 0; i -= 1) {
      glows[i].intensity *= 0.92;
      if (glows[i].intensity < 0.02) glows.splice(i, 1);
    }

    const glowMap = {};
    const zoneMap = {};

    glows.forEach((glow) => {
      for (let offset = -10; offset <= 10; offset += 1) {
        const index = glow.lineIndex + offset;
        if (index < 0 || index >= lines.length) continue;
        const falloff = glow.intensity * (1 - Math.abs(offset) / 11);
        if (!glowMap[index] || falloff > glowMap[index]) {
          glowMap[index] = falloff;
          zoneMap[index] = glow.zone;
        }
      }
    });

    lines.forEach((points, lineIndex) => {
      if (points.length < 2) return;
      const glow = glowMap[lineIndex] || 0;
      const zone = zoneMap[lineIndex];
      const hue =
        theme.baseHue +
        Math.sin(lineIndex * 0.08 + t * 2.5) * theme.hueSwing +
        (lineIndex / Math.max(1, lines.length - 1)) * theme.hueDrift;

      if (glow > 0.05 && zone) {
        mainCtx.strokeStyle = colorWithAlpha(theme.zoneColors[zone], 0.18 + glow * 0.42);
        mainCtx.lineWidth = 0.9 + glow * 1.5;
      } else {
        mainCtx.strokeStyle = `hsla(${hue}, ${theme.baseSaturation}%, ${theme.baseLightness}%, ${theme.baseAlpha})`;
        mainCtx.lineWidth = 0.75;
      }

      mainCtx.beginPath();
      const first = movedPoint(points[0], false);
      mainCtx.moveTo(first.x, first.y);
      for (let i = 1; i < points.length; i += 1) {
        const point = movedPoint(points[i]);
        mainCtx.lineTo(point.x, point.y);
      }
      mainCtx.stroke();
    });

    glows.forEach((glow) => {
      const x = lineXRef.current[glow.lineIndex];
      if (x === undefined || !glow.zone) return;
      const color = theme.zoneColors[glow.zone];
      const radius = 70 * (0.75 + glow.intensity * 0.35);
      const gradient = glowCtx.createRadialGradient(x, height / 2, 0, x, height / 2, radius);
      gradient.addColorStop(0, colorWithAlpha(color, glow.intensity * 0.18));
      gradient.addColorStop(0.45, colorWithAlpha(color, glow.intensity * 0.08));
      gradient.addColorStop(1, colorWithAlpha(color, 0));
      glowCtx.fillStyle = gradient;
      glowCtx.fillRect(x - radius, 0, radius * 2, height);
    });

    mainCtx.globalCompositeOperation = "lighter";
    for (let i = particlesRef.current.length - 1; i >= 0; i -= 1) {
      const particle = particlesRef.current[i];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.014;
      particle.vx *= 0.99;
      particle.life -= 0.02;
      if (particle.life <= 0) {
        particlesRef.current.splice(i, 1);
        continue;
      }
      mainCtx.fillStyle = colorWithAlpha(particle.color, particle.life * 0.36);
      mainCtx.beginPath();
      mainCtx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
      mainCtx.fill();
    }
    mainCtx.globalCompositeOperation = "source-over";
  }, [movedPoint]);

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

      movePoints(time);
      drawFrame();

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${mouse.sx - 5}px, ${mouse.sy - 5}px, 0)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [drawFrame, movePoints]
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
    lastLineRef.current = -1;
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
      lastLineRef.current = -1;
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

      const lineIndex = clamp(
        Math.floor((noteIndex / Math.max(1, notes.length - 1)) * (lineXRef.current.length - 1)),
        0,
        lineXRef.current.length - 1
      );
      glowLine(lineIndex, zone, 0.65);
      idleStepRef.current += 1;
    }, mood.audio.idleEvery);

    return () => clearInterval(intervalId);
  }, [audioStarted, droneActive, flowEnabled, glowLine, graphVersion, mood.audio.idleEvery]);

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
    initLines();

    const handleResize = () => {
      initSize();
      initLines();
    };

    window.addEventListener("resize", handleResize);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [initLines, initSize, tick]);

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
        <canvas ref={mainCanvasRef} className="mw-canvas" />
        <canvas ref={glowCanvasRef} className="mw-canvas mw-canvas-glow" />

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

        <header className="mw-header">
          <div className="mw-card mw-top-card">
            <div className="mw-label">Musical Waves</div>
            <h1>{mood.label}</h1>
            <p>{mood.tagline}</p>
            <div className="mw-chip-row">
              <span className="mw-chip">{currentRoot}</span>
              <span className="mw-chip">{SCALES[currentScale].label}</span>
              <span className="mw-chip">{ZONES[currentZone].label}</span>
            </div>
          </div>
          <div className="mw-chip-row mw-chip-row-right">
            <span className={`mw-chip ${flowActive ? "active" : ""}`}>Flow {flowActive ? "On" : "Off"}</span>
            <span className={`mw-chip ${droneActive ? "active warm" : ""}`}>Drone {droneActive ? "On" : "Off"}</span>
          </div>
        </header>

        <div className="mw-zone-row">
          {Object.keys(ZONES).map((zone) => (
            <span
              key={zone}
              className={`mw-chip ${currentZone === zone ? "active" : ""}`}
              style={{
                borderColor: currentZone === zone ? colorWithAlpha(mood.zoneColors[zone], 0.38) : "var(--border)",
                color: currentZone === zone ? colorWithAlpha(mood.zoneColors[zone], 1) : "var(--muted)",
              }}
            >
              {ZONES[zone].label}
            </span>
          ))}
        </div>

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

      <aside className="mw-dock">
        <section className="mw-card">
          <div className="mw-label">Mood Presets</div>
          <div className="mw-pill-row">
            {Object.entries(MOODS).map(([key, preset]) => (
              <button
                key={key}
                className={`mw-button ${currentMood === key ? "active" : ""}`}
                onClick={() => applyMood(key)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mw-card">
          <div className="mw-label">Pitch</div>
          <div className="mw-field-row">
            <label className="mw-field">
              <span>Key</span>
              <select value={currentRoot} onChange={changeRoot}>
                {ROOT_OPTIONS.map((root) => (
                  <option key={root} value={root}>
                    {root}
                  </option>
                ))}
              </select>
            </label>
            <button
              className={`mw-button ${showExperimentalScales ? "active" : ""}`}
              onClick={() => setShowExperimentalScales((value) => !value)}
            >
              {showExperimentalScales ? "Safe Only" : "More Colors"}
            </button>
          </div>
          <div className="mw-pill-row">
            {visibleScaleKeys.map((key) => (
              <button
                key={key}
                className={`mw-button ${currentScale === key ? "active" : ""}`}
                onClick={() => changeScale(key)}
              >
                {SCALES[key].label}
              </button>
            ))}
          </div>
        </section>

        <section className="mw-card">
          <div className="mw-label">Scene</div>
          <div className="mw-pill-row">
            <button className={`mw-button ${flowEnabled ? "active" : ""}`} onClick={toggleFlow}>
              Flow
            </button>
            <button className={`mw-button ${droneLatched ? "active warm" : ""}`} onClick={toggleDrone}>
              Drone
            </button>
            <button className="mw-button" onClick={copyLink}>
              {copyStatus === "copied"
                ? "Link Copied"
                : copyStatus === "failed"
                  ? "Copy Failed"
                  : "Share Link"}
            </button>
          </div>
          <p className="mw-note">Flow keeps the field moving on its own. Drone locks in a soft bed while you paint over it.</p>
        </section>
      </aside>

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
        .mw-canvas-glow { mix-blend-mode: screen; pointer-events: none; }
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
        .mw-header {
          position: absolute;
          top: 18px;
          left: 18px;
          right: 18px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          pointer-events: none;
          z-index: 10;
        }
        .mw-card {
          border: 1px solid var(--border);
          background: linear-gradient(180deg, rgba(255,255,255,0.06), var(--surface));
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          box-shadow: 0 26px 54px rgba(0,0,0,0.26);
        }
        .mw-top-card {
          max-width: 420px;
          padding: 16px 18px;
          border-radius: 24px;
        }
        .mw-label {
          color: var(--muted);
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .mw-top-card h1, .mw-prompt h2 {
          margin: 10px 0 8px;
          font-family: Georgia, "Times New Roman", serif;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .mw-top-card h1 { font-size: clamp(28px, 4vw, 40px); line-height: 1; }
        .mw-top-card p, .mw-note, .mw-prompt p {
          margin: 0;
          color: var(--muted);
          line-height: 1.55;
          font-size: 12px;
        }
        .mw-chip-row, .mw-pill-row, .mw-field-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .mw-chip-row { margin-top: 12px; }
        .mw-chip-row-right { justify-content: flex-end; }
        .mw-chip {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.04);
          color: var(--muted);
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .mw-chip.active { color: var(--text); background: rgba(255,255,255,0.1); }
        .mw-chip.warm.active { color: rgba(255,230,205,0.95); }
        .mw-zone-row {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          display: grid;
          gap: 8px;
          z-index: 10;
          pointer-events: none;
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
        }
        .mw-prompt h2 { font-size: clamp(32px, 6vw, 48px); line-height: 0.98; }
        .mw-prompt p { margin-bottom: 20px; font-size: 13px; }
        .mw-dock {
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 18px;
          display: grid;
          grid-template-columns: 1.15fr 1fr 0.95fr;
          gap: 12px;
          z-index: 30;
        }
        .mw-dock .mw-card {
          padding: 16px;
          border-radius: 24px;
          display: grid;
          gap: 12px;
        }
        .mw-field-row { justify-content: space-between; align-items: flex-end; }
        .mw-field { display: grid; gap: 8px; min-width: 110px; }
        .mw-field span { color: var(--muted); font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; }
        .mw-field select {
          min-height: 42px;
          padding: 0 14px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.05);
          color: var(--text);
          font: inherit;
        }
        .mw-button {
          min-height: 40px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.04);
          color: var(--muted);
          font: inherit;
          cursor: pointer;
          transition: transform 0.18s ease, border-color 0.18s ease, color 0.18s ease, background 0.18s ease;
        }
        .mw-button:hover, .mw-button:focus-visible {
          transform: translateY(-1px);
          color: var(--text);
          border-color: var(--border);
          outline: none;
        }
        .mw-button.active {
          color: var(--text);
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.22);
        }
        .mw-button.warm.active {
          border-color: rgba(255,200,145,0.36);
          color: rgba(255,233,206,0.96);
        }
        .mw-button.primary {
          min-height: 48px;
          background: linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05));
          color: var(--text);
          border-color: var(--border);
        }
        .mw-note { font-size: 11px; }
        @media (max-width: 1120px) {
          .mw-dock { grid-template-columns: 1fr; }
        }
        @media (max-width: 760px) {
          .mw-stage { cursor: default; }
          .mw-header {
            top: 14px;
            left: 14px;
            right: 14px;
            flex-direction: column;
            align-items: stretch;
          }
          .mw-zone-row {
            top: auto;
            left: 14px;
            right: 14px;
            bottom: 228px;
            transform: none;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .mw-guide {
            top: 122px;
            border-radius: 24px;
            font-size: 11px;
          }
          .mw-dock {
            left: 14px;
            right: 14px;
            bottom: 14px;
          }
          .mw-dock .mw-card, .mw-prompt { padding: 14px; }
        }
      `}</style>
    </div>
  );
}
