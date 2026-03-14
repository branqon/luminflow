// preview-entry.jsx
import React2 from "react";
import { createRoot } from "react-dom/client";

// musical-waves-v2.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";
import { jsx, jsxs } from "react/jsx-runtime";
var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
var SCALES = {
  pentatonic: { intervals: [0, 2, 4, 7, 9], label: "Pentatonic", safe: true },
  dorian: { intervals: [0, 2, 3, 5, 7, 9, 10], label: "Dorian", safe: true },
  minor: { intervals: [0, 2, 3, 5, 7, 8, 10], label: "Natural Minor", safe: true },
  phrygian: { intervals: [0, 1, 3, 5, 7, 8, 10], label: "Phrygian", safe: false },
  wholeTone: { intervals: [0, 2, 4, 6, 8, 10], label: "Whole Tone", safe: false }
};
var SAFE_SCALE_KEYS = Object.keys(SCALES).filter((key) => SCALES[key].safe);
var EXPERIMENTAL_SCALE_KEYS = Object.keys(SCALES).filter((key) => !SCALES[key].safe);
var ZONES = {
  crystal: { octaves: [4, 6], label: "Crystal" },
  pluck: { octaves: [3, 5], label: "Pluck" },
  sub: { octaves: [1, 3], label: "Sub" }
};
var SPLAT_SCALE = {
  crystal: { radius: 0.5, intensity: 1.4, velocityMul: 1.5 },
  pluck: { radius: 1, intensity: 1, velocityMul: 1 },
  sub: { radius: 2, intensity: 0.6, velocityMul: 0.5 }
};
var MOODS = {
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
      sub: [106, 151, 216]
    },
    flowPattern: [0, 2, 4, 2, 1, 3],
    idlePattern: [0, 3, 1, 4],
    audio: {
      // Ethereal, spacious, meditative — lots of reverb and chorus shimmer
      crystalOsc: { type: "fatsine", spread: 22, count: 3 },
      pluckOsc: { type: "triangle" },
      subOsc: { type: "sine" },
      droneOsc: { type: "fatsine", spread: 12, count: 2 },
      reverbDecay: 9.5,
      reverbWet: 0.7,
      delayTime: "4n.",
      feedback: 0.22,
      delayWet: 0.18,
      chorusFrequency: 0.4,
      chorusDepth: 0.45,
      chorusWet: 0.28,
      filterFrequency: 3200,
      crystalVolume: -22,
      crystalAttack: 0.01,
      crystalDecay: 0.6,
      crystalSustain: 0.04,
      crystalRelease: 3.5,
      pluckVolume: -18,
      pluckAttack: 0.03,
      pluckDecay: 0.35,
      pluckSustain: 0.02,
      pluckRelease: 2,
      subVolume: -18,
      subAttack: 0.12,
      subDecay: 0.8,
      subSustain: 0.3,
      subRelease: 4.5,
      droneVolume: -24,
      droneAttack: 2.5,
      droneRelease: 6,
      flowInterval: 420,
      flowVelocity: 0.16,
      flowDuration: "4n",
      idleEvery: 5500
    },
    fluid: {
      viscosity: 0.1,
      diffusion: 0.8,
      curl: 0.1,
      pressure: 0.6,
      splatRadius: 4e-3,
      dissipation: 0.97,
      bloomIntensity: 0.3,
      idleForce: 0.05,
      idleMode: "drift",
      noteSplatScale: { crystal: 0.6, pluck: 1, sub: 1.8 }
    }
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
      sub: [134, 138, 214]
    },
    flowPattern: [0, 1, 3, 4, 2, 1, 0, 3],
    idlePattern: [0, 2, 4, 1],
    audio: {
      // Mysterious, ghostly, echo-heavy — lots of delay feedback, detuned oscillators
      crystalOsc: { type: "fmsine", modulationIndex: 3, harmonicity: 2.5 },
      pluckOsc: { type: "fatsawtooth", spread: 8, count: 2 },
      subOsc: { type: "fatsine", spread: 6, count: 2 },
      droneOsc: { type: "fatsine", spread: 20, count: 3 },
      reverbDecay: 6.5,
      reverbWet: 0.5,
      delayTime: "4n",
      feedback: 0.35,
      delayWet: 0.3,
      chorusFrequency: 1.2,
      chorusDepth: 0.55,
      chorusWet: 0.35,
      filterFrequency: 3800,
      crystalVolume: -24,
      crystalAttack: 5e-3,
      crystalDecay: 0.3,
      crystalSustain: 0.06,
      crystalRelease: 2.2,
      pluckVolume: -20,
      pluckAttack: 0.05,
      pluckDecay: 0.18,
      pluckSustain: 0.04,
      pluckRelease: 1.4,
      subVolume: -19,
      subAttack: 0.18,
      subDecay: 0.7,
      subSustain: 0.35,
      subRelease: 3.8,
      droneVolume: -25,
      droneAttack: 2.8,
      droneRelease: 6.5,
      flowInterval: 200,
      flowVelocity: 0.2,
      flowDuration: "8n",
      idleEvery: 3200
    },
    fluid: {
      viscosity: 0.4,
      diffusion: 0.5,
      curl: 0.6,
      pressure: 0.5,
      splatRadius: 3e-3,
      dissipation: 0.985,
      bloomIntensity: 0.5,
      idleForce: 0.1,
      idleMode: "spiral",
      noteSplatScale: { crystal: 0.5, pluck: 0.9, sub: 1.6 }
    }
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
      sub: [202, 133, 95]
    },
    flowPattern: [0, 2, 1, 4, 2, 3, 1, 0],
    idlePattern: [0, 1, 3, 2],
    audio: {
      // Warm, earthy, intimate — dry and close, less reverb, lower filter
      crystalOsc: { type: "sine" },
      pluckOsc: { type: "triangle" },
      subOsc: { type: "sine" },
      droneOsc: { type: "sine" },
      reverbDecay: 3.5,
      reverbWet: 0.3,
      delayTime: "8n",
      feedback: 0.1,
      delayWet: 0.06,
      chorusFrequency: 0.3,
      chorusDepth: 0.15,
      chorusWet: 0.08,
      filterFrequency: 2200,
      crystalVolume: -23,
      crystalAttack: 0.035,
      crystalDecay: 0.2,
      crystalSustain: 0.01,
      crystalRelease: 1.2,
      pluckVolume: -16,
      pluckAttack: 8e-3,
      pluckDecay: 0.15,
      pluckSustain: 0.02,
      pluckRelease: 0.8,
      subVolume: -15,
      subAttack: 0.08,
      subDecay: 0.4,
      subSustain: 0.2,
      subRelease: 2.5,
      droneVolume: -22,
      droneAttack: 1.2,
      droneRelease: 3.5,
      flowInterval: 220,
      flowVelocity: 0.26,
      flowDuration: "16n",
      idleEvery: 3400
    },
    fluid: {
      viscosity: 0.7,
      diffusion: 0.3,
      curl: 0.2,
      pressure: 0.7,
      splatRadius: 5e-3,
      dissipation: 0.96,
      bloomIntensity: 0.25,
      idleForce: 0.15,
      idleMode: "rain",
      noteSplatScale: { crystal: 0.7, pluck: 1.1, sub: 2 }
    }
  }
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
      showExperimental: false
    };
  }
  const params = new URLSearchParams(window.location.search);
  const mood = MOODS[params.get("m")] ? params.get("m") : "stillWater";
  const scale = SCALES[params.get("s")] ? params.get("s") : MOODS[mood].defaultScale;
  const root = NOTE_NAMES.includes(params.get("k")) ? params.get("k") : MOODS[mood].defaultRoot;
  return {
    mood,
    scale,
    root,
    flowEnabled: params.get("f") === "1",
    showExperimental: params.get("x") === "1" || !SCALES[scale].safe
  };
}
function MusicalWavesV2() {
  const initialStateRef = useRef(readInitialState());
  const [audioStarted, setAudioStarted] = useState(false);
  const [introPhase, setIntroPhase] = useState("black");
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
  const [moodTransition, setMoodTransition] = useState(null);
  const [volume, setVolume] = useState(-12);
  const [copyStatus, setCopyStatus] = useState("idle");
  const [cursorVisible, setCursorVisible] = useState(false);
  const [pointerDown, setPointerDown] = useState(false);
  const [graphVersion, setGraphVersion] = useState(0);
  const [webglAvailable, setWebglAvailable] = useState(true);
  const webglTriedRef = useRef(false);
  const activeEdgeRef = useRef(null);
  const [activeEdge, setActiveEdge] = useState(null);
  const edgeThreshold = 80;
  const hasUrlParams = useRef(
    typeof window !== "undefined" && window.location.search.includes("m=")
  );
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const introRef = useRef(null);
  const cursorRef = useRef(null);
  const phantomCursorRef = useRef(null);
  const [dronePosition, setDronePosition] = useState(null);
  const boundingRef = useRef(null);
  const fluidSimRef = useRef(null);
  const lastFrameTimeRef = useRef(performance.now());
  const audioReadyRef = useRef(false);
  const synthsRef = useRef({});
  const droneSynthRef = useRef(null);
  const fxRef = useRef({});
  const scaleNotesRef = useRef({});
  const flowRef = useRef({ intervalId: null, step: 0, direction: 1 });
  const flowPinnedRef = useRef(null);
  const droneNoteRef = useRef(null);
  const droneSigRef = useRef("");
  const droneChangeRef = useRef(0);
  const pointerDownRef = useRef(false);
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
    set: false
  });
  const mood = MOODS[currentMood];
  const visibleScaleKeys = showExperimentalScales ? [...SAFE_SCALE_KEYS, ...EXPERIMENTAL_SCALE_KEYS] : SAFE_SCALE_KEYS;
  const introInteractive = introPhase === "invite" || introPhase === "ripple";
  const volumeLabel = `${volume} dB`;
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
      sub: buildScaleNotes(scaleKey, rootKey, ...ZONES.sub.octaves)
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
    flowPinnedRef.current = null;
    setFlowActive(false);
  }, []);
  const disposeAudio = useCallback(() => {
    stopFlow();
    stopDrone();
    audioReadyRef.current = false;
    const nodes = [
      ...Object.values(synthsRef.current),
      droneSynthRef.current,
      ...Object.values(fxRef.current)
    ];
    nodes.forEach((node) => {
      if (!node) return;
      try {
        node.releaseAll?.();
      } catch (error) {
      }
      try {
        node.dispose?.();
      } catch (error) {
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
        release: 0.28
      }).connect(limiter);
      const filter = new Tone.Filter({
        type: "lowpass",
        frequency: settings.filterFrequency,
        rolloff: -12,
        Q: 0.35
      }).connect(compressor);
      const reverb = new Tone.Reverb({
        decay: settings.reverbDecay,
        wet: settings.reverbWet
      }).connect(filter);
      const delay = new Tone.FeedbackDelay({
        delayTime: settings.delayTime,
        feedback: settings.feedback,
        wet: settings.delayWet
      }).connect(reverb);
      const chorus = new Tone.Chorus({
        frequency: settings.chorusFrequency,
        delayTime: 3.2,
        depth: settings.chorusDepth,
        wet: settings.chorusWet
      }).start().connect(delay);
      const crystal = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 8,
        options: {
          oscillator: settings.crystalOsc || { type: "fatsine", spread: 18, count: 3 },
          envelope: {
            attack: settings.crystalAttack,
            decay: settings.crystalDecay || 0.42,
            sustain: settings.crystalSustain || 0.08,
            release: settings.crystalRelease
          },
          volume: settings.crystalVolume
        }
      }).connect(chorus);
      const pluck = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 8,
        options: {
          oscillator: settings.pluckOsc || { type: "triangle" },
          envelope: {
            attack: settings.pluckAttack || 0.04,
            decay: settings.pluckDecay || 0.24,
            sustain: settings.pluckSustain || 0.03,
            release: settings.pluckRelease
          },
          volume: settings.pluckVolume
        }
      }).connect(delay);
      const sub = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 10,
        options: {
          oscillator: settings.subOsc || { type: "sine" },
          envelope: {
            attack: settings.subAttack || 0.15,
            decay: settings.subDecay || 0.55,
            sustain: settings.subSustain || 0.26,
            release: settings.subRelease
          },
          volume: settings.subVolume
        }
      }).connect(reverb);
      const drone = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 4,
        options: {
          oscillator: settings.droneOsc || { type: "sine" },
          envelope: {
            attack: settings.droneAttack,
            decay: 1.1,
            sustain: 0.78,
            release: settings.droneRelease
          },
          volume: settings.droneVolume
        }
      }).connect(reverb);
      synthsRef.current = { crystal, pluck, sub };
      droneSynthRef.current = drone;
      fxRef.current = { limiter, compressor, filter, reverb, delay, chorus };
      await reverb.ready;
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
      const dpr = window.devicePixelRatio || 1;
      canvasRef.current.width = rect.width * dpr;
      canvasRef.current.height = rect.height * dpr;
      if (!fluidSimRef.current && !webglTriedRef.current) {
        webglTriedRef.current = true;
        fluidSimRef.current = new window.FluidSim();
        const success = fluidSimRef.current.init(canvasRef.current);
        if (!success) {
          setWebglAvailable(false);
          fluidSimRef.current = null;
        }
      }
      if (fluidSimRef.current) {
        fluidSimRef.current.resize(rect.width * dpr, rect.height * dpr);
        fluidSimRef.current.setMoodParams(themeRef.current.fluid);
      }
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
    const color = themeRef.current.zoneColors[zone].map((c) => c / 255);
    const scale = SPLAT_SCALE[zone] || SPLAT_SCALE.pluck;
    const noteScale = fluid.noteSplatScale?.[zone] || 1;
    const radius = fluid.splatRadius * scale.radius * noteScale;
    const adjustedColor = color.map((c) => Math.min(c * scale.intensity, 1));
    sim.addSplat(
      x / rect.width,
      1 - y / rect.height,
      dx * 1e-3 * scale.velocityMul,
      -dy * 1e-3 * scale.velocityMul,
      adjustedColor,
      radius
    );
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
      notes[clamp(idx + 4, 0, notes.length - 1)]
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
        setDronePosition({ x: mouseRef.current.sx, y: mouseRef.current.sy });
      } catch (error) {
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
      const mouse = mouseRef.current;
      const yRatio = clamp(y / Math.max(1, rect.height), 0, 1);
      const zone = getZone(yRatio);
      const notes = scaleNotesRef.current[zone];
      if (!notes || !notes.length) return;
      const NOTE_GAP = { crystal: 0.03, pluck: 0.08, sub: 0.2 };
      if (Tone.now() - lastNoteTimeRef.current < (NOTE_GAP[zone] || 0.05)) return;
      lastNoteTimeRef.current = Tone.now();
      setCurrentZone(zone);
      const xRatio = clamp(x / Math.max(1, rect.width), 0, 1);
      const noteIndex = clamp(Math.floor(xRatio * (notes.length - 1)), 0, notes.length - 1);
      const note = notes[noteIndex];
      const synth = synthsRef.current[zone];
      if (!synth) return;
      const dragSpeed = clamp(mouse.vs, 0, 90);
      let velocity, duration;
      if (zone === "crystal") {
        velocity = 0.15 + (1 - yRatio) * 0.25 + clamp(dragSpeed * 2e-3, 0, 0.08);
        duration = 0.12;
      } else if (zone === "pluck") {
        velocity = 0.12 + (1 - yRatio) * 0.23;
        duration = 0.1 + (1 - clamp(dragSpeed / 80, 0, 1)) * 0.4;
      } else {
        velocity = 0.1 + (1 - yRatio) * 0.18;
        duration = 0.3;
      }
      try {
        synth.triggerAttackRelease(note, duration, Tone.now(), velocity);
        if (zone === "sub" && noteIndex > 0) {
          const scaleSize = SCALES[currentScale].intervals.length;
          const subIndex = clamp(noteIndex - scaleSize, 0, notes.length - 1);
          if (subIndex !== noteIndex) {
            synth.triggerAttackRelease(notes[subIndex], duration, Tone.now(), velocity * 0.6);
          }
        }
      } catch (error) {
      }
      injectSplat(mouse.x, mouse.y, mouse.x - mouse.lx, mouse.y - mouse.ly, zone);
    },
    [currentScale, injectSplat]
  );
  const runFlowStep = useCallback(() => {
    if (!audioReadyRef.current || !boundingRef.current) return;
    const activeMood = themeRef.current;
    const rect = boundingRef.current;
    let xRatio, yRatio;
    if (flowPinnedRef.current) {
      xRatio = clamp(flowPinnedRef.current.x / Math.max(1, rect.width), 0, 1);
      yRatio = clamp(flowPinnedRef.current.y / Math.max(1, rect.height), 0, 1);
    } else if (mouseRef.current.set) {
      xRatio = clamp(mouseRef.current.x / Math.max(1, rect.width), 0, 1);
      yRatio = clamp(mouseRef.current.y / Math.max(1, rect.height), 0, 1);
    } else {
      xRatio = 0.5 + Math.sin(Date.now() * 25e-5) * 0.18;
      yRatio = 0.48 + Math.sin(Date.now() * 18e-5) * 0.08;
    }
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
      phantomCursorRef.current.style.transform = `translate3d(${px}px, ${py}px, 0)`;
    }
    if (step === pattern.length - 1) flowRef.current.direction *= -1;
    flowRef.current.step += 1;
  }, [injectSplat]);
  const drawFrame = useCallback(() => {
    const sim = fluidSimRef.current;
    if (!sim || !boundingRef.current) return;
    const now2 = performance.now();
    const dt = Math.min((now2 - lastFrameTimeRef.current) / 1e3, 0.033);
    lastFrameTimeRef.current = now2;
    sim.step(dt);
    const fluid = themeRef.current.fluid;
    const idleColor = themeRef.current.zoneColors.pluck.map((c) => c / 255 * 0.3);
    if (fluid.idleMode === "drift") {
      sim.addSplat(0.1, 0.5, fluid.idleForce, 0, idleColor, 0.01);
    } else if (fluid.idleMode === "spiral") {
      const t = performance.now() * 5e-4;
      const cx = 0.5 + Math.cos(t) * 0.2;
      const cy = 0.5 + Math.sin(t) * 0.2;
      sim.addSplat(cx, cy, Math.cos(t + Math.PI / 2) * fluid.idleForce, Math.sin(t + Math.PI / 2) * fluid.idleForce, idleColor, 8e-3);
    } else if (fluid.idleMode === "rain") {
      if (Math.random() < 0.033) {
        const rx = Math.random();
        sim.addSplat(rx, 0.95, 0, -fluid.idleForce * 2, idleColor, 6e-3);
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
        cursorRef.current.style.transform = `translate3d(${mouse.sx}px, ${mouse.sy}px, 0)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [drawFrame]
  );
  const audioStartingRef = useRef(false);
  const startAudio = useCallback(async () => {
    if (audioStarted || audioStartingRef.current) return;
    audioStartingRef.current = true;
    try {
      await Tone.start();
      rebuildNotes(currentScale, currentRoot);
      await buildAudioGraph(currentMood);
      setAudioStarted(true);
      setIntroPhase("playing");
    } finally {
      audioStartingRef.current = false;
    }
  }, [audioStarted, buildAudioGraph, currentMood, currentRoot, currentScale, rebuildNotes]);
  const activateIntro = useCallback(async (clientX, clientY) => {
    await startAudio();
    if (fluidSimRef.current && boundingRef.current) {
      const rect = boundingRef.current;
      const splashX = typeof clientX === "number" ? clientX : rect.left + rect.width * 0.5;
      const splashY = typeof clientY === "number" ? clientY : rect.top + rect.height * 0.5;
      const color = themeRef.current.zoneColors.pluck.map((c) => c / 255);
      fluidSimRef.current.addSplat(
        (splashX - rect.left) / rect.width,
        1 - (splashY - rect.top) / rect.height,
        0,
        0,
        color,
        0.015
      );
    }
  }, [startAudio]);
  const moodTransitionRef = useRef(false);
  const applyMood = useCallback(async (key) => {
    if (key === currentMood || moodTransitionRef.current) return;
    moodTransitionRef.current = true;
    setMoodTransition("draining");
    await new Promise((r) => setTimeout(r, 800));
    setMoodTransition("dark");
    rebuildNotes(MOODS[key].defaultScale, MOODS[key].defaultRoot);
    setCurrentMood(key);
    setCurrentScale(MOODS[key].defaultScale);
    setCurrentRoot(MOODS[key].defaultRoot);
    setShowExperimentalScales(!SCALES[MOODS[key].defaultScale].safe);
    if (audioStarted) {
      await buildAudioGraph(key);
    }
    fluidSimRef.current?.setMoodParams(MOODS[key].fluid);
    setMoodTransition("flooding");
    const color = MOODS[key].zoneColors.pluck.map((c) => c / 255);
    fluidSimRef.current?.addSplat(0.5, 0.5, 0, 0, color, 0.02);
    await new Promise((r) => setTimeout(r, 600));
    setMoodTransition(null);
    moodTransitionRef.current = false;
    lastInteractionRef.current = Date.now();
  }, [currentMood, audioStarted, buildAudioGraph, rebuildNotes]);
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
    activeEdgeRef.current = "top";
    setActiveEdge("top");
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
    setPointerDown(false);
  }, []);
  const onPointerDown = useCallback(
    async (event) => {
      event.preventDefault();
      const target = event.currentTarget;
      const pointerId = event.pointerId;
      const button = event.button;
      const pointerType = event.pointerType;
      lastInteractionRef.current = Date.now();
      updateMouse(event.clientX, event.clientY);
      if (pointerType === "mouse") setCursorVisible(true);
      if (!audioStarted) await startAudio();
      if (button === 2) {
        if (droneLatched) {
          stopDrone();
          setDroneLatched(false);
        } else {
          setDroneLatched(true);
          startDrone("latched");
        }
        return;
      }
      if (button !== 0) return;
      if (flowActive) {
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        if (flowPinnedRef.current) {
          const dist = Math.hypot(mx - flowPinnedRef.current.x, my - flowPinnedRef.current.y);
          if (dist < 40) {
            flowPinnedRef.current = null;
            return;
          }
        } else {
          flowPinnedRef.current = { x: mx, y: my };
        }
      }
      pointerDownRef.current = true;
      setPointerDown(true);
      triggerNote(mouseRef.current.x, mouseRef.current.y);
      target?.setPointerCapture?.(pointerId);
    },
    [audioStarted, droneLatched, flowActive, startAudio, startDrone, stopDrone, triggerNote, updateMouse]
  );
  const onPointerMove = useCallback(
    (event) => {
      if (event.pointerType === "mouse") setCursorVisible(true);
      else setCursorVisible(false);
      lastInteractionRef.current = Date.now();
      updateMouse(event.clientX, event.clientY);
      if (!boundingRef.current) return;
      setCurrentZone(
        getZone(clamp(mouseRef.current.y / Math.max(1, boundingRef.current.height), 0, 1))
      );
      const rect = boundingRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      let edge = null;
      if (my < edgeThreshold) edge = "top";
      else if (my > rect.height - edgeThreshold) edge = "bottom";
      else if (mx < edgeThreshold) edge = "left";
      else if (mx > rect.width - edgeThreshold) edge = "right";
      if (edge !== activeEdgeRef.current) {
        activeEdgeRef.current = edge;
        setActiveEdge(edge);
      }
      if (!pointerDownRef.current) {
        const sim = fluidSimRef.current;
        if (sim) {
          const zone = getZone(clamp(my / Math.max(1, rect.height), 0, 1));
          const color = themeRef.current.zoneColors[zone].map((c) => c / 255 * 0.3);
          const radius = themeRef.current.fluid.splatRadius * 0.5;
          sim.addSplat(
            mx / rect.width,
            1 - my / rect.height,
            (mx - mouseRef.current.lx) * 5e-4,
            -(my - mouseRef.current.ly) * 5e-4,
            color,
            radius
          );
        }
        return;
      }
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
    if (!audioStarted || !audioReadyRef.current) return;
    if (droneLatched) startDrone("latched");
  }, [audioStarted, currentRoot, currentScale, droneLatched, startDrone]);
  useEffect(() => {
    if (!audioStarted || !flowEnabled || !audioReadyRef.current) {
      stopFlow();
      return void 0;
    }
    stopFlow();
    flowRef.current.intervalId = window.setInterval(runFlowStep, mood.audio.flowInterval);
    setFlowActive(true);
    return () => stopFlow();
  }, [audioStarted, flowEnabled, graphVersion, mood.audio.flowInterval, runFlowStep, stopFlow]);
  useEffect(() => {
    if (!audioStarted || !audioReadyRef.current) return void 0;
    const intervalId = window.setInterval(() => {
      if (!audioReadyRef.current || flowEnabled || droneActive) return;
      if (Date.now() - lastInteractionRef.current < 7e3) return;
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
    if (copyStatus === "idle") return void 0;
    const timeoutId = window.setTimeout(() => setCopyStatus("idle"), 1800);
    return () => clearTimeout(timeoutId);
  }, [copyStatus]);
  useEffect(() => {
    if (introPhase === "black") {
      if (hasUrlParams.current) {
        setIntroPhase("ripple");
        return;
      }
      const id = setTimeout(() => setIntroPhase("title"), 1e3);
      return () => clearTimeout(id);
    }
    if (introPhase === "title") {
      const id = setTimeout(() => setIntroPhase("ripple"), 2e3);
      return () => clearTimeout(id);
    }
    if (introPhase === "ripple") {
      if (fluidSimRef.current) {
        const color = themeRef.current.zoneColors.pluck.map((c) => c / 255);
        fluidSimRef.current.addSplat(0.5, 0.5, 0, 1e-3, color, 0.01);
      }
      const id = setTimeout(() => setIntroPhase("invite"), 2e3);
      return () => clearTimeout(id);
    }
  }, [introPhase]);
  useEffect(() => {
    if (!introInteractive) return void 0;
    const handleIntroKey = (event) => {
      if (event.defaultPrevented) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      if (document.activeElement !== introRef.current) return;
      event.preventDefault();
      void activateIntro();
    };
    window.addEventListener("keydown", handleIntroKey);
    return () => window.removeEventListener("keydown", handleIntroKey);
  }, [activateIntro, introInteractive]);
  useEffect(() => {
    initSize();
    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(initSize, 150);
    };
    window.addEventListener("resize", handleResize);
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fluidSimRef.current?.destroy();
    };
  }, [initSize, tick]);
  useEffect(() => {
    return () => disposeAudio();
  }, [disposeAudio]);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Tab") {
        setActiveEdge("all");
        activeEdgeRef.current = "all";
      }
      if (e.key === "Escape") {
        setActiveEdge(null);
        activeEdgeRef.current = null;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "mw-shell",
      style: {
        "--bg-top": mood.background[0],
        "--bg-bottom": mood.background[1],
        "--halo": mood.halo,
        "--surface": mood.surface,
        "--border": mood.border,
        "--text": mood.text,
        "--muted": mood.muted
      },
      children: [
        /* @__PURE__ */ jsxs(
          "div",
          {
            ref: stageRef,
            className: "mw-stage",
            onContextMenu: (event) => event.preventDefault(),
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel: finishPointer,
            onPointerLeave,
            children: [
              /* @__PURE__ */ jsx("canvas", { ref: canvasRef, className: "mw-canvas" }),
              /* @__PURE__ */ jsx("div", { className: "mw-stage-atmosphere", "aria-hidden": "true" }),
              /* @__PURE__ */ jsx(
                "div",
                {
                  ref: cursorRef,
                  className: `mw-cursor ${pointerDown ? "playing" : ""} ${activeEdge ? "edge" : ""}`,
                  style: {
                    opacity: audioStarted && cursorVisible ? 1 : 0,
                    boxShadow: activeEdge ? "none" : `0 0 24px 6px ${colorWithAlpha(mood.zoneColors[currentZone], 0.4)}, 0 0 48px 16px ${colorWithAlpha(mood.zoneColors[currentZone], 0.15)}`
                  }
                }
              ),
              flowActive && /* @__PURE__ */ jsx("div", { ref: phantomCursorRef, className: "mw-cursor mw-cursor-phantom", style: {
                opacity: 0.6,
                boxShadow: `0 0 20px 5px ${colorWithAlpha(mood.zoneColors[currentZone], 0.25)}`
              } }),
              droneActive && dronePosition && /* @__PURE__ */ jsx("div", { className: "mw-drone-ring", style: {
                left: dronePosition.x,
                top: dronePosition.y,
                borderColor: colorWithAlpha(mood.zoneColors[currentZone], 0.3)
              } }),
              introPhase !== "playing" && /* @__PURE__ */ jsxs(
                "div",
                {
                  ref: introRef,
                  className: "mw-intro",
                  role: introInteractive ? "button" : void 0,
                  tabIndex: introInteractive ? 0 : -1,
                  "aria-label": introInteractive ? "Start musical waves" : void 0,
                  onClick: introInteractive ? async (e) => {
                    e.stopPropagation();
                    await activateIntro(e.clientX, e.clientY);
                  } : void 0,
                  onKeyDown: introInteractive ? async (e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    e.stopPropagation();
                    await activateIntro();
                  } : void 0,
                  children: [
                    introPhase === "title" && /* @__PURE__ */ jsxs("div", { className: "mw-intro-title", children: [
                      /* @__PURE__ */ jsx("div", { className: "mw-intro-label", children: "Musical Waves" }),
                      /* @__PURE__ */ jsx("h1", { children: mood.label }),
                      /* @__PURE__ */ jsx("p", { children: mood.tagline })
                    ] }),
                    (introPhase === "ripple" || introPhase === "invite") && /* @__PURE__ */ jsxs("div", { className: "mw-intro-invite", children: [
                      /* @__PURE__ */ jsx("p", { children: "Touch anywhere to begin" }),
                      /* @__PURE__ */ jsxs("div", { className: "mw-intro-hints", "aria-hidden": "true", children: [
                        /* @__PURE__ */ jsx("span", { className: "mw-intro-hint", children: "Drag the surface to play" }),
                        /* @__PURE__ */ jsx("span", { className: "mw-intro-hint", children: "Move to edges for controls" }),
                        /* @__PURE__ */ jsx("span", { className: "mw-intro-hint", children: "Right click or tap Drone to latch" })
                      ] })
                    ] })
                  ]
                }
              )
            ]
          }
        ),
        moodTransition && /* @__PURE__ */ jsx("div", { className: `mw-transition mw-transition-${moodTransition}` }),
        moodTransition === "flooding" && /* @__PURE__ */ jsx("div", { className: "mw-transition-name", children: mood.label }),
        !webglAvailable && /* @__PURE__ */ jsxs("div", { className: "mw-fallback", children: [
          /* @__PURE__ */ jsx("p", { children: "Your browser doesn't support WebGL 2.0, which is needed for the visual effects." }),
          /* @__PURE__ */ jsx("p", { children: "The audio instrument still works \u2014 click or tap anywhere to play." })
        ] }),
        /* @__PURE__ */ jsx("nav", { className: `mw-edge mw-edge-bottom ${activeEdge === "bottom" || activeEdge === "all" ? "visible" : ""}`, "aria-label": "Mood presets", children: /* @__PURE__ */ jsx("div", { className: "mw-edge-content", children: Object.entries(MOODS).map(([key, preset]) => /* @__PURE__ */ jsx(
          "button",
          {
            className: `mw-edge-btn ${currentMood === key ? "active" : ""}`,
            onClick: () => applyMood(key),
            "aria-label": `Mood: ${preset.label}`,
            "aria-pressed": currentMood === key,
            children: preset.label
          },
          key
        )) }) }),
        /* @__PURE__ */ jsx("nav", { className: `mw-edge mw-edge-right ${activeEdge === "right" || activeEdge === "all" ? "visible" : ""}`, "aria-label": "Pitch controls", children: /* @__PURE__ */ jsxs("div", { className: "mw-edge-content", children: [
          /* @__PURE__ */ jsx("select", { value: currentRoot, onChange: changeRoot, className: "mw-edge-select", "aria-label": "Root key", children: NOTE_NAMES.map((root) => /* @__PURE__ */ jsx("option", { value: root, children: root }, root)) }),
          visibleScaleKeys.map((key) => /* @__PURE__ */ jsx(
            "button",
            {
              className: `mw-edge-btn ${currentScale === key ? "active" : ""}`,
              onClick: () => changeScale(key),
              "aria-label": `Scale: ${SCALES[key].label}`,
              "aria-pressed": currentScale === key,
              children: SCALES[key].label
            },
            key
          )),
          /* @__PURE__ */ jsx(
            "button",
            {
              className: `mw-edge-btn ${showExperimentalScales ? "active" : ""}`,
              onClick: () => setShowExperimentalScales((v) => !v),
              "aria-label": showExperimentalScales ? "Show safe scales only" : "Show experimental scales",
              "aria-pressed": showExperimentalScales,
              children: showExperimentalScales ? "Safe Only" : "More Colors"
            }
          )
        ] }) }),
        /* @__PURE__ */ jsx("nav", { className: `mw-edge mw-edge-left ${activeEdge === "left" || activeEdge === "all" ? "visible" : ""}`, "aria-label": "Zone selector", children: /* @__PURE__ */ jsx("div", { className: "mw-edge-content", children: Object.keys(ZONES).map((zone) => /* @__PURE__ */ jsx(
          "button",
          {
            className: `mw-edge-glyph ${currentZone === zone ? "active" : ""}`,
            style: currentZone === zone ? { color: colorWithAlpha(mood.zoneColors[zone], 1) } : {},
            onClick: () => setCurrentZone(zone),
            "aria-label": `Zone: ${ZONES[zone].label}`,
            "aria-pressed": currentZone === zone,
            children: ZONES[zone].label
          },
          zone
        )) }) }),
        /* @__PURE__ */ jsx("nav", { className: `mw-edge mw-edge-top ${activeEdge === "top" || activeEdge === "all" ? "visible" : ""}`, "aria-label": "Scene controls", children: /* @__PURE__ */ jsxs("div", { className: "mw-edge-content", children: [
          /* @__PURE__ */ jsx("button", { className: `mw-edge-btn ${flowEnabled ? "active" : ""}`, onClick: toggleFlow, "aria-label": `Flow mode: ${flowEnabled ? "on" : "off"}`, "aria-pressed": flowEnabled, children: "Flow" }),
          /* @__PURE__ */ jsx("button", { className: `mw-edge-btn ${droneLatched ? "active warm" : ""}`, onClick: toggleDrone, "aria-label": `Drone: ${droneLatched ? "on" : "off"}`, "aria-pressed": droneLatched, children: "Drone" }),
          /* @__PURE__ */ jsxs("label", { className: "mw-volume", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "range",
                min: -40,
                max: 0,
                step: 1,
                value: volume,
                onChange: (e) => setVolume(Number(e.target.value)),
                className: "mw-volume-slider",
                "aria-label": "Volume"
              }
            ),
            /* @__PURE__ */ jsx("span", { className: "mw-volume-value", "aria-hidden": "true", children: volumeLabel })
          ] }),
          /* @__PURE__ */ jsx("button", { className: "mw-edge-btn", onClick: copyLink, "aria-label": "Copy share link", "aria-live": "polite", children: copyStatus === "copied" ? "Copied" : copyStatus === "failed" ? "Failed" : "Share" })
        ] }) }),
        /* @__PURE__ */ jsxs(
          "div",
          {
            className: `mw-watermark ${activeEdge === "left" ? "bright" : ""}`,
            style: { color: mood.muted },
            children: [
              /* @__PURE__ */ jsx("div", { className: "mw-watermark-mood", children: mood.label }),
              /* @__PURE__ */ jsxs("div", { className: "mw-watermark-info", children: [
                currentRoot,
                " ",
                SCALES[currentScale].label,
                " \xB7 ",
                ZONES[currentZone].label
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsx("style", { children: `
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; min-height: 100%; }
        .mw-shell {
          --space-2: 8px;
          --space-3: 12px;
          --space-4: 16px;
          --space-5: 20px;
          --space-6: 28px;
          --radius-pill: 999px;
          --radius-panel: 28px;
          --radius-card: 24px;
          --shadow-soft: 0 20px 60px rgba(0, 0, 0, 0.2);
          --shadow-panel: 0 18px 40px rgba(0, 0, 0, 0.22);
          --motion-fast: 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
          --motion-base: 320ms cubic-bezier(0.22, 1, 0.36, 1);
          position: fixed;
          inset: 0;
          overflow: hidden;
          color: var(--text);
          font-family: 'Inter', system-ui, sans-serif;
          background: linear-gradient(180deg, var(--bg-top) 0%, var(--bg-bottom) 100%);
          user-select: none;
          -webkit-user-select: none;
        }
        .mw-shell::before,
        .mw-shell::after {
          content: "";
          position: absolute;
          pointer-events: none;
        }
        .mw-shell::before {
          inset: -12%;
          background:
            radial-gradient(circle at 18% 22%, var(--halo) 0%, transparent 34%),
            radial-gradient(circle at 78% 16%, rgba(255,255,255,0.08) 0%, transparent 28%),
            radial-gradient(circle at 50% 82%, rgba(255,255,255,0.05) 0%, transparent 26%);
          opacity: 0.95;
        }
        .mw-shell::after {
          inset: 0;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.18) 100%),
            radial-gradient(circle at center, transparent 45%, rgba(0,0,0,0.18) 100%);
          mix-blend-mode: screen;
          opacity: 0.6;
        }
        .mw-stage { position: absolute; inset: 0; cursor: none; touch-action: none; }
        .mw-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
        .mw-stage-atmosphere {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at center, transparent 48%, rgba(0,0,0,0.12) 100%),
            linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 22%, transparent 78%, rgba(0,0,0,0.12) 100%);
          mix-blend-mode: screen;
          opacity: 0.85;
        }
        .mw-cursor {
          position: absolute;
          top: 0; left: 0;
          width: 16px; height: 16px;
          margin-left: -8px;
          margin-top: -8px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 40%, transparent 70%);
          pointer-events: none;
          transition: width var(--motion-fast), height var(--motion-fast), margin var(--motion-fast), opacity var(--motion-fast);
          transform: translate3d(-120px, -120px, 0);
          filter: blur(0.5px);
          will-change: transform;
        }
        .mw-cursor.playing {
          width: 24px; height: 24px;
          margin-left: -12px;
          margin-top: -12px;
        }
        .mw-cursor.edge {
          width: 12px; height: 12px;
          margin-left: -6px;
          margin-top: -6px;
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
          will-change: transform, opacity;
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
          padding: var(--space-5);
          background: linear-gradient(180deg, rgba(5, 11, 18, 0.14) 0%, rgba(5, 10, 16, 0.34) 100%);
        }
        .mw-intro-title, .mw-intro-invite {
          width: min(560px, calc(100vw - 40px));
          padding: clamp(22px, 4vw, 34px);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: var(--radius-card);
          background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%);
          backdrop-filter: blur(22px);
          box-shadow: var(--shadow-soft);
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
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin: 0;
          animation: pulse-soft 3s ease-in-out infinite;
        }
        .mw-intro-hints {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: var(--space-2);
          margin-top: var(--space-5);
        }
        .mw-intro-hint {
          padding: 12px 14px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.045);
          color: var(--muted);
          font-size: 11px;
          letter-spacing: 0.08em;
          line-height: 1.45;
          text-transform: uppercase;
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
          transition: opacity var(--motion-base), transform var(--motion-base);
        }
        .mw-edge.visible, .mw-edge:focus-within {
          opacity: 1;
          pointer-events: auto;
        }
        .mw-edge-top,
        .mw-edge-bottom {
          transform: translateY(6px);
        }
        .mw-edge-top.visible,
        .mw-edge-bottom.visible,
        .mw-edge-top:focus-within,
        .mw-edge-bottom:focus-within {
          transform: translateY(0);
        }
        .mw-edge-left,
        .mw-edge-right {
          transform: translateX(6px);
        }
        .mw-edge-left.visible,
        .mw-edge-right.visible,
        .mw-edge-left:focus-within,
        .mw-edge-right:focus-within {
          transform: translateX(0);
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
          padding: 12px;
          border-radius: var(--radius-panel);
          border: 1px solid rgba(255,255,255,0.08);
          background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
          backdrop-filter: blur(18px) saturate(120%);
          box-shadow: var(--shadow-panel);
        }
        .mw-edge-left .mw-edge-content,
        .mw-edge-right .mw-edge-content {
          flex-direction: column;
          padding: 14px 12px;
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
          transition: transform var(--motion-fast), border-color var(--motion-fast), background var(--motion-fast), color var(--motion-fast), box-shadow var(--motion-fast);
        }
        .mw-edge-btn:hover, .mw-edge-btn:focus-visible {
          color: var(--text);
          border-color: var(--border);
          background: rgba(255,255,255,0.08);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 10px 24px rgba(0,0,0,0.18);
          outline: none;
          transform: translateY(-1px);
        }
        .mw-edge-btn:active {
          transform: translateY(0);
        }
        .mw-edge-btn.active {
          color: var(--text);
          background: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.26);
          box-shadow: 0 10px 26px rgba(0,0,0,0.2);
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
          outline: none;
          transition: border-color var(--motion-fast), box-shadow var(--motion-fast), background var(--motion-fast);
        }
        .mw-edge-select:hover,
        .mw-edge-select:focus-visible {
          border-color: var(--border);
          background: rgba(255,255,255,0.08);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 10px 24px rgba(0,0,0,0.18);
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
          background: linear-gradient(90deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.12) 100%);
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
        .mw-volume-slider::-moz-range-track {
          background: rgba(255,255,255,0.15);
          border-radius: 2px;
          height: 3px;
          border: none;
        }
        .mw-volume-value {
          min-width: 42px;
          color: var(--muted);
          font-size: 11px;
          letter-spacing: 0.08em;
        }
        .mw-edge-glyph {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          background: none;
          border: none;
          padding: 8px 4px;
          cursor: pointer;
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
          animation: fade-in-out 0.6s ease forwards;
        }
        @keyframes fade-in-out {
          0% { opacity: 0; }
          30% { opacity: 1; }
          100% { opacity: 0; }
        }
        .mw-fallback {
          position: absolute;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          max-width: 400px;
          padding: 16px 24px;
          border-radius: var(--radius-card);
          border: 1px solid rgba(255,255,255,0.08);
          background: linear-gradient(180deg, rgba(12, 16, 24, 0.72) 0%, rgba(5, 7, 12, 0.58) 100%);
          backdrop-filter: blur(18px);
          box-shadow: var(--shadow-panel);
          text-align: center;
          z-index: 5;
          pointer-events: none;
        }
        .mw-fallback p {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 13px;
          color: var(--muted);
          margin: 0 0 8px;
          line-height: 1.5;
        }
        .mw-fallback p:last-child { margin: 0; }
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
          .mw-intro { padding: 14px; }
          .mw-intro-title, .mw-intro-invite { width: min(100vw - 28px, 520px); padding: 22px 18px; }
          .mw-intro-hints { grid-template-columns: 1fr; }
          .mw-edge-top, .mw-edge-bottom { height: auto; padding: 12px; }
          .mw-edge-left { width: 74px; padding-left: 12px; }
          .mw-edge-right { width: 168px; padding-right: 12px; }
          .mw-edge-content { gap: 8px; padding: 10px; }
          .mw-edge-btn { min-height: 38px; padding: 0 14px; font-size: 11px; }
          .mw-edge-select { min-height: 40px; width: 100%; }
          .mw-volume { gap: 6px; }
          .mw-volume-slider { width: 72px; }
          .mw-volume-value { min-width: 38px; font-size: 10px; }
          .mw-watermark-mood { font-size: 48px; }
          .mw-watermark-info { font-size: 11px; }
          .mw-intro-title h1 { font-size: clamp(32px, 6vw, 56px); }
        }
      ` })
      ]
    }
  );
}

// preview-entry.jsx
import { jsx as jsx2 } from "react/jsx-runtime";
var rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Missing #root element");
}
createRoot(rootEl).render(/* @__PURE__ */ jsx2(MusicalWavesV2, {}));
