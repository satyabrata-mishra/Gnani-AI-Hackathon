import type { Metadata } from "next";
import { SubmissionDetail } from "@/components/dashboard/submission-detail";
import { SiteHeader } from "@/components/site-header";
import { getServiceStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Submission — Bolo" };

export default async function SubmissionPage(props: PageProps<"/dashboard/[id]">) {
  const { id } = await props.params;
  const status = getServiceStatus();
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader status={status} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-16 pt-8 sm:px-8">
        <SubmissionDetail id={id} />
      </main>
    </div>
  );
}
