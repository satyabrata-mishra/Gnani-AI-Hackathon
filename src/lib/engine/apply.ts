import { validateField } from "../forms/validate.ts";
import type { FormTemplate } from "../forms/types";
import type { Extraction } from "./extract";
import type { QuestionBank, SessionState, SpokenPrompt, TurnEvent } from "./types";

// The deterministic half of a turn: the model proposes, this code decides.
// Pure (no I/O), so it is unit-tested under `node --test`.

/** Asks per field before it is skipped and flagged for human review. */
export const MAX_ATTEMPTS = 3;
const HISTORY_LIMIT = 8;

export function startSession(template: FormTemplate, languageId: string): SessionState {
  return {
    templateId: template.id,
    languageId,
    turn: 0,
    values: {},
    skipped: [],
    current: { key: template.fields[0].key, kind: "ask", attempts: 0 },
    history: [],
    done: false,
  };
}

export function applyExtraction(
  template: FormTemplate,
  state: SessionState,
  extraction: Extraction,
  transcript: string,
  today: string,
): { state: SessionState; events: TurnEvent[] } {
  const events: TurnEvent[] = [];
  const values = { ...state.values };
  const asked = state.current?.key ?? null;
  const turn = state.turn + 1;
  let askedRejected = false;

  for (const update of extraction.updates) {
    const field = template.fields.find((f) => f.key === update.key);
    const existing = values[update.key];
    // Volunteered values never silently overwrite earlier answers; only explicit corrections do.
    if (!field || (existing && !update.is_correction && update.key !== asked)) {
      events.push({ type: "ignored", key: update.key, proposed: update.value });
      continue;
    }

    const result = validateField(field, update.value, { today });
    if (!result.ok) {
      events.push({ type: "rejected", key: field.key, proposed: update.value, reason: result.reason, message: result.message });
      if (field.key === asked) askedRejected = true;
      continue;
    }
    if (existing && existing.value === result.value) continue;

    values[field.key] = { value: result.value, display: result.display, quote: update.quote, turn, confidence: update.confidence };
    events.push({
      type: "filled",
      key: field.key,
      display: result.display,
      quote: update.quote,
      confidence: update.confidence,
      corrected: Boolean(existing),
    });
  }

  if (extraction.status !== "answered") events.push({ type: extraction.status, key: asked });

  const skipped = state.skipped.filter((k) => !values[k]);
  let current: SessionState["current"] = null;

  if (asked && !values[asked]) {
    const field = template.fields.find((f) => f.key === asked);
    const attempts = (state.current?.attempts ?? 0) + 1;
    const declined = extraction.status === "declined";
    const giveUp = attempts >= MAX_ATTEMPTS || (declined && (!field?.required || attempts >= 2));

    if (giveUp) {
      if (!skipped.includes(asked)) skipped.push(asked);
      events.push({ type: "skipped", key: asked });
    } else {
      const kind = askedRejected || declined ? "retry" : extraction.status === "question" ? "ask" : "clarify";
      current = { key: asked, kind, attempts };
    }
  }

  if (!current) {
    const next = template.fields.find((f) => !values[f.key] && !skipped.includes(f.key));
    current = next ? { key: next.key, kind: "ask", attempts: 0 } : null;
  }

  return {
    state: {
      ...state,
      turn,
      values,
      skipped,
      current,
      history: [...state.history, { askedKey: asked, transcript }].slice(-HISTORY_LIMIT),
      done: current === null,
    },
    events,
  };
}

export function promptFor(state: SessionState, bank: QuestionBank, extraction?: Extraction): SpokenPrompt {
  if (!state.current) return { key: null, kind: "done", text: bank.done };

  const { key, kind } = state.current;
  const lines = bank.fields[key];
  const question = kind === "retry" ? lines.retry : lines.ask;
  const lead =
    extraction?.status === "question" && extraction.reply
      ? extraction.reply
      : kind === "clarify"
        ? bank.unclear
        : "";
  return { key, kind, text: lead ? `${lead} ${question}` : question };
}
