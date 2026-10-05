"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const pending = useRef<((ok: boolean) => void) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  const confirm = useCallback<Confirm>((next) => {
    pending.current?.(false);
    return new Promise<boolean>((resolve) => {
      pending.current = resolve;
      setOptions(next);
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    pending.current?.(ok);
    pending.current = null;
    setOptions(null);
  }, []);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (options && !el.open) el.showModal();
    if (!options && el.open) el.close();
  }, [options]);

  const danger = options?.tone !== "default";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={options?.message ? messageId : undefined}
        onCancel={(e) => {
          e.preventDefault();
          settle(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) settle(false);
        }}
        className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40"
      >
        {options && (
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              {danger && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                  <AlertTriangle className="h-4 w-4" aria-hidden />
                </span>
              )}
              <div className="min-w-0">
                <h2 id={titleId} className="font-semibold text-ink">
                  {options.title}
                </h2>
                {options.message && (
                  <p id={messageId} className="mt-1 text-sm leading-relaxed text-ink-soft">
                    {options.message}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => settle(false)}
                className="inline-flex min-h-11 items-center rounded-xl border border-line-strong bg-surface px-4 text-sm font-medium text-ink transition hover:border-ink-faint"
              >
                {options.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => settle(true)}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-white transition",
                  danger ? "bg-danger hover:bg-danger/90" : "bg-brand hover:bg-brand-strong",
                )}
              >
                {options.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
}
