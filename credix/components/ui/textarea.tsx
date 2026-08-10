import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full min-h-[90px] rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 transition-colors resize-y',
        'placeholder:text-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
        'focus-ring disabled:opacity-60 disabled:cursor-not-allowed',
        error
          ? 'border-rose-300 dark:border-rose-700 focus-visible:ring-rose-500'
          : 'border-slate-200 dark:border-slate-700',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';
