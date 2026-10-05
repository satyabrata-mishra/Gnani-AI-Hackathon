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
/** Normalised level above which a chunk counts as speech (noise suppression keeps rooms well below). */
const SPEECH_LEVEL = 0.08;

interface Session {
  stream: MediaStream;
  context: AudioContext;
  node: AudioWorkletNode;
  chunks: Float32Array[];
  startedAt: number;
  heardSpeechAt: number | null;
  lastSpeechAt: number;
}

export interface RecorderOptions {
  /** Called with the recording when the recorder stops itself (time limit, silence, no speech). */
  onAutoStop?: (r: Recording | null) => void;
  /** Stop this long after the speaker goes quiet. Off when undefined. */
  silenceStopMs?: number;
  /** Stop if no speech is heard at all within this time. Off when undefined. */
  noSpeechTimeoutMs?: number;
}

function describeMicError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") return "Microphone access was blocked. Allow it in the browser's address bar, then tap the microphone.";
    if (err.name === "NotFoundError") return "No microphone was found on this device.";
    if (err.name === "NotReadableError") return "The microphone is being used by another app.";
  }
  return "Could not start the microphone.";
}

export function useVoiceRecorder({ onAutoStop, silenceStopMs, noSpeechTimeoutMs }: RecorderOptions = {}) {
  const [state, setState] = useState<RecorderState>("idle");
  const [level, setLevel] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [heardSpeech, setHeardSpeech] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const session = useRef<Session | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Bumped by cancel/unmount so a start() still awaiting the mic discards its stream. */
  const generation = useRef(0);
  const onAutoStopRef = useRef(onAutoStop);
  const limits = useRef({ silenceStopMs, noSpeechTimeoutMs });
  useEffect(() => {
    onAutoStopRef.current = onAutoStop;
    limits.current = { silenceStopMs, noSpeechTimeoutMs };
  }, [onAutoStop, silenceStopMs, noSpeechTimeoutMs]);

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
    const gen = ++generation.current;
    setError(null);
    setElapsedMs(0);
    setHeardSpeech(false);
    setState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const context = new AudioContext();
      await context.audioWorklet.addModule("/worklets/pcm-recorder.js");
      if (gen !== generation.current) {
        stream.getTracks().forEach((t) => t.stop());
        void context.close();
        return;
      }
      const source = context.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(context, "pcm-recorder");
      // Route through a muted gain so the graph is pulled without echoing the mic.
      const mute = context.createGain();
      mute.gain.value = 0;
      source.connect(node);
      node.connect(mute).connect(context.destination);

      const now = performance.now();
      const s: Session = { stream, context, node, chunks: [], startedAt: now, heardSpeechAt: null, lastSpeechAt: now };
      node.port.onmessage = (e: MessageEvent<Float32Array>) => {
        s.chunks.push(e.data);
        let sum = 0;
        for (let i = 0; i < e.data.length; i++) sum += e.data[i] * e.data[i];
        const value = Math.min(1, Math.sqrt(sum / e.data.length) * 4);
        setLevel(value);
        if (value >= SPEECH_LEVEL) {
          s.lastSpeechAt = performance.now();
          if (s.heardSpeechAt === null) {
            s.heardSpeechAt = s.lastSpeechAt;
            setHeardSpeech(true);
          }
        }
      };
      session.current = s;
      setState("recording");

      timer.current = setInterval(() => {
        const t = performance.now();
        const elapsed = t - s.startedAt;
        setElapsedMs(elapsed);
        const { silenceStopMs: silence, noSpeechTimeoutMs: noSpeech } = limits.current;
        const quietTooLong = silence !== undefined && s.heardSpeechAt !== null && t - s.lastSpeechAt >= silence;
        const nothingHeard = noSpeech !== undefined && s.heardSpeechAt === null && elapsed >= noSpeech;
        if (elapsed >= MAX_DURATION_MS || quietTooLong || nothingHeard) onAutoStopRef.current?.(finish());
      }, 150);
    } catch (err) {
      if (gen !== generation.current) return;
      teardown();
      setError(describeMicError(err));
      setState("error");
    }
  }, [finish, teardown]);

  const stop = useCallback(() => finish(), [finish]);

  const cancel = useCallback(() => {
    generation.current++;
    teardown();
    setLevel(0);
    setState("idle");
  }, [teardown]);

  useEffect(
    () => () => {
      generation.current++;
      teardown();
    },
    [teardown],
  );

  return { state, level, elapsedMs, heardSpeech, error, start, stop, cancel, maxDurationMs: MAX_DURATION_MS };
}
