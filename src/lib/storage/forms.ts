import { checkTemplate, isCustomFormId } from "../forms/schema";
import type { FormTemplate } from "../forms/types";

// Custom forms are saved in this browser only (demo storage); entries are re-validated on read.

const KEY = "bolo.forms.v1";
const CHANGE_EVENT = "bolo:forms-changed";

let cachedRaw: string | null | undefined;
let cachedForms: FormTemplate[] = [];

export function getCustomForms(): FormTemplate[] {
  const raw = localStorage.getItem(KEY);
  if (raw === cachedRaw) return cachedForms;
  cachedRaw = raw;
  let parsed: unknown = [];
  try {
    parsed = raw ? JSON.parse(raw) : [];
  } catch {
    parsed = [];
  }
  cachedForms = Array.isArray(parsed)
    ? parsed.flatMap((item) => {
        const check = checkTemplate(item);
        return check.ok && isCustomFormId(check.template.id) ? [check.template] : [];
      })
    : [];
  return cachedForms;
}

export function getCustomForm(id: string): FormTemplate | undefined {
  return getCustomForms().find((f) => f.id === id);
}

function write(forms: FormTemplate[]) {
  localStorage.setItem(KEY, JSON.stringify(forms));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function saveCustomForm(form: FormTemplate) {
  write([form, ...getCustomForms().filter((f) => f.id !== form.id)]);
}

export function deleteCustomForm(id: string) {
  write(getCustomForms().filter((f) => f.id !== id));
}

export function subscribeCustomForms(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}
