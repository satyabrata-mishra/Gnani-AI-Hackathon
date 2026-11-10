# Bolo: Any form. Any Indian language. Just speak.

**Live:** [bolo1.netlify.app](https://bolo1.netlify.app) · **Built on:** Gnani Prisma v2.5, Timbre v2.5 and Evon v3.3 · **Author:** Satyabrata Mishra

## The problem

India's most important forms (bank KYC, loan collections, hospital registration, scheme enrolment) are English-first and text-only. Hundreds of millions of people who are more comfortable speaking Hindi, Tamil, Kannada or Hinglish depend on middlemen to fill them in. That costs them money and invites errors and fraud, and institutions pay again for manual data entry and clean-up.

## The solution

Bolo turns any form into a **voice conversation in 11 Indian languages, Hinglish included**. It asks each question aloud, understands natural, code-mixed answers ("EMI saadhe chaar hazaar ki hai… parso tak bhar dunga"), and hands the institution **clean, validated English data, with the citizen's own recording behind every field**.

The citizen speaks their language; the officer receives an English record. Neither has to learn the other's.

## How it works

**Timbre asks → Prisma transcribes → Evon understands → code validates.** The model proposes values and deterministic rules decide what is accepted: mobile numbers, PIN codes, ranges, real dates, and cross-field checks such as an under-18 account applicant or a payment smaller than one EMI. Unclear answers get a follow-up in the same language, people can correct themselves mid-sentence, and the completed form is read back for confirmation before it is saved.

Any organisation can **describe a new form in one sentence** and get a working voice agent for it immediately.

## Why it matters for Gnani

Gnani's voice agents already run collections, onboarding and support for banks, insurers and hospitals. Bolo adds the step those conversations need at the end: a **structured, auditable record**. The built-in forms mirror Gnani's biggest use cases:

- **EMI repayment follow-up:** reason for delay, amount and date of payment.
- **Savings account opening:** KYC onboarding details and nominee.
- **Hospital OPD registration:** department and chief complaint.
- **Farmer support enrolment:** land holding and crop, for rural users.

## What makes it different

- **Not a chatbot:** a speech-to-structured-data engine where code, not the model, has the final word on every value.
- **Audit trail:** every field links to the exact words and recording it came from.
- **Built for Hinglish:** fractions like "dhai acre", Hindi number words, and English words mid-sentence are all handled.
- **Safe by design:** refuses Aadhaar, PAN, bank, card, OTP and password fields; API keys never reach the browser.

## Proof

Working end to end and deployed. 38 unit tests pass, and the engine scores **26/26 on messy multilingual answers** across seven languages, with a median of about 1.8 seconds per turn.
