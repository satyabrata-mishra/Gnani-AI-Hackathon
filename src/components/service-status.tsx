import type { ServiceStatus } from "@/lib/env";
import { cn } from "@/lib/cn";

type PillTone = "ok" | "standIn" | "off";

function Pill({ label, tone, title }: { label: string; tone: PillTone; title: string }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-surface px-2.5 py-1 text-xs font-medium text-ink-soft",
        tone === "standIn" ? "border-dashed border-line-strong" : "border-line",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "ok" ? "bg-ok" : tone === "standIn" ? "border border-ink-faint" : "bg-line-strong",
        )}
      />
      {label}
      <span className="sr-only">{tone === "off" ? "not configured" : tone === "standIn" ? "temporary stand-in" : "connected"}</span>
    </span>
  );
}

export function ServiceStatusPills({ status }: { status: ServiceStatus }) {
  const gemini = status.reasoning?.provider === "gemini";
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Model configuration">
      <Pill label="Prisma" tone={status.gnani ? "ok" : "off"} title="Gnani Prisma v2.5 · speech-to-text" />
      <Pill label="Timbre" tone={status.gnani ? "ok" : "off"} title="Gnani Timbre v2.5 · text-to-speech" />
      <Pill
        label={gemini ? "Gemini · stand-in" : "Evon"}
        tone={!status.reasoning ? "off" : gemini ? "standIn" : "ok"}
        title={
          status.reasoning
            ? `${status.reasoning.label} · model "${status.reasoning.model}"`
            : "Reasoning model not configured"
        }
      />
    </div>
  );
}
