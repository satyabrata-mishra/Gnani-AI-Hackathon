"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/cn";

/** Plays a recorded answer (a blob URL) — the audio evidence behind a field. */
export function ClipButton({ url, label, className }: { url: string; label: string; className?: string }) {
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audio.current?.pause(), []);

  function toggle() {
    if (playing && audio.current) {
      audio.current.pause();
      setPlaying(false);
      return;
    }
    audio.current?.pause();
    const el = new Audio(url);
    audio.current = el;
    el.onended = () => setPlaying(false);
    el.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? `Pause ${label}` : `Play ${label}`}
      title={playing ? "Pause" : "Play the recorded answer"}
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition hover:border-brand hover:text-brand",
        playing && "border-brand text-brand",
        className,
      )}
    >
      {playing ? <Pause className="h-3 w-3 fill-current" aria-hidden /> : <Play className="h-3 w-3 fill-current" aria-hidden />}
    </button>
  );
}
