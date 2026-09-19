import { UseFormReturn, useWatch } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { ClientFormValues } from "./ClientFormSchema";

function yearsLabel(months: number | undefined): string {
  if (!months || months <= 0) return "0 an";
  const years = months / 12;
  return `≈ ${years.toFixed(1)} an${years >= 2 ? "s" : ""}`;
}

export function AncienneteSection({ form }: { form: UseFormReturn<ClientFormValues> }) {
  const { register, control, formState } = form;
  const errors = formState.errors;
  const emploiMois = useWatch({ control, name: "anciennete_emploi_mois" });
  const domicileMois = useWatch({ control, name: "anciennete_domicile_mois" });

  return (
    <Card>
      <div className="flex items-center gap-2 px-card-padding py-3.5 border-b border-outline-variant/60 bg-surface-container-low/50">
        <Icon name="schedule" size={20} className="text-on-surface-variant" />
        <h3 className="font-headline-sm text-on-surface">Ancienneté déclarative</h3>
      </div>
      <div className="p-card-padding grid md:grid-cols-2 gap-5">
        <div>
          <Label required>Ancienneté emploi (mois)</Label>
          <Input type="number" min={0} {...register("anciennete_emploi_mois")} error={!!errors.anciennete_emploi_mois} />
          <p className="font-body-sm text-on-surface-variant mt-1">{yearsLabel(Number(emploiMois))}</p>
        </div>
        <div>
          <Label required>Ancienneté domicile (mois)</Label>
          <Input type="number" min={0} {...register("anciennete_domicile_mois")} error={!!errors.anciennete_domicile_mois} />
          <p className="font-body-sm text-on-surface-variant mt-1">{yearsLabel(Number(domicileMois))}</p>
        </div>
      </div>
    </Card>
  );
}
