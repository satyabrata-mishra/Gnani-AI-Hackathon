import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkTemplate, isSensitiveField, normaliseDraft, slugifyKey, uniqueKey, type FormDraft } from "./schema.ts";
import { FORM_TEMPLATES } from "./templates.ts";

const draftField = (over: Partial<FormDraft["fields"][number]>): FormDraft["fields"][number] => ({
  label: "Full name",
  type: "text",
  required: true,
  hint: "",
  options: [],
  min: null,
  max: null,
  unit: null,
  ...over,
});

const draft = (fields: FormDraft["fields"]): FormDraft => ({
  title: "Ration card application",
  org: "Food department (demo)",
  summary: "Apply for a ration card.",
  icon: "home",
  fields,
});

describe("form schema", () => {
  it("accepts every built-in template", () => {
    for (const t of FORM_TEMPLATES) assert.equal(checkTemplate(t).ok, true, t.id);
  });

  it("flags government IDs and bank details but not PIN codes", () => {
    assert.equal(isSensitiveField({ key: "aadhaar_number", label: "Aadhaar number" }), true);
    assert.equal(isSensitiveField({ key: "pan_number", label: "PAN" }), true);
    assert.equal(isSensitiveField({ key: "bank_account", label: "Bank account number" }), true);
    assert.equal(isSensitiveField({ key: "pincode", label: "PIN code" }), false);
    assert.equal(isSensitiveField({ key: "panchayat", label: "Gram panchayat" }), false);
  });

  it("reports duplicate keys, missing options and sensitive fields by field index", () => {
    const result = checkTemplate({
      ...FORM_TEMPLATES[0],
      id: "custom-test01",
      fields: [
        { key: "name", label: "Name", type: "text", required: true, hint: "" },
        { key: "name", label: "Category", type: "choice", required: true, hint: "", options: ["APL"] },
        { key: "id_no", label: "Aadhaar number", type: "text", required: true, hint: "" },
      ],
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.deepEqual(
      result.issues.map((i) => i.field),
      [1, 1, 2],
    );
  });

  it("makes keys from labels and keeps them unique", () => {
    assert.equal(slugifyKey("Family members (count)"), "family_members_count");
    assert.equal(slugifyKey("10th marks"), "f_10th_marks");
    assert.equal(uniqueKey("name", new Set(["name", "name_2"])), "name_3");
  });
});

describe("normaliseDraft", () => {
  it("drops sensitive fields with a note and produces a valid template", () => {
    const { template, notes } = normaliseDraft(
      draft([
        draftField({}),
        draftField({ label: "Aadhaar number" }),
        draftField({ label: "Family members", type: "number", min: 1, max: 20, unit: "people" }),
        draftField({ label: "Monthly income", type: "currency", min: null }),
        draftField({ label: "Category", type: "choice", options: ["APL", "BPL", "AAY", "BPL"] }),
      ]),
      "custom-abc123",
    );
    assert.equal(notes.length, 1);
    assert.deepEqual(
      template.fields.map((f) => f.key),
      ["full_name", "family_members", "monthly_income", "category"],
    );
    assert.equal(template.fields[2].unit, "INR");
    assert.equal(template.fields[2].min, 0);
    assert.deepEqual(template.fields[3].options, ["APL", "BPL", "AAY"]);
    assert.equal(checkTemplate(template).ok, true);
  });

  it("falls back to text for unknown types and choices without options", () => {
    const { template } = normaliseDraft(
      draft([draftField({ label: "Address", type: "address" }), draftField({ label: "Caste", type: "choice", options: [] })]),
      "custom-abc123",
    );
    assert.deepEqual(
      template.fields.map((f) => f.type),
      ["text", "text"],
    );
  });
});
