import Link from "next/link";
import type { ServiceStatus } from "@/lib/env";
import { Logo } from "./brand";
import { ServiceStatusPills } from "./service-status";
import { SiteLinks, SiteMenu } from "./site-nav";

export function SiteHeader({ status }: { status: ServiceStatus }) {
  return (
    <header className="border-b border-line">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="Bolo home">
            <Logo />
          </Link>
          <div className="hidden lg:block">
            <SiteLinks />
          </div>
        </div>
        <div className="hidden lg:block">
          <ServiceStatusPills status={status} />
        </div>
        <div className="lg:hidden">
          <SiteMenu>
            <ServiceStatusPills status={status} />
          </SiteMenu>
        </div>
      </div>
    </header>
  );
}
