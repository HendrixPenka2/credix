'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, LayoutGrid, UploadCloud, CheckCircle2 } from 'lucide-react';
import { AdminUser, ModelVersion } from '@/lib/types';
import { adminRepository } from '@/lib/repositories/admin.repository';
import { monitoringRepository } from '@/lib/repositories/monitoring.repository';
import { AdminStatCards } from '@/components/admin/AdminStatCards';
import { ModelVersionsTable } from '@/components/admin/ModelVersionsTable';
import { PromoteConfirmModal } from '@/components/admin/PromoteConfirmModal';
import { UploadModelModal } from '@/components/admin/UploadModelModal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';

export default function AdminDashboard() {
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [versions, setVersions] = useState<ModelVersion[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [toPromote, setToPromote] = useState<ModelVersion | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([adminRepository.getUsers(), monitoringRepository.getModelVersions()])
      .then(([u, v]) => { setUsers(u.users ?? []); setVersions(v.versions ?? []); })
      .catch(() => setError('Impossible de charger la vue générale. Vérifiez que le backend tourne sur le port 8080.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const nbAgents = users.filter(u => u.role === 'AGENT' && u.actif).length;
  const nbSuperviseurs = users.filter(u => u.role === 'SUPERVISEUR' && u.actif).length;
  const modeleProd = versions.find(v => v.statut === 'PRODUCTION');
  const nbEnAttente = versions.filter(v => v.statut === 'STAGING').length;

  const handlePromote = async (runId: string) => {
    await monitoringRepository.promoteModel(runId);
    setToPromote(null);
    setSuccessMsg('Modèle promu en production avec succès.');
    load();
  };

  const handleUploadSuccess = (runId: string) => {
    setShowUpload(false);
    setSuccessMsg(`Modèle uploadé en STAGING (run_id ${runId.slice(0, 8)}…). Utilisez "Promouvoir" pour l'activer.`);
    load();
  };

  return (
    <div className="w-full space-y-6">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/40 flex items-center justify-center shrink-0">
            <LayoutGrid className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Vue générale</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Comptes, modèle en production et versions disponibles
            </p>
          </div>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <UploadCloud className="w-4 h-4" />Uploader un modèle
        </Button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-700/30 rounded-lg text-xs text-emerald-700 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />{successMsg}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-24 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-sm text-slate-400 dark:text-slate-500">Chargement…</span>
        </div>
      )}
      {error && !loading && (
        <Card><ErrorState message={error} onRetry={load} /></Card>
      )}

      {!loading && !error && (
        <>
          <AdminStatCards nbAgents={nbAgents} nbSuperviseurs={nbSuperviseurs} modeleProd={modeleProd} nbEnAttente={nbEnAttente} />

          <div>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-3">
              Versions du modèle
            </p>
            <ModelVersionsTable versions={versions} onPromote={setToPromote} />
          </div>
        </>
      )}

      {toPromote && (
        <PromoteConfirmModal version={toPromote} onConfirm={handlePromote} onClose={() => setToPromote(null)} />
      )}
      {showUpload && (
        <UploadModelModal onSuccess={handleUploadSuccess} onClose={() => setShowUpload(false)} />
      )}
    </div>
  );
}
