import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="flex h-7 w-7 items-center justify-center gap-[3px] rounded-lg bg-brand"
      >
        <span className="h-2 w-[3px] rounded-full bg-white/80" />
        <span className="h-3.5 w-[3px] rounded-full bg-white" />
        <span className="h-2.5 w-[3px] rounded-full bg-marigold" />
      </span>
      <span className="text-lg font-semibold tracking-tight text-ink">Bolo</span>
    </span>
  );
}
