import Link from "next/link";
import type { ServiceStatus } from "@/lib/env";
import { Logo } from "./brand";
import { ServiceStatusPills } from "./service-status";

const NAV = [
  { href: "/builder", label: "Create a form" },
  { href: "/dashboard", label: "Submissions" },
  { href: "/mic-check", label: "Mic check" },
];

export function SiteHeader({ status }: { status: ServiceStatus }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="Bolo home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-4 text-sm text-ink-soft">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-ink">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <ServiceStatusPills status={status} />
      </div>
    </header>
  );
}
