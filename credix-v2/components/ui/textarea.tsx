import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, error, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "block w-full min-h-24 rounded-lg border bg-surface-container-lowest px-3 py-2 font-body-sm text-on-surface transition-shadow",
        "placeholder:text-outline resize-y",
        "focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        error ? "border-danger-rose focus:ring-danger-rose focus:border-danger-rose" : "border-outline-variant",
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
