import Link from "next/link";
import type { ServiceStatus } from "@/lib/env";
import { Logo } from "./brand";
import { ServiceStatusPills } from "./service-status";
import { SiteMenu } from "./site-nav";

export function SiteHeader({ status }: { status: ServiceStatus }) {
  return (
    <header className="border-b border-line">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-8">
        <Link href="/" aria-label="Bolo home">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <ServiceStatusPills status={status} />
          </div>
          <SiteMenu>
            <ServiceStatusPills status={status} />
          </SiteMenu>
        </div>
      </div>
    </header>
  );
}
