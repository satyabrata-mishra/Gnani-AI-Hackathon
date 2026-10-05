import "server-only";
import { reason } from "../reasoning";
import { resolveSession } from "./turn";
import type { SessionState } from "./types";

/** Timbre requests are capped at 600 characters by /api/tts. */
const MAX_CHARS = 600;

function clip(text: string): string {
  if (text.length <= MAX_CHARS) return text;
  const cut = text.slice(0, MAX_CHARS);
  const lastStop = Math.max(cut.lastIndexOf("।"), cut.lastIndexOf("."), cut.lastIndexOf("?"));
  return lastStop > MAX_CHARS / 2 ? cut.slice(0, lastStop + 1) : cut;
}

export async function readBack(state: SessionState): Promise<{ text: string; latencyMs: number }> {
  const { template, language } = resolveSession(state.templateId, state.languageId);
  const lines = template.fields
    .filter((f) => state.values[f.key])
    .map((f) => `- ${f.label}: ${state.values[f.key].display}`);

  const { content, latencyMs } = await reason({
    messages: [
      {
        role: "system",
        content: [
          "You write a spoken read-back for Bolo, a voice assistant that just filled a form for someone in India.",
          `Write in ${language.replyStyle}. It is read aloud by a text-to-speech voice.`,
          "Briefly list every recorded detail in natural speech, then ask whether everything is correct.",
          "Copy each value exactly as written in the list: same digits, spacing and spelling. Never regroup or reformat numbers.",
          "Plain sentences only: no lists, no markdown, no emojis. Under 400 characters.",
        ].join("\n"),
      },
      { role: "user", content: `Form: ${template.title}\nRecorded details:\n${lines.join("\n")}` },
    ],
    maxTokens: 512,
  });

  return { text: clip(content.replace(/\s+/g, " ").trim()), latencyMs };
}
