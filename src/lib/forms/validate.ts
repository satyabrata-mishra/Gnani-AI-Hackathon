import type { FormField } from "./types";

// Pure, dependency-free so it runs in the browser, on the server and under `node --test`.

export type FieldValue = string | number | boolean;

export type RejectReason =
  | "empty"
  | "too_long"
  | "not_a_number"
  | "out_of_range"
  | "invalid_date"
  | "future_date"
  | "invalid_phone"
  | "invalid_pincode"
  | "not_an_option"
  | "not_yes_no";

export type ValidationResult =
  | { ok: true; value: FieldValue; display: string }
  | { ok: false; reason: RejectReason; message: string };

const MAX_TEXT_LENGTH = 200;
const EARLIEST_DATE = "1900-01-01";

/** Today's date (YYYY-MM-DD) in India, where every demo form is filled. */
export function todayInIndia(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

function reject(reason: RejectReason, message: string): ValidationResult {
  return { ok: false, reason, message };
}

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[,\s₹]/g, "").replace(/^(rs\.?|inr)/i, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

function checkRange(field: FormField, n: number): ValidationResult | null {
  const unit = field.unit ? ` ${field.unit}` : "";
  if (field.min !== undefined && n < field.min) {
    return reject("out_of_range", `${field.label} must be at least ${field.min}${unit}.`);
  }
  if (field.max !== undefined && n > field.max) {
    return reject("out_of_range", `${field.label} must be at most ${field.max}${unit}.`);
  }
  return null;
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function isRealDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

const YES = new Set(["yes", "y", "true", "haan", "ha", "han"]);
const NO = new Set(["no", "n", "false", "nahi", "nahin", "na"]);

export function validateField(
  field: FormField,
  raw: string | number | boolean | null | undefined,
  { today = todayInIndia() }: { today?: string } = {},
): ValidationResult {
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return reject("empty", `${field.label} is empty.`);
  }
  const text = String(raw).trim().replace(/\s+/g, " ");

  switch (field.type) {
    case "text": {
      if (text.length > MAX_TEXT_LENGTH) return reject("too_long", `${field.label} is too long.`);
      return { ok: true, value: text, display: text };
    }

    case "number": {
      const n = parseNumber(text);
      if (n === null) return reject("not_a_number", `${field.label} must be a number.`);
      const rangeError = checkRange(field, n);
      if (rangeError) return rangeError;
      const rounded = Math.round(n * 100) / 100;
      return { ok: true, value: rounded, display: field.unit ? `${rounded} ${field.unit}` : String(rounded) };
    }

    case "currency": {
      const n = parseNumber(text);
      if (n === null) return reject("not_a_number", `${field.label} must be an amount in rupees.`);
      const rupees = Math.round(n);
      const rangeError = checkRange(field, rupees);
      if (rangeError) return rangeError;
      return { ok: true, value: rupees, display: inr.format(rupees) };
    }

    case "date": {
      if (!isRealDate(text)) return reject("invalid_date", `${field.label} must be a real calendar date.`);
      if (text > today) return reject("future_date", `${field.label} cannot be in the future.`);
      if (text < EARLIEST_DATE) return reject("invalid_date", `${field.label} is too far in the past.`);
      return { ok: true, value: text, display: text };
    }

    case "phone": {
      let digits = text.replace(/\D/g, "");
      if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
      else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
      if (!/^[6-9]\d{9}$/.test(digits)) {
        return reject("invalid_phone", `${field.label} must be a 10-digit Indian mobile number starting with 6, 7, 8 or 9.`);
      }
      return { ok: true, value: digits, display: `${digits.slice(0, 5)} ${digits.slice(5)}` };
    }

    case "pincode": {
      const digits = text.replace(/\D/g, "");
      if (!/^[1-9]\d{5}$/.test(digits)) return reject("invalid_pincode", `${field.label} must be a 6-digit PIN code.`);
      return { ok: true, value: digits, display: digits };
    }

    case "choice": {
      const match = field.options?.find((o) => o.toLowerCase() === text.toLowerCase());
      if (!match) {
        return reject("not_an_option", `${field.label} must be one of: ${field.options?.join(", ") ?? "the listed options"}.`);
      }
      return { ok: true, value: match, display: match };
    }

    case "yesno": {
      const lower = text.toLowerCase();
      if (YES.has(lower)) return { ok: true, value: true, display: "Yes" };
      if (NO.has(lower)) return { ok: true, value: false, display: "No" };
      return reject("not_yes_no", `${field.label} must be yes or no.`);
    }
  }
}
