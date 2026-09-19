import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, trailing, error, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none [&_.material-symbols-outlined]:text-lg">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            "block w-full h-10 rounded-lg border bg-surface-container-lowest px-3 font-body-sm text-on-surface transition-shadow",
            "placeholder:text-outline",
            "focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            icon ? "pl-9" : undefined,
            trailing ? "pr-9" : undefined,
            error ? "border-danger-rose focus:ring-danger-rose focus:border-danger-rose" : "border-outline-variant",
            className
          )}
          {...props}
        />
        {trailing && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline">{trailing}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";
