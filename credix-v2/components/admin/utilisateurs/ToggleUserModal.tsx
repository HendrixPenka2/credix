"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/shared/Banner";
import { adminRepository } from "@/lib/repositories/admin.repository";
import type { AdminUser } from "@/lib/types";

export function ToggleUserModal({
  user,
  onOpenChange,
  onToggled,
}: {
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
  onToggled: (userId: string, actif: boolean) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;
  const willDeactivate = user.actif;

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await adminRepository.toggleUser(user!.user_id);
      onToggled(res.user_id, res.actif);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Impossible de mettre à jour ce compte.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{willDeactivate ? "Désactiver ce compte ?" : "Activer ce compte ?"}</DialogTitle>
          <DialogDescription>
            {user.profil.prenom} {user.profil.nom} ({user.username})
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Banner
            variant={willDeactivate ? "warning" : "info"}
            title={willDeactivate ? "Action réversible" : "Réactivation"}
            description={
              willDeactivate
                ? "L'utilisateur ne pourra plus se connecter. Le compte n'est jamais supprimé et pourra être réactivé à tout moment."
                : "L'utilisateur pourra à nouveau se connecter à la plateforme."
            }
          />
          {error && <Banner variant="critical" title="Erreur" description={error} className="mt-3" />}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant={willDeactivate ? "destructive" : "success"} loading={submitting} onClick={handleConfirm}>
            {willDeactivate ? "Désactiver" : "Activer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
