import Link from "next/link";
import { ArrowRight, Mic, Sparkles } from "lucide-react";
import { SessionLauncher } from "@/components/session-launcher";
import { SiteHeader } from "@/components/site-header";
import { getServiceStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function Home() {
  const status = getServiceStatus();
  const servicesReady = status.gnani && Boolean(status.reasoning);
  const steps = [
    { action: "Bolo asks", model: "Timbre" },
    { action: "You speak", model: "Prisma" },
    { action: "Bolo understands", model: status.reasoning?.provider === "gemini" ? "Gemini · stand-in" : "Evon" },
    { action: "Rules validate", model: "code" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader status={status} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
        <section className="max-w-3xl">
          <p className="text-sm font-medium text-brand">Voice-first forms for India</p>
          <h1 className="mt-2 font-display text-[2.75rem] leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Any form. Any Indian language. <span className="italic text-brand">Just speak.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Bolo asks each question aloud in the citizen&apos;s language, understands natural, code-mixed answers, and
            hands your team validated English data, with the citizen&apos;s own voice behind every field.
          </p>
          {servicesReady && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/session?form=farmer-enrolment&lang=hinglish"
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                <Mic className="h-4 w-4" aria-hidden />
                Try a Hinglish demo
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/builder"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-sm font-medium text-ink transition hover:border-brand hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Turn your own form into a voice agent
              </Link>
            </div>
          )}
        </section>

        <div className="mt-10">
          <SessionLauncher servicesReady={servicesReady} />
        </div>

        <section aria-label="How Bolo works" className="mt-10 border-t border-line pt-6">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">How Bolo works</p>
          <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
            {steps.map((step, i) => (
              <li key={step.action} className="flex items-center gap-2">
                {i > 0 && <ArrowRight className="h-3.5 w-3.5 text-ink-faint" aria-hidden />}
                <span className="font-medium text-ink">{step.action}</span>
                <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink-soft ring-1 ring-line">
                  {step.model}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-2 max-w-3xl text-sm text-ink-soft">
            The model proposes values; deterministic rules decide what is accepted. Unclear answers get a follow-up, and
            every field keeps the words and recording it came from.
          </p>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-5 text-xs text-ink-faint sm:px-8">
          Built on Gnani Prisma v2.5 and Timbre v2.5, with{" "}
          {status.reasoning?.provider === "gemini"
            ? "Gemini standing in for Evon v3.3 until an Evon endpoint is available"
            : "Evon v3.3 for reasoning"}
          . Demo forms use mock data only.
        </div>
      </footer>
    </div>
  );
}
