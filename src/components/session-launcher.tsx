"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useCustomForms } from "@/hooks/use-custom-forms";
import { cn } from "@/lib/cn";
import { FORM_TEMPLATES } from "@/lib/forms/templates";
import type { FormTemplate } from "@/lib/forms/types";
import { DEFAULT_LANGUAGE_ID, LANGUAGES } from "@/lib/languages";
import { deleteCustomForm } from "@/lib/storage/forms";
import { useConfirm } from "./confirm-dialog";
import { FormIcon } from "./form-icon";

function FormOption({
  form,
  selected,
  onSelect,
  actions,
}: {
  form: FormTemplate;
  selected: boolean;
  onSelect: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border pr-3 transition",
        selected ? "border-brand bg-brand-soft ring-1 ring-brand" : "border-line bg-surface hover:border-line-strong",
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-4 p-4 text-left"
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition",
            selected ? "bg-brand text-white" : "bg-paper text-ink-soft",
          )}
        >
          <FormIcon icon={form.icon} className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-ink">{form.title}</span>
          <span className="block truncate text-sm text-ink-faint">
            {form.org ? `${form.org} · ` : ""}
            {form.fields.length} fields
          </span>
        </span>
      </button>
      {actions}
      <span
        aria-hidden
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
          selected ? "border-brand bg-brand text-white" : "border-line-strong",
        )}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </div>
  );
}

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
  const customForms = useCustomForms() ?? [];
  const confirm = useConfirm();

  const form = [...FORM_TEMPLATES, ...customForms].find((f) => f.id === formId) ?? FORM_TEMPLATES[0];
  const language = LANGUAGES.find((l) => l.id === languageId) ?? LANGUAGES[0];

  async function remove(f: FormTemplate) {
    const ok = await confirm({
      title: `Delete "${f.title}"?`,
      message: "The form will be removed from this browser. Submissions already collected with it are kept.",
      confirmLabel: "Delete form",
    });
    if (!ok) return;
    const id = f.id;
    deleteCustomForm(id);
    if (formId === id) setFormId(FORM_TEMPLATES[0].id);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr]">
      <div className="space-y-8">
        <section aria-labelledby="choose-form">
          <h2 id="choose-form" className="mb-3 text-sm font-medium text-ink-soft">
            <span className="mr-2 font-mono text-ink-faint">01</span>Choose a form
          </h2>
          <div role="radiogroup" aria-labelledby="choose-form" className="grid grid-cols-1 gap-2">
            {FORM_TEMPLATES.map((f) => (
              <FormOption key={f.id} form={f} selected={f.id === form.id} onSelect={() => setFormId(f.id)} />
            ))}
            {customForms.length > 0 && (
              <p className="mt-3 text-xs font-medium uppercase tracking-wider text-ink-faint">Your forms</p>
            )}
            {customForms.map((f) => (
              <FormOption
                key={f.id}
                form={f}
                selected={f.id === form.id}
                onSelect={() => setFormId(f.id)}
                actions={
                  <span className="flex items-center gap-1">
                    <Link
                      href={`/builder?id=${f.id}`}
                      aria-label={`Edit ${f.title}`}
                      className="rounded-md p-2 text-ink-faint transition hover:bg-paper hover:text-ink"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(f)}
                      aria-label={`Delete ${f.title}`}
                      className="rounded-md p-2 text-ink-faint transition hover:bg-paper hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </span>
                }
              />
            ))}
            <Link
              href="/builder"
              className="flex items-center gap-4 rounded-xl border border-dashed border-line-strong p-4 text-left transition hover:border-brand hover:text-brand"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink">Create a form from a description</span>
                <span className="block text-sm text-ink-faint">Type or say what you need; Bolo drafts the fields.</span>
              </span>
              <Plus className="h-4 w-4 text-ink-faint" aria-hidden />
            </Link>
          </div>
        </section>

        <section aria-labelledby="choose-language">
          <h2 id="choose-language" className="mb-3 text-sm font-medium text-ink-soft">
            <span className="mr-2 font-mono text-ink-faint">02</span>Choose the citizen&apos;s language
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
                    "relative min-h-14 rounded-lg border px-3 py-2 text-left transition",
                    selected
                      ? "border-brand bg-brand-soft ring-1 ring-brand"
                      : "border-line bg-surface hover:border-line-strong",
                  )}
                >
                  {selected && (
                    <span
                      aria-hidden
                      className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-white"
                    >
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  )}
                  <span lang={l.stt} className="block pr-5 text-[15px] font-medium text-ink">
                    {l.native}
                  </span>
                  <span className={cn("block text-xs", l.tagline ? "font-medium text-brand" : "text-ink-faint")}>
                    {l.tagline ?? l.name}
                  </span>
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
          <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
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
