"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { RawFeaturesGrid } from "@/components/shared/RawFeaturesGrid";

/** Panneau repliable listant toutes les variables brutes utilisées par le modèle — cf. cdc_credix.md §5.3. */
export function RevueFeaturesPanel({ features, declaratif }: { features?: Record<string, any>; declaratif?: Record<string, any> }) {
  const [open, setOpen] = useState(false);
  const merged = { ...features, ...declaratif };

  if (Object.keys(merged).length === 0) return null;

  return (
    <div className="rounded-xl border border-outline-variant/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 bg-surface-container-low hover:bg-surface-container-high transition-colors"
      >
        <span className="flex items-center gap-2 font-data-sm text-on-surface">
          <Icon name="data_object" size={18} />
          Variables du dossier scoré ({Object.keys(merged).length})
        </span>
        <Icon name="expand_more" size={18} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="p-4 bg-surface-container-lowest">
          <RawFeaturesGrid data={merged} />
        </div>
      )}
    </div>
  );
}
