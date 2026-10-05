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
    const emi = field("emi-follow-up", "emi_amount");
    assert.equal(accepted(emi, "₹4,500"), 4500);
    assert.equal(accepted(emi, "Rs 4500"), 4500);
    assert.equal(rejected(emi, "200"), "out_of_range");
  });

  it("rejects impossible and future dates", () => {
    const dob = field("account-opening", "date_of_birth");
    assert.equal(accepted(dob, "1990-08-15"), "1990-08-15");
    assert.equal(rejected(dob, "1990-02-30"), "invalid_date");
    assert.equal(rejected(dob, "2026-10-04"), "future_date");
    assert.equal(rejected(dob, "15/08/1990"), "invalid_date");
  });

  it("maps choices and yes/no answers to canonical values", () => {
    const occupation = field("account-opening", "occupation");
    assert.equal(accepted(occupation, "salaried"), "Salaried");
    assert.equal(rejected(occupation, "Astronaut"), "not_an_option");
    const consent: FormField = { key: "consent", label: "Consent", type: "yesno", required: true, hint: "" };
    assert.equal(accepted(consent, "no"), false);
    assert.equal(accepted(consent, "Haan"), true);
    assert.equal(rejected(consent, "maybe"), "not_yes_no");
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

  it("blocks a minor from opening an account alone", () => {
    const issues = crossFieldIssues("account-opening", { date_of_birth: "2012-01-15" }, TODAY);
    assert.equal(issues.length, 1);
    assert.deepEqual(issues[0].keys, ["date_of_birth"]);
    assert.equal(issues[0].severity, "error");
  });

  it("accepts an adult applicant with a separate nominee", () => {
    const values = { full_name: "Anita Ghosh", date_of_birth: "1990-01-15", nominee_name: "Rahul Ghosh", nominee_relation: "Spouse" };
    assert.deepEqual(crossFieldIssues("account-opening", values, TODAY), []);
  });

  it("rejects the account holder as their own nominee", () => {
    const issues = crossFieldIssues("account-opening", { full_name: "Anita Ghosh", nominee_name: "anita ghosh", nominee_relation: "Other" }, TODAY);
    assert.deepEqual(issues.map((i) => i.severity), ["error"]);
  });

  it("warns on a payment that covers less than one EMI", () => {
    const issues = crossFieldIssues("emi-follow-up", { emi_amount: 4500, missed_emis: 2, pay_amount: 2000 }, TODAY);
    assert.deepEqual(issues.map((i) => i.keys), [["pay_amount", "emi_amount"]]);
    assert.equal(issues[0].severity, "warning");
  });

  it("accepts a full overdue payment within a month", () => {
    assert.deepEqual(crossFieldIssues("emi-follow-up", { emi_amount: 4500, missed_emis: 2, pay_amount: 9000, pay_in_days: 7 }, TODAY), []);
  });
});
