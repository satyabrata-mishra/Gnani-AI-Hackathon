import "server-only";
import { z } from "zod";
import { ServiceError } from "../errors";
import { reasonJson } from "../reasoning";
import { checkTemplate, FIELD_TYPES, FORM_ICONS, MAX_FIELDS, newCustomFormId, normaliseDraft } from "./schema";
import type { FormTemplate } from "./types";

const draftSchema = z.object({
  title: z.string(),
  org: z.string(),
  summary: z.string(),
  icon: z.string(),
  fields: z.array(
    z.object({
      label: z.string(),
      type: z.string(),
      required: z.boolean(),
      hint: z.string(),
      options: z.array(z.string()),
      min: z.number().nullable(),
      max: z.number().nullable(),
      unit: z.string().nullable(),
    }),
  ),
  omitted: z.array(z.string()),
});

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "org", "summary", "icon", "fields", "omitted"],
  properties: {
    title: { type: "string" },
    org: { type: "string" },
    summary: { type: "string" },
    icon: { type: "string", enum: [...FORM_ICONS] },
    fields: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "type", "required", "hint", "options", "min", "max", "unit"],
        properties: {
          label: { type: "string" },
          type: { type: "string", enum: [...FIELD_TYPES] },
          required: { type: "boolean" },
          hint: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          min: { type: ["number", "null"] },
          max: { type: ["number", "null"] },
          unit: { type: ["string", "null"] },
        },
      },
    },
    omitted: { type: "array", items: { type: "string" } },
  },
};

const SYSTEM_PROMPT = [
  "You design forms for Bolo, which fills forms by asking questions aloud in Indian languages and extracting the answers.",
  "Turn the description (English, Hindi or Hinglish) into a short form that works well as a spoken conversation.",
  "Field types:",
  "- text: names, places, short descriptions",
  "- number: counts and measurements; give a unit and a sensible min and max",
  "- currency: amounts in whole rupees",
  "- date: calendar dates (date of birth, incident date)",
  "- phone: Indian 10-digit mobile number",
  "- pincode: Indian 6-digit PIN code",
  "- choice: one of 2 to 8 fixed options, written in English",
  "- yesno: yes or no questions",
  "Rules:",
  `- 3 to 12 fields (never more than ${MAX_FIELDS}), in the order a person would naturally answer them.`,
  "- One fact per field. Labels are short English Title Case (\"Date of birth\").",
  "- hint: one English sentence telling the extractor what counts as a valid answer and how to normalise it.",
  "- options only for choice fields; otherwise an empty list. min, max and unit are null when they do not apply.",
  "- Mark a field required only if the form is useless without it.",
  "- Never include Aadhaar, PAN, passport, voter ID, bank account, IFSC, card numbers, OTPs or passwords,",
  "  even if the description asks for them. List each requested item you left out in omitted (short English name).",
  "- title: short English form name. org: generic issuer ending in \"(demo)\". summary: one sentence.",
  "- icon: sprout (farming), car (vehicles), landmark (banking, government), heart (health), home (housing, ration),",
  "  graduation (education), clipboard (anything else).",
  "Return only JSON matching the schema.",
].join("\n");

export async function draftForm(description: string): Promise<{ template: FormTemplate; notes: string[]; latencyMs: number }> {
  const { data, meta } = await reasonJson(
    {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: description },
      ],
      jsonSchema: { name: "form_draft", schema: JSON_SCHEMA },
      maxTokens: 4096,
      timeoutMs: 60_000,
    },
    draftSchema,
  );

  const { template, notes } = normaliseDraft(data, newCustomFormId());
  for (const item of data.omitted.slice(0, 5)) {
    notes.unshift(`Left out "${item.slice(0, 60)}": Bolo never collects ID numbers, bank details or passwords.`);
  }
  const check = checkTemplate(template);
  if (!check.ok) {
    throw new ServiceError(meta.provider, `The drafted form was not usable: ${check.issues[0].message}`, 502, "INVALID_DRAFT");
  }
  return { template: check.template, notes, latencyMs: meta.latencyMs };
}
