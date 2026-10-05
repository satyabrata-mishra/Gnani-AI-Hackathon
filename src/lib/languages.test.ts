import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getLanguage, usesNativeScript } from "./languages.ts";

describe("usesNativeScript", () => {
  const hinglish = getLanguage("hinglish")!;

  it("accepts Devanagari Hinglish with English words mixed in", () => {
    assert.equal(usesNativeScript(["आपका mobile number क्या है?", "धन्यवाद, details दर्ज हो गई हैं।"], hinglish), true);
  });

  it("rejects Hinglish written in Roman letters", () => {
    assert.equal(usesNativeScript(["Maine aapka form bhar diya hai. Kya yeh sahi hai?"], hinglish), false);
  });

  it("checks the right script per language and skips English", () => {
    assert.equal(usesNativeScript(["ನಿಮ್ಮ ಹೆಸರು ಏನು?"], getLanguage("kn")!), true);
    assert.equal(usesNativeScript(["आपका नाम क्या है?"], getLanguage("ta")!), false);
    assert.equal(usesNativeScript(["What is your name?"], getLanguage("en")!), true);
  });
});
