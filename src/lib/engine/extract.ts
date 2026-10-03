import "server-only";
import { z } from "zod";
import type { FormField, FormTemplate } from "../forms/types";
import type { Language } from "../languages";
import { reasonJson, type ReasonResult } from "../reasoning";
import type { SessionState } from "./types";

export const extractionSchema = z.object({
  status: z.enum(["answered", "unclear", "declined", "question"]),
  updates: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      quote: z.string(),
      confidence: z.enum(["high", "low"]),
      is_correction: z.boolean(),
    }),
  ),
  reply: z.string().nullable(),
});

export type Extraction = z.infer<typeof extractionSchema>;

function jsonSchemaFor(template: FormTemplate) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["status", "updates", "reply"],
    properties: {
      status: { type: "string", enum: ["answered", "unclear", "declined", "question"] },
      updates: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["key", "value", "quote", "confidence", "is_correction"],
          properties: {
            key: { type: "string", enum: template.fields.map((f) => f.key) },
            value: { type: "string" },
            quote: { type: "string" },
            confidence: { type: "string", enum: ["high", "low"] },
            is_correction: { type: "boolean" },
          },
        },
      },
      reply: { type: ["string", "null"] },
    },
  };
}

const VALUE_FORMATS: Record<FormField["type"], string> = {
  text: "English text; transliterate names and places into English letters, keep proper nouns as spoken",
  number: 'digits only, decimals allowed (e.g. "2.5")',
  currency: 'whole rupees as digits only (e.g. "250000" for dhai lakh)',
  date: "YYYY-MM-DD",
  phone: "the digits as spoken, digits only",
  pincode: "6 digits",
  choice: "exactly one of the listed options",
  yesno: '"yes" or "no"',
};

function systemPrompt(language: Language, today: string) {
  return [
    "You are the understanding layer of Bolo, a voice assistant that fills forms for people in India.",
    "The person heard a question and answered aloud. Speech-to-text produced the transcript, which may be",
    "in Hindi, Hinglish or another Indian language, and may contain recognition errors and numbers in words.",
    "",
    "Propose field values ONLY from what the person actually said. Never guess or invent a value.",
    "- Extract the asked field, plus any other form fields the person clearly volunteered.",
    "- If the person corrects an earlier answer, output the new value with is_correction true.",
    "- Convert spoken quantities: dhai = 2.5, dedh = 1.5, sava X = X + 0.25, saadhe X = X + 0.5,",
    "  paune X = X - 0.25, hazaar = 1,000, lakh = 100,000, crore = 10,000,000.",
    `- Resolve relative dates (aaj, kal, parson, last Monday) against today's date: ${today}.`,
    "  'kal' about a past event means yesterday.",
    "- quote: the exact words from the transcript that support the value.",
    "- confidence: low if the audio seems garbled or you had to interpret loosely.",
    "",
    "status:",
    "- answered: at least one usable value was given.",
    "- unclear: no usable value (noise, unrelated words, cut off).",
    "- declined: the person refuses, does not know, or asks to skip.",
    "- question: the person asked something back; put a one-sentence answer in reply,",
    `  written in ${language.replyStyle}. Otherwise reply is null.`,
    "Return only JSON matching the schema.",
  ].join("\n");
}

function describeField(f: FormField) {
  const parts = [`${f.key} (${f.type}${f.required ? ", required" : ", optional"}): ${f.label}. ${f.hint}`];
  parts.push(`Value format: ${VALUE_FORMATS[f.type]}.`);
  if (f.options) parts.push(`Options: ${f.options.join(" | ")}.`);
  return `- ${parts.join(" ")}`;
}

function userPrompt(template: FormTemplate, state: SessionState, askedText: string | null, transcript: string) {
  const filled = Object.entries(state.values).map(([k, v]) => `- ${k} = ${v.display}`);
  const recent = state.history.slice(-3).map((h) => `- asked ${h.askedKey ?? "(none)"}: "${h.transcript}"`);
  return [
    `Form: ${template.title}`,
    "Fields:",
    ...template.fields.map(describeField),
    "",
    `Already filled:\n${filled.length ? filled.join("\n") : "- (nothing yet)"}`,
    recent.length ? `\nRecent answers:\n${recent.join("\n")}` : "",
    "",
    `Question just asked: ${state.current?.key ?? "(none)"}${askedText ? ` - "${askedText}"` : ""}`,
    `Transcript of the answer: "${transcript}"`,
  ].join("\n");
}

export async function extractAnswer(args: {
  template: FormTemplate;
  language: Language;
  state: SessionState;
  askedText: string | null;
  transcript: string;
  today: string;
}): Promise<{ extraction: Extraction; meta: ReasonResult }> {
  const { data, meta } = await reasonJson(
    {
      messages: [
        { role: "system", content: systemPrompt(args.language, args.today) },
        { role: "user", content: userPrompt(args.template, args.state, args.askedText, args.transcript) },
      ],
      jsonSchema: { name: "extraction", schema: jsonSchemaFor(args.template) },
      maxTokens: 1024,
    },
    extractionSchema,
  );
  return { extraction: data, meta };
}
