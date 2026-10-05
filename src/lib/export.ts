import type { FilledField, ReviewResult } from "./engine/types";
import type { FormTemplate } from "./forms/types";

export function buildRecordExport(input: {
  template: FormTemplate;
  languageId: string;
  completedAt: string;
  values: Record<string, FilledField>;
  skipped: string[];
  review: ReviewResult;
}) {
  const { template, languageId, completedAt, values, skipped, review } = input;
  return {
    form: { id: template.id, title: template.title },
    language: languageId,
    completedAt,
    record: review.record,
    evidence: Object.fromEntries(
      Object.entries(values).map(([key, f]) => [key, { display: f.display, quote: f.quote, confidence: f.confidence, turn: f.turn }]),
    ),
    needsFollowUp: [...new Set([...review.missing, ...skipped])],
    issues: review.issues,
    summary: review.summary,
    models: {
      stt: "Gnani Prisma",
      tts: "Gnani Timbre",
      reasoning: `${review.meta.provider}/${review.meta.model}`,
    },
  };
}

export function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
