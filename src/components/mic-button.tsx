"use client";

import { motion } from "framer-motion";
import { Loader2, Mic, Square, Volume2 } from "lucide-react";
import { cn } from "@/lib/cn";

/** `speaking`: Bolo is talking and a tap answers right away instead of waiting. */
export type MicButtonMode = "idle" | "speaking" | "recording" | "busy";

const LABELS: Record<MicButtonMode, string> = {
  idle: "Start recording",
  speaking: "Answer now without waiting for Bolo to finish",
  recording: "Stop recording",
  busy: "Working",
};

export function MicButton({
  mode,
  level,
  onClick,
  disabled,
}: {
  mode: MicButtonMode;
  level: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  const recording = mode === "recording";
  const speaking = mode === "speaking";
  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      {recording && (
        <motion.span
          aria-hidden
          className="absolute inset-2 rounded-full bg-marigold/30"
          animate={{ scale: 1 + level * 0.5 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
        />
      )}
      {speaking && (
        <span aria-hidden className="absolute inset-2 rounded-full bg-brand/15 motion-safe:animate-ping" />
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || mode === "busy"}
        aria-label={LABELS[mode]}
        aria-pressed={recording}
        className={cn(
          "relative flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition focus-visible:ring-4 focus-visible:ring-brand/30 disabled:cursor-not-allowed",
          recording
            ? "bg-marigold text-white"
            : speaking
              ? "border-2 border-brand bg-surface text-brand hover:bg-brand-soft"
              : mode === "busy"
                ? "bg-paper text-ink-faint shadow-none ring-1 ring-line"
                : "bg-brand text-white enabled:hover:bg-brand-strong",
        )}
      >
        {mode === "busy" ? (
          <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
        ) : speaking ? (
          <Volume2 className="h-7 w-7" aria-hidden />
        ) : recording ? (
          <Square className="h-6 w-6 fill-current" aria-hidden />
        ) : (
          <Mic className="h-7 w-7" aria-hidden />
        )}
      </button>
    </div>
  );
}
