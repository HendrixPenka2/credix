"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Banner } from "@/components/shared/Banner";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { clientFormSchema, type ClientFormValues } from "./ClientFormSchema";
import { IdentiteCiviteSection } from "./IdentiteCiviteSection";
import { ProfilProfessionnelSection } from "./ProfilProfessionnelSection";
import { AncienneteSection } from "./AncienneteSection";

export function ClientForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ClientFormValues>({
    // zod 4 : l'entrée de z.coerce.number() est typée "unknown", alors que le résolveur renvoie bien des ClientFormValues.
    resolver: zodResolver(clientFormSchema) as unknown as Resolver<ClientFormValues>,
    defaultValues: { nb_enfants: 0, genre: "F" },
  });

  async function onSubmit(values: ClientFormValues) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await clientsRepository.createClient(values);
      router.push(`/clients/${res.client_id}`);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setSubmitError("Un client avec des informations similaires existe déjà. Vérifiez la recherche client avant de recréer un dossier.");
      } else {
        setSubmitError(err.response?.data?.detail || "Impossible de créer le client.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <IdentiteCiviteSection form={form} />
      <ProfilProfessionnelSection form={form} />
      <AncienneteSection form={form} />

      {submitError && <Banner variant="critical" title="Impossible de créer le client" description={submitError} />}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/clients")}>
          Annuler
        </Button>
        <Button type="submit" loading={submitting}>
          Créer le dossier
          <Icon name="arrow_forward" size={16} />
        </Button>
      </div>
    </form>
  );
}
