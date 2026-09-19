"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { required?: boolean }
>(({ className, required, children, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn("block font-label-md text-on-surface-variant mb-1.5", className)} {...props}>
    {children}
    {required && <span className="text-danger-rose ml-0.5">*</span>}
  </LabelPrimitive.Root>
));
Label.displayName = "Label";
