import { UseFormReturn } from "react-hook-form";
import { Card, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { UserFormValues } from "./UserFormSchema";

export function IdentiteSection({ form }: { form: UseFormReturn<UserFormValues> }) {
  const { register, formState } = form;
  const errors = formState.errors;

  return (
    <Card className="p-card-padding">
      <CardTitle className="mb-4">Identité & agence</CardTitle>
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <Label required>Prénom</Label>
          <Input {...register("prenom")} error={!!errors.prenom} />
        </div>
        <div>
          <Label required>Nom</Label>
          <Input {...register("nom")} error={!!errors.nom} />
        </div>
        <div className="md:col-span-2">
          <Label required>Email</Label>
          <Input type="email" {...register("email")} error={!!errors.email} />
        </div>
        <div>
          <Label>Agence</Label>
          <Input {...register("agence")} />
        </div>
      </div>
    </Card>
  );
}
