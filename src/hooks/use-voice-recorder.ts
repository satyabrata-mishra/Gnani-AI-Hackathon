"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { concatChunks, downsample, encodeWav, TARGET_SAMPLE_RATE } from "@/lib/audio/wav";

export type RecorderState = "idle" | "starting" | "recording" | "error";

export interface Recording {
  blob: Blob;
  durationMs: number;
}

/** Prisma REST is ideal for clips ≤ 30 s. */
const MAX_DURATION_MS = 30_000;

interface Session {
  stream: MediaStream;
  context: AudioContext;
  node: AudioWorkletNode;
  chunks: Float32Array[];
  startedAt: number;
}

function describeMicError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") return "Microphone access was blocked. Allow it in the browser's address bar and try again.";
    if (err.name === "NotFoundError") return "No microphone was found on this device.";
    if (err.name === "NotReadableError") return "The microphone is being used by another app.";
  }
  return "Could not start the microphone.";
}

export function useVoiceRecorder({ onAutoStop }: { onAutoStop?: (r: Recording | null) => void } = {}) {
  const [state, setState] = useState<RecorderState>("idle");
  const [level, setLevel] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const session = useRef<Session | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const onAutoStopRef = useRef(onAutoStop);
  useEffect(() => {
    onAutoStopRef.current = onAutoStop;
  }, [onAutoStop]);

  const teardown = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    const s = session.current;
    session.current = null;
    if (!s) return null;
    s.node.port.onmessage = null;
    s.node.disconnect();
    s.stream.getTracks().forEach((t) => t.stop());
    void s.context.close();
    return s;
  }, []);

  const finish = useCallback((): Recording | null => {
    const s = teardown();
    setLevel(0);
    setState("idle");
    if (!s || s.chunks.length === 0) return null;
    const samples = downsample(concatChunks(s.chunks), s.context.sampleRate, TARGET_SAMPLE_RATE);
    return {
      blob: encodeWav(samples, TARGET_SAMPLE_RATE),
      durationMs: Math.round((samples.length / TARGET_SAMPLE_RATE) * 1000),
    };
  }, [teardown]);

  const start = useCallback(async () => {
    if (session.current) return;
    setError(null);
    setElapsedMs(0);
    setState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const context = new AudioContext();
      await context.audioWorklet.addModule("/worklets/pcm-recorder.js");
      const source = context.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(context, "pcm-recorder");
      // Route through a muted gain so the graph is pulled without echoing the mic.
      const mute = context.createGain();
      mute.gain.value = 0;
      source.connect(node);
      node.connect(mute).connect(context.destination);

      const s: Session = { stream, context, node, chunks: [], startedAt: performance.now() };
      node.port.onmessage = (e: MessageEvent<Float32Array>) => {
        s.chunks.push(e.data);
        let sum = 0;
        for (let i = 0; i < e.data.length; i++) sum += e.data[i] * e.data[i];
        setLevel(Math.min(1, Math.sqrt(sum / e.data.length) * 4));
      };
      session.current = s;
      setState("recording");

      timer.current = setInterval(() => {
        const elapsed = performance.now() - s.startedAt;
        setElapsedMs(elapsed);
        if (elapsed >= MAX_DURATION_MS) onAutoStopRef.current?.(finish());
      }, 200);
    } catch (err) {
      teardown();
      setError(describeMicError(err));
      setState("error");
    }
  }, [finish, teardown]);

  const stop = useCallback(() => finish(), [finish]);

  const cancel = useCallback(() => {
    teardown();
    setLevel(0);
    setState("idle");
  }, [teardown]);

  useEffect(() => () => void teardown(), [teardown]);

  return { state, level, elapsedMs, error, start, stop, cancel, maxDurationMs: MAX_DURATION_MS };
}
