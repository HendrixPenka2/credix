import * as React from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/design-tokens";
import { toneBadgeClass } from "@/lib/design-tokens";

/** Badge générique par ton sémantique — base de tous les badges spécialisés (voir components/shared/*Badge). */
export function Badge({
  tone = "neutral",
  dotted = false,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone; dotted?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-label-md text-[12px] font-semibold",
        toneBadgeClass(tone),
        className
      )}
      {...props}
    >
      {dotted && <span className={cn("h-1.5 w-1.5 rounded-full", tone && `bg-current`)} />}
      {children}
    </span>
  );
}
