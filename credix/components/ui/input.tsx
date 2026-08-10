import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, error, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 [&>svg]:w-4 [&>svg]:h-4">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full h-9 rounded-lg border bg-white px-3 text-sm text-slate-900 transition-colors',
            'placeholder:text-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
            'focus-ring disabled:opacity-60 disabled:cursor-not-allowed',
            icon ? 'pl-9' : undefined,
            error
              ? 'border-rose-300 dark:border-rose-700 focus-visible:ring-rose-500'
              : 'border-slate-200 dark:border-slate-700',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = 'Input';
