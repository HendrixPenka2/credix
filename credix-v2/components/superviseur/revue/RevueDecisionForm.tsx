"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/ui/icon";
import { Banner } from "@/components/shared/Banner";
import { cn } from "@/lib/utils";
import { decisionsRepository } from "@/lib/repositories/decisions.repository";

const MIN_LENGTH = 20;
const MAX_LENGTH = 500;

export interface RevueDecisionFormProps {
  demandeId: string;
  onDecided: () => void;
  onConflict: () => void;
}

export function RevueDecisionForm({ demandeId, onDecided, onConflict }: RevueDecisionFormProps) {
  const [decision, setDecision] = useState<"ACCORDE" | "REFUSE">("REFUSE");
  const [commentaire, setCommentaire] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = commentaire.trim().length >= MIN_LENGTH;

  async function handleSubmit() {
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      await decisionsRepository.overrideDecision(demandeId, decision, commentaire.trim());
      window.dispatchEvent(new Event("credix:pending-review-changed"));
      onDecided();
    } catch (err: any) {
      if (err.response?.status === 409) {
        onConflict();
      } else {
        setError(err.response?.data?.detail || "Impossible d'enregistrer la décision.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="font-headline-sm text-on-surface">Décision superviseur</p>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-outline-variant p-1">
        <button
          type="button"
          onClick={() => setDecision("ACCORDE")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md py-2 font-data-sm transition-colors",
            decision === "ACCORDE" ? "bg-success-emerald text-white" : "text-on-surface-variant hover:bg-surface-container-low"
          )}
        >
          <Icon name="check_circle" size={16} />
          Accordé
        </button>
        <button
          type="button"
          onClick={() => setDecision("REFUSE")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md py-2 font-data-sm transition-colors",
            decision === "REFUSE" ? "bg-danger-rose text-white" : "text-on-surface-variant hover:bg-surface-container-low"
          )}
        >
          <Icon name="cancel" size={16} />
          Refusé
        </button>
      </div>

      <div>
        <div className="flex justify-between items-baseline mb-1">
          <label className="font-label-md text-on-surface-variant">Commentaire justificatif</label>
          <span className={cn("font-label-md", valid ? "text-on-surface-variant" : "text-danger-rose")}>
            {commentaire.length}/{MAX_LENGTH}
          </span>
        </div>
        <Textarea
          value={commentaire}
          maxLength={MAX_LENGTH}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder="Expliquez votre décision (minimum 20 caractères)..."
          rows={5}
        />
        {!valid && commentaire.length > 0 && (
          <p className="font-body-sm text-danger-rose mt-1">Encore {MIN_LENGTH - commentaire.trim().length} caractère(s) minimum.</p>
        )}
      </div>

      {error && <Banner variant="critical" title="Erreur" description={error} />}

      <Button
        onClick={handleSubmit}
        loading={submitting}
        disabled={!valid}
        className="w-full"
        variant={decision === "ACCORDE" ? "success" : "destructive"}
      >
        Valider la décision
      </Button>
    </div>
  );
}
