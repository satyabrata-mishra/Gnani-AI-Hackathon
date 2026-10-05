import { z } from "zod";
import type { FieldType, FormField, FormIconName, FormTemplate } from "./types";

// Pure: shared by the builder UI, the API routes and `node --test`.

export const FIELD_TYPES = ["text", "number", "currency", "date", "phone", "pincode", "choice", "yesno"] as const satisfies readonly FieldType[];
export const FORM_ICONS = ["clipboard", "sprout", "car", "landmark", "heart", "home", "graduation"] as const satisfies readonly FormIconName[];

export const CUSTOM_PREFIX = "custom-";
export const MAX_FIELDS = 15;
export const MAX_OPTIONS = 10;

/** Bolo never collects government IDs, financial account details or secrets, even in demos. */
const SENSITIVE =
  /\b(aadhaa?r|pan|pan card|pan number|voter id|epic|passport|bank account|account (no|number)|ifsc|card number|debit card|credit card|cvv|otp|password|upi pin|atm pin|pin number)\b/i;

export function isSensitiveField(f: { key: string; label: string }): boolean {
  return SENSITIVE.test(`${f.label} ${f.key.replace(/_/g, " ")}`);
}

export function isCustomFormId(id: string): boolean {
  return id.startsWith(CUSTOM_PREFIX);
}

export function newCustomFormId(): string {
  return CUSTOM_PREFIX + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export function slugifyKey(label: string): string {
  const slug = label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  if (!slug) return "field";
  return /^[a-z]/.test(slug) ? slug : `f_${slug}`.slice(0, 40);
}

export function uniqueKey(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base.slice(0, 36)}_${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}

const fieldSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/, "Use lowercase letters, digits and underscores"),
  label: z.string().trim().min(1, "Add a label").max(60, "Keep the label under 60 characters"),
  type: z.enum(FIELD_TYPES),
  required: z.boolean(),
  hint: z.string().trim().max(300, "Keep the hint under 300 characters"),
  options: z.array(z.string().trim().min(1).max(40)).max(MAX_OPTIONS).optional(),
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
  unit: z.string().trim().max(20).optional(),
});

export const formTemplateSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{3,48}$/),
    title: z.string().trim().min(1, "Add a title").max(80, "Keep the title under 80 characters"),
    org: z.string().trim().max(60),
    summary: z.string().trim().max(240),
    icon: z.enum(FORM_ICONS),
    fields: z.array(fieldSchema).min(1, "Add at least one field").max(MAX_FIELDS, `Use at most ${MAX_FIELDS} fields`),
  })
  .superRefine((t, ctx) => {
    const seen = new Set<string>();
    t.fields.forEach((f, i) => {
      const at = (key: string) => ["fields", i, key];
      if (seen.has(f.key)) ctx.addIssue({ code: "custom", path: at("key"), message: `Another field already uses "${f.key}"` });
      seen.add(f.key);
      if (f.type === "choice" && (f.options?.length ?? 0) < 2) {
        ctx.addIssue({ code: "custom", path: at("options"), message: "A choice needs at least two options" });
      }
      if (f.min !== undefined && f.max !== undefined && f.min > f.max) {
        ctx.addIssue({ code: "custom", path: at("max"), message: "Max must be at least min" });
      }
      if (isSensitiveField(f)) {
        ctx.addIssue({ code: "custom", path: at("label"), message: "Bolo never collects ID numbers, bank details or passwords" });
      }
    });
  });

export interface TemplateIssue {
  /** Index of the field the issue belongs to, or null for form-level issues. */
  field: number | null;
  message: string;
}

export type TemplateCheck = { ok: true; template: FormTemplate } | { ok: false; issues: TemplateIssue[] };

export function checkTemplate(input: unknown): TemplateCheck {
  const parsed = formTemplateSchema.safeParse(input);
  if (parsed.success) return { ok: true, template: parsed.data };
  return {
    ok: false,
    issues: parsed.error.issues.map((issue) => ({
      field: issue.path[0] === "fields" && typeof issue.path[1] === "number" ? issue.path[1] : null,
      message: issue.message,
    })),
  };
}

/** What the reasoning model returns when drafting a form from a description. */
export interface FormDraft {
  title: string;
  org: string;
  summary: string;
  icon: string;
  fields: {
    label: string;
    type: string;
    required: boolean;
    hint: string;
    options: string[];
    min: number | null;
    max: number | null;
    unit: string | null;
  }[];
}

/** Turns a model draft into a template the schema accepts, dropping anything Bolo must not collect. */
export function normaliseDraft(draft: FormDraft, id: string): { template: FormTemplate; notes: string[] } {
  const notes: string[] = [];
  const taken = new Set<string>();
  const fields: FormField[] = [];

  for (const raw of draft.fields) {
    const label = raw.label.trim().slice(0, 60);
    if (!label) continue;
    const type = (FIELD_TYPES as readonly string[]).includes(raw.type) ? (raw.type as FieldType) : "text";
    const key = uniqueKey(slugifyKey(label), taken);
    if (isSensitiveField({ key, label })) {
      notes.push(`Left out "${label}": Bolo never collects ID numbers, bank details or passwords.`);
      continue;
    }
    if (fields.length === MAX_FIELDS) {
      notes.push(`Kept the first ${MAX_FIELDS} fields; a voice form longer than that tires people out.`);
      break;
    }
    taken.add(key);

    const field: FormField = { key, label, type, required: Boolean(raw.required), hint: raw.hint.trim().slice(0, 300) };
    if (type === "choice") {
      const options = [...new Set(raw.options.map((o) => o.trim().slice(0, 40)).filter(Boolean))].slice(0, MAX_OPTIONS);
      if (options.length >= 2) field.options = options;
      else {
        field.type = "text";
        notes.push(`"${label}" had no usable options, so it takes a free-text answer.`);
      }
    }
    if (type === "number" || type === "currency") {
      if (raw.min !== null && Number.isFinite(raw.min)) field.min = raw.min;
      if (raw.max !== null && Number.isFinite(raw.max)) field.max = raw.max;
      if (field.min !== undefined && field.max !== undefined && field.min > field.max) delete field.max;
      if (type === "currency") {
        field.unit = "INR";
        field.min ??= 0;
      } else if (raw.unit?.trim()) field.unit = raw.unit.trim().slice(0, 20);
    }
    fields.push(field);
  }

  const icon = (FORM_ICONS as readonly string[]).includes(draft.icon) ? (draft.icon as FormIconName) : "clipboard";
  return {
    template: {
      id,
      title: draft.title.trim().slice(0, 80) || "Untitled form",
      org: draft.org.trim().slice(0, 60),
      summary: draft.summary.trim().slice(0, 240),
      icon,
      fields,
    },
    notes,
  };
}

/** A blank field for the builder's "Add field" button. */
export function blankField(taken: Set<string>): FormField {
  return { key: uniqueKey("new_field", taken), label: "", type: "text", required: true, hint: "" };
}
