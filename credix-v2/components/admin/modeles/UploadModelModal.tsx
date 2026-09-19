"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Banner } from "@/components/shared/Banner";
import { FileField } from "./FileField";
import { adminRepository } from "@/lib/repositories/admin.repository";

const GROUPS: { title: string; fields: { key: string; label: string }[] }[] = [
  {
    title: "Groupe 1 — Pipeline LightGBM",
    fields: [
      { key: "woe_transformers", label: "WOE Transformers" },
      { key: "nap_features", label: "NAP Features" },
      { key: "lgbm_model", label: "Modèle LightGBM" },
      { key: "iv_scores", label: "Scores IV (CSV)" },
      { key: "feature_stats", label: "Statistiques features (JSON)" },
    ],
  },
  {
    title: "Groupe 2 — Calibration & Décision",
    fields: [
      { key: "isotonic_calibrator", label: "Calibrateur isotonique" },
      { key: "decision_config", label: "Config décision (JSON)" },
    ],
  },
  {
    title: "Groupe 3 — Prétraitement & Isolation Forest",
    fields: [
      { key: "isolation_forest", label: "Isolation Forest" },
      { key: "scaler_if", label: "Scaler IF" },
      { key: "encoder_hybrid", label: "Encoder hybride" },
      { key: "if_metadata", label: "Métadonnées IF (JSON)" },
    ],
  },
  {
    title: "Groupe 4 — Autoencodeur",
    fields: [
      { key: "autoencoder", label: "Autoencodeur (.keras)" },
      { key: "ae_metadata", label: "Métadonnées AE (JSON)" },
      { key: "colonnes_ordonnees_61", label: "Colonnes ordonnées 61 dims (JSON)" },
    ],
  },
];

const ALL_FIELDS = GROUPS.flatMap((g) => g.fields);

export function UploadModelModal({ open, onOpenChange, onUploaded }: { open: boolean; onOpenChange: (open: boolean) => void; onUploaded: () => void }) {
  const [nomVersion, setNomVersion] = useState("");
  const [description, setDescription] = useState("");
  const [metriques, setMetriques] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missingFields = ALL_FIELDS.filter((f) => !files[f.key]);
  const canSubmit = nomVersion.trim().length > 0 && description.trim().length > 0 && missingFields.length === 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("nom_version", nomVersion.trim());
      formData.append("description", description.trim());
      formData.append("metriques", metriques.trim() || "{}");
      for (const field of ALL_FIELDS) {
        formData.append(field.key, files[field.key]!);
      }
      await adminRepository.uploadModel(formData);
      onUploaded();
      onOpenChange(false);
      setNomVersion("");
      setDescription("");
      setMetriques("");
      setFiles({});
    } catch (err: any) {
      setError(err.response?.data?.detail ? JSON.stringify(err.response.data.detail) : "Échec de l'importation du modèle.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Importer un nouveau modèle</DialogTitle>
          <DialogDescription>Les 14 artéfacts techniques sont requis. La version sera créée en statut STAGING.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-6">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <Label required>Nom du modèle</Label>
              <Input value={nomVersion} onChange={(e) => setNomVersion(e.target.value)} placeholder="ex: CREDIX_v4_2026" />
            </div>
            <div>
              <Label>Métriques (JSON, optionnel)</Label>
              <Input value={metriques} onChange={(e) => setMetriques(e.target.value)} placeholder='{"auc": 0.78, "gini": 0.56}' />
            </div>
            <div className="md:col-span-2">
              <Label required>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
          </div>

          {GROUPS.map((group) => {
            const done = group.fields.filter((f) => files[f.key]).length;
            return (
              <div key={group.title}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-data-sm text-on-surface">{group.title}</p>
                  <span className={`font-mono text-xs px-2 py-0.5 rounded ${done === group.fields.length ? "bg-success-emerald/10 text-success-emerald" : "bg-surface-container-high text-on-surface-variant"}`}>
                    {done}/{group.fields.length}
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {group.fields.map((f) => (
                    <FileField key={f.key} label={f.label} file={files[f.key] ?? null} onChange={(file) => setFiles((prev) => ({ ...prev, [f.key]: file }))} />
                  ))}
                </div>
              </div>
            );
          })}

          {error && <Banner variant="critical" title="Échec de l'importation" description={error} />}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!canSubmit}>
            Lancer l&apos;importation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
