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
      { key: "land_acres", label: "Land holding", type: "number", required: true, hint: "Cultivable land in acres. Convert fractions like 'dhai' (2.5) or 'sava do' (2.25).", min: 0, max: 100, unit: "acres" },
      { key: "main_crop", label: "Main crop", type: "text", required: true, hint: "Primary crop grown, in English (e.g. paddy, ragi, sugarcane)." },
      { key: "mobile", label: "Mobile number", type: "phone", required: true, hint: "10-digit Indian mobile number starting with 6-9." },
    ],
  },
  {
    id: "emi-follow-up",
    title: "EMI repayment follow-up",
    org: "Bank / NBFC collections (demo)",
    summary: "Find out why an EMI was missed and get a commitment to pay.",
    icon: "wallet",
    fields: [
      { key: "full_name", label: "Borrower name", type: "text", required: true, hint: "Borrower's full name; transliterate to English letters for value_en." },
      { key: "loan_type", label: "Loan type", type: "choice", required: true, hint: "Map the answer to one of the options; a bike or scooty loan is a Two-wheeler loan.", options: ["Two-wheeler loan", "Personal loan", "Home loan", "Gold loan", "Microfinance loan", "Other"] },
      { key: "emi_amount", label: "Monthly EMI", type: "currency", required: true, hint: "Monthly EMI in rupees. Convert lakh/hazaar to digits.", min: 500, max: 500000, unit: "INR" },
      { key: "missed_emis", label: "EMIs unpaid", type: "number", required: true, hint: "How many EMIs are unpaid; 'do mahine se nahi bhara' means 2.", min: 1, max: 24, unit: "EMIs" },
      { key: "delay_reason", label: "Reason for delay", type: "choice", required: true, hint: "Map the reason to the closest option.", options: ["Salary delayed", "Lost job or income", "Medical emergency", "Business slowdown", "Crop loss", "Forgot the due date", "Disputes the amount", "Other"] },
      { key: "pay_amount", label: "Amount they will pay", type: "currency", required: true, hint: "Rupees the borrower commits to pay now. If they say 'poora' or 'full', use the monthly EMI times the unpaid EMIs.", min: 0, max: 5000000, unit: "INR" },
      { key: "pay_in_days", label: "Will pay within", type: "number", required: true, hint: "Days from today until they pay: aaj = 0, kal = 1, parso = 2, agle hafte = 7. Resolve weekdays and month-end against today's date.", min: 0, max: 90, unit: "days" },
      { key: "payment_mode", label: "Payment mode", type: "choice", required: true, hint: "Map to one option; PhonePe, GPay or Paytm mean UPI.", options: ["UPI", "Auto-debit (NACH)", "Net banking", "Cash at branch", "Cheque"] },
      { key: "mobile", label: "Mobile number", type: "phone", required: true, hint: "10-digit Indian mobile number starting with 6-9, for the payment link." },
    ],
  },
  {
    id: "account-opening",
    title: "Savings account opening",
    org: "Bank KYC onboarding (demo)",
    summary: "Collect the basic details to open a savings account.",
    icon: "landmark",
    fields: [
      { key: "full_name", label: "Full name", type: "text", required: true, hint: "Applicant's full name; transliterate to English letters for value_en." },
      { key: "date_of_birth", label: "Date of birth", type: "date", required: true, hint: "Date of birth as YYYY-MM-DD." },
      { key: "occupation", label: "Occupation", type: "choice", required: true, hint: "Map the answer to one of the options.", options: ["Salaried", "Self-employed", "Business owner", "Farmer", "Student", "Homemaker", "Retired", "Other"] },
      { key: "annual_income", label: "Annual income", type: "currency", required: true, hint: "Yearly income in rupees; multiply a monthly figure by 12. Convert lakh/hazaar to digits.", min: 0, max: 100000000, unit: "INR" },
      { key: "city", label: "City", type: "text", required: true, hint: "City or town of residence." },
      { key: "pincode", label: "PIN code", type: "pincode", required: true, hint: "6-digit Indian PIN code." },
      { key: "nominee_name", label: "Nominee name", type: "text", required: false, hint: "Full name of the person who receives the money if the holder dies." },
      { key: "nominee_relation", label: "Nominee relation", type: "choice", required: false, hint: "Nominee's relation to the applicant; wife, husband or patni map to Spouse.", options: ["Spouse", "Father", "Mother", "Son", "Daughter", "Brother", "Sister", "Other"] },
      { key: "mobile", label: "Mobile number", type: "phone", required: true, hint: "10-digit Indian mobile number starting with 6-9." },
    ],
  },
];

export function getFormTemplate(id: string): FormTemplate | undefined {
  return FORM_TEMPLATES.find((f) => f.id === id);
}
