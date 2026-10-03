import "server-only";
import { ServiceError } from "../errors";
import { getFormTemplate } from "../forms/templates";
import type { FormTemplate } from "../forms/types";
import { todayInIndia } from "../forms/validate";
import { getLanguage, type Language } from "../languages";
import { applyExtraction, promptFor, startSession } from "./apply";
import { extractAnswer, type Extraction } from "./extract";
import { getQuestionBank } from "./questions";
import type { QuestionBank, SessionState, SpokenPrompt, TurnResult } from "./types";

export function resolveSession(templateId: string, languageId: string): { template: FormTemplate; language: Language } {
  const template = getFormTemplate(templateId);
  if (!template) throw new ServiceError("config", `Unknown form "${templateId}"`, 400, "UNKNOWN_FORM");
  const language = getLanguage(languageId);
  if (!language) throw new ServiceError("config", `Unknown language "${languageId}"`, 400, "UNKNOWN_LANGUAGE");
  return { template, language };
}

export async function beginSession(
  templateId: string,
  languageId: string,
): Promise<{ state: SessionState; prompt: SpokenPrompt; bank: QuestionBank }> {
  const { template, language } = resolveSession(templateId, languageId);
  const bank = await getQuestionBank(template, language);
  const state = startSession(template, language.id);
  return { state, prompt: promptFor(state, bank), bank };
}

const UNCLEAR: Extraction = { status: "unclear", updates: [], reply: null };

export async function runTurn(state: SessionState, transcript: string): Promise<TurnResult> {
  const { template, language } = resolveSession(state.templateId, state.languageId);
  if (state.done || !state.current) {
    throw new ServiceError("config", "This session is already complete", 409, "SESSION_DONE");
  }

  const bank = await getQuestionBank(template, language);
  const today = todayInIndia();
  const cleaned = transcript.trim();
  const askedText = bank.fields[state.current.key]?.ask ?? null;

  // Silence or a failed recording never needs a model call.
  const { extraction, meta } = cleaned
    ? await extractAnswer({ template, language, state, askedText, transcript: cleaned, today })
    : { extraction: UNCLEAR, meta: null };

  const next = applyExtraction(template, state, extraction, cleaned, today);
  return {
    state: next.state,
    events: next.events,
    prompt: promptFor(next.state, bank, extraction),
    meta: meta
      ? { provider: meta.provider, model: meta.model, latencyMs: meta.latencyMs }
      : { provider: "none", model: "none", latencyMs: 0 },
  };
}
