import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getFormTemplate } from "../forms/templates.ts";
import type { FormTemplate } from "../forms/types.ts";
import { applyExtraction, MAX_ATTEMPTS, promptFor, startSession } from "./apply.ts";
import type { Extraction } from "./extract.ts";
import type { QuestionBank, SessionState } from "./types.ts";

const TODAY = "2026-10-03";

function template(id: string): FormTemplate {
  const t = getFormTemplate(id);
  if (!t) throw new Error(id);
  return t;
}

function update(key: string, value: string, extra: Partial<Extraction["updates"][number]> = {}) {
  return { key, value, quote: value, confidence: "high" as const, is_correction: false, ...extra };
}

function answered(...updates: Extraction["updates"]): Extraction {
  return { status: "answered", updates, reply: null };
}

const farmer = template("farmer-enrolment");
const account = template("account-opening");

function bankFor(t: FormTemplate): QuestionBank {
  return {
    templateId: t.id,
    languageId: "en",
    fields: Object.fromEntries(t.fields.map((f) => [f.key, { ask: `ask ${f.key}`, retry: `retry ${f.key}` }])),
    unclear: "sorry",
    done: "thanks",
  };
}

function askedState(t: FormTemplate, key: string, base: Partial<SessionState> = {}): SessionState {
  return { ...startSession(t, "en"), current: { key, kind: "ask", attempts: 0 }, ...base };
}

describe("applyExtraction", () => {
  it("fills the asked field and moves to the next one", () => {
    const { state, events } = applyExtraction(farmer, startSession(farmer, "en"), answered(update("full_name", "Ramesh Kumar")), "Ramesh Kumar", TODAY);
    assert.equal(state.values.full_name?.value, "Ramesh Kumar");
    assert.deepEqual(state.current, { key: "age", kind: "ask", attempts: 0 });
    assert.equal(events[0]?.type, "filled");
  });

  it("accepts volunteered fields and skips asking for them", () => {
    const start = askedState(farmer, "land_acres");
    const { state } = applyExtraction(farmer, start, answered(update("land_acres", "2.5"), update("main_crop", "wheat")), "...", TODAY);
    assert.equal(state.values.land_acres?.value, 2.5);
    assert.equal(state.values.main_crop?.value, "wheat");
    assert.equal(state.current?.key, "full_name");
  });

  it("applies explicit corrections but ignores silent overwrites", () => {
    const filled = { value: 32, display: "32 years", quote: "32", turn: 1, confidence: "high" as const };
    const start = askedState(farmer, "village", { values: { age: filled } });

    const silent = applyExtraction(farmer, start, answered(update("age", "45"), update("village", "Rampur")), "...", TODAY);
    assert.equal(silent.state.values.age?.value, 32);
    assert.ok(silent.events.some((e) => e.type === "ignored" && e.key === "age"));

    const corrected = applyExtraction(farmer, start, answered(update("age", "42", { is_correction: true })), "...", TODAY);
    assert.equal(corrected.state.values.age?.value, 42);
    assert.ok(corrected.events.some((e) => e.type === "filled" && e.key === "age" && e.corrected));
  });

  it("rejects invalid values and retries the same field", () => {
    const start = askedState(farmer, "mobile");
    const { state, events } = applyExtraction(farmer, start, answered(update("mobile", "12345")), "one two three four five", TODAY);
    assert.equal(state.values.mobile, undefined);
    assert.deepEqual(state.current, { key: "mobile", kind: "retry", attempts: 1 });
    assert.equal(events[0]?.type, "rejected");
    assert.equal(promptFor(state, bankFor(farmer)).text, "retry mobile");
  });

  it("asks again with an apology when the answer is unclear", () => {
    const start = askedState(farmer, "district");
    const { state } = applyExtraction(farmer, start, { status: "unclear", updates: [], reply: null }, "hmm", TODAY);
    assert.deepEqual(state.current, { key: "district", kind: "clarify", attempts: 1 });
    assert.equal(promptFor(state, bankFor(farmer)).text, "sorry ask district");
  });

  it("answers a question back and re-asks", () => {
    const start = askedState(farmer, "mobile");
    const extraction: Extraction = { status: "question", updates: [], reply: "It is only used for scheme updates." };
    const { state } = applyExtraction(farmer, start, extraction, "why do you need it?", TODAY);
    assert.equal(promptFor(state, bankFor(farmer), extraction).text, "It is only used for scheme updates. ask mobile");
  });

  it("skips a declined optional field", () => {
    const start = askedState(account, "nominee_name");
    const { state, events } = applyExtraction(account, start, { status: "declined", updates: [], reply: null }, "abhi nahi", TODAY);
    assert.ok(state.skipped.includes("nominee_name"));
    assert.ok(events.some((e) => e.type === "skipped"));
    assert.notEqual(state.current?.key, "nominee_name");
  });

  it("gives up on a field after the maximum attempts and flags it", () => {
    const start = askedState(farmer, "pincode", { current: { key: "pincode", kind: "clarify", attempts: MAX_ATTEMPTS - 1 } });
    const { state } = applyExtraction(farmer, start, { status: "unclear", updates: [], reply: null }, "...", TODAY);
    assert.ok(state.skipped.includes("pincode"));
    assert.notEqual(state.current?.key, "pincode");
  });

  it("finishes when every field is filled or skipped", () => {
    const values = Object.fromEntries(
      farmer.fields
        .filter((f) => f.key !== "mobile")
        .map((f) => [f.key, { value: "x", display: "x", quote: "x", turn: 1, confidence: "high" as const }]),
    );
    const start = askedState(farmer, "mobile", { values });
    const { state } = applyExtraction(farmer, start, answered(update("mobile", "9876543210")), "...", TODAY);
    assert.equal(state.done, true);
    assert.equal(state.current, null);
    assert.equal(promptFor(state, bankFor(farmer)).kind, "done");
  });
});
