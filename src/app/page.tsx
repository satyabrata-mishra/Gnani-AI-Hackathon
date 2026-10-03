import { SessionLauncher } from "@/components/session-launcher";
import { SiteHeader } from "@/components/site-header";
import { getServiceStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

const STEPS = [
  { model: "Timbre", verb: "asks", text: "Each question is spoken in the citizen's language with a natural voice." },
  { model: "Prisma", verb: "listens", text: "Free-form, code-mixed answers are transcribed — even on noisy phone audio." },
  { model: "Evon", verb: "understands", text: "Values are extracted, normalised and cross-checked; unclear answers get a follow-up." },
];

export default function Home() {
  const status = getServiceStatus();

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader status={status} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 pt-12 sm:px-8 sm:pt-16">
        <section className="max-w-3xl">
          <p className="text-sm font-medium text-brand">Voice-first forms for India</p>
          <h1 className="mt-3 font-display text-5xl leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Any form. Any Indian language. <span className="italic text-brand">Just speak.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Bolo asks each question aloud in the citizen&apos;s language, understands natural,
            code-mixed answers, and hands your team clean, validated English data — with the audio
            behind every field.
          </p>
        </section>

        <ol className="mt-10 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.model} className="bg-surface p-4">
              <p className="text-sm font-medium text-ink">
                <span className="mr-2 font-mono text-xs text-ink-faint">{i + 1}</span>
                {step.model} <span className="text-ink-faint">{step.verb}</span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12">
          <SessionLauncher servicesReady={status.gnani && status.evon} />
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-5 text-xs text-ink-faint sm:px-8">
          Built on Gnani Prisma v2.5, Timbre v2.5 and Evon v3.3. Demo forms use mock data only.
        </div>
      </footer>
    </div>
  );
}
