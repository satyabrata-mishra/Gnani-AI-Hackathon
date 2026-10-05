import { Car, ClipboardList, GraduationCap, HeartPulse, Home, Landmark, Sprout, type LucideProps } from "lucide-react";
import type { FormIconName } from "@/lib/forms/types";

const ICONS = {
  sprout: Sprout,
  car: Car,
  landmark: Landmark,
  clipboard: ClipboardList,
  heart: HeartPulse,
  home: Home,
  graduation: GraduationCap,
} as const;

export function FormIcon({ icon, ...props }: { icon: FormIconName } & LucideProps) {
  const Icon = ICONS[icon] ?? ClipboardList;
  return <Icon aria-hidden {...props} />;
}
