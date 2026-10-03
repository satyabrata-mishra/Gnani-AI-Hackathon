"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Play, RotateCcw, Square, Volume2 } from "lucide-react";
import { useSpeechPlayer } from "@/hooks/use-speech-player";
import { useVoiceRecorder, type Recording } from "@/hooks/use-voice-recorder";
import { transcribeAudio } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { DEFAULT_LANGUAGE_ID, getLanguage, LANGUAGES } from "@/lib/languages";
import { MicButton } from "./mic-button";

interface Result {
  transcript: string;
  latencyMs: number;
  durationMs: number;
  url: string;
}

const MIN_RECORDING_MS = 400;

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-3 text-sm font-medium text-ink">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-paper font-mono text-xs text-ink-soft">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-warn">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export function MicCheck({ gnaniReady }: { gnaniReady: boolean }) {
  const [languageId, setLanguageId] = useState(DEFAULT_LANGUAGE_ID);
  const language = getLanguage(languageId) ?? LANGUAGES[0];

  const player = useSpeechPlayer();
  const [result, setResult] = useState<Result | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);

  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url);
  }, [result]);

  const handleRecording = useCallback(
    async (recording: Recording | null) => {
      if (!recording || recording.durationMs < MIN_RECORDING_MS) {
        setSttError("That recording was too short. Tap the mic, speak, then tap again to stop.");
        return;
      }
      setSttError(null);
      setTranscribing(true);
      try {
        const res = await transcribeAudio(recording.blob, languageId);
        setResult({
          transcript: res.transcript,
          latencyMs: res.latencyMs,
          durationMs: recording.durationMs,
          url: URL.createObjectURL(recording.blob),
        });
      } catch (err) {
        setSttError(err instanceof Error ? err.message : "Transcription failed");
      } finally {
        setTranscribing(false);
      }
    },
    [languageId],
  );

  const recorder = useVoiceRecorder({ onAutoStop: handleRecording });
  const recording = recorder.state === "recording" || recorder.state === "starting";
  const busy = transcribing || player.state === "loading";

  const toggleRecording = async () => {
    if (recording) {
      await handleRecording(recorder.stop());
    } else {
      player.stop();
      await recorder.start();
    }
  };

  const runLoop = async () => {
    setResult(null);
    setSttError(null);
    const spoken = await player.speak(language.sample, language.id);
    if (spoken) await recorder.start();
  };

  const changeLanguage = (id: string) => {
    player.stop();
    recorder.cancel();
    setResult(null);
    setSttError(null);
    setLanguageId(id);
  };

  return (
    <div className="space-y-4">
      {!gnaniReady && (
        <p role="alert" className="rounded-xl border border-marigold/40 bg-marigold-soft px-4 py-3 text-sm text-warn">
          GNANI_API_KEY is not configured, so speech and transcription will fail.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-3 text-sm text-ink-soft">
          Language
          <select
            value={languageId}
            onChange={(e) => changeLanguage(e.target.value)}
            disabled={recording || busy}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-ink"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.native === l.name ? l.name : `${l.native} · ${l.name}`}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={runLoop}
          disabled={recording || busy || player.state === "speaking"}
          className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition enabled:hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play className="h-4 w-4" aria-hidden />
          Run full loop
        </button>
      </div>

      <Step n={1} title="Bolo asks · Timbre">
        <p lang={language.stt} className="text-xl leading-relaxed text-ink">
          {language.sample}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {player.state === "speaking" ? (
            <button
              type="button"
              onClick={player.stop}
              className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink transition hover:border-line-strong"
            >
              <Square className="h-4 w-4" aria-hidden /> Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => player.speak(language.sample, language.id)}
              disabled={player.state === "loading" || recording}
              className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink transition enabled:hover:border-line-strong disabled:opacity-50"
            >
              <Volume2 className="h-4 w-4" aria-hidden />
              {player.state === "loading" ? "Generating…" : "Play question"}
            </button>
          )}
          <span className="text-xs text-ink-faint">
            Voice {language.voice}
            {player.lastLatencyMs !== null &&
              ` · ${player.lastLatencyMs === 0 ? "cached" : `${player.lastLatencyMs} ms`}`}
          </span>
        </div>
        {player.error && <ErrorNote message={player.error} />}
      </Step>

      <Step n={2} title="You answer">
        <div className="flex flex-col items-center gap-2 py-2">
          <MicButton
            mode={transcribing ? "busy" : recording ? "recording" : "idle"}
            level={recorder.level}
            onClick={toggleRecording}
            disabled={player.state === "loading"}
          />
          <p aria-live="polite" className="text-sm text-ink-soft">
            {transcribing
              ? "Transcribing…"
              : recording
                ? `Listening ${formatTime(recorder.elapsedMs)} / ${formatTime(recorder.maxDurationMs)} · tap to stop`
                : "Tap the mic and answer in any way you like"}
          </p>
        </div>
        {recorder.error && <ErrorNote message={recorder.error} />}
      </Step>

      <Step n={3} title="Bolo hears · Prisma">
        {result ? (
          <div className="space-y-4">
            {result.transcript ? (
              <p lang={language.stt} className="text-xl leading-relaxed text-ink">
                {result.transcript}
              </p>
            ) : (
              <p className="text-ink-soft">
                Prisma heard no speech. Check that the right microphone is selected and speak a little louder.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <audio controls src={result.url} className="h-9" aria-label="Your recording" />
              <span className="text-xs text-ink-faint">
                {formatTime(result.durationMs)} audio · transcribed in {result.latencyMs} ms
              </span>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="ml-auto inline-flex items-center gap-1.5 text-sm text-ink-soft transition hover:text-ink"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Clear
              </button>
            </div>
          </div>
        ) : (
          <p className={cn("text-sm", sttError ? "text-ink-soft" : "text-ink-faint")}>
            Your transcript will appear here.
          </p>
        )}
        {sttError && <ErrorNote message={sttError} />}
      </Step>
    </div>
  );
}
