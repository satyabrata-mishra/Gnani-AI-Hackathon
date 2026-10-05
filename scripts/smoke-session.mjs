// End-to-end check of the session API with typed answers (no microphone):
// start -> turns -> read-back -> review. Run with the dev server up: npm run smoke
const BASE = process.env.BOLO_URL ?? "http://localhost:3000";

const answers = [
  "Mera naam Ramesh Kumar hai, umar 42 saal",
  "Gaon Hosahalli, district Mandya",
  "PIN 571401",
  "Dhai acre zameen hai, ragi ugaate hain",
  "Mobile 98450 12345",
];

async function post(path, body) {
  const t = performance.now();
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  const ms = Math.round(performance.now() - t);
  if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(json)}`);
  return { json, ms };
}

const start = await post("/api/session/start", { templateId: "farmer-enrolment", languageId: "hinglish" });
let state = start.json.state;
console.log(`start (${start.ms}ms): ${start.json.prompt.text}`);

for (const transcript of answers) {
  if (state.done) break;
  const { json, ms } = await post("/api/session/turn", { state, transcript });
  state = json.state;
  const filled = json.events.filter((e) => e.type === "filled").map((e) => `${e.key}=${e.display}`);
  console.log(`turn (${ms}ms) "${transcript}" -> [${filled.join(", ")}] next: ${json.prompt.text}`);
}

console.log(`done: ${state.done}, filled ${Object.keys(state.values).length} fields, skipped [${state.skipped}]`);

const readback = await post("/api/session/readback", { state });
console.log(`readback (${readback.ms}ms, ${readback.json.text.length} chars): ${readback.json.text}`);

const review = await post("/api/session/review", { state });
console.log(`review (${review.ms}ms): ${review.json.summary}`);
console.log(`issues: ${JSON.stringify(review.json.issues)} missing: [${review.json.missing}]`);
