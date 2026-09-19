"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-label-md " +
    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface " +
    "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] duration-150 shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary hover:opacity-90 shadow-sm",
        secondary: "bg-secondary text-on-secondary hover:bg-secondary-container",
        outline: "border border-outline-variant bg-transparent text-on-surface hover:bg-surface-container-low",
        ghost: "text-on-surface-variant hover:bg-surface-container-low",
        destructive: "bg-danger-rose text-white hover:opacity-90 shadow-sm",
        success: "bg-success-emerald text-white hover:opacity-90 shadow-sm",
        link: "text-secondary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-5 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Icon name="progress_activity" size={16} className="animate-spin" />}
            {children}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";
