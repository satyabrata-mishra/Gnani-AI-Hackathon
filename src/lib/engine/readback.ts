import "server-only";
import type { FormTemplate } from "../forms/types";
import { usesNativeScript } from "../languages";
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

export async function readBack(state: SessionState, custom?: FormTemplate): Promise<{ text: string; latencyMs: number }> {
  const { template, language } = resolveSession(state.templateId, state.languageId, custom);
  const lines = template.fields
    .filter((f) => state.values[f.key])
    .map((f) => `- ${f.label}: ${state.values[f.key].display}`);

  const system = [
    "You write a spoken read-back for Bolo, a voice assistant that just filled a form for someone in India.",
    `Write in ${language.replyStyle}. It is read aloud by a text-to-speech voice.`,
    "Use the script named in the style for the sentences, even though the details below are in English.",
    "Briefly list every recorded detail in natural speech, then ask whether everything is correct.",
    "Copy each value exactly as written in the list: same digits, spacing and spelling. Never regroup or reformat numbers.",
    "Plain sentences only: no lists, no markdown, no emojis. Under 400 characters.",
  ].join("\n");
  const user = `Form: ${template.title}\nRecorded details:\n${lines.join("\n")}`;

  let latencyMs = 0;
  let text = "";
  // One retry if the model drifts into Roman script; Timbre reads native script best.
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await reason({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      maxTokens: 512,
    });
    latencyMs += result.latencyMs;
    text = clip(result.content.replace(/\s+/g, " ").trim());
    if (usesNativeScript([text], language)) break;
  }
  return { text, latencyMs };
}
