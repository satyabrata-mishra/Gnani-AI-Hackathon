export type FieldType =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "phone"
  | "pincode"
  | "choice"
  | "yesno";

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  /** Guidance for Evon on what counts as a valid answer. */
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
  icon: "sprout" | "car" | "landmark";
  fields: FormField[];
}
