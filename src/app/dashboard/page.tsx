import type { Metadata } from "next";
import { SubmissionList } from "@/components/dashboard/submission-list";
import { SiteHeader } from "@/components/site-header";
import { getServiceStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Submissions — Bolo" };

export default function DashboardPage() {
  const status = getServiceStatus();
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader status={status} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-16 pt-10 sm:px-8">
        <p className="text-sm font-medium text-brand">Officer view</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">Submissions</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Every record arrives in English with its checks, a summary, and the citizen&apos;s own words and voice behind each
          field.
        </p>
        <div className="mt-8">
          <SubmissionList />
        </div>
      </main>
    </div>
  );
}
