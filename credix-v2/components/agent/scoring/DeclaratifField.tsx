import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { OCCUPATION_TYPES } from "@/components/agent/clients-nouveau/options";
import type { FormChamp } from "@/lib/types";

/** Secours pour les champs `select` dont le backend ne fournit pas `options` (ex: OCCUPATION_TYPE). */
const FALLBACK_OPTIONS: Record<string, string[]> = {
  OCCUPATION_TYPE: OCCUPATION_TYPES.map((o) => o.value),
};

export interface DeclaratifFieldProps {
  champ: FormChamp;
  value: any;
  onChange: (value: any) => void;
}

/** Un champ = un rendu selon `champ.type`, entièrement piloté par /api/scoring/form-schema. */
export function DeclaratifField({ champ, value, onChange }: DeclaratifFieldProps) {
  const options = champ.options ?? FALLBACK_OPTIONS[champ.nom];

  return (
    <div>
      <Label required={champ.obligatoire}>{champ.label}</Label>
      {champ.type === "select" && options ? (
        <Select value={value ?? ""} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : champ.type === "date" ? (
        <Input type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      ) : champ.type === "number" ? (
        <Input type="number" min={champ.min} max={champ.max} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
      ) : (
        <Input type="text" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
