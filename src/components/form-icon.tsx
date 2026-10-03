import { Car, Landmark, Sprout, type LucideProps } from "lucide-react";
import type { FormTemplate } from "@/lib/forms/types";

const ICONS = { sprout: Sprout, car: Car, landmark: Landmark } as const;

export function FormIcon({ icon, ...props }: { icon: FormTemplate["icon"] } & LucideProps) {
  const Icon = ICONS[icon];
  return <Icon aria-hidden {...props} />;
}
