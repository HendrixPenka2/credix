import { UseFormReturn, Controller } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { GENDERS, FAMILY_STATUSES } from "./options";
import type { ClientFormValues } from "./ClientFormSchema";

export function IdentiteCiviteSection({ form }: { form: UseFormReturn<ClientFormValues> }) {
  const { register, control, formState } = form;
  const errors = formState.errors;

  return (
    <Card>
      <div className="flex items-center gap-2 px-card-padding py-3.5 border-b border-outline-variant/60 bg-surface-container-low/50">
        <Icon name="badge" size={20} className="text-on-surface-variant" />
        <h3 className="font-headline-sm text-on-surface">Identité civile</h3>
      </div>
      <div className="p-card-padding grid md:grid-cols-2 gap-5">
        <div>
          <Label required>Prénom</Label>
          <Input {...register("prenom")} error={!!errors.prenom} />
        </div>
        <div>
          <Label required>Nom</Label>
          <Input {...register("nom")} error={!!errors.nom} />
        </div>
        <div>
          <Label required>Date de naissance</Label>
          <Input type="date" {...register("date_naissance")} error={!!errors.date_naissance} />
        </div>
        <div>
          <Label required>Genre</Label>
          <Controller
            control={control}
            name="genre"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label required>Situation familiale</Label>
          <Controller
            control={control}
            name="situation_familiale"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {FAMILY_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label>Enfants à charge</Label>
          <Input type="number" min={0} {...register("nb_enfants")} />
        </div>
        <div>
          <Label>Téléphone</Label>
          <Input type="tel" placeholder="+237 6XX XXX XXX" {...register("telephone")} />
        </div>
        <div>
          <Label required>Agence</Label>
          <Input {...register("agence_saisie")} error={!!errors.agence_saisie} />
        </div>
      </div>
    </Card>
  );
}
