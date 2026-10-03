"use client";

import { motion } from "framer-motion";
import { Loader2, Mic, Square } from "lucide-react";
import { cn } from "@/lib/cn";

export type MicButtonMode = "idle" | "recording" | "busy";

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
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || mode === "busy"}
        aria-label={recording ? "Stop recording" : "Start recording"}
        aria-pressed={recording}
        className={cn(
          "relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50",
          recording ? "bg-marigold" : "bg-brand enabled:hover:bg-brand-strong",
        )}
      >
        {mode === "busy" ? (
          <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
        ) : recording ? (
          <Square className="h-6 w-6 fill-current" aria-hidden />
        ) : (
          <Mic className="h-7 w-7" aria-hidden />
        )}
      </button>
    </div>
  );
}
