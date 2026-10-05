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
          Make sure Bolo can speak to you and hear you before starting a session. Takes about ten seconds.
        </p>
        <div className="mt-6">
          <MicCheck gnaniReady={status.gnani} />
        </div>
      </main>
    </div>
  );
}
