"use client";

import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/shared/Banner";
import { adminRepository } from "@/lib/repositories/admin.repository";

export function SeuilAlertePdForm({ initialSeuil }: { initialSeuil: number }) {
  const [seuil, setSeuil] = useState(Math.round(initialSeuil * 100));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await adminRepository.updateSeuilAlertePd(seuil / 100);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Impossible de mettre à jour le seuil d'alerte.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-card-padding">
      <CardTitle className="mb-1">Seuil d&apos;alerte PD du portefeuille</CardTitle>
      <p className="font-body-sm text-on-surface-variant mb-4">Déclenche une alerte sur la vue d&apos;ensemble superviseur si la PD moyenne le dépasse.</p>

      <div className="flex items-center gap-4">
        <input
          type="range"
          min={5}
          max={80}
          value={seuil}
          onChange={(e) => setSeuil(Number(e.target.value))}
          className="flex-1 accent-secondary"
        />
        <div className="flex items-center gap-1 w-24">
          <input
            type="number"
            min={5}
            max={80}
            value={seuil}
            onChange={(e) => setSeuil(Number(e.target.value))}
            className="w-16 h-9 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 font-mono text-on-surface text-right"
          />
          <span className="font-body-sm text-on-surface-variant">%</span>
        </div>
      </div>
      <div className="flex justify-between font-label-md text-outline mt-1">
        <span>5%</span>
        <span>40%</span>
        <span>80%</span>
      </div>

      {error && <Banner variant="critical" title="Erreur" description={error} className="mt-4" />}
      {success && <Banner variant="success" title="Seuil mis à jour" description="Le nouveau seuil d'alerte est actif." className="mt-4" />}

      <div className="flex justify-end mt-4">
        <Button onClick={handleSave} loading={submitting}>
          Enregistrer
        </Button>
      </div>
    </Card>
  );
}
