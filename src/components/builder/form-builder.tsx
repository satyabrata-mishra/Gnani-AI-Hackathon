"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, Info, Loader2, Mic, Plus, RotateCcw, Save, Sparkles, Square } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCustomForms } from "@/hooks/use-custom-forms";
import { useVoiceRecorder, type Recording } from "@/hooks/use-voice-recorder";
import { draftForm, transcribeAudio } from "@/lib/api-client";
import { blankField, checkTemplate, FORM_ICONS, newCustomFormId, slugifyKey, uniqueKey } from "@/lib/forms/schema";
import type { FormField, FormTemplate } from "@/lib/forms/types";
import { DEFAULT_LANGUAGE_ID, LANGUAGES } from "@/lib/languages";
import { saveCustomForm } from "@/lib/storage/forms";
import { FormIcon } from "../form-icon";
import { FieldEditor } from "./field-editor";

const EXAMPLES = [
  {
    label: "Ration card (Hinglish)",
    text: "Ration card ke liye form chahiye: parivaar ke mukhiya ka naam, family mein kitne log hain, ghar ki mahine ki income, category APL, BPL ya Antyodaya, gaon ka naam, PIN code aur mobile number.",
  },
  {
    label: "Hospital OPD registration",
    text: "Hospital OPD registration: patient name, age, gender, main symptom, for how many days, any existing illness such as diabetes or blood pressure, and a mobile number.",
  },
  {
    label: "College scholarship",
    text: "Scholarship application for college students: student name, college name, course, year of study, annual family income, class 12 percentage, and mobile number.",
  },
];

const DICTATION_LANGUAGES = [
  { id: "en", label: "English" },
  { id: "hinglish", label: "Hinglish" },
];

/** New fields get their real key from the label on save; drafted and saved keys stay put. */
function finaliseKeys(template: FormTemplate): FormTemplate {
  const taken = new Set(template.fields.filter((f) => !f.key.startsWith("new_field")).map((f) => f.key));
  return {
    ...template,
    fields: template.fields.map((f) => {
      if (!f.key.startsWith("new_field") || !f.label.trim()) return f;
      const key = uniqueKey(slugifyKey(f.label), taken);
      taken.add(key);
      return { ...f, key };
    }),
  };
}

function patchField(field: FormField, patch: Partial<FormField>): FormField {
  const next: FormField = { ...field, ...patch };
  if (patch.type && patch.type !== field.type) {
    if (next.type !== "choice") delete next.options;
    else next.options ??= [];
    if (next.type !== "number" && next.type !== "currency") {
      delete next.min;
      delete next.max;
    }
    if (next.type === "currency") next.unit = "INR";
    else if (next.type !== "number") delete next.unit;
    else if (field.type === "currency") delete next.unit;
  }
  return next;
}

export function FormBuilder({ editId, canDraft }: { editId?: string; canDraft: boolean }) {
  const router = useRouter();
  const forms = useCustomForms();
  const [draft, setDraft] = useState<FormTemplate | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [languageId, setLanguageId] = useState(DEFAULT_LANGUAGE_ID);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const editing = editId ? forms?.find((f) => f.id === editId) : undefined;
  const template = draft ?? editing ?? null;

  if (editId && forms !== null && !editing && !draft) {
    return (
      <p className="rounded-2xl border border-line bg-surface p-6 text-ink-soft">
        That form isn&apos;t saved in this browser. Start a new one below by removing <code>?id</code> from the address.
      </p>
    );
  }
  if (editId && forms === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-faint">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading your form…
      </p>
    );
  }

  async function runDraft() {
    setDrafting(true);
    setDraftError(null);
    try {
      const result = await draftForm(description);
      setDraft(result.template);
      setNotes(result.notes);
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "Could not draft the form");
    } finally {
      setDrafting(false);
    }
  }

  function startBlank() {
    setDraft({
      id: newCustomFormId(),
      title: "",
      org: "",
      summary: "",
      icon: "clipboard",
      fields: [blankField(new Set())],
    });
    setNotes([]);
  }

  if (!template) {
    return (
      <DescribeStep
        description={description}
        onDescription={setDescription}
        drafting={drafting}
        error={draftError}
        canDraft={canDraft}
        onDraft={runDraft}
        onBlank={startBlank}
      />
    );
  }

  const update = (next: FormTemplate) => {
    setDraft(next);
    setSavedAt(null);
  };
  const updateField = (i: number, patch: Partial<FormField>) =>
    update({ ...template, fields: template.fields.map((f, j) => (j === i ? patchField(f, patch) : f)) });
  const moveField = (i: number, direction: -1 | 1) => {
    const fields = [...template.fields];
    const j = i + direction;
    [fields[i], fields[j]] = [fields[j], fields[i]];
    update({ ...template, fields });
  };
  const removeField = (i: number) => update({ ...template, fields: template.fields.filter((_, j) => j !== i) });
  const addField = () =>
    update({ ...template, fields: [...template.fields, blankField(new Set(template.fields.map((f) => f.key)))] });

  const finalised = finaliseKeys(template);
  const check = checkTemplate(finalised);
  const issues = check.ok ? [] : check.issues;
  const fieldIssues = (i: number) => issues.filter((x) => x.field === i).map((x) => x.message);
  const formIssues = issues.filter((x) => x.field === null).map((x) => x.message);

  function save(start: boolean) {
    if (!check.ok) return;
    saveCustomForm(check.template);
    setDraft(check.template);
    setSavedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    if (start) router.push(`/session?form=${check.template.id}&lang=${languageId}`);
  }

  return (
    <div className="space-y-6">
      {notes.length > 0 && (
        <div className="space-y-1 rounded-xl bg-marigold-soft px-4 py-3 text-sm text-warn">
          {notes.map((n, i) => (
            <p key={i} className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {n}
            </p>
          ))}
        </div>
      )}

      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
          <label className="text-xs font-medium text-ink-soft">
            Form title
            <input
              value={template.title}
              onChange={(e) => update({ ...template, title: e.target.value })}
              placeholder="Ration card application"
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-base font-semibold text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="text-xs font-medium text-ink-soft">
            Organisation
            <input
              value={template.org}
              onChange={(e) => update({ ...template, org: e.target.value })}
              placeholder="Food department (demo)"
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Icon">
          {FORM_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              role="radio"
              aria-checked={template.icon === icon}
              aria-label={icon}
              onClick={() => update({ ...template, icon })}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border transition",
                template.icon === icon ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-faint hover:text-ink",
              )}
            >
              <FormIcon icon={icon} className="h-4 w-4" />
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Fields">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink-soft">
            {template.fields.length} field{template.fields.length === 1 ? "" : "s"}, asked in this order
          </h2>
          <button
            type="button"
            onClick={addField}
            className="inline-flex items-center gap-1.5 text-sm text-brand transition hover:text-brand-strong"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add field
          </button>
        </div>
        <ul className="space-y-2">
          {template.fields.map((field, i) => (
            <FieldEditor
              key={field.key}
              field={field}
              index={i}
              total={template.fields.length}
              issues={fieldIssues(i)}
              onChange={(patch) => updateField(i, patch)}
              onMove={(d) => moveField(i, d)}
              onRemove={() => removeField(i)}
            />
          ))}
        </ul>
        {formIssues.map((m, i) => (
          <p key={i} className="mt-2 flex items-center gap-1.5 text-sm text-danger">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            {m}
          </p>
        ))}
      </section>

      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4">
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          Ask in
          <select
            value={languageId}
            onChange={(e) => setLanguageId(e.target.value)}
            className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {savedAt && (
            <span className="flex items-center gap-1 text-xs text-ok">
              <Check className="h-3.5 w-3.5" aria-hidden />
              Saved {savedAt}
            </span>
          )}
          {!editId && (
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-ink-soft transition hover:text-ink"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Start over
            </button>
          )}
          <button
            type="button"
            onClick={() => save(false)}
            disabled={!check.ok}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink-soft transition enabled:hover:border-line-strong disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden />
            Save
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={!check.ok || !canDraft}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition enabled:hover:bg-brand-strong disabled:opacity-50"
          >
            Save and start voice session
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </section>
      <p className="text-center text-xs text-ink-faint">Custom forms are saved in this browser only.</p>
    </div>
  );
}

function DescribeStep({
  description,
  onDescription,
  drafting,
  error,
  canDraft,
  onDraft,
  onBlank,
}: {
  description: string;
  onDescription: (v: string) => void;
  drafting: boolean;
  error: string | null;
  canDraft: boolean;
  onDraft: () => void;
  onBlank: () => void;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <label htmlFor="describe" className="font-medium text-ink">
        Describe the form, in English or Hinglish
      </label>
      <p id="describe-hint" className="mt-0.5 text-sm text-ink-soft">
        Bolo turns this into questions, field types and validation rules. You can edit everything before saving.
      </p>
      <textarea
        id="describe"
        aria-describedby="describe-hint"
        value={description}
        onChange={(e) => onDescription(e.target.value)}
        rows={5}
        maxLength={1500}
        placeholder="e.g. A ration card application asking for the head of family's name, family size, monthly income…"
        className="mt-2 w-full resize-y rounded-xl border border-line bg-paper px-3.5 py-3 text-ink outline-none transition focus:border-brand"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-faint">Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => onDescription(ex.text)}
            className="rounded-full px-2 py-1 text-xs text-ink-faint underline decoration-line-strong underline-offset-2 transition hover:text-brand hover:decoration-brand"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <Dictation onText={(text) => onDescription(description ? `${description} ${text}` : text)} disabled={!canDraft || drafting} />

      {error && (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button
          type="button"
          onClick={onDraft}
          disabled={!canDraft || drafting || description.trim().length < 10}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-semibold text-white transition enabled:hover:bg-brand-strong disabled:opacity-50"
        >
          {drafting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
          {drafting ? "Drafting the form…" : "Draft the form"}
          {!drafting && <ArrowRight className="h-4 w-4" aria-hidden />}
        </button>
        {!canDraft ? (
          <span className="text-xs text-ink-faint">Drafting needs a reasoning model and a Gnani key in .env.local.</span>
        ) : (
          description.trim().length < 10 &&
          !drafting && <span className="text-xs text-ink-faint">Write a sentence or pick an example to enable drafting.</span>
        )}
        <button
          type="button"
          onClick={onBlank}
          className="ml-auto inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-medium text-ink-soft underline-offset-4 transition hover:text-brand hover:underline"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Start from a blank form
        </button>
      </div>
    </section>
  );
}

function Dictation({ onText, disabled }: { onText: (text: string) => void; disabled: boolean }) {
  const [languageId, setLanguageId] = useState("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function transcribe(recording: Recording | null) {
    if (!recording || recording.durationMs < 400) return;
    setBusy(true);
    setError(null);
    try {
      const { transcript } = await transcribeAudio(recording.blob, languageId);
      if (transcript.trim()) onText(transcript.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not transcribe");
    } finally {
      setBusy(false);
    }
  }

  const recorder = useVoiceRecorder({ onAutoStop: transcribe, silenceStopMs: 2500, noSpeechTimeoutMs: 8000 });
  const recording = recorder.state === "recording";

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => (recording ? void transcribe(recorder.stop()) : void recorder.start())}
        disabled={disabled || busy || recorder.state === "starting"}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition disabled:opacity-50",
          recording ? "border-marigold bg-marigold-soft text-warn" : "border-line text-ink-soft enabled:hover:border-brand enabled:hover:text-brand",
        )}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : recording ? (
          <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
        ) : (
          <Mic className="h-4 w-4" aria-hidden />
        )}
        {busy ? "Transcribing…" : recording ? "Stop" : "Dictate"}
      </button>
      <div role="radiogroup" aria-label="Dictation language" className="flex rounded-lg border border-line p-0.5">
        {DICTATION_LANGUAGES.map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={languageId === l.id}
            onClick={() => setLanguageId(l.id)}
            disabled={recording || busy}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs transition",
              languageId === l.id ? "bg-brand-soft font-medium text-brand" : "text-ink-faint hover:text-ink",
            )}
          >
            {l.label}
          </button>
        ))}
      </div>
      <span className="text-xs text-ink-faint">Prisma transcribes; stops when you pause.</span>
      {(error || recorder.error) && <span className="w-full text-xs text-danger">{error ?? recorder.error}</span>}
    </div>
  );
}
