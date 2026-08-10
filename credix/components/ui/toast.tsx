'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (t: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const VARIANT_META: Record<ToastVariant, { icon: React.ElementType; className: string }> = {
  success: { icon: CheckCircle2, className: 'text-emerald-600 dark:text-emerald-400' },
  error: { icon: XCircle, className: 'text-rose-600 dark:text-rose-400' },
  warning: { icon: AlertTriangle, className: 'text-amber-600 dark:text-amber-400' },
  info: { icon: Info, className: 'text-blue-600 dark:text-blue-400' },
};

/** Fournisseur global — à monter UNE FOIS dans components/Providers.tsx. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = crypto.randomUUID();
    setItems((prev) => [...prev, { ...t, id }]);
  }, []);

  const remove = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}
        {items.map((item) => {
          const meta = VARIANT_META[item.variant];
          const Icon = meta.icon;
          return (
            <ToastPrimitive.Root
              key={item.id}
              onOpenChange={(open) => !open && remove(item.id)}
              className={cn(
                'flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg',
                'dark:border-slate-700 dark:bg-slate-900',
                'data-[state=open]:animate-credix-toast-in data-[state=closed]:animate-credix-toast-out',
                'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', meta.className)} />
              <div className="flex-1 min-w-0">
                <ToastPrimitive.Title className="text-sm font-semibold text-slate-900 dark:text-white">
                  {item.title}
                </ToastPrimitive.Title>
                {item.description && (
                  <ToastPrimitive.Description className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.description}
                  </ToastPrimitive.Description>
                )}
              </div>
              <ToastPrimitive.Close className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0">
                <X className="w-4 h-4" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-4 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

/**
 * Hook d'accès au système de toast global.
 * Usage : const { toast } = useToast(); toast({ title: 'Profil mis à jour', variant: 'success' });
 */
export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast() doit être utilisé sous <ToastProvider>.');
  return ctx;
}
