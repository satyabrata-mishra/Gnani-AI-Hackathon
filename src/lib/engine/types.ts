import { z } from "zod";
import type { CrossFieldIssue } from "../forms/checks";
import type { RejectReason } from "../forms/validate";

// Shared by the API routes and the browser. The browser holds session state and
// sends it back each turn, so the server stays stateless.

const fieldValue = z.union([z.string(), z.number(), z.boolean()]);

export const filledFieldSchema = z.object({
  value: fieldValue,
  display: z.string(),
  /** Words from the transcript that support the value (evidence). */
  quote: z.string(),
  turn: z.number().int().nonnegative(),
  confidence: z.enum(["high", "low"]),
});

export const promptKindSchema = z.enum(["ask", "retry", "clarify"]);

export const sessionStateSchema = z.object({
  templateId: z.string(),
  languageId: z.string(),
  turn: z.number().int().nonnegative(),
  values: z.record(z.string(), filledFieldSchema),
  /** Fields the person declined or that failed repeatedly; flagged for human review. */
  skipped: z.array(z.string()),
  current: z
    .object({ key: z.string(), kind: promptKindSchema, attempts: z.number().int().nonnegative() })
    .nullable(),
  history: z.array(z.object({ askedKey: z.string().nullable(), transcript: z.string() })).max(8),
  done: z.boolean(),
});

export type FilledField = z.infer<typeof filledFieldSchema>;
export type PromptKind = z.infer<typeof promptKindSchema>;
export type SessionState = z.infer<typeof sessionStateSchema>;

export interface QuestionBank {
  languageId: string;
  templateId: string;
  fields: Record<string, { ask: string; retry: string }>;
  unclear: string;
  done: string;
}

export interface SpokenPrompt {
  /** Field being asked about, or null when the form is complete. */
  key: string | null;
  kind: PromptKind | "done";
  text: string;
}

export type TurnEvent =
  | { type: "filled"; key: string; display: string; quote: string; confidence: "high" | "low"; corrected: boolean }
  | { type: "rejected"; key: string; proposed: string; reason: RejectReason; message: string }
  | { type: "ignored"; key: string; proposed: string }
  | { type: "unclear"; key: string | null }
  | { type: "declined"; key: string | null }
  | { type: "question"; key: string | null }
  | { type: "skipped"; key: string };

export interface ModelMeta {
  provider: string;
  model: string;
  latencyMs: number;
}

export interface TurnResult {
  state: SessionState;
  events: TurnEvent[];
  prompt: SpokenPrompt;
  meta: ModelMeta;
}

export interface ReviewResult {
  record: Record<string, string | number | boolean>;
  issues: (CrossFieldIssue & { source: "rules" | "model" })[];
  summary: string;
  missing: string[];
  meta: ModelMeta;
}
