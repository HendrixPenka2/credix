"use client";

import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/shared/Banner";
import { ThresholdZoneVisualizer } from "@/components/shared/ThresholdZoneVisualizer";
import { adminRepository } from "@/lib/repositories/admin.repository";
import { SCORE_MIN, SCORE_MAX } from "@/lib/design-tokens";

export function SeuilsPdoForm({ initialRefuse, initialAccorde, onSaved }: { initialRefuse: number; initialAccorde: number; onSaved: (refuse: number, accorde: number) => void }) {
  const [refuse, setRefuse] = useState(initialRefuse);
  const [accorde, setAccorde] = useState(initialAccorde);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const valid = refuse < accorde;

  async function handleSave() {
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await adminRepository.updateThresholds(accorde, refuse);
      onSaved(refuse, accorde);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Impossible de mettre à jour les seuils.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-card-padding">
      <CardTitle className="mb-1">Seuils de décision PDO</CardTitle>
      <p className="font-body-sm text-on-surface-variant mb-4">Ces seuils déterminent la décision automatique appliquée à chaque scoring.</p>

      <ThresholdZoneVisualizer min={SCORE_MIN} max={SCORE_MAX} threshold1={refuse} threshold2={accorde} formatValue={(v) => Math.round(v).toString()} />

      <div className="grid sm:grid-cols-2 gap-5 mt-8">
        <div>
          <Label>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-danger-rose" />
              Seuil Refusé / Revue
            </span>
          </Label>
          <Input type="number" min={SCORE_MIN} max={SCORE_MAX} value={refuse} onChange={(e) => setRefuse(Number(e.target.value))} />
          <p className="font-body-sm text-on-surface-variant mt-1">Sous ce score : refus automatique.</p>
        </div>
        <div>
          <Label>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success-emerald" />
              Seuil Revue / Accordé
            </span>
          </Label>
          <Input type="number" min={SCORE_MIN} max={SCORE_MAX} value={accorde} onChange={(e) => setAccorde(Number(e.target.value))} />
          <p className="font-body-sm text-on-surface-variant mt-1">Au-dessus de ce score : accord automatique.</p>
        </div>
      </div>

      {!valid && <p className="font-body-sm text-danger-rose mt-3">Le seuil refusé doit être strictement inférieur au seuil accordé.</p>}
      {error && <Banner variant="critical" title="Erreur" description={error} className="mt-4" />}
      {success && <Banner variant="success" title="Seuils mis à jour" description="Les nouveaux seuils sont appliqués immédiatement aux prochains scorings." className="mt-4" />}

      <div className="flex justify-end mt-4">
        <Button onClick={handleSave} loading={submitting} disabled={!valid}>
          Enregistrer les seuils PDO
        </Button>
      </div>
    </Card>
  );
}
