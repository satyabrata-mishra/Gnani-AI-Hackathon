// Verifies the browser recording pipeline (48 kHz float PCM -> 16 kHz WAV) against Prisma
// via the app's own /api/stt route. Requires `npm run dev` and GNANI_API_KEY.
// Run with: node --env-file-if-exists=.env.local scripts/test-wav-pipeline.ts
import { downsample, encodeWav, TARGET_SAMPLE_RATE } from "../src/lib/audio/wav.ts";

const KEY = process.env.GNANI_API_KEY;
const BASE = (process.env.GNANI_BASE_URL || "https://api.vachana.ai").replace(/\/$/, "");
const APP = process.env.APP_URL || "http://localhost:3000";
const TEXT = "मेरा नाम सुनीता देवी है और मैं जयपुर में रहती हूँ।";

if (!KEY) throw new Error("GNANI_API_KEY missing");

const tts = await fetch(`${BASE}/api/v1/tts/inference`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-API-Key-ID": KEY },
  body: JSON.stringify({
    text: TEXT,
    voice: "Chitra",
    model: "timbre-v2.5",
    language: "hi-IN",
    audio_config: { sample_rate: 48000, num_channels: 1, sample_width: 2, encoding: "linear_pcm", container: "wav" },
  }),
});
if (!tts.ok) throw new Error(`Timbre HTTP ${tts.status}: ${await tts.text()}`);
const wav = Buffer.from(await tts.arrayBuffer());

// Locate the PCM "data" chunk and convert int16 -> float32, as the AudioWorklet would deliver.
const dataAt = wav.indexOf("data");
// Timbre's header can overstate the data size; trust the bytes actually present.
const pcmBytes = Math.min(wav.readUInt32LE(dataAt + 4), wav.length - (dataAt + 8)) & ~1;
const pcm = new Float32Array(pcmBytes / 2);
for (let i = 0; i < pcm.length; i++) pcm[i] = wav.readInt16LE(dataAt + 8 + i * 2) / 0x8000;

const samples = downsample(pcm, 48000, TARGET_SAMPLE_RATE);
const encoded = encodeWav(samples, TARGET_SAMPLE_RATE);
console.log(`Input ${(pcm.length / 48000).toFixed(2)}s @48k -> ${(samples.length / TARGET_SAMPLE_RATE).toFixed(2)}s @16k, ${encoded.size} bytes`);

const form = new FormData();
form.append("audio", encoded, "answer.wav");
form.append("languageId", "hi");
const res = await fetch(`${APP}/api/stt`, { method: "POST", body: form });
const body = await res.json();
console.log(`/api/stt HTTP ${res.status}`, body);
console.log(`Expected:   ${TEXT}`);
