import { UseFormReturn, Controller } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { OCCUPATION_TYPES, INCOME_TYPES, EDUCATION_TYPES } from "./options";
import type { ClientFormValues } from "./ClientFormSchema";

export function ProfilProfessionnelSection({ form }: { form: UseFormReturn<ClientFormValues> }) {
  const { control } = form;

  return (
    <Card>
      <div className="flex items-center gap-2 px-card-padding py-3.5 border-b border-outline-variant/60 bg-surface-container-low/50">
        <Icon name="work" size={20} className="text-on-surface-variant" />
        <h3 className="font-headline-sm text-on-surface">Profil professionnel</h3>
      </div>
      <div className="p-card-padding grid md:grid-cols-2 gap-5">
        <div>
          <Label required>Type de poste</Label>
          <Controller
            control={control}
            name="type_emploi"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {OCCUPATION_TYPES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label required>Type de revenu</Label>
          <Controller
            control={control}
            name="type_revenu"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {INCOME_TYPES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="md:col-span-2">
          <Label required>Niveau d&apos;éducation</Label>
          <Controller
            control={control}
            name="niveau_education"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_TYPES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
    </Card>
  );
}
