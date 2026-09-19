"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { RoleBadge } from "@/components/shared/StatusPill";
import type { Role } from "@/lib/types";

export function ConfirmationScreen({ username, role, onCreateAnother }: { username: string; role: Role; onCreateAnother: () => void }) {
  return (
    <Card className="p-card-padding max-w-lg mx-auto text-center py-12">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-emerald/10 text-success-emerald mx-auto mb-4">
        <Icon name="check_circle" filled size={32} />
      </span>
      <p className="font-headline-lg text-on-surface">Compte créé avec succès</p>
      <p className="font-body-sm text-on-surface-variant mt-2">Le nouvel utilisateur peut désormais se connecter à la plateforme.</p>

      <div className="flex items-center justify-center gap-3 mt-6 p-3 rounded-lg bg-surface-container-low">
        <span className="font-mono text-on-surface">{username}</span>
        <RoleBadge role={role} />
      </div>

      <div className="flex justify-center gap-3 mt-8">
        <Button variant="outline" onClick={onCreateAnother}>
          Créer un autre compte
        </Button>
        <Button asChild>
          <Link href="/admin/utilisateurs">Retour à la liste</Link>
        </Button>
      </div>
    </Card>
  );
}
