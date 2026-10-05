"use client";

import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, Volume2 } from "lucide-react";
import type { BoloSession } from "@/hooks/use-bolo-session";
import type { FormTemplate } from "@/lib/forms/types";
import { CheckSummary, IssueList } from "../checks";

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
              className="-mr-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand transition hover:bg-brand-soft hover:text-brand-strong disabled:opacity-50"
            >
              <Volume2 className="h-4 w-4" aria-hidden />
              Play again
            </button>
          )}
        </div>
        {readback ? (
          <p lang={speechLang} className="text-lg leading-[1.6] text-ink">
            {readback}
          </p>
        ) : readbackFailed ? (
          <p className="text-sm text-ink-soft">The spoken read-back could not be generated. The live form is the full record.</p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Preparing the read-back…
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-ink-soft">Checks</p>
        {review ? (
          <div className="space-y-3">
            <CheckSummary issues={review.issues} />
            {review.missing.length > 0 && (
              <p className="flex items-start gap-2 rounded-lg bg-marigold-soft px-3 py-2 text-sm text-warn">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Missing: {review.missing.map(labelOf).join(", ")}
              </p>
            )}
            <IssueList issues={review.issues} labelOf={labelOf} />
            <div>
              <p className="text-xs font-medium text-ink-faint">AI-generated summary · the live form is the record</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{review.summary}</p>
            </div>
          </div>
        ) : reviewError ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            <span>Checks failed: {reviewError}</span>
            <button
              type="button"
              onClick={session.retryReview}
              className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 font-medium hover:bg-white/60"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Retry
            </button>
          </div>
        ) : (
          <div role="status" className="flex items-start gap-3 rounded-xl border border-line bg-paper p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            </span>
            <div>
              <p className="font-medium text-ink">Checking your answers</p>
              <p className="mt-0.5 text-sm text-ink-soft">
                Rules validate every field while {reasoningLabel} looks for answers that don&apos;t fit together. This
                can take a few seconds.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-line pt-5">
        {!review && !reviewError && (
          <p className="text-center text-sm text-ink-soft">You can confirm once the checks finish.</p>
        )}
        <button
          type="button"
          onClick={session.confirm}
          disabled={!review}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 font-semibold text-white transition enabled:hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {errors > 0 ? `Confirm with ${errors} issue${errors > 1 ? "s" : ""} flagged` : "Confirm and finish"}
        </button>
        <p className="text-center text-xs text-ink-faint">Something wrong? Use Fix on any field to answer it again by voice.</p>
      </div>
    </section>
  );
}
