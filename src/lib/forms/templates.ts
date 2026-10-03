import type { FormTemplate } from "./types";

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: "farmer-enrolment",
    title: "Farmer support enrolment",
    org: "Agriculture scheme (demo)",
    summary: "Register a farmer for an income-support scheme.",
    icon: "sprout",
    fields: [
      { key: "full_name", label: "Full name", type: "text", required: true, hint: "Farmer's full name as spoken; transliterate to English letters for value_en." },
      { key: "age", label: "Age", type: "number", required: true, hint: "Age in years.", min: 18, max: 100, unit: "years" },
      { key: "village", label: "Village", type: "text", required: true, hint: "Village or town name." },
      { key: "district", label: "District", type: "text", required: true, hint: "District name." },
      { key: "pincode", label: "PIN code", type: "pincode", required: true, hint: "6-digit Indian PIN code." },
      { key: "land_acres", label: "Land holding", type: "number", required: true, hint: "Cultivable land in acres. Convert fractions like 'dhai' (2.5) or 'sava do' (2.25).", min: 0, max: 500, unit: "acres" },
      { key: "main_crop", label: "Main crop", type: "text", required: true, hint: "Primary crop grown, in English (e.g. paddy, ragi, sugarcane)." },
      { key: "mobile", label: "Mobile number", type: "phone", required: true, hint: "10-digit Indian mobile number starting with 6-9." },
    ],
  },
  {
    id: "motor-claim",
    title: "Motor insurance claim",
    org: "General insurer (demo)",
    summary: "First notice of loss after a vehicle accident.",
    icon: "car",
    fields: [
      { key: "policy_holder", label: "Policy holder name", type: "text", required: true, hint: "Name of the person who holds the policy." },
      { key: "incident_date", label: "Date of incident", type: "date", required: true, hint: "Calendar date as YYYY-MM-DD. Resolve relative dates like 'kal' or 'last Monday' against today's date." },
      { key: "incident_location", label: "Location", type: "text", required: true, hint: "Where the incident happened (road, area, city)." },
      { key: "description", label: "What happened", type: "text", required: true, hint: "One-sentence English summary of the incident." },
      { key: "injuries", label: "Anyone injured", type: "yesno", required: true, hint: "Whether anyone was hurt." },
      { key: "police_report", label: "Police report filed", type: "yesno", required: true, hint: "Whether an FIR or police complaint was filed." },
      { key: "estimated_damage", label: "Estimated damage", type: "currency", required: false, hint: "Approximate repair cost in rupees.", min: 0, unit: "INR" },
      { key: "mobile", label: "Mobile number", type: "phone", required: true, hint: "10-digit Indian mobile number starting with 6-9." },
    ],
  },
  {
    id: "loan-application",
    title: "Personal loan application",
    org: "Bank / NBFC (demo)",
    summary: "Capture a loan lead with basic eligibility details.",
    icon: "landmark",
    fields: [
      { key: "full_name", label: "Full name", type: "text", required: true, hint: "Applicant's full name." },
      { key: "date_of_birth", label: "Date of birth", type: "date", required: true, hint: "Date of birth as YYYY-MM-DD." },
      { key: "age", label: "Age", type: "number", required: true, hint: "Age in years; must be consistent with date of birth.", min: 21, max: 65, unit: "years" },
      { key: "occupation", label: "Occupation", type: "choice", required: true, hint: "Map the answer to one of the options.", options: ["Salaried", "Self-employed", "Business owner", "Farmer", "Other"] },
      { key: "monthly_income", label: "Monthly income", type: "currency", required: true, hint: "Monthly take-home income in rupees. Convert lakh/hazaar to digits.", min: 0, unit: "INR" },
      { key: "loan_amount", label: "Loan amount", type: "currency", required: true, hint: "Requested loan amount in rupees.", min: 10000, max: 5000000, unit: "INR" },
      { key: "loan_purpose", label: "Purpose", type: "text", required: true, hint: "Short English description of why the loan is needed." },
      { key: "city", label: "City", type: "text", required: true, hint: "City of residence." },
      { key: "mobile", label: "Mobile number", type: "phone", required: true, hint: "10-digit Indian mobile number starting with 6-9." },
    ],
  },
];

export function getFormTemplate(id: string): FormTemplate | undefined {
  return FORM_TEMPLATES.find((f) => f.id === id);
}
