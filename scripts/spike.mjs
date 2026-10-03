// API spike: verifies Timbre, Prisma and Evon end to end and reports latency.
// Run with: npm run spike
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const GNANI_API_KEY = process.env.GNANI_API_KEY;
const GNANI_BASE_URL = (process.env.GNANI_BASE_URL || "https://api.vachana.ai").replace(/\/$/, "");
const EVON_BASE_URL = process.env.EVON_BASE_URL?.replace(/\/$/, "");
const EVON_MODEL = process.env.EVON_MODEL || "model";
const EVON_API_KEY = process.env.EVON_API_KEY;
const SEND_KWARGS = process.env.EVON_SEND_CHAT_TEMPLATE_KWARGS !== "false";

const OUT_DIR = join(import.meta.dirname, "out");
const results = [];

const SAMPLES = [
  {
    label: "Hindi",
    tts: "hi-IN",
    stt: "hi-IN",
    voice: "Chitra",
    text: "मेरा नाम रमेश कुमार है। मेरे पास ढाई एकड़ ज़मीन है। मेरा मोबाइल नंबर नौ आठ सात छह पाँच चार तीन दो एक शून्य है।",
  },
  {
    label: "Kannada",
    tts: "kn-IN",
    stt: "kn-IN",
    voice: "Kavin",
    text: "ನನ್ನ ಹೆಸರು ಲಕ್ಷ್ಮಿ. ನಾನು ಮಂಡ್ಯ ಜಿಲ್ಲೆಯಲ್ಲಿ ರಾಗಿ ಬೆಳೆಯುತ್ತೇನೆ.",
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Gnani rate-limits bursts; retry 429/503 with backoff, like the app does.
async function gnaniFetch(url, init, retries = 3) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, init);
    if (![429, 503].includes(res.status) || attempt >= retries) return res;
    await res.body?.cancel();
    await sleep(1000 * 2 ** attempt);
  }
}

async function timed(fn) {
  const started = performance.now();
  const value = await fn();
  return { value, ms: Math.round(performance.now() - started) };
}

async function failText(res) {
  const body = await res.text().catch(() => "");
  return `HTTP ${res.status} ${body.slice(0, 300)}`;
}

async function tts(sample) {
  const { value: res, ms } = await timed(() =>
    gnaniFetch(`${GNANI_BASE_URL}/api/v1/tts/inference`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key-ID": GNANI_API_KEY },
      body: JSON.stringify({
        text: sample.text,
        voice: sample.voice,
        model: "timbre-v2.5",
        language: sample.tts,
        speed: 1,
        audio_config: { container: "mp3" },
      }),
    }),
  );
  if (!res.ok) throw new Error(`Timbre ${sample.label}: ${await failText(res)}`);
  const audio = Buffer.from(await res.arrayBuffer());
  const file = join(OUT_DIR, `tts-${sample.tts}.mp3`);
  await writeFile(file, audio);
  results.push({ step: `Timbre TTS (${sample.label})`, ms, detail: `${audio.length} bytes -> ${file}` });
  return audio;
}

async function stt(sample, audio) {
  const form = new FormData();
  form.append("audio_file", new Blob([audio], { type: "audio/mpeg" }), `tts-${sample.tts}.mp3`);
  form.append("language_code", sample.stt);
  form.append("format", "transcribe");
  const { value: res, ms } = await timed(() =>
    gnaniFetch(`${GNANI_BASE_URL}/stt/v3`, { method: "POST", headers: { "X-API-Key-ID": GNANI_API_KEY }, body: form }),
  );
  if (!res.ok) throw new Error(`Prisma ${sample.label}: ${await failText(res)}`);
  const body = await res.json();
  results.push({ step: `Prisma STT (${sample.label})`, ms, detail: body.transcript });
  return body.transcript;
}

async function evonModels() {
  const { value: res, ms } = await timed(() =>
    fetch(`${EVON_BASE_URL}/models`, {
      headers: EVON_API_KEY ? { Authorization: `Bearer ${EVON_API_KEY}` } : {},
    }),
  );
  if (!res.ok) throw new Error(`Evon /models: ${await failText(res)}`);
  const data = await res.json();
  const ids = (data.data ?? []).map((m) => m.id).join(", ") || "(none reported)";
  results.push({ step: "Evon /models", ms, detail: `served: ${ids} | EVON_MODEL=${EVON_MODEL}` });
}

async function evon(transcript, thinking) {
  const body = {
    model: EVON_MODEL,
    messages: [
      {
        role: "system",
        content:
          'Extract form fields from the user\'s answer. Reply with JSON only: {"full_name": string|null, "land_acres": number|null, "mobile": string|null}.',
      },
      { role: "user", content: transcript },
    ],
    max_tokens: thinking ? 2048 : 256,
    temperature: thinking ? 0.6 : 0.2,
    top_p: 0.95,
  };
  if (SEND_KWARGS) body.chat_template_kwargs = { enable_thinking: thinking };

  const { value: res, ms } = await timed(() =>
    fetch(`${EVON_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(EVON_API_KEY ? { Authorization: `Bearer ${EVON_API_KEY}` } : {}) },
      body: JSON.stringify(body),
    }),
  );
  if (!res.ok) throw new Error(`Evon: ${await failText(res)}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  results.push({ step: `Evon extract (thinking ${thinking ? "on" : "off"})`, ms, detail: content.replace(/\s+/g, " ").slice(0, 200) });
}

async function main() {
  if (!GNANI_API_KEY) {
    console.error("GNANI_API_KEY is missing. Copy .env.example to .env.local and add your key.");
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });

  let hindiTranscript = null;
  for (const sample of SAMPLES) {
    try {
      const audio = await tts(sample);
      await sleep(1000);
      const transcript = await stt(sample, audio);
      await sleep(1000);
      if (sample.tts === "hi-IN") hindiTranscript = transcript;
    } catch (err) {
      results.push({ step: sample.label, ms: null, detail: `FAILED: ${err.message}` });
    }
  }

  if (!EVON_BASE_URL) {
    results.push({ step: "Evon", ms: null, detail: "Skipped: EVON_BASE_URL not set" });
  } else if (hindiTranscript) {
    try {
      await evonModels();
    } catch (err) {
      results.push({ step: "Evon /models", ms: null, detail: `FAILED: ${err.message}` });
    }
    for (const thinking of [false, true]) {
      try {
        await evon(hindiTranscript, thinking);
      } catch (err) {
        results.push({ step: "Evon", ms: null, detail: `FAILED: ${err.message}` });
        break;
      }
    }
  }

  console.log("\nBolo API spike\n");
  for (const r of results) {
    console.log(`${r.step.padEnd(30)} ${r.ms === null ? "   -  " : `${String(r.ms).padStart(5)}ms`}  ${r.detail}`);
  }
  console.log("");
}

main();
