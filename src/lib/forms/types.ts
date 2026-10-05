export type FieldType =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "phone"
  | "pincode"
  | "choice"
  | "yesno";

export type FormIconName = "sprout" | "car" | "landmark" | "clipboard" | "heart" | "home" | "graduation";

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  /** Guidance for the reasoning model on what counts as a valid answer. */
  hint: string;
  options?: string[];
  min?: number;
  max?: number;
  unit?: string;
}

export interface FormTemplate {
  id: string;
  title: string;
  org: string;
  summary: string;
  icon: FormIconName;
  fields: FormField[];
}
