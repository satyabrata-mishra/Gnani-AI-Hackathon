"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Home, Inbox, Menu, Mic, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/builder", label: "Create a form", icon: Sparkles },
  { href: "/dashboard", label: "Submissions", icon: Inbox },
  { href: "/mic-check", label: "Mic check", icon: Mic },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition",
              active ? "bg-brand-soft text-brand" : "text-ink-soft hover:bg-surface hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SiteMenu({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Remembering where the menu was opened closes it on navigation without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenOn(open ? null : pathname)}
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="relative z-50 -mr-2 flex h-10 w-10 items-center justify-center rounded-lg border border-transparent text-ink transition hover:border-line hover:bg-surface"
      >
        {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              tabIndex={-1}
              onClick={() => setOpenOn(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-30 cursor-default bg-ink/20"
            />
            <motion.div
              id="site-menu"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-x-0 top-full z-40 border-b border-line bg-paper px-5 pb-5 pt-2 shadow-lg sm:inset-x-auto sm:right-6 sm:mt-2 sm:w-72 sm:rounded-2xl sm:border sm:px-4 sm:pb-4"
            >
              <nav className="flex flex-col">
                {NAV.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "-mx-2 flex min-h-12 items-center gap-3 rounded-lg px-2 font-medium transition",
                        active ? "bg-brand-soft text-brand" : "text-ink hover:bg-surface",
                      )}
                    >
                      <Icon className={cn("h-4 w-4", active ? "text-brand" : "text-ink-faint")} aria-hidden />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-3 border-t border-line pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-faint">Services</p>
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
