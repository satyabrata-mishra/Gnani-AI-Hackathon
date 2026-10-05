// Scores the turn engine on messy, mixed-language answers through the live API routes.
// Needs the dev server running. Run with: npm run eval   (APP_URL defaults to localhost:3000)

const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const DELAY_MS = Number(process.env.EVAL_DELAY_MS ?? 4000);

const istDate = (offsetDays = 0) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(Date.now() + offsetDays * 86_400_000));

const filled = (value, display = String(value)) => ({ value, display, quote: display, turn: 1, confidence: "high" });

// expect: key -> value (or array of acceptable values). status: expected extraction status event.
// absent: keys that must NOT be filled after the turn.
const CASES = [
  { name: "Hinglish fraction + volunteered crop", form: "farmer-enrolment", lang: "hinglish", ask: "land_acres",
    say: "Haan ji, mere paas dhai acre zameen hai, aur wheat ugaate hain", expect: { land_acres: 2.5, main_crop: "wheat" } },
  { name: "Hindi name in Devanagari", form: "farmer-enrolment", lang: "hinglish", ask: "full_name",
    say: "मेरा नाम सुनीता देवी है", expect: { full_name: "Sunita Devi" } },
  { name: "Mobile with spaces", form: "farmer-enrolment", lang: "hinglish", ask: "mobile",
    say: "मेरा नंबर है 98765 43210", expect: { mobile: "9876543210" } },
  { name: "Mobile in Hindi words", form: "farmer-enrolment", lang: "hinglish", ask: "mobile",
    say: "नौ आठ सात छह पाँच चार तीन दो एक शून्य", expect: { mobile: "9876543210" } },
  { name: "Self-correction of earlier age", form: "farmer-enrolment", lang: "hinglish", ask: "village",
    prior: { age: filled(32, "32 years") },
    say: "Rampur gaon hai. Aur haan, meri age 32 nahi, 42 hai", expect: { village: "Rampur", age: 42 } },
  { name: "Sava teen = 3.25", form: "farmer-enrolment", lang: "hinglish", ask: "land_acres",
    say: "sava teen acre hai ji", expect: { land_acres: 3.25 } },
  { name: "PIN code in words", form: "farmer-enrolment", lang: "hinglish", ask: "pincode",
    say: "pin code hai paanch saat ek chaar shunya ek", expect: { pincode: "571401" } },
  { name: "Declined required field", form: "farmer-enrolment", lang: "hinglish", ask: "age",
    say: "पता नहीं, मुझे याद नहीं", status: "declined", absent: ["age"] },
  { name: "Noise / unusable answer", form: "farmer-enrolment", lang: "hinglish", ask: "district",
    say: "haan haan... hello? awaaz aa rahi hai?", status: "unclear", absent: ["district"] },
  { name: "Question back", form: "farmer-enrolment", lang: "hinglish", ask: "mobile",
    say: "aap mera number kyun le rahe ho?", status: "question", absent: ["mobile"] },
  { name: "Kannada crop", form: "farmer-enrolment", lang: "kn", ask: "main_crop",
    say: "ನಾನು ರಾಗಿ ಬೆಳೆಯುತ್ತೇನೆ", expect: { main_crop: ["ragi", "finger millet"] } },
  { name: "Kannada district", form: "farmer-enrolment", lang: "kn", ask: "district",
    say: "ನಮ್ಮದು ಮಂಡ್ಯ ಜಿಲ್ಲೆ", expect: { district: "Mandya" } },
  { name: "Relative promise: parso", form: "emi-follow-up", lang: "hinglish", ask: "pay_in_days",
    say: "parso tak pakka kar dunga", expect: { pay_in_days: 2 } },
  { name: "Delay reason mapped to option", form: "emi-follow-up", lang: "hinglish", ask: "delay_reason",
    say: "इस महीने salary late आई, इसलिए नहीं भर पाया", expect: { delay_reason: "Salary delayed" } },
  { name: "Tamil medical reason", form: "emi-follow-up", lang: "ta", ask: "delay_reason",
    say: "அம்மாவுக்கு ஆஸ்பத்திரி செலவு ஆயிடுச்சு", expect: { delay_reason: "Medical emergency" } },
  { name: "Saadhe chaar hazaar EMI", form: "emi-follow-up", lang: "hinglish", ask: "emi_amount",
    say: "EMI साढ़े चार हज़ार की है", expect: { emi_amount: 4500 } },
  { name: "Do mahine = 2 EMIs", form: "emi-follow-up", lang: "hinglish", ask: "missed_emis",
    say: "do mahine se nahi bhara", expect: { missed_emis: 2 } },
  { name: "GPay -> UPI", form: "emi-follow-up", lang: "hinglish", ask: "payment_mode",
    say: "main GPay se kar dunga", expect: { payment_mode: "UPI" } },
  { name: "Bike loan -> Two-wheeler", form: "emi-follow-up", lang: "hinglish", ask: "loan_type",
    say: "bike ke liye loan liya tha", expect: { loan_type: "Two-wheeler loan" } },
  { name: "Below minimum -> code rejects", form: "emi-follow-up", lang: "hinglish", ask: "emi_amount",
    say: "do sau rupaye ki EMI hai", absent: ["emi_amount"], kind: "retry" },
  { name: "Monthly income x 12", form: "account-opening", lang: "hinglish", ask: "annual_income",
    say: "mahine ka paintalis hazaar milta hai", expect: { annual_income: 540000 } },
  { name: "Occupation mapped to option", form: "account-opening", lang: "hinglish", ask: "occupation",
    say: "main ek private company mein naukri karta hoon", expect: { occupation: "Salaried" } },
  { name: "Telugu city", form: "account-opening", lang: "te", ask: "city",
    say: "నేను హైదరాబాద్‌లో ఉంటాను", expect: { city: "Hyderabad" } },
  { name: "Bengali name", form: "account-opening", lang: "bn", ask: "full_name",
    say: "আমার নাম অনিতা ঘোষ", expect: { full_name: "Anita Ghosh" } },
  { name: "Nominee wife -> Spouse", form: "account-opening", lang: "hinglish", ask: "nominee_relation",
    say: "meri wife hai", expect: { nominee_relation: "Spouse" } },
  { name: "Marathi date of birth", form: "account-opening", lang: "mr", ask: "date_of_birth",
    say: "माझा जन्म पंधरा ऑगस्ट एकोणीसशे नव्याण्णव ला झाला", expect: { date_of_birth: "1999-08-15" } },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(path, body) {
  const res = await fetch(`${APP_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}: ${data?.error?.message ?? "unknown error"}`);
  return data;
}

const norm = (v) => (typeof v === "string" ? v.trim().toLowerCase().replace(/\s+/g, " ") : v);

function matches(actual, expected) {
  if (expected === "*") return actual !== undefined;
  const options = Array.isArray(expected) ? expected : [expected];
  return options.some((o) => norm(o) === norm(actual));
}

const sessions = new Map();
async function baseState(form, lang) {
  const key = `${form}:${lang}`;
  if (!sessions.has(key)) {
    const started = await post("/api/session/start", { templateId: form, languageId: lang });
    sessions.set(key, started);
    console.log(`  question bank ${key}: "${started.prompt.text}"`);
    await sleep(DELAY_MS);
  }
  return sessions.get(key).state;
}

async function runCase(c) {
  const base = await baseState(c.form, c.lang);
  const state = { ...base, values: { ...(c.prior ?? {}) }, current: { key: c.ask, kind: "ask", attempts: 0 } };
  const result = await post("/api/session/turn", { state, transcript: c.say });

  const problems = [];
  for (const [key, expected] of Object.entries(c.expect ?? {})) {
    const actual = result.state.values[key]?.value;
    if (!matches(actual, expected)) problems.push(`${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
  for (const key of c.absent ?? []) {
    if (result.state.values[key] !== undefined) problems.push(`${key} should be empty, got ${JSON.stringify(result.state.values[key].value)}`);
  }
  if (c.status && !result.events.some((e) => e.type === c.status)) {
    problems.push(`expected status "${c.status}", events: ${result.events.map((e) => e.type).join(",") || "none"}`);
  }
  if (c.kind && result.state.current?.kind !== c.kind) {
    problems.push(`expected next prompt kind "${c.kind}", got "${result.state.current?.kind}"`);
  }
  return { result, problems };
}

async function main() {
  console.log(`Evaluating ${CASES.length} cases against ${APP_URL}\n`);
  const latencies = [];
  let passed = 0;

  for (const c of CASES) {
    try {
      const { result, problems } = await runCase(c);
      latencies.push(result.meta.latencyMs);
      const ok = problems.length === 0;
      if (ok) passed++;
      const values = Object.entries(result.state.values).map(([k, v]) => `${k}=${JSON.stringify(v.value)}`).join(" ");
      console.log(`${ok ? "PASS" : "FAIL"}  ${c.name} [${c.lang}] ${result.meta.latencyMs}ms (${result.meta.model})`);
      console.log(`      said: ${c.say}`);
      console.log(`      got:  ${values || "(nothing)"} | events: ${result.events.map((e) => e.type).join(",") || "none"}`);
      console.log(`      next: ${result.prompt.text}`);
      for (const p of problems) console.log(`      !! ${p}`);
    } catch (err) {
      console.log(`ERROR ${c.name}: ${err.message}`);
    }
    await sleep(DELAY_MS);
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;
  console.log(`\nScore: ${passed}/${CASES.length} passed`);
  console.log(`Model latency per turn: median ${pct(50)}ms, p90 ${pct(90)}ms`);

  console.log("\nReview check (applicant is a minor):");
  try {
    const base = await baseState("account-opening", "hinglish");
    const review = await post("/api/session/review", {
      state: {
        ...base,
        values: {
          full_name: filled("Rahul Verma"),
          date_of_birth: filled(istDate(-16 * 365)),
          occupation: filled("Student"),
          annual_income: filled(0, "₹0"),
          city: filled("Lucknow"),
          pincode: filled("226001"),
          nominee_name: filled("Sunita Verma"),
          nominee_relation: filled("Mother"),
          mobile: filled("9876543210", "98765 43210"),
        },
        current: null,
        done: true,
      },
    });
    console.log(`  ${review.meta.latencyMs}ms (${review.meta.model})`);
    console.log(`  summary: ${review.summary}`);
    for (const i of review.issues) console.log(`  [${i.source}/${i.severity}] ${i.keys.join(", ")}: ${i.message}`);
    const caught = review.issues.some((i) => i.source === "rules" && i.keys.includes("date_of_birth"));
    console.log(`  ${caught ? "PASS" : "FAIL"}  rule check caught the minor`);
  } catch (err) {
    console.log(`  ERROR ${err.message}`);
  }
}

main();
