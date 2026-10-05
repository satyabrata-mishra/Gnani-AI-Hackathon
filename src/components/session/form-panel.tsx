"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Check, CircleDashed, Mic, PencilLine } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ReviewResult, SessionState } from "@/lib/engine/types";
import type { FormTemplate } from "@/lib/forms/types";
import { FormIcon } from "../form-icon";
import { ClipButton } from "./clip-button";

type Issue = ReviewResult["issues"][number];

export function FormPanel({
  template,
  state,
  activeKey,
  clips,
  corrected,
  issues,
  quoteLang,
  onFix,
}: {
  template: FormTemplate;
  state: SessionState | null;
  /** Field Bolo is currently asking about. */
  activeKey: string | null;
  clips: Record<number, string>;
  corrected: Set<string>;
  issues: Issue[];
  quoteLang: string;
  /** Present when fields can be re-answered (review stage). */
  onFix?: (key: string) => void;
}) {
  const values = state?.values ?? {};
  const skipped = new Set(state?.skipped ?? []);
  const filledCount = template.fields.filter((f) => values[f.key]).length;

  return (
    <aside aria-label="Live form" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <FormIcon icon={template.icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-ink">{template.title}</h2>
          <p className="text-sm text-ink-faint">{template.org}</p>
        </div>
        <span className="font-mono text-sm text-ink-soft" aria-label={`${filledCount} of ${template.fields.length} fields filled`}>
          {filledCount}/{template.fields.length}
        </span>
      </div>

      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-paper" aria-hidden>
        <motion.div
          className="h-full rounded-full bg-brand"
          animate={{ width: `${(filledCount / template.fields.length) * 100}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 22 }}
        />
      </div>

      <ul className="divide-y divide-line">
        {template.fields.map((field) => {
          const filled = values[field.key];
          const active = activeKey === field.key;
          const fieldIssues = issues.filter((i) => i.keys.includes(field.key));
          const clip = filled ? clips[filled.turn] : undefined;

          return (
            <li
              key={field.key}
              className={cn(
                "-mx-2 rounded-lg px-2 py-3 transition-colors",
                active && "bg-brand-soft",
              )}
            >
              <div className="flex items-start gap-3">
                <StatusIcon filled={Boolean(filled)} active={active} skipped={skipped.has(field.key)} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm text-ink-soft">{field.label}</span>
                    {!field.required && <span className="text-xs text-ink-faint">optional</span>}
                    {filled?.confidence === "low" && <Badge tone="warn">check</Badge>}
                    {filled && corrected.has(field.key) && <Badge tone="brand">corrected</Badge>}
                    {!filled && skipped.has(field.key) && <Badge tone="warn">needs follow-up</Badge>}
                  </div>

                  {filled ? (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} key={filled.display}>
                      <p className="mt-0.5 font-medium text-ink">{filled.display}</p>
                      {filled.quote && (
                        <p className="mt-1 flex items-center gap-2 text-xs text-ink-faint">
                          {clip && <ClipButton url={clip} label={`answer for ${field.label}`} />}
                          <span lang={quoteLang} className="italic">
                            &ldquo;{filled.quote}&rdquo;
                          </span>
                        </p>
                      )}
                    </motion.div>
                  ) : active ? (
                    <p className="mt-0.5 text-sm text-brand">Asking now…</p>
                  ) : (
                    <span className="mt-2 block h-2 w-24 rounded-full bg-paper" aria-hidden />
                  )}

                  {fieldIssues.map((issue, i) => (
                    <p
                      key={i}
                      className={cn(
                        "mt-1.5 flex items-start gap-1.5 text-xs",
                        issue.severity === "error" ? "text-danger" : "text-warn",
                      )}
                    >
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                      {issue.message}
                    </p>
                  ))}
                </div>

                {onFix && (
                  <button
                    type="button"
                    onClick={() => onFix(field.key)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink-soft transition hover:border-brand hover:text-brand"
                    aria-label={`Fix ${field.label} by voice`}
                  >
                    {filled ? <PencilLine className="h-3 w-3" aria-hidden /> : <Mic className="h-3 w-3" aria-hidden />}
                    {filled ? "Fix" : "Answer"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function StatusIcon({ filled, active, skipped }: { filled: boolean; active: boolean; skipped: boolean }) {
  if (filled) {
    return (
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ok text-white">
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  if (active) {
    return (
      <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <span className="absolute h-5 w-5 animate-ping rounded-full bg-brand/30" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand" />
      </span>
    );
  }
  if (skipped) {
    return <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />;
  }
  return <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-line-strong" aria-hidden />;
}

function Badge({ tone, children }: { tone: "warn" | "brand"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        tone === "warn" ? "bg-marigold-soft text-warn" : "bg-brand-soft text-brand",
      )}
    >
      {children}
    </span>
  );
}
