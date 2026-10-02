import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12", className)}>
      {children}
    </div>
  );
}

export function Section({
  children,
  className,
  innerClassName,
  id,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("py-20 sm:py-28", className)}>
      <Container className={innerClassName}>{children}</Container>
    </section>
  );
}
