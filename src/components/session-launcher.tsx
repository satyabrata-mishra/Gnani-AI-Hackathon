"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { FORM_TEMPLATES } from "@/lib/forms/templates";
import { DEFAULT_LANGUAGE_ID, LANGUAGES } from "@/lib/languages";
import { FormIcon } from "./form-icon";

const TYPE_LABEL: Record<string, string> = {
  text: "Text",
  number: "Number",
  currency: "₹ Amount",
  date: "Date",
  phone: "Phone",
  pincode: "PIN",
  choice: "Choice",
  yesno: "Yes / No",
};

export function SessionLauncher({ servicesReady }: { servicesReady: boolean }) {
  const [formId, setFormId] = useState(FORM_TEMPLATES[0].id);
  const [languageId, setLanguageId] = useState(DEFAULT_LANGUAGE_ID);

  const form = FORM_TEMPLATES.find((f) => f.id === formId) ?? FORM_TEMPLATES[0];
  const language = LANGUAGES.find((l) => l.id === languageId) ?? LANGUAGES[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
      <div className="space-y-8">
        <section aria-labelledby="choose-form">
          <h2 id="choose-form" className="mb-3 text-sm font-medium text-ink-soft">
            <span className="mr-2 font-mono text-ink-faint">01</span>Choose a form
          </h2>
          <div role="radiogroup" aria-labelledby="choose-form" className="grid gap-2">
            {FORM_TEMPLATES.map((f) => {
              const selected = f.id === formId;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setFormId(f.id)}
                  className={cn(
                    "group flex items-center gap-4 rounded-xl border bg-surface p-4 text-left transition",
                    selected
                      ? "border-brand shadow-[0_0_0_3px_var(--color-brand-soft)]"
                      : "border-line hover:border-line-strong",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition",
                      selected ? "bg-brand text-white" : "bg-paper text-ink-soft",
                    )}
                  >
                    <FormIcon icon={f.icon} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ink">{f.title}</span>
                    <span className="block truncate text-sm text-ink-faint">
                      {f.org} · {f.fields.length} fields
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border transition",
                      selected ? "border-brand bg-brand text-white" : "border-line-strong",
                    )}
                  >
                    {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="choose-language">
          <h2 id="choose-language" className="mb-3 text-sm font-medium text-ink-soft">
            <span className="mr-2 font-mono text-ink-faint">02</span>Citizen&apos;s language
          </h2>
          <div
            role="radiogroup"
            aria-labelledby="choose-language"
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            {LANGUAGES.map((l) => {
              const selected = l.id === languageId;
              return (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setLanguageId(l.id)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left transition",
                    selected
                      ? "border-brand bg-brand-soft"
                      : "border-line bg-surface hover:border-line-strong",
                  )}
                >
                  <span lang={l.stt} className="block text-[15px] font-medium text-ink">
                    {l.native}
                  </span>
                  <span className="block text-xs text-ink-faint">{l.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <aside
        aria-label="Form preview"
        className="flex flex-col rounded-2xl border border-line bg-surface p-5 sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
              Output preview
            </p>
            <h3 className="mt-1 text-lg font-semibold text-ink">{form.title}</h3>
          </div>
          <span className="rounded-full bg-marigold-soft px-2.5 py-1 text-xs font-medium text-warn">
            Asked in {language.name}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.ul
            key={form.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="flex-1 divide-y divide-line"
          >
            {form.fields.map((field) => (
              <li key={field.key} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm text-ink-soft">
                  {field.label}
                  {!field.required && <span className="ml-1 text-ink-faint">(optional)</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-16 rounded-full bg-paper" aria-hidden />
                  <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
                    {TYPE_LABEL[field.type]}
                  </span>
                </span>
              </li>
            ))}
          </motion.ul>
        </AnimatePresence>

        <div className="mt-6 space-y-2">
          {servicesReady ? (
            <Link
              href={`/session?form=${form.id}&lang=${language.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 font-medium text-white transition hover:bg-brand-strong"
            >
              Start voice session
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 font-medium text-white opacity-50"
            >
              Start voice session
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          )}
          <p className="text-center text-xs text-ink-faint">
            {servicesReady
              ? "Uses your microphone. Demo with made-up details only."
              : "Add your Gnani key and a reasoning model (Evon or Gemini) to .env.local to enable sessions."}
          </p>
        </div>
      </aside>
    </div>
  );
}
