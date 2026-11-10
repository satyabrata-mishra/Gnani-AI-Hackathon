<div align="center">

# 🎙️ Bolo

### Any form. Any Indian language. *Just speak.*

[![Live demo](https://img.shields.io/badge/Live_demo-bolo1.netlify.app-3b3fc4?style=for-the-badge)](https://bolo1.netlify.app)

![Prisma](https://img.shields.io/badge/Prisma_v2.5-speech--to--text-16181d?style=flat-square)
![Timbre](https://img.shields.io/badge/Timbre_v2.5-text--to--speech-16181d?style=flat-square)
![Evon](https://img.shields.io/badge/Evon_v3.3-reasoning-16181d?style=flat-square)
![Languages](https://img.shields.io/badge/languages-11-f0a530?style=flat-square)

*Gnani AI · Great Indian AI Internship Challenge · by Satyabrata Mishra*

</div>

---

## 😟 The problem

India's most important forms (bank KYC, loan collections, hospital registration, scheme enrolment) are **English-first and text-only**. Millions who prefer to speak Hindi, Tamil, Kannada or Hinglish rely on middlemen, which costs them money and invites errors and fraud. Institutions then pay again for manual data entry.

## 💡 The solution

Bolo turns any form into a **voice conversation in 11 Indian languages, Hinglish included**, and hands the institution **clean, validated English data, with the citizen's own recording behind every field**.

> 🗣️ *"EMI saadhe chaar hazaar ki hai… parso tak bhar dunga"*
>
> → `emi_amount: 4500` · `pay_in_days: 2`

The citizen speaks their language; the officer gets an English record. Neither has to learn the other's.

## ⚙️ How it works

| 🔊 Bolo asks | 🎙️ You speak | 🧠 Bolo understands | ✅ Rules validate |
| :---: | :---: | :---: | :---: |
| Timbre | Prisma | Evon | code |

**The model proposes, code decides.** Deterministic rules check mobile numbers, PIN codes, ranges, real dates and cross-field logic, such as an under-18 account applicant or a payment smaller than one EMI. Unclear answers get a follow-up, and the form is read back before it's saved. Any organisation can **describe a new form in one sentence** and get a working voice agent for it instantly.

## 🏢 Built for Gnani's use cases

| 💳 EMI follow-up | 🏦 Account opening | 🏥 OPD registration | 🌾 Farmer enrolment |
| :---: | :---: | :---: | :---: |
| Collections | KYC onboarding | Healthcare | Rural schemes |

## ⭐ What makes it different

- ✅ **Not a chatbot:** code has the final word on every value.
- 🔎 **Audit trail:** each field links to the words and audio it came from.
- 🇮🇳 **Hinglish-native:** "dhai acre" → 2.5, Hindi number words, mixed scripts.
- 🔒 **Safe by design:** refuses Aadhaar, PAN, card and OTP fields; API keys never reach the browser.

## 📊 Proof

<div align="center">

| **11** | **26 / 26** | **~1.8 s** | **38** |
| :---: | :---: | :---: | :---: |
| Indian languages | messy multilingual answers | median per turn | unit tests passing |

**[▶ Try it live at bolo1.netlify.app](https://bolo1.netlify.app)**

</div>
