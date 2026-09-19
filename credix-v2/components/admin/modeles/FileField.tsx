"use client";

import { useId } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export function FileField({ label, file, onChange }: { label: string; file: File | null; onChange: (file: File | null) => void }) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
        file ? "border-success-emerald/40 bg-success-emerald/5" : "border-dashed border-outline-variant hover:bg-surface-container-low"
      )}
    >
      <Icon name={file ? "check_circle" : "upload_file"} filled={!!file} size={18} className={file ? "text-success-emerald" : "text-outline"} />
      <div className="flex-1 min-w-0">
        <p className="font-body-sm text-on-surface">{label}</p>
        <p className="font-body-sm text-on-surface-variant truncate">{file ? file.name : "Cliquez pour choisir un fichier"}</p>
      </div>
      <input id={id} type="file" className="sr-only" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
    </label>
  );
}
