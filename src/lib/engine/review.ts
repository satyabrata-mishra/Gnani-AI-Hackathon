import "server-only";
import { z } from "zod";
import { crossFieldIssues } from "../forms/checks";
import type { FormTemplate } from "../forms/types";
import { todayInIndia, validateField, type FieldValue } from "../forms/validate";
import { reasonJson } from "../reasoning";
import { resolveSession } from "./turn";
import type { ReviewResult, SessionState } from "./types";

const reviewSchema = z.object({
  summary: z.string(),
  issues: z.array(
    z.object({ keys: z.array(z.string()).min(1), severity: z.enum(["error", "warning"]), message: z.string() }),
  ),
});

function jsonSchemaFor(template: FormTemplate) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["summary", "issues"],
    properties: {
      summary: { type: "string" },
      issues: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["keys", "severity", "message"],
          properties: {
            keys: { type: "array", items: { type: "string", enum: template.fields.map((f) => f.key) } },
            severity: { type: "string", enum: ["error", "warning"] },
            message: { type: "string" },
          },
        },
      },
    },
  };
}

const SYSTEM_PROMPT = [
  "You review a form that Bolo filled from a spoken conversation in an Indian language.",
  "Each value comes with the exact words (quote) the person said. Check whether each value is faithful to its",
  "quote and whether the values are plausible together (for example age vs date of birth, income vs loan amount,",
  "crop vs land size). Do not flag formatting, and do not repeat issues already listed under 'Rule checks'.",
  "Only report real problems a human reviewer should look at; an empty list is a good outcome.",
  "summary: two sentences in plain English for the reviewing officer, describing the applicant and the request.",
  "Return only JSON matching the schema.",
].join("\n");

export async function reviewSession(state: SessionState): Promise<ReviewResult> {
  const { template } = resolveSession(state.templateId, state.languageId);
  const today = todayInIndia();

  // Re-validate everything: session state comes back from the browser.
  const record: Record<string, FieldValue> = {};
  const issues: ReviewResult["issues"] = [];
  for (const field of template.fields) {
    const filled = state.values[field.key];
    if (!filled) continue;
    const result = validateField(field, String(filled.value), { today });
    if (result.ok) record[field.key] = result.value;
    else issues.push({ keys: [field.key], severity: "error", message: result.message, source: "rules" });
  }
  const missing = template.fields.filter((f) => f.required && record[f.key] === undefined).map((f) => f.key);
  for (const issue of crossFieldIssues(template.id, record, today)) issues.push({ ...issue, source: "rules" });

  const lines = template.fields.map((f) => {
    const filled = state.values[f.key];
    return filled
      ? `- ${f.key} (${f.label}) = ${filled.display} | quote: "${filled.quote}" | confidence: ${filled.confidence}`
      : `- ${f.key} (${f.label}) = (not provided)`;
  });
  const ruleLines = issues.map((i) => `- [${i.keys.join(", ")}] ${i.message}`);

  const { data, meta } = await reasonJson(
    {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            `Form: ${template.title} (${template.org}). Today: ${today}.`,
            "Values:",
            ...lines,
            "",
            `Rule checks:\n${ruleLines.length ? ruleLines.join("\n") : "- none"}`,
          ].join("\n"),
        },
      ],
      thinking: true,
      jsonSchema: { name: "form_review", schema: jsonSchemaFor(template) },
      maxTokens: 4096,
      timeoutMs: 90_000,
    },
    reviewSchema,
  );

  for (const issue of data.issues) issues.push({ ...issue, source: "model" });

  return {
    record,
    issues,
    summary: data.summary,
    missing,
    meta: { provider: meta.provider, model: meta.model, latencyMs: meta.latencyMs },
  };
}
