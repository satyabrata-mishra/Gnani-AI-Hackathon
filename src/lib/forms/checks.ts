import type { FieldValue } from "./validate";

// Deterministic cross-field checks. Pure, so it runs under `node --test` too.

export interface CrossFieldIssue {
  keys: string[];
  severity: "error" | "warning";
  message: string;
}

type Values = Record<string, FieldValue | undefined>;

export function ageOn(dateOfBirth: string, today: string): number {
  const [by, bm, bd] = dateOfBirth.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const CHECKS: Record<string, (values: Values, today: string) => CrossFieldIssue[]> = {
  "emi-follow-up": (v) => {
    const issues: CrossFieldIssue[] = [];
    if (typeof v.pay_amount === "number" && typeof v.emi_amount === "number" && typeof v.missed_emis === "number") {
      const overdue = v.emi_amount * v.missed_emis;
      if (v.pay_amount > overdue) {
        issues.push({
          keys: ["pay_amount", "emi_amount", "missed_emis"],
          severity: "warning",
          message: `Committed ${rupees(v.pay_amount)} is more than the ${rupees(overdue)} overdue; confirm the amount.`,
        });
      } else if (v.pay_amount < v.emi_amount) {
        issues.push({
          keys: ["pay_amount", "emi_amount"],
          severity: "warning",
          message: `Partial payment: ${rupees(v.pay_amount)} does not cover one EMI of ${rupees(v.emi_amount)}.`,
        });
      }
    }
    if (typeof v.pay_in_days === "number" && v.pay_in_days > 30) {
      issues.push({
        keys: ["pay_in_days"],
        severity: "warning",
        message: `Payment promised ${v.pay_in_days} days out; consider offering a restructuring call.`,
      });
    }
    return issues;
  },

  "account-opening": (v, today) => {
    const issues: CrossFieldIssue[] = [];
    if (typeof v.date_of_birth === "string") {
      const age = ageOn(v.date_of_birth, today);
      if (age < 18) {
        issues.push({
          keys: ["date_of_birth"],
          severity: "error",
          message: `Applicant is ${age}; a minor's account must be opened with a guardian.`,
        });
      }
    }
    if (typeof v.nominee_name === "string" && typeof v.full_name === "string" && v.nominee_name.trim().toLowerCase() === v.full_name.trim().toLowerCase()) {
      issues.push({
        keys: ["nominee_name", "full_name"],
        severity: "error",
        message: "The nominee cannot be the account holder.",
      });
    }
    if (typeof v.nominee_name === "string" && v.nominee_relation === undefined) {
      issues.push({
        keys: ["nominee_relation"],
        severity: "warning",
        message: "Nominee named without a relation; the bank will ask for it.",
      });
    }
    if ((v.occupation === "Student" || v.occupation === "Homemaker") && typeof v.annual_income === "number" && v.annual_income > 1_000_000) {
      issues.push({
        keys: ["annual_income", "occupation"],
        severity: "warning",
        message: `${v.occupation} declaring ${rupees(v.annual_income)} a year; confirm the source of funds.`,
      });
    }
    return issues;
  },
};

export function crossFieldIssues(templateId: string, values: Values, today: string): CrossFieldIssue[] {
  return CHECKS[templateId]?.(values, today) ?? [];
}
