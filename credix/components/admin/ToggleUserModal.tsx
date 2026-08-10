'use client';

import { useState } from 'react';
import { AdminUser } from '@/lib/types';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';

interface Props {
  user: AdminUser;
  onConfirm: (userId: string) => Promise<void>;
  onClose: () => void;
}

export function ToggleUserModal({ user, onConfirm, onClose }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const desactiver = user.actif;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(user.user_id);
    } catch {
      toast({ variant: 'error', title: 'Erreur lors de la mise à jour du compte' });
      setLoading(false);
    }
  };

  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={desactiver ? 'Désactiver ce compte' : 'Réactiver ce compte'}
      description={
        <>
          <strong>{user.profil?.prenom} {user.profil?.nom}</strong> (@{user.username}, {user.role})
          {desactiver
            ? ' ne pourra plus se connecter à CREDIX tant que le compte est désactivé.'
            : ' pourra de nouveau se connecter à CREDIX.'}
          {' '}Le compte n'est jamais supprimé, cette action est réversible à tout moment.
        </>
      }
      confirmLabel={desactiver ? 'Désactiver le compte' : 'Réactiver le compte'}
      variant={desactiver ? 'destructive' : 'default'}
      loading={loading}
      onConfirm={handleConfirm}
    />
  );
}
