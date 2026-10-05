"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  requestReadBack,
  requestReview,
  sendTurn,
  startSession,
  transcribeAudio,
} from "@/lib/api-client";
import type { QuestionBank, ReviewResult, SessionState, SpokenPrompt, TurnEvent } from "@/lib/engine/types";
import { isCustomFormId } from "@/lib/forms/schema";
import type { FormTemplate } from "@/lib/forms/types";
import { saveSubmission } from "@/lib/storage/submissions";
import { useSpeechPlayer } from "./use-speech-player";
import { useVoiceRecorder, type Recording } from "./use-voice-recorder";

export type SessionPhase =
  | "ready"
  | "preparing"
  | "speaking"
  | "listening"
  | "transcribing"
  | "thinking"
  | "reviewing"
  | "confirmed"
  | "error";

export interface LogEntry {
  id: number;
  role: "bolo" | "user";
  text: string;
  /** For answers: the session turn they produced, which links filled fields to this audio. */
  turn?: number;
  audioUrl?: string;
  typed?: boolean;
  events?: TurnEvent[];
  timings?: { sttMs?: number; modelMs?: number };
}

interface Answer {
  transcript: string;
  audio?: { url: string; blob: Blob };
  sttMs?: number;
  typed?: boolean;
}

export type SaveState = "idle" | "saving" | "saved" | "error";

const MIN_RECORDING_MS = 400;
const SILENCE_STOP_MS = 1600;
const NO_SPEECH_TIMEOUT_MS = 8000;

function messageOf(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

export function useBoloSession({ template, languageId }: { template: FormTemplate; languageId: string }) {
  const templateId = template.id;
  const custom = isCustomFormId(templateId) ? template : undefined;
  const player = useSpeechPlayer();
  const { speak, stop: stopSpeech } = player;

  const [phase, setPhase] = useState<SessionPhase>("ready");
  const [state, setState] = useState<SessionState | null>(null);
  const [prompt, setPrompt] = useState<SpokenPrompt | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [clips, setClips] = useState<Record<number, string>>({});
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(null);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [readback, setReadback] = useState<string | null>(null);
  const [readbackFailed, setReadbackFailed] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ state: SaveState; id?: string }>({ state: "idle" });

  const stateRef = useRef<SessionState | null>(null);
  const bankRef = useRef<QuestionBank | null>(null);
  const fixingRef = useRef(false);
  const endedRef = useRef(false);
  /** Each spoken flow (ask, read-back) takes a ticket; a newer flow makes older ones bail after their awaits. */
  const flow = useRef(0);
  const reviewSeq = useRef(0);
  const logId = useRef(0);
  const urls = useRef<string[]>([]);
  const blobs = useRef<Record<number, Blob>>({});
  const onRecording = useRef<(r: Recording | null) => void>(() => {});

  const recorder = useVoiceRecorder({
    onAutoStop: useCallback((r: Recording | null) => onRecording.current(r), []),
    silenceStopMs: SILENCE_STOP_MS,
    noSpeechTimeoutMs: NO_SPEECH_TIMEOUT_MS,
  });
  const { start: startRecording, stop: stopRecording, cancel: cancelRecording } = recorder;

  const commit = useCallback((next: SessionState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const appendLog = useCallback((entry: Omit<LogEntry, "id">) => {
    const id = ++logId.current;
    setLog((l) => [...l, { ...entry, id }]);
    return id;
  }, []);

  const patchLog = useCallback((id: number, patch: Partial<LogEntry>) => {
    setLog((l) => l.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const fail = useCallback((err: unknown, retry: () => void) => {
    if (endedRef.current) return;
    setError({ message: messageOf(err), retry });
    setPhase("error");
  }, []);

  const askAndListen = useCallback(
    async (next: SpokenPrompt, { log: shouldLog = true } = {}) => {
      if (endedRef.current) return;
      const ticket = ++flow.current;
      setPrompt(next);
      if (shouldLog) appendLog({ role: "bolo", text: next.text });
      setPhase("speaking");
      // A failed playback leaves the question on screen; listening still proceeds.
      await speak(next.text, languageId);
      if (endedRef.current || ticket !== flow.current) return;
      setPhase("listening");
      await startRecording();
    },
    [appendLog, languageId, speak, startRecording],
  );

  const startReview = useCallback((snapshot: SessionState) => {
    const seq = ++reviewSeq.current;
    setReview(null);
    setReviewError(null);
    requestReview(snapshot, custom)
      .then((r) => seq === reviewSeq.current && setReview(r))
      .catch((err) => seq === reviewSeq.current && setReviewError(messageOf(err)));
  }, [custom]);

  const finishForm = useCallback(
    async (donePrompt: SpokenPrompt) => {
      const snapshot = stateRef.current;
      if (!snapshot || endedRef.current) return;
      const ticket = ++flow.current;
      const wasFixing = fixingRef.current;
      fixingRef.current = false;
      setPrompt(donePrompt);
      setPhase("reviewing");
      setReadback(null);
      setReadbackFailed(false);
      startReview(snapshot);

      const stillCurrent = () => !endedRef.current && ticket === flow.current;
      if (!wasFixing) {
        appendLog({ role: "bolo", text: donePrompt.text });
        await speak(donePrompt.text, languageId);
        if (!stillCurrent()) return;
      }
      try {
        const { text } = await requestReadBack(snapshot, custom);
        if (!stillCurrent()) return;
        setReadback(text);
        // After a fix the card updates quietly; reading the whole form aloud again would be tiring.
        if (wasFixing) return;
        appendLog({ role: "bolo", text });
        await speak(text, languageId);
      } catch {
        if (stillCurrent()) setReadbackFailed(true);
      }
    },
    [appendLog, custom, languageId, speak, startReview],
  );

  const submitTurn = useCallback(
    async (entryId: number, answer: Answer) => {
      const attempt = async () => {
        const current = stateRef.current;
        if (!current || endedRef.current) return;
        setPhase("thinking");
        try {
          const result = await sendTurn(current, answer.transcript, custom);
          if (endedRef.current) return;
          if (answer.audio) {
            const { url, blob } = answer.audio;
            blobs.current[result.state.turn] = blob;
            setClips((c) => ({ ...c, [result.state.turn]: url }));
          }
          patchLog(entryId, {
            turn: result.state.turn,
            events: result.events,
            timings: { sttMs: answer.sttMs, modelMs: result.meta.latencyMs || undefined },
          });
          commit(result.state);
          if (result.state.done) await finishForm(result.prompt);
          else await askAndListen(result.prompt);
        } catch (err) {
          fail(err, () => void attempt());
        }
      };
      await attempt();
    },
    [askAndListen, commit, custom, fail, finishForm, patchLog],
  );

  const processAnswer = useCallback(
    async (answer: Answer) => {
      const id = appendLog({
        role: "user",
        text: answer.transcript || "(no speech heard)",
        audioUrl: answer.audio?.url,
        typed: answer.typed,
      });
      await submitTurn(id, answer);
    },
    [appendLog, submitTurn],
  );

  const handleRecording = useCallback(
    async (recording: Recording | null) => {
      if (endedRef.current) return;
      setPhase("transcribing");
      if (!recording || recording.durationMs < MIN_RECORDING_MS) {
        await processAnswer({ transcript: "" });
        return;
      }
      const audio = { url: URL.createObjectURL(recording.blob), blob: recording.blob };
      urls.current.push(audio.url);

      const transcribe = async () => {
        try {
          const res = await transcribeAudio(recording.blob, languageId);
          await processAnswer({ transcript: res.transcript, audio, sttMs: res.latencyMs });
        } catch (err) {
          fail(err, () => {
            setPhase("transcribing");
            void transcribe();
          });
        }
      };
      await transcribe();
    },
    [fail, languageId, processAnswer],
  );

  useEffect(() => {
    onRecording.current = (r) => void handleRecording(r);
  }, [handleRecording]);

  const begin = useCallback(async () => {
    const attempt = async () => {
      setPhase("preparing");
      try {
        const started = await startSession(templateId, languageId, custom);
        if (endedRef.current) return;
        bankRef.current = started.bank;
        commit(started.state);
        await askAndListen(started.prompt);
      } catch (err) {
        fail(err, () => void attempt());
      }
    };
    setError(null);
    await attempt();
  }, [askAndListen, commit, custom, fail, languageId, templateId]);

  const stopListening = useCallback(() => {
    void handleRecording(stopRecording());
  }, [handleRecording, stopRecording]);

  /** Cuts Bolo's question short; askAndListen then moves straight to listening. */
  const answerNow = useCallback(() => stopSpeech(), [stopSpeech]);

  const submitText = useCallback(
    (text: string) => {
      const transcript = text.trim();
      if (!transcript) return;
      flow.current++;
      stopSpeech();
      cancelRecording();
      void processAnswer({ transcript, typed: true });
    },
    [cancelRecording, processAnswer, stopSpeech],
  );

  const listenAgain = useCallback(() => {
    setPhase("listening");
    void startRecording();
  }, [startRecording]);

  const repeatQuestion = useCallback(() => {
    if (!prompt) return;
    cancelRecording();
    void askAndListen(prompt, { log: false });
  }, [askAndListen, cancelRecording, prompt]);

  const fixField = useCallback(
    (key: string) => {
      const current = stateRef.current;
      const bank = bankRef.current;
      if (!current || !bank) return;
      fixingRef.current = true;
      reviewSeq.current++;
      setReview(null);
      setReviewError(null);
      commit({ ...current, done: false, current: { key, kind: "ask", attempts: 0 } });
      void askAndListen({ key, kind: "ask", text: bank.fields[key].ask });
    },
    [askAndListen, commit],
  );

  const retryReview = useCallback(() => {
    if (stateRef.current) startReview(stateRef.current);
  }, [startReview]);

  const retry = useCallback(() => {
    const pending = error;
    setError(null);
    pending?.retry();
  }, [error]);

  const replay = useCallback((text: string) => void speak(text, languageId), [languageId, speak]);

  const confirm = useCallback(async () => {
    flow.current++;
    stopSpeech();
    const createdAt = new Date().toISOString();
    setCompletedAt(createdAt);
    setPhase("confirmed");

    const final = stateRef.current;
    if (!final || !review) return;
    const id = crypto.randomUUID();
    setSaved({ state: "saving" });
    try {
      await saveSubmission({
        id,
        createdAt,
        template,
        languageId,
        values: final.values,
        skipped: final.skipped,
        review,
        conversation: log.map(({ role, text, turn, typed }) => ({ role, text, turn, typed })),
        clips: { ...blobs.current },
      });
      setSaved({ state: "saved", id });
    } catch {
      setSaved({ state: "error" });
    }
  }, [languageId, log, review, stopSpeech, template]);

  useEffect(() => {
    endedRef.current = false;
    const created = urls.current;
    return () => {
      endedRef.current = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  return {
    phase,
    state,
    prompt,
    log,
    clips,
    error,
    review,
    reviewError,
    readback,
    readbackFailed,
    completedAt,
    saved,
    player,
    recorder,
    begin,
    stopListening,
    answerNow,
    submitText,
    listenAgain,
    repeatQuestion,
    fixField,
    retryReview,
    retry,
    replay,
    confirm,
  };
}

export type BoloSession = ReturnType<typeof useBoloSession>;
