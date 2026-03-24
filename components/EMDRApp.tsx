"use client";

import { useState, useRef, useEffect } from "react";
import AdjustmentsPanel from "./AdjustmentsPanel";

export type SoundMode = "muted" | "beep" | "snap";
export type Speeds = [number, number, number];
export type RepeatCounts = [number | null, number | null];

const DEFAULT_SPEEDS: Speeds = [0.5, 1.5, 0.5];
const DEFAULT_REPEAT_COUNTS: RepeatCounts = [35, 70];

// ─── Audio synthesis ────────────────────────────────────────────────────────

// Short clock-like tick — the metronome icon sound
function playBeep(ctx: AudioContext, dest: AudioNode) {
  const t = ctx.currentTime;
  // Very short high-frequency impulse, like a clock or mechanical metronome tick
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 1200;
  gain.gain.setValueAtTime(0.9, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(t);
  osc.stop(t + 0.015);
}

// Sustained 440 Hz tone — the wave icon sound
function playSnap(ctx: AudioContext, dest: AudioNode) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(dest);
  osc.type = "sine";
  osc.frequency.value = 440; // A4
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0.25, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.start(t);
  osc.stop(t + 0.12);
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 ml-1">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

function IconMute({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-5 h-5 ${active ? "text-gray-900" : "text-gray-400"}`}
    >
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

// Metronome body with swung pendulum — represents the "tick" beat
function IconBeep({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-5 h-5 ${active ? "text-gray-900" : "text-gray-400"}`}
    >
      {/* Trapezoid body */}
      <path d="M5 21h14L15 4H9L5 21z" />
      {/* Pendulum swung to the right */}
      <line x1="12" y1="21" x2="17.5" y2="8" />
      {/* Weight on pendulum */}
      <circle cx="17.5" cy="8" r="1.5" fill="currentColor" stroke="none" />
      {/* Tempo mark on body */}
      <line x1="9" y1="14" x2="14" y2="14" strokeWidth="1.4" />
    </svg>
  );
}

// ECG / heartbeat waveform — represents the tone beat
function IconSnap({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-5 h-5 ${active ? "text-gray-900" : "text-gray-400"}`}
    >
      {/* flat – P bump – QRS spike – T wave – flat */}
      <polyline points="2,12 6,12 7,10 8,12 10,12 11,3 12,21 13,12 15,9 17,12 22,12" />
    </svg>
  );
}

function IconSliders() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="w-5 h-5 text-gray-600"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="9" cy="6" r="2.5" fill="white" stroke="currentColor" />
      <circle cx="15" cy="12" r="2.5" fill="white" stroke="currentColor" />
      <circle cx="9" cy="18" r="2.5" fill="white" stroke="currentColor" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EMDRApp() {
  // Three speed presets; active one is used for playback
  const [speeds, setSpeeds] = useState<Speeds>([...DEFAULT_SPEEDS]);
  const [activeSpeedIdx, setActiveSpeedIdx] = useState(1); // slot 2 (1.5 Hz) active by default

  // Two repeat-count presets; active one is used for playback (null = infinite)
  const [repeatCounts, setRepeatCounts] = useState<RepeatCounts>([...DEFAULT_REPEAT_COUNTS]);
  const [activeRepeatIdx, setActiveRepeatIdx] = useState(0); // slot 1 (35) active by default

  const [soundMode, setSoundMode] = useState<SoundMode>("beep");
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatCount, setRepeatCount] = useState(0);
  const [showAdjustments, setShowAdjustments] = useState(false);

  // DOM refs
  const ballRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Animation refs — always hold the latest values so the rAF loop never stales
  const phaseRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const repeatCountRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const hzRef = useRef(speeds[activeSpeedIdx]);
  const repeatsRef = useRef(repeatCounts[activeRepeatIdx]);
  const soundModeRef = useRef(soundMode);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioDestRef = useRef<AudioNode | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Keep animation refs in sync with state
  useEffect(() => {
    hzRef.current = speeds[activeSpeedIdx];
  }, [speeds, activeSpeedIdx]);

  useEffect(() => {
    repeatsRef.current = repeatCounts[activeRepeatIdx];
  }, [repeatCounts, activeRepeatIdx]);

  useEffect(() => {
    soundModeRef.current = soundMode;
  }, [soundMode]);

  // ─── Audio ──────────────────────────────────────────────────────────────

  function getAudioCtx(): AudioContext {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkitAudioContext)();
      // Route all Web Audio through a MediaStreamDestination → DOM <audio> element.
      // iOS then treats it as media playback (same category as YouTube/Spotify),
      // bypassing the hardware silent switch as long as the volume is up.
      try {
        const streamDest = audioCtxRef.current.createMediaStreamDestination();
        // Silent oscillator keeps stream active → <audio> stays playing →
        // iOS holds AVAudioSessionCategoryPlayback (bypasses silent switch).
        const silentOsc = audioCtxRef.current.createOscillator();
        const silentGain = audioCtxRef.current.createGain();
        silentGain.gain.value = 0;
        silentOsc.connect(silentGain);
        silentGain.connect(streamDest);
        silentOsc.start();
        const el = document.createElement("audio");
        el.setAttribute("playsinline", "");
        el.srcObject = streamDest.stream;
        document.body.appendChild(el);
        audioElRef.current = el;
        // Beeps go to ctx.destination — clean path, no iOS stream processing
        audioDestRef.current = audioCtxRef.current.destination;
      } catch {
        audioDestRef.current = audioCtxRef.current.destination;
      }
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  function getAudioDest(): AudioNode {
    return audioDestRef.current ?? getAudioCtx().destination;
  }

  async function unlockAudio(): Promise<void> {
    const ctx = getAudioCtx();
    // el.play() must be called synchronously before any await to stay within
    // the iOS user gesture window — this upgrades the audio session category.
    if (audioElRef.current) audioElRef.current.play().catch(() => {});
    await ctx.resume(); // wait until context is confirmed "running"
  }

  function triggerSound() {
    if (soundModeRef.current === "muted") return;
    try {
      const ctx = getAudioCtx();
      const dest = getAudioDest();
      if (soundModeRef.current === "beep") playBeep(ctx, dest);
      else playSnap(ctx, dest);
    } catch {
      /* AudioContext not available */
    }
  }

  function previewSound(mode: SoundMode) {
    if (mode === "muted") return;
    unlockAudio().then(() => {
      try {
        const ctx = getAudioCtx();
        const dest = getAudioDest();
        if (mode === "beep") playBeep(ctx, dest);
        else playSnap(ctx, dest);
      } catch {
        /* AudioContext not available */
      }
    });
  }

  // ─── Ball rendering ──────────────────────────────────────────────────────

  function renderBall(phase: number) {
    const ball = ballRef.current;
    const container = containerRef.current;
    if (!ball || !container) return;
    const phaseMod = ((phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const normPos = (1 - Math.cos(phaseMod)) / 2; // 0 = left, 1 = right
    const travelWidth = container.offsetWidth - ball.offsetWidth;
    ball.style.left = `${normPos * travelWidth}px`;
    // Scale + shadow bloom peaks at center (max velocity), fades at edges
    const vel = Math.abs(Math.sin(phaseMod));
    ball.style.transform = `translateY(-50%) scale(${1 + vel * 0.045})`;
    ball.style.boxShadow = `0 ${4 + vel * 10}px ${8 + vel * 20}px rgba(0,0,0,${0.12 + vel * 0.1})`;
  }

  // ─── Animation loop ──────────────────────────────────────────────────────

  const animateRef = useRef<((ts: number) => void) | undefined>(undefined);
  useEffect(() => {
    animateRef.current = (timestamp: number) => {
    if (!isPlayingRef.current) return;
    if (lastTsRef.current === null) lastTsRef.current = timestamp;
    const dt = Math.min((timestamp - lastTsRef.current) / 1000, 0.1);
    lastTsRef.current = timestamp;

    const TWO_PI = 2 * Math.PI;
    const prevPhase = phaseRef.current;
    const nextPhase = prevPhase + TWO_PI * hzRef.current * dt;
    const prevCycles = Math.floor(prevPhase / TWO_PI);
    const nextCycles = Math.floor(nextPhase / TWO_PI);

    // Sound at right edge (phase crosses n·2π + π)
    for (let c = prevCycles; c <= nextCycles; c++) {
      const rightX = c * TWO_PI + Math.PI;
      if (prevPhase < rightX && nextPhase >= rightX) triggerSound();
    }

    // Sound + repeat count at left edge (full cycle completed)
    if (nextCycles > prevCycles) {
      for (let i = 0; i < nextCycles - prevCycles; i++) {
        repeatCountRef.current++;
        setRepeatCount(repeatCountRef.current);
        const max = repeatsRef.current;
        if (max !== null && repeatCountRef.current >= max) {
          phaseRef.current = 0;
          renderBall(0);
          isPlayingRef.current = false;
          setIsPlaying(false);
          lastTsRef.current = null;
          repeatCountRef.current = 0;
          setRepeatCount(0);
          return;
        }
        triggerSound();
      }
    }

    phaseRef.current = nextPhase;
    renderBall(nextPhase);
    animFrameRef.current = requestAnimationFrame((ts) => animateRef.current!(ts));
  };
  });

  // ─── Play / stop ─────────────────────────────────────────────────────────

  function startAnimation() {
    isPlayingRef.current = true;
    phaseRef.current = 0;
    lastTsRef.current = null;
    repeatCountRef.current = 0;
    setRepeatCount(0);
    renderBall(0);
    animFrameRef.current = requestAnimationFrame((ts) => animateRef.current!(ts));
  }

  function stopAnimation() {
    isPlayingRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    phaseRef.current = 0;
    lastTsRef.current = null;
    repeatCountRef.current = 0;
    setRepeatCount(0);
    renderBall(0);
  }

  function togglePlay() {
    if (isPlayingRef.current) {
      stopAnimation();
      setIsPlaying(false);
    } else {
      setIsPlaying(true); // update UI immediately
      // Start animation only after AudioContext is confirmed running — prevents
      // oscillators queuing up while suspended and firing all at once (distortion).
      unlockAudio().then(() => startAnimation());
    }
  }

  useEffect(() => {
    renderBall(0);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current.remove();
      }
    };
  }, []);

  // ─── Settings handlers ────────────────────────────────────────────────────

  function handleSpeedsChange(next: Speeds) {
    setSpeeds(next);
    hzRef.current = next[activeSpeedIdx];
  }

  function handleRepeatCountsChange(next: RepeatCounts) {
    setRepeatCounts(next);
    repeatsRef.current = next[activeRepeatIdx];
  }

  function cycleRepeatSlot() {
    const next = (activeRepeatIdx + 1) % 2;
    setActiveRepeatIdx(next);
    repeatsRef.current = repeatCounts[next];
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const activeRepeat = repeatCounts[activeRepeatIdx];

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* ── Ball arena ── */}
      <div
        ref={containerRef}
        className="flex-1 relative"
        onClick={togglePlay}
        style={{ cursor: "pointer", touchAction: "manipulation" }}
      >
        <div
          ref={ballRef}
          style={{
            position: "absolute",
            top: "50%",
            left: "0px",
            width: "clamp(52px, 9vh, 80px)",
            height: "clamp(52px, 9vh, 80px)",
            borderRadius: "50%",
            background: "#111111",
            transform: "translateY(-50%)",
            willChange: "left, transform, box-shadow",
          }}
        />

        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button
              className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center shadow-sm pointer-events-auto"
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            >
              <IconPlay />
            </button>
          </div>
        )}

        {isPlaying && activeRepeat !== null && (
          <div className="absolute bottom-4 right-4 text-sm text-gray-300 font-mono tabular-nums">
            {repeatCount} / {activeRepeat}
          </div>
        )}
      </div>

      {/* ── Control bar ── */}
      <div
        className={`border-t border-gray-100 bg-white transition-opacity duration-500 ${
          isPlaying ? "opacity-20 pointer-events-none" : "opacity-100"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-end justify-between px-4 py-3">
          {/* Speed pill — tap individual value to select */}
          <div className="flex flex-col items-center gap-1">
            <div className="bg-gray-100 rounded-full px-3 py-1.5 flex items-center gap-1">
              {speeds.map((s, i) => (
                <span key={i} className="flex items-center">
                  {i > 0 && (
                    <span className="text-gray-300 font-normal mx-0.5">|</span>
                  )}
                  <button
                    className={`text-[12px] font-semibold tabular-nums transition-colors px-0.5 ${
                      i === activeSpeedIdx ? "text-gray-900" : "text-gray-400"
                    }`}
                    onClick={() => { setActiveSpeedIdx(i); hzRef.current = speeds[i]; }}
                  >
                    {s.toFixed(1)}
                  </button>
                </span>
              ))}
            </div>
            <span className="text-[11px] text-gray-400">Speed (Hz)</span>
          </div>

          {/* Repeats pill — tap to cycle active slot */}
          <div className="flex flex-col items-center gap-1">
            <button
              className="bg-gray-100 rounded-full px-3 py-1.5 flex items-center gap-1"
              onClick={cycleRepeatSlot}
            >
              {repeatCounts.map((r, i) => (
                <span
                  key={i}
                  className={`text-[12px] font-semibold tabular-nums transition-colors ${
                    i === activeRepeatIdx ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {i > 0 && (
                    <span className="text-gray-300 font-normal mx-0.5">|</span>
                  )}
                  {r !== null ? r : "∞"}
                </span>
              ))}
            </button>
            <span className="text-[11px] text-gray-400">Repeats</span>
          </div>

          {/* Sound mode */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1.5">
              <button className="p-0.5" onClick={() => setSoundMode("muted")}>
                <IconMute active={soundMode === "muted"} />
              </button>
              <button className="p-0.5" onClick={() => { setSoundMode("snap"); previewSound("snap"); }}>
                <IconSnap active={soundMode === "snap"} />
              </button>
              <button className="p-0.5" onClick={() => { setSoundMode("beep"); previewSound("beep"); }}>
                <IconBeep active={soundMode === "beep"} />
              </button>
            </div>
            <span className="text-[11px] text-gray-400">Sound</span>
          </div>

          {/* Adjustments */}
          <div className="flex flex-col items-center gap-1">
            <button
              className="bg-gray-100 rounded-full p-2"
              onClick={() => setShowAdjustments(true)}
            >
              <IconSliders />
            </button>
            <span className="text-[11px] text-gray-400">Adjustments</span>
          </div>
        </div>
      </div>

      {/* ── Adjustments panel ── */}
      {showAdjustments && (
        <AdjustmentsPanel
          speeds={speeds}
          activeSpeedIdx={activeSpeedIdx}
          repeatCounts={repeatCounts}
          activeRepeatIdx={activeRepeatIdx}
          onSpeedsChange={handleSpeedsChange}
          onRepeatCountsChange={handleRepeatCountsChange}
          onClose={() => setShowAdjustments(false)}
        />
      )}
    </div>
  );
}
