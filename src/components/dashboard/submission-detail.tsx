"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Download, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { buildRecordExport, downloadJson } from "@/lib/export";
import { getLanguage } from "@/lib/languages";
import { deleteSubmission, getSubmission, type Submission } from "@/lib/storage/submissions";
import { useConfirm } from "../confirm-dialog";
import { FormIcon } from "../form-icon";
import { ClipButton } from "../session/clip-button";
import { CheckSummary, IssueList } from "../checks";
import { formatWhen, headline } from "./submission-list";

type Loaded = { submission: Submission; clips: Record<number, string> } | "missing" | "error" | null;

export function SubmissionDetail({ id }: { id: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [loaded, setLoaded] = useState<Loaded>(null);

  useEffect(() => {
    let urls: string[] = [];
    let cancelled = false;
    getSubmission(id).then(
      (submission) => {
        if (cancelled) return;
        if (!submission) return setLoaded("missing");
        const clips = Object.fromEntries(
          Object.entries(submission.clips).map(([turn, blob]) => [Number(turn), URL.createObjectURL(blob)]),
        );
        urls = Object.values(clips);
        setLoaded({ submission, clips });
      },
      () => !cancelled && setLoaded("error"),
    );
    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [id]);

  if (loaded === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-faint">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading submission…
      </p>
    );
  }
  if (loaded === "missing" || loaded === "error") {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6">
        <p className="font-medium text-ink">
          {loaded === "missing" ? "This submission isn't stored in this browser" : "This browser's storage could not be read"}
        </p>
        <Link href="/dashboard" className="mt-2 inline-block text-sm text-brand hover:text-brand-strong">
          Back to submissions
        </Link>
      </div>
    );
  }

  const { submission: s, clips } = loaded;
  const language = getLanguage(s.languageId);
  const speechLang = language?.stt ?? "en-IN";
  const labelOf = (key: string) => s.template.fields.find((f) => f.key === key)?.label ?? key;
  const followUps = [...new Set([...s.review.missing, ...s.skipped])];

  async function remove() {
    const ok = await confirm({
      title: "Delete this submission?",
      message: `The record for ${headline(s)} and all its recordings will be removed from this browser. This can't be undone.`,
      confirmLabel: "Delete submission",
    });
    if (!ok) return;
    await deleteSubmission(s.id);
    router.push("/dashboard");
  }

  function download() {
    downloadJson(
      buildRecordExport({
        template: s.template,
        languageId: s.languageId,
        completedAt: s.createdAt,
        values: s.values,
        skipped: s.skipped,
        review: s.review,
      }),
      `bolo-${s.template.id}-${s.id.slice(0, 8)}.json`,
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All submissions
      </Link>

      <header className="flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <FormIcon icon={s.template.icon} className="h-6 w-6" />
        </span>
        {/* The min width pushes the actions onto their own line on phones instead of squeezing the title. */}
        <div className="min-w-48 flex-1">
          <h1 className="font-display text-3xl tracking-tight text-ink">{headline(s)}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {s.template.title} · answered in {language?.name ?? s.languageId} · {formatWhen(s.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={download}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink-soft transition hover:border-line-strong"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download JSON
          </button>
          <button
            type="button"
            onClick={remove}
            aria-label="Delete submission"
            className="inline-flex items-center rounded-xl border border-line px-3 py-2 text-ink-faint transition hover:border-danger/40 hover:text-danger"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </header>

      <section className="space-y-3 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">AI-generated summary</p>
          <p className="mt-0.5 text-xs text-ink-faint">For orientation only. The record and evidence below are authoritative.</p>
        </div>
        <p className="leading-relaxed text-ink">{s.review.summary}</p>
        <CheckSummary issues={s.review.issues} />
        {followUps.length > 0 && (
          <p className="flex items-start gap-2 rounded-lg border border-marigold/40 bg-marigold-soft px-3 py-2 text-sm text-warn">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Needs follow-up: {followUps.map(labelOf).join(", ")}
          </p>
        )}
        <IssueList issues={s.review.issues} labelOf={labelOf} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">Record and evidence</p>
          <p className="hidden text-xs text-ink-faint sm:block">Captured value → citizen said → original audio</p>
        </div>
        <ul className="divide-y divide-line">
          {s.template.fields.map((field) => {
            const filled = s.values[field.key];
            const clip = filled ? clips[filled.turn] : undefined;
            const issue = s.review.issues.find((i) => i.keys.includes(field.key));
            const flagged = !filled || filled.confidence === "low" || Boolean(issue);
            return (
              <li
                key={field.key}
                className={cn(
                  "grid gap-1 border-l-[3px] px-5 py-3 sm:grid-cols-[180px_1fr]",
                  !flagged ? "border-transparent" : issue?.severity === "error" ? "border-danger" : "border-marigold",
                )}
              >
                <span className="text-sm text-ink-soft">{field.label}</span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                    {filled ? filled.display : <span className="font-normal text-warn">Not provided · needs follow-up</span>}
                    {filled?.confidence === "low" && (
                      <span className="rounded-full bg-marigold-soft px-1.5 py-0.5 text-[10px] font-medium uppercase text-warn">
                        low confidence
                      </span>
                    )}
                    {issue && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase",
                          issue.severity === "error" ? "bg-danger-soft text-danger" : "bg-marigold-soft text-warn",
                        )}
                      >
                        <AlertTriangle className="h-3 w-3" aria-hidden />
                        {issue.severity}
                      </span>
                    )}
                  </p>
                  {filled?.quote && (
                    <p className="mt-1.5 flex items-center gap-2.5 text-[15px] text-ink-soft">
                      {clip ? (
                        <ClipButton url={clip} label={`original audio for ${field.label}`} />
                      ) : (
                        <span className="rounded bg-paper px-1.5 py-0.5 text-[11px] text-ink-faint">typed</span>
                      )}
                      <span lang={speechLang} className="italic leading-snug">
                        &ldquo;{filled.quote}&rdquo;
                      </span>
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-line bg-surface">
        <p className="border-b border-line px-5 py-3 text-xs font-medium uppercase tracking-wider text-ink-faint">Full conversation</p>
        <div className="space-y-2.5 p-5">
          {s.conversation.map((entry, i) => {
            const clip = entry.role === "user" && entry.turn !== undefined ? clips[entry.turn] : undefined;
            return (
              <div key={i} className={cn("flex", entry.role === "user" ? "justify-end" : "justify-start")}>
                <p
                  lang={speechLang}
                  className={cn(
                    "flex max-w-[85%] items-start gap-2 rounded-2xl px-3.5 py-2 text-sm",
                    entry.role === "user" ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm bg-paper text-ink",
                  )}
                >
                  {clip && <ClipButton url={clip} label="this answer" className="mt-px border-white/40 bg-white/10 text-white" />}
                  <span>{entry.text}</span>
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <p className="text-center text-xs text-ink-faint">
        Reasoning: {s.review.meta.provider}/{s.review.meta.model} · Speech: Gnani Prisma and Timbre · Stored in this browser only
      </p>
    </div>
  );
}
