import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ageOn, crossFieldIssues } from "./checks.ts";
import { getFormTemplate } from "./templates.ts";
import type { FormField } from "./types.ts";
import { validateField } from "./validate.ts";

const TODAY = "2026-10-03";

function field(templateId: string, key: string): FormField {
  const found = getFormTemplate(templateId)?.fields.find((f) => f.key === key);
  if (!found) throw new Error(`No field ${templateId}.${key}`);
  return found;
}

function accepted(f: FormField, raw: string) {
  const result = validateField(f, raw, { today: TODAY });
  assert.ok(result.ok, `expected "${raw}" to be accepted for ${f.key}: ${result.ok ? "" : result.message}`);
  return result.value;
}

function rejected(f: FormField, raw: string) {
  const result = validateField(f, raw, { today: TODAY });
  assert.ok(!result.ok, `expected "${raw}" to be rejected for ${f.key}`);
  return result.reason;
}

describe("validateField", () => {
  it("normalises Indian mobile numbers", () => {
    const mobile = field("farmer-enrolment", "mobile");
    assert.equal(accepted(mobile, "98765 43210"), "9876543210");
    assert.equal(accepted(mobile, "+91 98765-43210"), "9876543210");
    assert.equal(accepted(mobile, "09876543210"), "9876543210");
    assert.equal(rejected(mobile, "1234567890"), "invalid_phone");
    assert.equal(rejected(mobile, "98765"), "invalid_phone");
  });

  it("checks PIN codes", () => {
    const pincode = field("farmer-enrolment", "pincode");
    assert.equal(accepted(pincode, "571 401"), "571401");
    assert.equal(rejected(pincode, "071401"), "invalid_pincode");
    assert.equal(rejected(pincode, "57140"), "invalid_pincode");
  });

  it("parses numbers with units and enforces ranges", () => {
    const land = field("farmer-enrolment", "land_acres");
    assert.equal(accepted(land, "2.5"), 2.5);
    assert.equal(rejected(land, "dhai"), "not_a_number");
    assert.equal(rejected(land, "900"), "out_of_range");
    const age = field("farmer-enrolment", "age");
    assert.equal(rejected(age, "15"), "out_of_range");
  });

  it("parses rupee amounts", () => {
    const income = field("loan-application", "monthly_income");
    assert.equal(accepted(income, "₹45,000"), 45000);
    assert.equal(accepted(income, "Rs 45000"), 45000);
    const loan = field("loan-application", "loan_amount");
    assert.equal(rejected(loan, "5000"), "out_of_range");
  });

  it("rejects impossible and future dates", () => {
    const incident = field("motor-claim", "incident_date");
    assert.equal(accepted(incident, "2026-10-02"), "2026-10-02");
    assert.equal(rejected(incident, "2026-02-30"), "invalid_date");
    assert.equal(rejected(incident, "2026-10-04"), "future_date");
    assert.equal(rejected(incident, "02/10/2026"), "invalid_date");
  });

  it("maps choices and yes/no answers to canonical values", () => {
    const occupation = field("loan-application", "occupation");
    assert.equal(accepted(occupation, "salaried"), "Salaried");
    assert.equal(rejected(occupation, "Astronaut"), "not_an_option");
    const injuries = field("motor-claim", "injuries");
    assert.equal(accepted(injuries, "no"), false);
    assert.equal(accepted(injuries, "Haan"), true);
    assert.equal(rejected(injuries, "maybe"), "not_yes_no");
  });

  it("rejects empty values", () => {
    assert.equal(rejected(field("farmer-enrolment", "full_name"), "   "), "empty");
  });
});

describe("crossFieldIssues", () => {
  it("computes age on a date", () => {
    assert.equal(ageOn("1990-10-03", TODAY), 36);
    assert.equal(ageOn("1990-10-04", TODAY), 35);
  });

  it("flags age that contradicts date of birth", () => {
    const issues = crossFieldIssues("loan-application", { age: 25, date_of_birth: "1990-01-15" }, TODAY);
    assert.equal(issues.length, 1);
    assert.deepEqual(issues[0].keys, ["age", "date_of_birth"]);
    assert.equal(issues[0].severity, "error");
  });

  it("accepts consistent age and date of birth", () => {
    assert.deepEqual(crossFieldIssues("loan-application", { age: 36, date_of_birth: "1990-01-15" }, TODAY), []);
  });

  it("warns on injuries without a police report", () => {
    const issues = crossFieldIssues("motor-claim", { injuries: true, police_report: false }, TODAY);
    assert.equal(issues[0]?.severity, "warning");
  });
});
