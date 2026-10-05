"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Keyboard, Loader2, Play, RotateCcw, SendHorizontal, Volume2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useBoloSession, type BoloSession, type LogEntry, type SessionPhase } from "@/hooks/use-bolo-session";
import type { TurnEvent } from "@/lib/engine/types";
import type { FormTemplate } from "@/lib/forms/types";
import { getLanguage, type Language } from "@/lib/languages";
import { MicButton, type MicButtonMode } from "../mic-button";
import { ClipButton } from "./clip-button";
import { FormPanel } from "./form-panel";
import { ResultView } from "./result-view";
import { ReviewCard } from "./review-card";

const ASKING: SessionPhase[] = ["speaking", "listening", "transcribing", "thinking"];

export function VoiceSession({
  template,
  languageId,
  reasoningLabel,
}: {
  template: FormTemplate;
  languageId: string;
  reasoningLabel: string;
}) {
  const language = getLanguage(languageId)!;
  const session = useBoloSession({ template, languageId });
  const { phase, state, prompt, log, review } = session;

  const corrected = useMemo(() => {
    const keys = new Set<string>();
    for (const entry of log) {
      for (const e of entry.events ?? []) if (e.type === "filled" && e.corrected) keys.add(e.key);
    }
    return keys;
  }, [log]);

  const activeKey = ASKING.includes(phase) ? (state?.current?.key ?? prompt?.key ?? null) : null;
  const inReview = phase === "reviewing" || phase === "confirmed";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="min-w-0 space-y-6">
        {phase === "ready" ? (
          <Intro template={template} language={language} onStart={session.begin} />
        ) : phase === "confirmed" ? (
          <ResultView session={session} template={template} language={language} />
        ) : phase === "reviewing" ? (
          <ReviewCard session={session} template={template} speechLang={language.stt} reasoningLabel={reasoningLabel} />
        ) : (
          <Conversation session={session} language={language} />
        )}

        {phase !== "ready" && phase !== "confirmed" && <ConversationLog log={log} template={template} language={language} />}
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <FormPanel
          template={template}
          state={state}
          activeKey={activeKey}
          clips={session.clips}
          corrected={corrected}
          issues={inReview ? (review?.issues ?? []) : []}
          quoteLang={language.stt}
          onFix={phase === "reviewing" ? session.fixField : undefined}
        />
      </div>
    </div>
  );
}

function Intro({ template, language, onStart }: { template: FormTemplate; language: Language; onStart: () => void }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <p className="text-sm font-medium text-brand">Ready when you are</p>
      <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight text-ink">
        {template.title}, in <span className="italic text-brand">{language.name}</span>
      </h1>
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-ink-soft">
        <li>Bolo asks {template.fields.length} questions aloud. Answer the way you normally talk: mix languages, correct yourself, give several details at once.</li>
        <li>It stops listening when you pause, and you can type an answer instead at any time.</li>
        <li>At the end it reads everything back so you can fix anything before confirming.</li>
      </ul>
      <p className="mt-4 rounded-lg bg-marigold-soft px-3 py-2 text-xs text-warn">
        Demo only: use made-up details, never real ID, phone or account numbers.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-medium text-white transition hover:bg-brand-strong"
      >
        <Play className="h-4 w-4 fill-current" aria-hidden />
        Start conversation
      </button>
    </section>
  );
}

function statusLine(session: BoloSession, language: Language): string {
  const { phase, recorder } = session;
  switch (phase) {
    case "preparing":
      return `Preparing questions in ${language.name}…`;
    case "speaking":
      return "Bolo is speaking. Tap the mic to answer right away.";
    case "listening":
      if (recorder.state === "error") return recorder.error ?? "The microphone is unavailable.";
      if (recorder.state === "starting") return "Starting the microphone…";
      return recorder.heardSpeech ? "Listening… pause when you're done." : "Listening. Speak your answer.";
    case "transcribing":
      return "Transcribing with Prisma…";
    case "thinking":
      return "Understanding your answer…";
    default:
      return "";
  }
}

function Conversation({ session, language }: { session: BoloSession; language: Language }) {
  const { phase, prompt, recorder, player, error } = session;
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");

  const recording = phase === "listening" && recorder.state === "recording";
  const micMode: MicButtonMode = recording
    ? "recording"
    : phase === "speaking" || (phase === "listening" && recorder.state !== "starting")
      ? "idle"
      : "busy";

  function onMic() {
    if (recording) session.stopListening();
    else if (phase === "speaking") session.answerNow();
    else if (phase === "listening") session.listenAgain();
  }

  const canType = phase === "speaking" || phase === "listening";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !canType) return;
    session.submitText(draft);
    setDraft("");
  }

  if (phase === "error" && error) {
    return (
      <section className="rounded-2xl border border-danger/30 bg-danger-soft p-6" role="alert">
        <div className="flex items-start gap-3 text-danger">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium">That step didn&apos;t go through</p>
            <p className="mt-1 text-sm">{error.message}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={session.retry}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Try again
        </button>
      </section>
    );
  }

  return (
    <section aria-live="polite" className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">Step 1 of 2 · Bolo asks</p>
        {prompt && phase === "listening" && (
          <button
            type="button"
            onClick={session.repeatQuestion}
            className="inline-flex items-center gap-1.5 text-xs text-brand transition hover:text-brand-strong"
          >
            <Volume2 className="h-3.5 w-3.5" aria-hidden />
            Repeat question
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={prompt?.text ?? "preparing"}
          lang={language.stt}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="mt-3 min-h-16 text-2xl leading-snug text-ink"
        >
          {prompt?.text ?? (
            <span className="flex items-center gap-2 text-base text-ink-faint">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Writing questions in {language.name}…
            </span>
          )}
        </motion.p>
      </AnimatePresence>

      <div className="mt-6 flex flex-col items-center gap-2">
        <MicButton mode={micMode} level={recorder.level} onClick={onMic} />
        <p className={cn("min-h-5 text-center text-sm", recorder.state === "error" ? "text-danger" : "text-ink-soft")}>
          {statusLine(session, language)}
        </p>
        {player.state === "error" && player.error && (
          <p className="text-center text-xs text-warn">Audio didn&apos;t play ({player.error}). The question is shown above.</p>
        )}
      </div>

      <div className="mt-5 border-t border-line pt-4">
        {typing ? (
          <form onSubmit={submit} className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type the answer…"
              lang={language.stt}
              disabled={!canType}
              autoFocus
              className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink outline-none transition focus:border-brand disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!canType || !draft.trim()}
              aria-label="Send typed answer"
              className="inline-flex items-center justify-center rounded-xl bg-brand px-3 text-white transition enabled:hover:bg-brand-strong disabled:opacity-50"
            >
              <SendHorizontal className="h-4 w-4" aria-hidden />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setTyping(true)}
            className="inline-flex items-center gap-2 text-sm text-ink-soft transition hover:text-ink"
          >
            <Keyboard className="h-4 w-4" aria-hidden />
            Type instead
          </button>
        )}
      </div>
    </section>
  );
}

function ConversationLog({ log, template, language }: { log: LogEntry[]; template: FormTemplate; language: Language }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [log.length]);

  if (log.length === 0) return null;
  const labelOf = (key: string | null) => (key ? (template.fields.find((f) => f.key === key)?.label ?? key) : "");

  return (
    <section aria-label="Conversation" className="rounded-2xl border border-line bg-surface">
      <p className="border-b border-line px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-faint">Conversation</p>
      <div ref={box} className="max-h-96 space-y-3 overflow-y-auto p-5">
        {log.map((entry) => (
          <div key={entry.id} className={cn("flex", entry.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                entry.role === "user" ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm bg-paper text-ink",
              )}
            >
              <p lang={language.stt} className="flex items-start gap-2 leading-relaxed">
                {entry.audioUrl && <ClipButton url={entry.audioUrl} label="this answer" className="mt-px border-white/40 bg-white/10 text-white" />}
                <span>{entry.text}</span>
              </p>
              {entry.events && entry.events.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1">
                  {entry.events.map((e, i) => {
                    const chip = describeEvent(e, labelOf);
                    return chip ? (
                      <li key={i} className={cn("rounded-full px-2 py-0.5 text-[11px]", chip.bad ? "bg-white/90 text-danger" : "bg-white/20")}>
                        {chip.text}
                      </li>
                    ) : null;
                  })}
                </ul>
              )}
              {entry.timings && (
                <p className="mt-1 font-mono text-[10px] opacity-70">
                  {entry.typed ? "typed" : `Prisma ${entry.timings.sttMs ?? "–"}ms`}
                  {entry.timings.modelMs ? ` · model ${entry.timings.modelMs}ms` : ""}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function describeEvent(e: TurnEvent, labelOf: (key: string | null) => string): { text: string; bad?: boolean } | null {
  switch (e.type) {
    case "filled":
      return { text: `${e.corrected ? "Corrected" : "✓"} ${labelOf(e.key)}: ${e.display}` };
    case "rejected":
      return { text: `${labelOf(e.key)}: ${e.message}`, bad: true };
    case "unclear":
      return { text: "Not clear, asking again" };
    case "declined":
      return { text: `Declined${e.key ? `: ${labelOf(e.key)}` : ""}` };
    case "question":
      return { text: "Asked a question" };
    case "skipped":
      return { text: `${labelOf(e.key)} left for follow-up`, bad: true };
    default:
      return null;
  }
}
