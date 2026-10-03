// Probes the community Evon ZeroGPU Space (luminenio/gnani-evon-v3.3-chat).
// Run with: npm run probe:evon  (reads HF_TOKEN from .env.local)

const SPACE_URL = "https://luminenio-gnani-evon-v3-3-chat.hf.space";
const ENDPOINT = `${SPACE_URL}/gradio_api/call/chat`;

const token = process.env.HF_TOKEN?.trim();
const headers = { "Content-Type": "application/json" };
if (token) headers.Authorization = `Bearer ${token}`;

const CASES = [
  {
    name: "Plain greeting",
    data: ["Hello! Reply in one short sentence."],
  },
  {
    name: "Hinglish extraction (Bolo turn)",
    data: [
      "Question asked: How much land do you have? Farmer said: Haan ji, mere paas dhai acre zameen hai, aur wheat ugaate hain",
      'You extract form data. Reply with ONLY minified JSON, no prose, matching: {"land_acres":number|null,"main_crop":string|null,"follow_up":string|null}. Values in English.',
      128,
      0.3,
      0.95,
      1.1,
    ],
  },
];

async function checkWhoami() {
  if (!token) return "none (anonymous quota: about 2 GPU-minutes/day)";
  const res = await fetch("https://huggingface.co/api/whoami-v2", { headers });
  if (!res.ok) return `token rejected (HTTP ${res.status})`;
  const me = await res.json();
  return `${me.name}${me.isPro ? " (PRO)" : " (free account)"}`;
}

function parseSse(text) {
  const events = [];
  let current = null;
  for (const line of text.split("\n")) {
    if (line.startsWith("event:")) current = { event: line.slice(6).trim(), data: "" };
    else if (line.startsWith("data:") && current) {
      current.data = line.slice(5).trim();
      events.push(current);
      current = null;
    }
  }
  return events;
}

async function runCase({ name, data }) {
  const started = Date.now();
  const submit = await fetch(ENDPOINT, { method: "POST", headers, body: JSON.stringify({ data }) });
  if (!submit.ok) {
    console.log(`  submit failed: HTTP ${submit.status} ${await submit.text()}`);
    return;
  }
  const { event_id } = await submit.json();
  const stream = await fetch(`${ENDPOINT}/${event_id}`, { headers });
  const events = parseSse(await stream.text());
  const elapsed = Date.now() - started;

  const final = events.findLast((e) => e.event === "complete" || e.event === "error");
  console.log(`\n[${name}] ${elapsed} ms, ${events.length} events, final: ${final?.event ?? "none"}`);
  if (final?.event === "complete") {
    const [answer] = JSON.parse(final.data);
    console.log(`  answer: ${answer}`);
  } else {
    console.log(`  raw: ${events.map((e) => `${e.event}=${e.data}`).join(" | ") || "(empty stream)"}`);
  }
}

console.log(`Space: ${SPACE_URL}`);
console.log(`Hugging Face identity: ${await checkWhoami()}`);
for (const testCase of CASES) await runCase(testCase);
