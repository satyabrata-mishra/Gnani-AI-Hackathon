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

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

const CHECKS: Record<string, (values: Values, today: string) => CrossFieldIssue[]> = {
  "loan-application": (v, today) => {
    const issues: CrossFieldIssue[] = [];
    if (typeof v.date_of_birth === "string" && typeof v.age === "number") {
      const expected = ageOn(v.date_of_birth, today);
      if (Math.abs(expected - v.age) > 1) {
        issues.push({
          keys: ["age", "date_of_birth"],
          severity: "error",
          message: `Age ${v.age} does not match date of birth ${v.date_of_birth} (that would make them ${expected}).`,
        });
      }
    }
    if (typeof v.loan_amount === "number" && typeof v.monthly_income === "number" && v.monthly_income > 0) {
      const months = v.loan_amount / v.monthly_income;
      if (months > 60) {
        issues.push({
          keys: ["loan_amount", "monthly_income"],
          severity: "warning",
          message: `Loan amount is ${Math.round(months)} months of income; flag for manual eligibility review.`,
        });
      }
    }
    return issues;
  },

  "motor-claim": (v, today) => {
    const issues: CrossFieldIssue[] = [];
    if (typeof v.incident_date === "string") {
      const age = daysBetween(v.incident_date, today);
      if (age > 365) {
        issues.push({
          keys: ["incident_date"],
          severity: "warning",
          message: `Incident was ${age} days ago; most policies require prompt intimation.`,
        });
      }
    }
    if (v.injuries === true && v.police_report === false) {
      issues.push({
        keys: ["injuries", "police_report"],
        severity: "warning",
        message: "Injuries reported without a police report; an FIR is usually required for injury claims.",
      });
    }
    return issues;
  },
};

export function crossFieldIssues(templateId: string, values: Values, today: string): CrossFieldIssue[] {
  return CHECKS[templateId]?.(values, today) ?? [];
}
