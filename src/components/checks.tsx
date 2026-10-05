import { AlertTriangle, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ReviewResult } from "@/lib/engine/types";

type Issue = ReviewResult["issues"][number];

/** Keeps deterministic validation and the model's judgement visibly separate. */
export function CheckSummary({ issues }: { issues: Issue[] }) {
  const rules = issues.filter((i) => i.source === "rules");
  const model = issues.filter((i) => i.source === "model");
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <CheckCell
        icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
        title="Rule checks"
        detail="Formats, ranges and the form's own rules"
        issues={rules}
        passedText="Passed"
      />
      <CheckCell
        icon={<Sparkles className="h-4 w-4" aria-hidden />}
        title="AI plausibility check"
        detail="Do the answers make sense together?"
        issues={model}
        passedText="No issues found"
      />
    </div>
  );
}

function CheckCell({
  icon,
  title,
  detail,
  issues,
  passedText,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  issues: Issue[];
  passedText: string;
}) {
  const errors = issues.some((i) => i.severity === "error");
  const tone = issues.length === 0 ? "ok" : errors ? "danger" : "warn";
  return (
    <div className="rounded-xl border border-line bg-paper p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint">
        {icon}
        {title}
      </p>
      <p
        className={cn(
          "mt-1.5 flex items-center gap-1.5 font-semibold",
          tone === "ok" ? "text-ok" : tone === "danger" ? "text-danger" : "text-warn",
        )}
      >
        {tone === "ok" ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        )}
        {tone === "ok" ? passedText : `${issues.length} issue${issues.length > 1 ? "s" : ""} to review`}
      </p>
      <p className="mt-0.5 text-xs text-ink-soft">{detail}</p>
    </div>
  );
}

export function IssueList({ issues, labelOf }: { issues: Issue[]; labelOf: (key: string) => string }) {
  if (issues.length === 0) return null;
  return (
    <ul className="space-y-2">
      {issues.map((issue, i) => (
        <li
          key={i}
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            issue.severity === "error" ? "border-danger/30 bg-danger-soft text-danger" : "border-marigold/40 bg-marigold-soft text-warn",
          )}
        >
          <span className="mr-2 inline-flex items-center gap-1 rounded bg-white/80 px-1.5 py-0.5 text-xs font-semibold">
            {issue.source === "rules" ? (
              <ShieldCheck className="h-3 w-3" aria-hidden />
            ) : (
              <Sparkles className="h-3 w-3" aria-hidden />
            )}
            {issue.source === "rules" ? "Rule check" : "AI check"}
          </span>
          {issue.message}
          <span className="mt-0.5 block text-xs opacity-80">{issue.keys.map(labelOf).join(" · ")}</span>
        </li>
      ))}
    </ul>
  );
}
