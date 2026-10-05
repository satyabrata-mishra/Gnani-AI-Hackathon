"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useCustomForms } from "@/hooks/use-custom-forms";
import { VoiceSession } from "./voice-session";

/** Custom forms are stored in the browser, so they are resolved on the client. */
export function CustomFormSession({
  formId,
  languageId,
  reasoningLabel,
}: {
  formId: string;
  languageId: string;
  reasoningLabel: string;
}) {
  const forms = useCustomForms();
  if (forms === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-faint">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading your form…
      </p>
    );
  }

  const template = forms.find((f) => f.id === formId);
  if (!template) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6">
        <p className="font-medium text-ink">This form isn&apos;t saved in this browser</p>
        <p className="mt-1 text-sm text-ink-soft">
          Custom forms are stored on the device that created them.{" "}
          <Link href="/builder" className="text-brand hover:text-brand-strong">
            Create a new form
          </Link>
          .
        </p>
      </div>
    );
  }

  return <VoiceSession key={`${template.id}:${languageId}`} template={template} languageId={languageId} reasoningLabel={reasoningLabel} />;
}
