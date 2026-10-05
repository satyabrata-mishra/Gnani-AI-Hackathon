"use client";

import { useSyncExternalStore } from "react";
import { getCustomForms, subscribeCustomForms } from "@/lib/storage/forms";
import type { FormTemplate } from "@/lib/forms/types";

const serverSnapshot = () => null;

/** Custom forms saved in this browser; null until read on the client. */
export function useCustomForms(): FormTemplate[] | null {
  return useSyncExternalStore(subscribeCustomForms, getCustomForms, serverSnapshot);
}
