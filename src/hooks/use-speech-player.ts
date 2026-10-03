"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSpeech, type SpeechResponse } from "@/lib/api-client";

export type PlayerState = "idle" | "loading" | "speaking" | "error";

/** Speaks text through Timbre and resolves when playback ends (or is stopped). */
export function useSpeechPlayer() {
  const [state, setState] = useState<PlayerState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);

  const audio = useRef<HTMLAudioElement | null>(null);
  const objectUrl = useRef<string | null>(null);
  const settle = useRef<(() => void) | null>(null);

  const release = useCallback(() => {
    audio.current?.pause();
    audio.current = null;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    settle.current?.();
    settle.current = null;
  }, []);

  const speak = useCallback(
    async (text: string, languageId: string): Promise<SpeechResponse | null> => {
      release();
      setError(null);
      setState("loading");
      let speech: SpeechResponse;
      try {
        speech = await fetchSpeech(text, languageId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not generate speech");
        setState("error");
        return null;
      }
      setLastLatencyMs(speech.cached ? 0 : speech.latencyMs);

      const url = URL.createObjectURL(speech.audio);
      const el = new Audio(url);
      objectUrl.current = url;
      audio.current = el;

      let failure: string | null = null;
      await new Promise<void>((resolve) => {
        settle.current = resolve;
        el.onended = () => resolve();
        el.onerror = () => {
          failure = "The browser could not play the audio";
          resolve();
        };
        setState("speaking");
        el.play().catch(() => {
          failure = "Playback was blocked by the browser. Click play again.";
          resolve();
        });
      });

      // If stop() or a newer speak() took over, leave state to them.
      if (audio.current !== el) return speech;
      release();
      if (failure) {
        setError(failure);
        setState("error");
        return null;
      }
      setState("idle");
      return speech;
    },
    [release],
  );

  const stop = useCallback(() => {
    release();
    setState("idle");
  }, [release]);

  useEffect(() => release, [release]);

  return { state, error, lastLatencyMs, speak, stop };
}
