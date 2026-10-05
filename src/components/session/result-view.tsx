"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, FileCheck2, RotateCcw } from "lucide-react";
import type { BoloSession } from "@/hooks/use-bolo-session";
import type { FormTemplate } from "@/lib/forms/types";
import type { Language } from "@/lib/languages";
import { ClipButton } from "./clip-button";

export function ResultView({
  session,
  template,
  language,
  reasoningLabel,
}: {
  session: BoloSession;
  template: FormTemplate;
  language: Language;
  reasoningLabel: string;
}) {
  const { state, review, clips, completedAt } = session;
  const [copied, setCopied] = useState(false);

  const exported = useMemo(() => {
    if (!state || !review || !completedAt) return null;
    const evidence = Object.fromEntries(
      Object.entries(state.values).map(([key, f]) => [
        key,
        { display: f.display, quote: f.quote, confidence: f.confidence, turn: f.turn },
      ]),
    );
    return {
      form: template.id,
      language: language.id,
      completedAt,
      record: review.record,
      evidence,
      needsFollowUp: [...new Set([...review.missing, ...state.skipped])],
      issues: review.issues,
      summary: review.summary,
      models: { stt: "Gnani Prisma", tts: "Gnani Timbre", reasoning: `${reasoningLabel} (${review.meta.model})` },
    };
  }, [completedAt, language.id, reasoningLabel, review, state, template.id]);

  if (!state || !review || !exported) return null;
  const json = JSON.stringify(exported, null, 2);

  function download() {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `bolo-${template.id}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section aria-labelledby="result-heading" className="space-y-5 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ok-soft text-ok">
          <FileCheck2 className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 id="result-heading" className="text-lg font-semibold text-ink">
            Form complete
          </h2>
          <p className="text-sm text-ink-soft">
            Answered in {language.name}, delivered as validated English data with the audio behind each field.
          </p>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-ink-faint">
            <th className="pb-2 font-medium">Field</th>
            <th className="pb-2 font-medium">Value</th>
            <th className="pb-2 text-right font-medium">Evidence</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {template.fields.map((field) => {
            const filled = state.values[field.key];
            const clip = filled ? clips[filled.turn] : undefined;
            return (
              <tr key={field.key}>
                <td className="py-2 pr-3 text-ink-soft">{field.label}</td>
                <td className="py-2 pr-3 font-medium text-ink">
                  {filled ? filled.display : <span className="font-normal text-warn">Needs follow-up</span>}
                </td>
                <td className="py-2 text-right">
                  {clip ? (
                    <ClipButton url={clip} label={`answer for ${field.label}`} />
                  ) : filled ? (
                    <span className="text-xs text-ink-faint">typed</span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <details className="rounded-xl border border-line">
        <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-ink-soft">JSON for your system</summary>
        <pre className="max-h-72 overflow-auto border-t border-line bg-paper p-4 font-mono text-xs leading-relaxed text-ink-soft">
          {json}
        </pre>
      </details>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={download}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-strong"
        >
          <Download className="h-4 w-4" aria-hidden />
          Download JSON
        </button>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:border-line-strong"
        >
          {copied ? <Check className="h-4 w-4 text-ok" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:border-line-strong"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          New session
        </Link>
      </div>
    </section>
  );
}
