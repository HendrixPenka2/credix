"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Banner } from "@/components/shared/Banner";
import { adminRepository } from "@/lib/repositories/admin.repository";
import { userFormSchema, type UserFormValues } from "@/components/admin/utilisateurs-nouveau/UserFormSchema";
import { IdentiteSection } from "@/components/admin/utilisateurs-nouveau/IdentiteSection";
import { CredentialsSection } from "@/components/admin/utilisateurs-nouveau/CredentialsSection";
import { ConfirmationScreen } from "@/components/admin/utilisateurs-nouveau/ConfirmationScreen";
import type { Role } from "@/lib/types";

export default function NouveauCompteAdminPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ username: string; role: Role } | null>(null);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { role: "AGENT" },
  });

  async function onSubmit(values: UserFormValues) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await adminRepository.createUser({
        username: values.username,
        password: values.password,
        role: values.role,
        nom: values.nom,
        prenom: values.prenom,
        email: values.email,
        agence: values.agence,
      });
      setCreated({ username: res.username, role: res.role as Role });
    } catch (err: any) {
      setSubmitError(err.response?.status === 409 ? "Cet identifiant est déjà utilisé." : err.response?.data?.detail || "Impossible de créer le compte.");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="space-y-6">
        <ConfirmationScreen
          username={created.username}
          role={created.role}
          onCreateAnother={() => {
            form.reset({ role: "AGENT" });
            setCreated(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="font-headline-lg text-on-surface">Nouveau compte</h2>
        <p className="font-body-sm text-on-surface-variant mt-1">Créez un compte agent, superviseur ou administrateur.</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <IdentiteSection form={form} />
        <CredentialsSection form={form} />

        {submitError && <Banner variant="critical" title="Impossible de créer le compte" description={submitError} />}

        <div className="flex justify-end gap-3">
          <Button type="submit" loading={submitting}>
            Créer le compte
            <Icon name="person_add" size={16} />
          </Button>
        </div>
      </form>
    </div>
  );
}
