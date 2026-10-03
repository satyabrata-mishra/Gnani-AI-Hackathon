import type { Metadata } from "next";
import { MicCheck } from "@/components/mic-check";
import { SiteHeader } from "@/components/site-header";
import { getServiceStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mic check — Bolo" };

export default function MicCheckPage() {
  const status = getServiceStatus();

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader status={status} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16 pt-10 sm:px-8">
        <h1 className="font-display text-4xl tracking-tight text-ink">Mic check</h1>
        <p className="mt-2 max-w-xl text-ink-soft">
          The voice loop without Evon: Timbre asks, you answer, Prisma transcribes. Run this before
          every demo to confirm the microphone and Gnani APIs are working.
        </p>
        <div className="mt-8">
          <MicCheck gnaniReady={status.gnani} />
        </div>
      </main>
    </div>
  );
}
