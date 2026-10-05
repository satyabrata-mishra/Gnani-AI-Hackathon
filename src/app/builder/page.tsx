import type { Metadata } from "next";
import { FormBuilder } from "@/components/builder/form-builder";
import { SiteHeader } from "@/components/site-header";
import { getServiceStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Create a form — Bolo" };

export default async function BuilderPage(props: PageProps<"/builder">) {
  const { id } = await props.searchParams;
  const status = getServiceStatus();
  const editId = typeof id === "string" ? id : undefined;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader status={status} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 pb-16 pt-10 sm:px-8">
        <p className="text-sm font-medium text-brand">Form builder</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">
          {editId ? "Edit your form" : "Describe a form. Get a voice agent."}
        </h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Describe what you need. Bolo drafts the fields, rules validate them, and the form can be asked aloud in any of 11
          languages.
        </p>
        <div className="mt-8">
          <FormBuilder key={editId ?? "new"} editId={editId} canDraft={status.gnani && Boolean(status.reasoning)} />
        </div>
      </main>
    </div>
  );
}
