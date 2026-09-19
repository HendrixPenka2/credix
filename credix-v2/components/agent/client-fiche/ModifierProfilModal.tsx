"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Banner } from "@/components/shared/Banner";
import { OCCUPATION_TYPES, INCOME_TYPES, EDUCATION_TYPES } from "@/components/agent/clients-nouveau/options";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { formatDate } from "@/lib/utils";
import type { Client } from "@/lib/types";

export function ModifierProfilModal({
  client,
  open,
  onOpenChange,
  onUpdated,
}: {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (client: Client) => void;
}) {
  const [values, setValues] = useState({
    anciennete_emploi_mois: client.features.employment_years != null ? Math.round(client.features.employment_years * 12) : "",
    anciennete_domicile_mois: client.features.registration_years != null ? Math.round(client.features.registration_years * 12) : "",
    OCCUPATION_TYPE: client.features.OCCUPATION_TYPE ?? "",
    type_revenu: client.features.NAME_INCOME_TYPE ?? "",
    niveau_education: client.features.NAME_EDUCATION_TYPE ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await clientsRepository.updateClientProfile(client.client_id, values);
      const refreshed = await clientsRepository.getClientById(client.client_id);
      onUpdated(refreshed);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Impossible de mettre à jour le profil.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Modifier le profil</DialogTitle>
          <DialogDescription>Seuls les champs déclaratifs modifiables sont éditables ici.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <Label>Ancienneté emploi (mois)</Label>
              <Input
                type="number"
                value={values.anciennete_emploi_mois}
                onChange={(e) => setValues((v) => ({ ...v, anciennete_emploi_mois: e.target.value === "" ? "" : Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label>Ancienneté domicile (mois)</Label>
              <Input
                type="number"
                value={values.anciennete_domicile_mois}
                onChange={(e) => setValues((v) => ({ ...v, anciennete_domicile_mois: e.target.value === "" ? "" : Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label>Type de poste</Label>
              <Select value={values.OCCUPATION_TYPE} onValueChange={(v) => setValues((prev) => ({ ...prev, OCCUPATION_TYPE: v }))}>
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
            </div>
            <div>
              <Label>Type de revenu</Label>
              <Select value={values.type_revenu} onValueChange={(v) => setValues((prev) => ({ ...prev, type_revenu: v }))}>
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
            </div>
            <div className="md:col-span-2">
              <Label>Niveau d&apos;éducation</Label>
              <Select value={values.niveau_education} onValueChange={(v) => setValues((prev) => ({ ...prev, niveau_education: v }))}>
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
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6 pt-4 border-t border-outline-variant/60">
            <div>
              <p className="font-label-md text-on-surface-variant">Date de naissance</p>
              <p className="font-data-sm text-on-surface-variant">{formatDate(client.profile.date_naissance)}</p>
            </div>
            <div>
              <p className="font-label-md text-on-surface-variant">Genre</p>
              <p className="font-data-sm text-on-surface-variant">{client.profile.genre === "F" ? "Femme" : "Homme"}</p>
            </div>
            <div>
              <p className="font-label-md text-on-surface-variant">Identifiant</p>
              <p className="font-data-sm text-on-surface-variant font-mono">{client.client_id}</p>
            </div>
          </div>

          {error && <Banner variant="critical" title="Erreur" description={error} className="mt-4" />}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
