# 🎙️ Bolo

### 🗣️ Any form. Any Indian language. Just speak.

🏆 Built for Gnani AI's **[Great Indian AI Internship Challenge](https://www.gnani.ai/internship)** (2026) — a working application on Gnani AI's models and APIs for enterprises, developers and creators.

---

## 📦 Hackathon deliverables

**Judges:** this is the submission repo (full-stack Next.js app). Links that are not live yet are marked as such.

| Deliverable | Link |
| --- | --- |
| 🎬 Demo video (60 s) | _Coming soon_ |
| 🖥️ Live demo | _Coming soon — deploys after the voice session milestone_ |
| 📣 LinkedIn / X post | _Coming soon_ |
| 🧠 Repo (this) | _Add GitHub URL after first push_ |
| 🧩 Gnani models used | Prisma v2.5 (STT) · Timbre v2.5 (TTS) · Evon v3.3 (reasoning) |
| 📘 Evon hosting guide | [`docs/evon-setup.md`](docs/evon-setup.md) |
| 👤 Author | Satyabrata Mishra · solo entry |

### Quick start for judges

1. Open the app and pick a form (farmer enrolment, motor insurance claim, or personal loan) and the citizen's language.
2. Open **Mic check** and press **Run full loop**: Timbre asks a question aloud, you answer, Prisma transcribes it in native script.
3. Browse `src/lib/gnani/` for the Prisma and Timbre clients, `src/lib/evon.ts` for the Evon client, and `src/hooks/` for in-browser recording and playback.

> Note: Evon is self-hosted on a GPU endpoint with scale-to-zero, so the first request after a pause can take a few minutes to wake.

---

Bolo turns any enterprise form into a **voice conversation in Indian languages**. It asks each question aloud in the citizen's language, understands natural, code-mixed answers ("mera loan do lakh… nahi, dhai lakh ka chahiye"), and hands the institution **clean, validated English data — with the audio behind every field**.

India's most important forms — bank KYC, loan applications, insurance claims, scheme enrolment — are English-first and text-only. Hundreds of millions of people who are more comfortable speaking their own language depend on middlemen to fill them in, which costs them money and invites errors and fraud. Institutions pay again for manual data entry and clean-up.

Bolo is **not a chatbot**. It is a speech-to-structured-data engine: every answer is extracted, normalised (₹, dates, "dhai acre" → 2.5), validated against the form's rules, cross-checked against earlier answers, and linked to the exact recording it came from — so a compliance team can audit any field in one click.

**The language bridge:** the citizen speaks Kannada, Tamil or Hinglish; the bank officer receives an English record. Neither has to learn the other's language.

---

## 🚦 Build status

| Capability | Status |
| --- | --- |
| Prisma speech-to-text (REST) with inverse text normalisation | ✅ Working |
| Timbre text-to-speech in 11 languages, with response caching | ✅ Working |
| In-browser recording → 16 kHz WAV (AudioWorklet) | ✅ Working |
| Mic check: Timbre asks → user answers → Prisma transcribes | ✅ Working |
| Form templates + language/voice catalogue | ✅ Working |
| Evon client (OpenAI-compatible, reasoning on/off, JSON schema output) | ✅ Built · ⏳ awaiting endpoint |
| Evon turn engine: extract → normalise → validate → follow-up | ⏳ In progress |
| Live voice session with field-by-field form filling | ⏳ In progress |
| Read-back confirmation + English result with per-field audio evidence | 🗓️ Planned |
| Describe-a-form → instant voice agent | 🗓️ Planned |
| Officer dashboard | 🗓️ Planned |

---

## 👨‍💻 Author

**Satyabrata Mishra**

---

## 🚀 Great Indian AI Internship Challenge · Gnani AI

### 🎯 The brief

> Build a working application using Gnani AI's models and/or APIs that addresses a practical need for enterprises, developers or creators.

| | |
| --- | --- |
| 🗓️ Build window | October 1 – **November 10, 2026** (final, no extensions) |
| 📤 Submission | Demo or video · written project explanation · Gnani models/APIs used · LinkedIn or X post |
| 🏅 Award fit (max one per entry) | Mixed Vibes (Hinglish and code-mixed voice) · Main Character (regional languages) · Real Deal (farmers, rural users) · Solo Ninja · Demo Day Drop (60-second video) |
| 🔒 Data rule | Synthetic data only. Demo forms never use real phone, Aadhaar, PAN or account numbers |

### 🧰 Models available

| Model | What it is | How Bolo uses it |
| --- | --- | --- |
| 🎧 **Prisma v2.5** | Speech-to-text for 10 Indian languages, trained on real telephony audio; handles code-switching and accents | Transcribes every answer in native script; inverse text normalisation turns spoken numbers into digits |
| 🔊 **Timbre v2.5** (beta) | Text-to-speech, 10 Indian languages + Hinglish, 42 voices | Speaks every question and follow-up in the citizen's language |
| 🧠 **Evon v3.3** | 30B-parameter (3.5B active) Indic reasoning model, open weights on Hugging Face, 128K context | Extracts and normalises values, catches contradictions, writes follow-up questions, explains its checks |

### 🏢 Why this fits Gnani

Gnani's platform already covers voice agents, agent assist, conversation analytics and voice biometrics for BFSI. Bolo complements that stack with **structured, auditable data capture** for onboarding, KYC and claims — the step where an institution needs a validated record, not just a conversation.

### ⏱️ Why now

Until recently, voice interfaces broke on exactly the speech that matters in India: code-mixed sentences, regional accents and 8 kHz phone lines. Indic-native speech models and an open-weights Indic reasoning model now make it possible to go from a spoken, messy answer to a validated database field — in the user's own language, on infrastructure an institution controls.

---

## 🏗️ Architecture

Bolo is a turn-based loop where **the model proposes and code decides**: Evon extracts values, deterministic validators accept or reject them.

```
🔊 Ask (Timbre) → 🎙️ Record (browser) → 🎧 Transcribe (Prisma) → 🧠 Understand (Evon) → ✅ Validate (code)
      ▲                                                                                      │
      └──────────────── next question or follow-up, in the user's language ─────────────────┘
                                                │
                                   📋 Read-back confirmation
                                                │
                     🧾 English record + per-field audio evidence
```

| Layer | Responsibility |
| --- | --- |
| 🔊 Ask | Timbre speaks the question in the selected language and voice. Repeated prompts are served from cache to save credits and latency. |
| 🎙️ Record | An AudioWorklet captures mono PCM in the browser, downsamples to 16 kHz and encodes WAV (Prisma does not accept the browser's default webm/opus). Auto-stops at 30 s. |
| 🎧 Transcribe | Prisma REST returns a native-script transcript with inverse text normalisation (phone numbers, ₹ amounts, dates as digits). |
| 🧠 Understand | Evon receives the form schema, answers so far and the new transcript, and returns strict JSON: field updates, confidence, evidence, and a reply in the user's language. Reasoning is off for turns (latency) and on for the final review. |
| ✅ Validate | Deterministic checks — PIN code, mobile number, ranges, enums, cross-field rules (age vs date of birth). Evon is never trusted to validate formats on its own. |
| 📋 Confirm | The completed form is read back in the user's language before submission. |
| 🧾 Evidence | Each field links to the transcript and audio clip that produced it. |

### 🧩 How the pieces fit

- 🔐 **Server-only API routes** (`/api/stt`, `/api/tts`, `/api/health`) hold the Gnani key; the browser never sees credentials.
- 🔁 **Resilient Gnani client** retries rate limits (429) and outages (503) with backoff and surfaces Gnani's own error messages.
- 🧠 **Evon behind an OpenAI-compatible interface** — vLLM, SGLang or a Hugging Face Inference Endpoint all work by changing `.env.local`; no code changes.
- 🌐 **Language catalogue** maps each language to Prisma and Timbre codes, a matched voice, and a reply style for Evon.

### 🔬 Integration notes

Findings from building against the live APIs:

- Prisma's inverse text normalisation converts spoken digits (`नौ आठ सात…` → `9876543210`) but **not** fractions like `ढाई एकड़` (2.5 acres) — that normalisation is Evon's job.
- Timbre returns HTTP 500 when `container: "mp3"` is combined with `bitrate`/`sample_rate`; plain `{ "container": "mp3" }` works.
- Bursts of ~5 calls trigger HTTP 429, so calls are sequential and retried with backoff.

---

## 📁 Project structure

```
bolo/
├── docs/
│   └── evon-setup.md             # Hosting Evon on Hugging Face Inference Endpoints
├── public/
│   └── worklets/pcm-recorder.js  # AudioWorklet: mic → Float32 PCM batches
├── scripts/
│   ├── spike.mjs                 # Live check: Timbre → Prisma round trip + Evon latency
│   └── test-wav-pipeline.ts      # Verifies browser WAV encoding against Prisma
└── src/
    ├── app/
    │   ├── page.tsx              # Start screen: choose form + language
    │   ├── mic-check/page.tsx    # Voice loop without Evon
    │   └── api/                  # stt, tts, health route handlers
    ├── components/               # Session launcher, mic button, mic check, header
    ├── hooks/                    # useVoiceRecorder, useSpeechPlayer
    └── lib/
        ├── gnani/                # Prisma + Timbre clients, retrying fetch
        ├── forms/                # Form schema types + demo templates
        ├── audio/wav.ts          # Downsampling + WAV encoding
        ├── evon.ts               # Evon chat client (OpenAI-compatible)
        ├── languages.ts          # Languages, voices, sample prompts
        ├── env.ts                # Server-only configuration
        └── errors.ts             # Typed service errors → JSON responses
```

### Local development

```bash
cd bolo
npm install
cp .env.example .env.local      # add GNANI_API_KEY; Evon values per docs/evon-setup.md
npm run dev                     # http://localhost:3000
```

```bash
npm run spike        # live Timbre → Prisma round trip in Hindi and Kannada (+ Evon if configured)
npm run test:audio   # browser WAV pipeline → /api/stt (needs npm run dev)
npm run lint
npm run build
```

Demo forms use mock data only — never enter real Aadhaar or account numbers.

---

## 🛠️ Stack

| Area | Tools |
| --- | --- |
| 🌐 App & runtime | Next.js 16 (App Router, route handlers) · React 19 · TypeScript |
| 🎨 UI | Tailwind CSS v4 · Framer Motion · Lucide icons · Geist + Instrument Serif |
| 🎧 Speech | Gnani Prisma v2.5 (STT) · Gnani Timbre v2.5 (TTS) · Web Audio AudioWorklet |
| 🧠 Reasoning | Gnani Evon v3.3, self-hosted behind an OpenAI-compatible server (vLLM or llama.cpp) |
| ✅ Validation | Zod |
| ☁️ Deploy | Vercel (app) · self-hosted GPU endpoint for Evon (hosting being finalised) |

---

## 🔗 Related

- 📘 Evon hosting: [`docs/evon-setup.md`](docs/evon-setup.md)
- 🎧 Gnani Speech API docs: https://docs.gnani.ai
- 🧠 Evon model card: https://huggingface.co/gnani/gnani-evon-v3.3-30B-A3B

---

✨ Built by **Satyabrata Mishra** for Gnani AI's **Great Indian AI Internship Challenge**
