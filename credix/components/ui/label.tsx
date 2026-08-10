'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

export function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { required?: boolean }) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'text-sm font-medium text-slate-700 dark:text-slate-300 select-none',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </LabelPrimitive.Root>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{children}</p>;
}

export function FieldHint({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{children}</p>;
}
