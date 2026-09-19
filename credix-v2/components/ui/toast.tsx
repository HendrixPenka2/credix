"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (t: Omit<ToastItem, "id">) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const VARIANT_META: Record<ToastVariant, { icon: string; className: string }> = {
  success: { icon: "check_circle", className: "text-success-emerald" },
  error: { icon: "cancel", className: "text-danger-rose" },
  warning: { icon: "warning", className: "text-warning-amber" },
  info: { icon: "info", className: "text-secondary" },
};

/** Fournisseur global — à monter UNE FOIS dans components/layout/Providers.tsx. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((t: Omit<ToastItem, "id">) => {
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
          return (
            <ToastPrimitive.Root
              key={item.id}
              onOpenChange={(open) => !open && remove(item.id)}
              className={cn(
                "flex items-start gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-lg",
                "data-[state=open]:animate-credix-toast-in data-[state=closed]:animate-credix-toast-out",
                "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]"
              )}
            >
              <Icon name={meta.icon} filled className={cn("shrink-0 mt-0.5", meta.className)} />
              <div className="flex-1 min-w-0">
                <ToastPrimitive.Title className="font-data-sm text-on-surface">{item.title}</ToastPrimitive.Title>
                {item.description && (
                  <ToastPrimitive.Description className="font-body-sm text-on-surface-variant mt-0.5">
                    {item.description}
                  </ToastPrimitive.Description>
                )}
              </div>
              <ToastPrimitive.Close className="text-outline hover:text-on-surface shrink-0">
                <Icon name="close" size={18} />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-4 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

/** Usage : const { toast } = useToast(); toast({ title: 'Profil mis à jour', variant: 'success' }); */
export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast() doit être utilisé sous <ToastProvider>.");
  return ctx;
}
