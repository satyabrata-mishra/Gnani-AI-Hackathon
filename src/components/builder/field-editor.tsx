"use client";

import { useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { FIELD_TYPES } from "@/lib/forms/schema";
import type { FieldType, FormField } from "@/lib/forms/types";

const TYPE_LABEL: Record<FieldType, string> = {
  text: "Text",
  number: "Number",
  currency: "₹ Amount",
  date: "Date",
  phone: "Mobile number",
  pincode: "PIN code",
  choice: "Choice",
  yesno: "Yes / No",
};

const input =
  "w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink outline-none transition focus:border-brand";

function toNumber(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function FieldEditor({
  field,
  index,
  total,
  issues,
  onChange,
  onMove,
  onRemove,
}: {
  field: FormField;
  index: number;
  total: number;
  issues: string[];
  onChange: (patch: Partial<FormField>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const id = `field-${index}`;
  return (
    <li className={cn("rounded-xl border bg-surface p-4", issues.length ? "border-danger/40" : "border-line")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="w-5 shrink-0 font-mono text-xs text-ink-faint">{index + 1}</span>
          <label htmlFor={`${id}-label`} className="sr-only">
            Field label
          </label>
          <input
            id={`${id}-label`}
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Field label, e.g. Date of birth"
            className={cn(input, "min-w-0 flex-1 font-medium")}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-7 sm:flex-nowrap sm:pl-0">
          <label htmlFor={`${id}-type`} className="sr-only">
            Answer type
          </label>
          <select
            id={`${id}-type`}
            value={field.type}
            onChange={(e) => onChange({ type: e.target.value as FieldType })}
            className={cn(input, "w-auto")}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <label className="flex min-h-9 items-center gap-1.5 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => onChange({ required: e.target.checked })}
              className="h-4 w-4 accent-brand"
            />
            Required
          </label>
          <div className="ml-auto flex items-center">
            <IconButton label="Move up" onClick={() => onMove(-1)} disabled={index === 0}>
              <ArrowUp className="h-4 w-4" />
            </IconButton>
            <IconButton label="Move down" onClick={() => onMove(1)} disabled={index === total - 1}>
              <ArrowDown className="h-4 w-4" />
            </IconButton>
            <IconButton label="Remove field" onClick={onRemove} disabled={total === 1}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 pl-7">
        {field.type === "choice" && (
          <OptionsInput options={field.options ?? []} onChange={(options) => onChange({ options })} />
        )}
        {(field.type === "number" || field.type === "currency") && (
          <div className="flex flex-wrap gap-2">
            <NumberInput label="Min" value={field.min} onChange={(min) => onChange({ min })} />
            <NumberInput label="Max" value={field.max} onChange={(max) => onChange({ max })} />
            {field.type === "number" && (
              <input
                value={field.unit ?? ""}
                onChange={(e) => onChange({ unit: e.target.value || undefined })}
                placeholder="Unit (acres, years…)"
                aria-label="Unit"
                className={cn(input, "w-44")}
              />
            )}
          </div>
        )}
        <div>
          <label htmlFor={`${id}-hint`} className="text-xs font-medium text-ink-soft">
            Guidance for the AI <span className="font-normal text-ink-faint">(optional)</span>
          </label>
          <input
            id={`${id}-hint`}
            value={field.hint}
            onChange={(e) => onChange({ hint: e.target.value })}
            placeholder="e.g. Convert 'dhai' to 2.5"
            aria-describedby={`${id}-hint-help`}
            className={cn(input, "mt-1 text-ink-soft")}
          />
          <p id={`${id}-hint-help`} className="mt-1 text-xs text-ink-faint">
            Helps Bolo interpret spoken answers. Whether a value is accepted is still decided by the field&apos;s type and limits.
          </p>
        </div>
        {issues.map((message, i) => (
          <p key={i} className="flex items-center gap-1.5 text-xs text-danger">
            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
            {message}
          </p>
        ))}
      </div>
    </li>
  );
}

/** Keeps the raw text so typing "A, " isn't normalised away mid-word. */
function OptionsInput({ options, onChange }: { options: string[]; onChange: (options: string[]) => void }) {
  const [raw, setRaw] = useState(options.join(", "));
  return (
    <input
      value={raw}
      onChange={(e) => {
        setRaw(e.target.value);
        onChange(
          e.target.value
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean),
        );
      }}
      placeholder="Options, separated by commas"
      aria-label="Options"
      className={input}
    />
  );
}

function NumberInput({ label, value, onChange }: { label: string; value?: number; onChange: (v: number | undefined) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-ink-soft">
      {label}
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(toNumber(e.target.value))}
        className={cn(input, "w-28")}
      />
    </label>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded-md p-2 text-ink-faint transition hover:bg-paper hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}
