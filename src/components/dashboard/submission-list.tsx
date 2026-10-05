"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, ChevronRight, Inbox, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { getLanguage } from "@/lib/languages";
import { clearSubmissions, listSubmissions, type Submission } from "@/lib/storage/submissions";
import { useConfirm } from "../confirm-dialog";
import { FormIcon } from "../form-icon";

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** The first answered field is usually the person's name; it identifies the row. */
export function headline(s: Submission): string {
  const first = s.template.fields.find((f) => s.values[f.key]);
  return first ? s.values[first.key].display : "No answers";
}

export function attention(s: Submission) {
  const errors = s.review.issues.filter((i) => i.severity === "error").length;
  const warnings = s.review.issues.length - errors;
  const followUps = new Set([...s.review.missing, ...s.skipped]).size;
  return { errors, warnings, followUps, clean: errors + warnings + followUps === 0 };
}

export function SubmissionList() {
  const [items, setItems] = useState<Submission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  useEffect(() => {
    listSubmissions().then(setItems, () => setError("This browser's storage could not be read."));
  }, []);

  async function clearAll() {
    const ok = await confirm({
      title: "Delete all submissions?",
      message: `All ${items?.length ?? 0} submissions and their recordings will be removed from this browser. This can't be undone.`,
      confirmLabel: "Delete all",
    });
    if (!ok) return;
    await clearSubmissions();
    setItems([]);
  }

  if (error) return <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>;
  if (items === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-faint">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading submissions…
      </p>
    );
  }
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
        <Inbox className="h-8 w-8 text-ink-faint" aria-hidden />
        <p className="mt-3 font-medium text-ink">No submissions yet</p>
        <p className="mt-1 max-w-sm text-sm text-ink-soft">
          Complete a voice session and press Confirm. The record, its checks and the recordings appear here.
        </p>
        <Link href="/" className="mt-5 rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-strong">
          Start a session
        </Link>
      </div>
    );
  }

  const needAttention = items.filter((s) => !attention(s).clean).length;
  const languages = new Set(items.map((s) => s.languageId)).size;

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {[
          { label: "Submissions", value: items.length, alert: false },
          { label: "Need attention", value: needAttention, alert: needAttention > 0 },
          { label: "Languages", value: languages, alert: false },
        ].map((stat) => (
          <div key={stat.label} className={cn("px-4 py-3", stat.alert ? "bg-marigold-soft" : "bg-surface")}>
            <dt className={cn("flex items-center gap-1 text-xs", stat.alert ? "font-medium text-warn" : "text-ink-faint")}>
              {stat.alert && <AlertTriangle className="h-3 w-3" aria-hidden />}
              {stat.label}
            </dt>
            <dd className={cn("mt-0.5 text-2xl font-semibold", stat.alert ? "text-warn" : "text-ink")}>{stat.value}</dd>
          </div>
        ))}
      </dl>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {items.map((s) => {
          const a = attention(s);
          const filled = s.template.fields.filter((f) => s.values[f.key]).length;
          return (
            <li key={s.id}>
              <Link href={`/dashboard/${s.id}`} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-paper">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper text-ink-soft">
                  <FormIcon icon={s.template.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{headline(s)}</span>
                  <span className="block truncate text-sm text-ink-faint">
                    {s.template.title} · {getLanguage(s.languageId)?.name ?? s.languageId}
                  </span>
                </span>
                <span className="hidden font-mono text-xs text-ink-soft sm:inline">
                  {filled}/{s.template.fields.length} fields
                </span>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
                    a.errors ? "bg-danger-soft text-danger" : a.clean ? "bg-ok-soft text-ok" : "bg-marigold-soft text-warn",
                  )}
                >
                  {a.clean ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : <AlertTriangle className="h-3 w-3" aria-hidden />}
                  {a.clean ? (
                    "No issues"
                  ) : (
                    <>
                      <span className="sm:hidden">{a.errors + a.warnings + a.followUps} to check</span>
                      <span className="hidden sm:inline">
                        {[
                          a.errors && `${a.errors} error${a.errors > 1 ? "s" : ""}`,
                          a.warnings && `${a.warnings} warning${a.warnings > 1 ? "s" : ""}`,
                          a.followUps && `${a.followUps} follow-up${a.followUps > 1 ? "s" : ""}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </>
                  )}
                </span>
                <span className="hidden w-28 text-right text-xs text-ink-faint md:block">{formatWhen(s.createdAt)}</span>
                <ChevronRight className="h-4 w-4 text-ink-faint" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-4 text-xs text-ink-faint">
        <span>Stored in this browser only (demo storage). Synthetic data only.</span>
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap transition hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Delete all
        </button>
      </div>
    </div>
  );
}
