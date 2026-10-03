import Link from "next/link";
import type { ServiceStatus } from "@/lib/env";
import { Logo } from "./brand";
import { ServiceStatusPills } from "./service-status";

export function SiteHeader({ status }: { status: ServiceStatus }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="Bolo home">
            <Logo />
          </Link>
          <nav className="text-sm text-ink-soft">
            <Link href="/mic-check" className="transition hover:text-ink">
              Mic check
            </Link>
          </nav>
        </div>
        <ServiceStatusPills status={status} />
      </div>
    </header>
  );
}
