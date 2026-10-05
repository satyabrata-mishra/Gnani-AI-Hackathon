import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { VoiceSession } from "@/components/session/voice-session";
import { getServiceStatus } from "@/lib/env";
import { getFormTemplate } from "@/lib/forms/templates";
import { getLanguage } from "@/lib/languages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Voice session — Bolo" };

export default async function SessionPage(props: PageProps<"/session">) {
  const { form, lang } = await props.searchParams;
  const template = typeof form === "string" ? getFormTemplate(form) : undefined;
  const language = typeof lang === "string" ? getLanguage(lang) : undefined;
  if (!template || !language) notFound();

  const status = getServiceStatus();
  const ready = status.gnani && status.reasoning;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader status={status} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 pt-8 sm:px-8">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-soft transition hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Choose another form
        </Link>
        {ready ? (
          <VoiceSession
            key={`${template.id}:${language.id}`}
            templateId={template.id}
            languageId={language.id}
            reasoningLabel={status.reasoning!.label}
          />
        ) : (
          <p className="rounded-2xl border border-line bg-surface p-6 text-ink-soft">
            Sessions need a Gnani API key and a reasoning model (Evon or Gemini) in <code>.env.local</code>.
          </p>
        )}
      </main>
    </div>
  );
}
