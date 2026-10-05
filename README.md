# 🎙️ Bolo

### 🗣️ Any form. Any Indian language. Just speak.

**Live demo: [bolo1.netlify.app](https://bolo1.netlify.app)**

🏆 Built for Gnani AI's **[Great Indian AI Internship Challenge](https://www.gnani.ai/internship)** (2026).

Bolo turns any enterprise form into a **voice conversation in 11 Indian languages, Hinglish included**. It asks each question aloud in the citizen's language, understands natural, code-mixed answers ("EMI saadhe chaar hazaar ki hai… parso tak bhar dunga"), and hands the institution **clean, validated English data, with the recording behind every field**.

---

## 📦 Hackathon deliverables

| Deliverable | Link |
| --- | --- |
| 🖥️ Live demo | **[bolo1.netlify.app](https://bolo1.netlify.app)** |
| 🧠 Source code | [github.com/satyabrata-mishra/Gnani-AI-Hackathon](https://github.com/satyabrata-mishra/Gnani-AI-Hackathon) |
| 🎬 Demo video (60 s) | _Coming soon_ |
| 📣 LinkedIn / X post | _Coming soon_ |
| 🧩 Gnani models used | **Prisma v2.5** (speech-to-text) · **Timbre v2.5** (text-to-speech) · **Evon v3.3** (reasoning; Gemini stands in until a hosted Evon endpoint is available) |
| 👤 Author | Satyabrata Mishra · solo entry |

---

## ⚡ Try it

Open **[bolo1.netlify.app](https://bolo1.netlify.app)** in a recent Chrome, Edge, Safari or Firefox, on a laptop or phone, and allow microphone access.

1. **Pick a form and a language** on the home page, then press **Start voice session**.
2. **Answer each question aloud.** Bolo stops listening when you pause, fills the form live, and asks a follow-up when an answer is unclear or breaks a rule. You can also type an answer.
3. **Check the read-back.** Bolo reads the form back in your language, flags anything suspicious, and lets you re-answer any field by voice.
4. **See the result:** an English record, the recording behind each field, and a JSON download.
5. **Create your own form:** describe it in a sentence (typed, or dictated in English or Hinglish), adjust the drafted fields, and start a voice session on it.
6. **Open Submissions** for the officer view, or **Mic check** if the microphone misbehaves.

> Use made-up details only. Bolo refuses to collect Aadhaar, PAN, bank account, card, OTP or password fields.

---

## 🧭 Why Bolo

India's most important forms (bank KYC, loan collections, scheme enrolment) are English-first and text-only. People who are more comfortable speaking their own language depend on middlemen to fill them in, which costs money and invites errors. Institutions then pay again for manual data entry.

Bolo is **not a chatbot** but a speech-to-structured-data engine. Every answer is extracted, normalised (₹ amounts, dates, "dhai acre" → 2.5), validated, cross-checked against earlier answers, and linked to the recording it came from. The citizen speaks Kannada, Tamil or Hinglish; the officer receives an English record.

---

## 📝 Demo forms

The built-in forms follow Gnani's core business: voice automation for banks and lenders.

| Form | Use case | Rules that code enforces |
| --- | --- | --- |
| 💳 **EMI repayment follow-up** | Loan collections: reason for delay, amount, days until payment, payment mode | Payment less than one EMI · more than the overdue total · promised over 30 days out |
| 🏦 **Savings account opening** | KYC onboarding: date of birth, occupation, income, nominee | Applicant under 18 · holder named as own nominee · high income for a student or homemaker |
| 🌾 **Farmer support enrolment** | Rural scheme enrolment: village, land holding, main crop | Age and land ranges · fractions like "sava teen" → 3.25 acres |

**Languages:** Hinglish · Hindi · English · Kannada · Tamil · Telugu · Bengali · Marathi · Gujarati · Malayalam · Punjabi. Each has its own Timbre voice, and spoken lines are checked for the language's native script.

---

## 🏗️ Architecture

The **model proposes and code decides**: the reasoning model extracts values, and deterministic validators accept or reject them.

```
🔊 Ask (Timbre) → 🎙️ Record (browser) → 🎧 Transcribe (Prisma) → 🧠 Understand (Evon) → ✅ Validate (code)
      ▲                                                                                      │
      └──────────────── next question or follow-up, in the user's language ─────────────────┘
                                                │
                     📋 Read-back → 🧾 English record + per-field audio evidence
```

| Layer | Responsibility |
| --- | --- |
| 🔊 Ask | Timbre speaks each question in the chosen language; repeated prompts come from cache. |
| 🎙️ Record | An AudioWorklet records 16 kHz WAV in the browser and stops when the speaker goes quiet (or at 30 s). |
| 🎧 Transcribe | Prisma returns a native-script transcript with spoken numbers as digits. |
| 🧠 Understand | The reasoning model returns strict JSON: field updates, confidence, evidence and a reply in the user's language. |
| ✅ Validate | Code checks mobile numbers, PIN codes, ranges, real dates, choices and cross-field rules. |
| 📋 Confirm | The form is read back while a review runs; any field can be re-answered by voice. |

**Under the hood:**

- 🔐 API keys stay in server-only routes; the browser never sees them.
- 🔁 Upstream calls retry on rate limits, and a fallback Gemini model answers when the main one is busy.
- 🚧 Per-visitor rate limits protect the demo's quotas, with friendly "try again" messages.
- 🧠 One OpenAI-compatible interface: setting `EVON_BASE_URL` switches from Gemini to Evon with no code changes.
- 🗄️ No database: session state, custom forms and submissions (with recordings) live in the browser.

---

## ✅ Quality checks

| Check | Result |
| --- | --- |
| Unit tests (`npm test`): validators, cross-field rules, turn engine, form schema, rate limiter | 36 / 36 passing |
| Live eval (`npm run eval`): 26 messy answers in Hinglish, Hindi, Kannada, Tamil, Telugu, Bengali and Marathi | 26 / 26 passing · median 1.8 s per turn |
| Type check, lint, production build, dependency audit | Clean · 0 vulnerabilities |

---

## 💻 Run it locally

**Requirements:** Node.js 22.18+, a Gnani API key, and a Gemini API key (free from [Google AI Studio](https://aistudio.google.com/apikey)).

```bash
git clone https://github.com/satyabrata-mishra/Gnani-AI-Hackathon.git
cd Gnani-AI-Hackathon
npm install
cp .env.example .env.local      # then add your keys
npm run dev                     # http://localhost:3000
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `GNANI_API_KEY` | Yes | Prisma and Timbre |
| `GEMINI_API_KEY` | Yes, unless Evon is set | Gemini stand-in for Evon |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` | No | Main and fallback models |
| `EVON_BASE_URL`, `EVON_API_KEY`, `EVON_MODEL` | No | Use Evon instead (see [`docs/evon-setup.md`](docs/evon-setup.md)) |
| `RATE_LIMIT` | No | `on` or `off`; on in production by default |

```bash
npm test               # unit tests
npm run eval           # live multilingual eval (needs npm run dev)
npm run eval:audio     # Timbre → Prisma → engine round trip (needs npm run dev)
npm run smoke          # typed end-to-end session (needs npm run dev)
npm run lint && npm run build
```

### ☁️ Deployment

The live demo runs on **Netlify**, which detects Next.js automatically. Import the repo, add `GNANI_API_KEY` and `GEMINI_API_KEY` as environment variables, and deploy. Netlify's HTTPS is what lets the browser use the microphone.

---

## 📁 Project structure

```
├── docs/evon-setup.md        # Hosting Evon on Hugging Face Inference Endpoints
├── public/worklets/          # AudioWorklet recorder
├── scripts/                  # Live evals and smoke tests
└── src/
    ├── app/                  # Pages (home, session, builder, dashboard, mic check) and API routes
    ├── components/           # Session, builder, dashboard and layout components
    ├── hooks/                # Session, recorder, speech player, custom forms
    └── lib/
        ├── gnani/            # Prisma + Timbre clients
        ├── engine/           # Turn engine: extraction, rules, question bank, review
        ├── forms/            # Templates, validators, cross-field checks
        └── reasoning.ts      # Evon / Gemini client (OpenAI-compatible)
```

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · Zod · Netlify

---

## 🏢 Why this fits Gnani

Gnani's voice agents already handle collections, onboarding and support for banks, insurers and telecoms. Bolo adds **structured, auditable data capture**: the step where an institution needs a validated record, not just a conversation.

| Model | How Bolo uses it |
| --- | --- |
| 🎧 **Prisma v2.5** | Transcribes every answer in native script, including code-mixed speech |
| 🔊 **Timbre v2.5** | Speaks every question, follow-up and read-back in the citizen's language |
| 🧠 **Evon v3.3** | Extracts and normalises values, catches contradictions, writes follow-ups |

---

## 🚧 Known limitations

- **Evon isn't hosted yet** (it needs an 80 GB GPU), so Gemini's free tier stands in; switching is a configuration change.
- **Submissions are stored in the browser**, so the dashboard shows records from the same device only.
- **The language is chosen before the session** and the form panel's labels stay in English.
- **Synthetic data only:** this is a hackathon demo, not a production KYC system.

---

✨ Built by **Satyabrata Mishra** for Gnani AI's **Great Indian AI Internship Challenge**
