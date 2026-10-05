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
| 🧩 Gnani models used | Prisma v2.5 (STT) · Timbre v2.5 (TTS) · Evon v3.3 (reasoning, pending a hosted endpoint; Gemini stands in meanwhile) |
| 📘 Evon hosting guide | [`docs/evon-setup.md`](docs/evon-setup.md) |
| 👤 Author | Satyabrata Mishra · solo entry |

### Quick start for judges

1. Open the app, pick a form (farmer enrolment, motor insurance claim, or personal loan) and the citizen's language, and press **Start voice session**.
2. Answer each question aloud. Bolo stops listening when you pause, fills the form live, reads everything back, and lets you fix any field by voice before confirming.
3. The result screen shows the English record, with a play button for the recording behind each field and a JSON download.
4. If the microphone misbehaves, open **Mic check** and press **Run full loop** to test Timbre and Prisma on their own.
5. Browse `src/lib/gnani/` for the Prisma and Timbre clients, `src/lib/engine/` for the turn engine, `src/lib/forms/` for the validators, and `src/hooks/` for in-browser recording and playback.

> **Reasoning model status:** Evon v3.3 is open-weight only (no hosted API), and it needs an 80 GB GPU. Until an Evon endpoint is available, Google Gemini (free tier) stands in behind the same OpenAI-compatible interface. Setting `EVON_BASE_URL` switches Bolo to Evon with no code changes, and the header shows which model is active.

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
| Reasoning client: Evon or Gemini, reasoning on/off, strict JSON output with one repair retry | ✅ Built |
| Field validators (phone, PIN, ranges, dates, choices, yes/no) + cross-field checks, unit-tested | ✅ Working |
| Turn engine: extract → normalise → validate → follow-up, with corrections, retries and skips | ✅ Built · unit-tested |
| Localised question bank per form and language (one model call, cacheable audio) | ✅ Built |
| End-of-form review: rule checks + model plausibility check + English summary | ✅ Built |
| Live voice session: auto-stop on silence, live form panel, type-instead fallback, retry on errors | ✅ Built · API smoke-tested, browser voice test pending |
| Spoken read-back + fix any field by voice + English result with per-field audio evidence and JSON export | ✅ Built · API smoke-tested, browser voice test pending |
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
| 🎙️ Record | An AudioWorklet captures mono PCM in the browser, downsamples to 16 kHz and encodes WAV (Prisma does not accept the browser's default webm/opus). Stops 1.6 s after the speaker goes quiet, after 8 s with no speech, or at 30 s. |
| 🎧 Transcribe | Prisma REST returns a native-script transcript with inverse text normalisation (phone numbers, ₹ amounts, dates as digits). |
| 🧠 Understand | Evon receives the form schema, answers so far and the new transcript, and returns strict JSON: field updates, confidence, evidence, and a reply in the user's language. Reasoning is off for turns (latency) and on for the final review. |
| ✅ Validate | Deterministic checks — PIN code, mobile number, ranges, enums, cross-field rules (age vs date of birth). Evon is never trusted to validate formats on its own. |
| 📋 Confirm | The completed form is read back in the user's language while the review runs in the background. Any field can be re-answered by voice before confirming. |
| 🧾 Evidence | Each field links to the transcript and audio clip that produced it. |

### 🧩 How the pieces fit

- 🔐 **Server-only API routes** (`/api/stt`, `/api/tts`, `/api/session/*`, `/api/health`) hold the keys; the browser never sees credentials.
- 🔁 **Resilient clients** retry rate limits (429) and outages (503) with backoff and surface the provider's own error messages.
- 🧠 **One OpenAI-compatible reasoning interface** — Evon on vLLM, SGLang or llama.cpp, or Gemini as the stand-in, selected by `.env.local`; no code changes.
- 🗂️ **Stateless sessions** — the browser holds the session state and sends it with each turn; the server re-validates every value before the final review.
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
│   ├── eval-turns.mjs            # Scores the turn engine on 24 messy multilingual answers
│   ├── smoke-session.mjs         # Typed end-to-end session: start → turns → read-back → review
│   ├── probe-evon-space.mjs      # Checks the community Evon demo on Hugging Face
│   └── test-wav-pipeline.ts      # Verifies browser WAV encoding against Prisma
└── src/
    ├── app/
    │   ├── page.tsx              # Start screen: choose form + language
    │   ├── session/page.tsx      # Live voice session
    │   ├── mic-check/page.tsx    # Voice loop without the reasoning model
    │   └── api/                  # stt, tts, health, session/{start,turn,readback,review}
    ├── components/
    │   └── session/              # Conversation, live form panel, review card, result view
    ├── hooks/                    # useBoloSession (conversation loop), useVoiceRecorder, useSpeechPlayer
    └── lib/
        ├── gnani/                # Prisma + Timbre clients
        ├── engine/               # Turn engine: extraction, apply rules, question bank, review
        ├── forms/                # Form templates, field validators, cross-field checks
        ├── audio/wav.ts          # Downsampling + WAV encoding
        ├── reasoning.ts          # Evon / Gemini chat client (OpenAI-compatible)
        ├── http.ts               # Retrying fetch
        ├── languages.ts          # Languages, voices, sample prompts
        ├── env.ts                # Server-only configuration
        └── errors.ts             # Typed service errors → JSON responses
```

### Local development

```bash
cd bolo
npm install
cp .env.example .env.local      # add GNANI_API_KEY and GEMINI_API_KEY (or Evon values per docs/evon-setup.md)
npm run dev                     # http://localhost:3000
```

```bash
npm test             # unit tests: validators, cross-field checks, turn rules
npm run eval         # live turn-engine score on messy multilingual answers (needs npm run dev)
npm run smoke        # typed end-to-end session incl. read-back and review (needs npm run dev)
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
| 🧠 Reasoning | Gnani Evon v3.3 behind an OpenAI-compatible server (vLLM or llama.cpp); Google Gemini free tier as the stand-in until then |
| ✅ Validation | Zod |
| ☁️ Deploy | Vercel (app) · self-hosted GPU endpoint for Evon (hosting being finalised) |

---

## 🔗 Related

- 📘 Evon hosting: [`docs/evon-setup.md`](docs/evon-setup.md)
- 🎧 Gnani Speech API docs: https://docs.gnani.ai
- 🧠 Evon model card: https://huggingface.co/gnani/gnani-evon-v3.3-30B-A3B

---

✨ Built by **Satyabrata Mishra** for Gnani AI's **Great Indian AI Internship Challenge**
