import type { ServiceStatus } from "@/lib/env";
import { cn } from "@/lib/cn";

function Pill({ label, ready, title }: { label: string; ready: boolean; title: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-soft"
    >
      <span
        aria-hidden
        className={cn("h-1.5 w-1.5 rounded-full", ready ? "bg-ok" : "bg-line-strong")}
      />
      {label}
      <span className="sr-only">{ready ? "configured" : "not configured"}</span>
    </span>
  );
}

export function ServiceStatusPills({ status }: { status: ServiceStatus }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Model configuration">
      <Pill label="Prisma" ready={status.gnani} title="Gnani Prisma v2.5 · speech-to-text" />
      <Pill label="Timbre" ready={status.gnani} title="Gnani Timbre v2.5 · text-to-speech" />
      <Pill
        label="Evon"
        ready={status.evon}
        title={status.evon ? `Evon endpoint · model "${status.evonModel}"` : "Evon endpoint not configured"}
      />
    </div>
  );
}
