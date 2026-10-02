import type { ReactNode } from "react";
import { PageHeader } from "./PageHeader";
import { Section } from "@/components/ui/Section";

/** Shared shell for the Privacy / Terms pages. Pass semantic <section><h2>…</h2>
 *  content as children; the prose styling is applied here. */
export function LegalDoc({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} subtitle={`Last updated ${updated}`} />
      <Section innerClassName="max-w-3xl">
        <div className="space-y-8 leading-relaxed text-muted [&_a]:text-royal-700 [&_a]:underline [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-ink [&_strong]:text-ink [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>
      </Section>
    </>
  );
}
