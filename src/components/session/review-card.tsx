"use client";

import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, Volume2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { BoloSession } from "@/hooks/use-bolo-session";
import type { FormTemplate } from "@/lib/forms/types";

export function ReviewCard({
  session,
  template,
  speechLang,
  reasoningLabel,
}: {
  session: BoloSession;
  template: FormTemplate;
  speechLang: string;
  reasoningLabel: string;
}) {
  const { review, reviewError, readback, readbackFailed, player } = session;
  const labelOf = (key: string) => template.fields.find((f) => f.key === key)?.label ?? key;
  const errors = review?.issues.filter((i) => i.severity === "error").length ?? 0;

  return (
    <section aria-labelledby="review-heading" className="space-y-5 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">Step 2 of 2</p>
        <h2 id="review-heading" className="mt-1 text-lg font-semibold text-ink">
          Read-back and checks
        </h2>
      </div>

      <div className="rounded-xl bg-paper p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-ink-soft">Bolo reads it back</p>
          {readback && (
            <button
              type="button"
              onClick={() => session.replay(readback)}
              disabled={player.state === "loading" || player.state === "speaking"}
              className="inline-flex items-center gap-1.5 text-xs text-brand transition hover:text-brand-strong disabled:opacity-50"
            >
              <Volume2 className="h-3.5 w-3.5" aria-hidden />
              Play again
            </button>
          )}
        </div>
        {readback ? (
          <p lang={speechLang} className="leading-relaxed text-ink">
            {readback}
          </p>
        ) : readbackFailed ? (
          <p className="text-sm text-ink-faint">The spoken read-back could not be generated. The form on the right is the full record.</p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-ink-faint">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Preparing the read-back…
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-ink-soft">Checks</p>
        {review ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-ink">{review.summary}</p>
            {review.missing.length > 0 && (
              <p className="flex items-start gap-2 rounded-lg bg-marigold-soft px-3 py-2 text-sm text-warn">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Missing: {review.missing.map(labelOf).join(", ")}
              </p>
            )}
            {review.issues.length === 0 && review.missing.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-ok">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                All rule and plausibility checks passed.
              </p>
            ) : (
              <ul className="space-y-2">
                {review.issues.map((issue, i) => (
                  <li
                    key={i}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm",
                      issue.severity === "error" ? "border-danger/30 bg-danger-soft text-danger" : "border-marigold/40 bg-marigold-soft text-warn",
                    )}
                  >
                    <span className="mr-2 rounded bg-white/70 px-1.5 py-0.5 font-mono text-[10px] uppercase">
                      {issue.source === "rules" ? "rule" : "model"}
                    </span>
                    {issue.message}
                    <span className="mt-0.5 block text-xs opacity-80">{issue.keys.map(labelOf).join(" · ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : reviewError ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            <span>Checks failed: {reviewError}</span>
            <button type="button" onClick={session.retryReview} className="inline-flex items-center gap-1 font-medium">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Retry
            </button>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-ink-faint">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Validating fields and asking {reasoningLabel} for a plausibility check…
          </p>
        )}
      </div>

      <div className="space-y-2 border-t border-line pt-5">
        <button
          type="button"
          onClick={session.confirm}
          disabled={!review}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 font-medium text-white transition enabled:hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {errors > 0 ? `Confirm with ${errors} issue${errors > 1 ? "s" : ""} flagged` : "Confirm and finish"}
        </button>
        <p className="text-center text-xs text-ink-faint">Something wrong? Use Fix on any field to answer it again by voice.</p>
      </div>
    </section>
  );
}
