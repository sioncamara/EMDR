"use client";

import { useState } from "react";
import type { Speeds, RepeatCounts } from "./EMDRApp";

interface Props {
  speeds: Speeds;
  activeSpeedIdx: number;
  repeatCounts: RepeatCounts;
  activeRepeatIdx: number;
  onSpeedsChange: (s: Speeds) => void;
  onRepeatCountsChange: (r: RepeatCounts) => void;
  onClose: () => void;
}

const DEFAULT_SPEEDS: Speeds = [0.5, 1.5, 0.5];
const DEFAULT_REPEATS: RepeatCounts = [35, 70];

function fmt(n: number) {
  return n.toFixed(2);
}

export default function AdjustmentsPanel({
  speeds,
  activeSpeedIdx,
  repeatCounts,
  activeRepeatIdx,
  onSpeedsChange,
  onRepeatCountsChange,
  onClose,
}: Props) {
  const [speedOpen, setSpeedOpen] = useState(false);
  const [repeatsOpen, setRepeatsOpen] = useState(false);

  // Local string state for the two repeat inputs so the user can type freely
  const [repeatInputs, setRepeatInputs] = useState<[string, string]>([
    repeatCounts[0] !== null ? String(repeatCounts[0]) : "",
    repeatCounts[1] !== null ? String(repeatCounts[1]) : "",
  ]);

  function handleSpeedSlider(idx: 0 | 1 | 2, value: number) {
    const next: Speeds = [...speeds] as Speeds;
    next[idx] = value;
    onSpeedsChange(next);
  }

  function handleRepeatInput(idx: 0 | 1, raw: string) {
    const digits = raw.replace(/[^0-9]/g, "");
    const next: [string, string] = [...repeatInputs] as [string, string];
    next[idx] = digits;
    setRepeatInputs(next);

    const nextCounts: RepeatCounts = [...repeatCounts] as RepeatCounts;
    if (digits === "") {
      nextCounts[idx] = null;
    } else {
      const n = parseInt(digits, 10);
      if (!isNaN(n) && n > 0) nextCounts[idx] = n;
    }
    onRepeatCountsChange(nextCounts);
  }

  function restoreSpeedDefaults() {
    onSpeedsChange([...DEFAULT_SPEEDS]);
  }

  function restoreRepeatDefaults() {
    onRepeatCountsChange([...DEFAULT_REPEATS]);
    setRepeatInputs([String(DEFAULT_REPEATS[0]), String(DEFAULT_REPEATS[1])]);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-gray-100 rounded-t-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Drag handle — tap to close */}
        <div className="flex justify-center pt-3 pb-1 cursor-pointer" onClick={onClose}>
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="relative flex items-center px-5 pt-3 pb-4">
          <button
            onClick={onClose}
            className="relative z-10 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="w-4 h-4 text-gray-700"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <h2 className="absolute inset-x-0 text-center text-base font-semibold pointer-events-none">
            Adjustments
          </h2>
        </div>

        <p className="px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Presets
        </p>

        <div className="px-5 pb-10 space-y-2">
          {/* ── Speed ── */}
          <div className="bg-white rounded-2xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-4"
              onClick={() => setSpeedOpen((v) => !v)}
            >
              <div className="flex items-center gap-3">
                {/* Rabbit icon */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5 text-gray-600"
                >
                  <path d="M16 2c1 0 3 1 3 4 0 2-1 3-2 4l-1 1" />
                  <path d="M9 13c-2 0-5 1-5 5 0 2 1 3 3 3h8c3 0 5-1 5-4 0-2-1-3-3-4l-2-1" />
                  <circle cx="9" cy="9" r="4" />
                  <path d="M12 13v2" />
                </svg>
                <span className="font-medium text-gray-900">Speed</span>
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                  speedOpen ? "rotate-180" : ""
                }`}
              >
                <polyline points="6,9 12,15 18,9" />
              </svg>
            </button>

            {speedOpen && (
              <div className="border-t border-gray-100 px-4 pt-4 pb-5 space-y-5">
                {([0, 1, 2] as const).map((idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-sm font-bold w-4 ${
                          idx === activeSpeedIdx
                            ? "text-gray-900"
                            : "text-gray-400"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          idx === activeSpeedIdx
                            ? "text-gray-900"
                            : "text-gray-500"
                        }`}
                      >
                        {fmt(speeds[idx])} Hz
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.3"
                      max="2.5"
                      step="0.05"
                      value={speeds[idx]}
                      onChange={(e) =>
                        handleSpeedSlider(idx, parseFloat(e.target.value))
                      }
                      className="w-full"
                      style={{
                        accentColor:
                          idx === activeSpeedIdx ? "#3b82f6" : "#9ca3af",
                      }}
                    />
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[10px] text-gray-400">0.3 Hz</span>
                      <span className="text-[10px] text-gray-400">2.5 Hz</span>
                    </div>
                  </div>
                ))}

                <button
                  onClick={restoreSpeedDefaults}
                  className="text-blue-500 text-sm font-medium pt-1"
                >
                  Restore Defaults
                </button>
              </div>
            )}
          </div>

          {/* ── Repeats ── */}
          <div className="bg-white rounded-2xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-4"
              onClick={() => setRepeatsOpen((v) => !v)}
            >
              <div className="flex items-center gap-3">
                {/* Repeat arrows */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5 text-gray-600"
                >
                  <polyline points="17,1 21,5 17,9" />
                  <path d="M3,11V9a4,4 0 0,1 4-4h14" />
                  <polyline points="7,23 3,19 7,15" />
                  <path d="M21,13v2a4,4 0 0,1-4,4H3" />
                </svg>
                <span className="font-medium text-gray-900">Repeats</span>
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                  repeatsOpen ? "rotate-180" : ""
                }`}
              >
                <polyline points="6,9 12,15 18,9" />
              </svg>
            </button>

            {repeatsOpen && (
              <div className="border-t border-gray-100 px-4 pt-4 pb-5 space-y-3">
                {([0, 1] as const).map((idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <span
                      className={`text-sm font-bold w-4 ${
                        idx === activeRepeatIdx
                          ? "text-gray-900"
                          : "text-gray-400"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={repeatInputs[idx]}
                      onChange={(e) => handleRepeatInput(idx, e.target.value)}
                      placeholder="∞"
                      className={`border rounded-xl px-3 py-2 text-sm w-28 focus:outline-none text-gray-900 ${
                        idx === activeRepeatIdx
                          ? "border-blue-300 focus:border-blue-400"
                          : "border-gray-200 focus:border-gray-300"
                      }`}
                    />
                  </div>
                ))}

                <p className="text-xs text-gray-400 pt-1">
                  Leave empty for infinite repeats
                </p>

                <button
                  onClick={restoreRepeatDefaults}
                  className="text-blue-500 text-sm font-medium"
                >
                  Restore Defaults
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
