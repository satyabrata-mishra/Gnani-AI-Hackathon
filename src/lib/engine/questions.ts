import "server-only";
import { z } from "zod";
import type { FormTemplate } from "../forms/types";
import type { Language } from "../languages";
import { reasonJson } from "../reasoning";
import type { QuestionBank } from "./types";

// One model call per (form, language) produces every spoken line Bolo needs.
// Fixed lines keep turns to a single model call and let Timbre cache the audio.

const bankSchema = z.object({
  fields: z.array(z.object({ key: z.string(), ask: z.string().min(1), retry: z.string().min(1) })),
  unclear: z.string().min(1),
  done: z.string().min(1),
});

function jsonSchemaFor(template: FormTemplate) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["fields", "unclear", "done"],
    properties: {
      fields: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["key", "ask", "retry"],
          properties: {
            key: { type: "string", enum: template.fields.map((f) => f.key) },
            ask: { type: "string" },
            retry: { type: "string" },
          },
        },
      },
      unclear: { type: "string" },
      done: { type: "string" },
    },
  };
}

function systemPrompt(language: Language) {
  return [
    "You write the spoken lines for Bolo, a voice assistant that helps people in India fill forms by talking.",
    `Write every line in ${language.replyStyle}. The lines are read aloud by a text-to-speech voice.`,
    "Style: warm, respectful (use the polite form of address), short (under 18 words), one question per line,",
    "no emojis, no markdown, no lists. Spell out nothing in English letters unless the style says so.",
    "For each field write:",
    "- ask: the first time the question is asked.",
    "- retry: asked after an answer could not be accepted; restate briefly what format is needed",
    "  (for example 10 digits for a mobile number, a date with day, month and year).",
    "Also write:",
    "- unclear: a short line saying you did not catch that (the question is repeated after it).",
    "- done: a short thank-you line saying all details are recorded and will be read back.",
    "Return only JSON matching the schema.",
  ].join("\n");
}

function userPrompt(template: FormTemplate) {
  const lines = template.fields.map((f) => {
    const extras = [
      f.options ? `options: ${f.options.join(" / ")}` : null,
      f.unit ? `unit: ${f.unit}` : null,
      f.required ? null : "optional (say they can skip it)",
    ].filter(Boolean);
    return `- ${f.key}: ${f.label} (${f.type})${extras.length ? `; ${extras.join("; ")}` : ""}`;
  });
  return `Form: ${template.title} (${template.org})\nFields:\n${lines.join("\n")}`;
}

const cache = new Map<string, Promise<QuestionBank>>();

async function generate(template: FormTemplate, language: Language): Promise<QuestionBank> {
  const { data } = await reasonJson(
    {
      messages: [
        { role: "system", content: systemPrompt(language) },
        { role: "user", content: userPrompt(template) },
      ],
      jsonSchema: { name: "question_bank", schema: jsonSchemaFor(template) },
      maxTokens: 2048,
    },
    bankSchema,
  );

  const fields: QuestionBank["fields"] = {};
  for (const f of data.fields) fields[f.key] = { ask: f.ask.trim(), retry: f.retry.trim() };
  const missing = template.fields.filter((f) => !fields[f.key]).map((f) => f.key);
  if (missing.length) throw new Error(`Question bank is missing fields: ${missing.join(", ")}`);

  return { templateId: template.id, languageId: language.id, fields, unclear: data.unclear.trim(), done: data.done.trim() };
}

export function getQuestionBank(template: FormTemplate, language: Language): Promise<QuestionBank> {
  const key = `${template.id}:${language.id}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = generate(template, language);
    cache.set(key, pending);
    pending.catch(() => cache.delete(key));
  }
  return pending;
}
