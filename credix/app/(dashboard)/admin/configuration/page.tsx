'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Settings, Save, Gauge, Lock, Info } from 'lucide-react';
import { adminRepository } from '@/lib/repositories/admin.repository';
import { dashboardRepository } from '@/lib/repositories/dashboard.repository';
import { ThresholdVisualizer } from '@/components/admin/ThresholdVisualizer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorState } from '@/components/ui/error-state';
import { useToast } from '@/components/ui/toast';

export default function ConfigurationPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [accorde, setAccorde] = useState('600');
  const [refuse, setRefuse]   = useState('500');
  const [savingT, setSavingT] = useState(false);

  const [seuilPct, setSeuilPct] = useState('20');
  const [savingS, setSavingS]   = useState(false);

  const [rhoBanniere, setRhoBanniere] = useState(0.40);
  const [rhoCritique, setRhoCritique] = useState(0.25);

  const load = useCallback(() => {
    setLoading(true); setLoadError(null);
    Promise.all([adminRepository.getThresholds(), dashboardRepository.getPortfolioRisk('30j')])
      .then(([t, p]) => {
        setAccorde(String(t.accorde)); setRefuse(String(t.refuse));
        if (p.seuils_appliques) { setRhoBanniere(p.seuils_appliques.rho_banniere); setRhoCritique(p.seuils_appliques.rho_critique); }
        if (p.seuil_alerte_pd != null) setSeuilPct(String(Math.round(p.seuil_alerte_pd * 100)));
      })
      .catch(() => setLoadError('Impossible de charger la configuration. Vérifiez que le backend tourne sur le port 8080.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const accordeNum = parseFloat(accorde);
  const refuseNum  = parseFloat(refuse);
  const thresholdsValid = !Number.isNaN(accordeNum) && !Number.isNaN(refuseNum) &&
    accordeNum >= 300 && accordeNum <= 850 && refuseNum >= 300 && refuseNum <= 850 && refuseNum < accordeNum;

  const seuilNum = parseFloat(seuilPct) / 100;
  const seuilValid = !Number.isNaN(seuilNum) && seuilNum >= 0.05 && seuilNum <= 0.80;

  const saveThresholds = async () => {
    if (!thresholdsValid) {
      toast({ variant: 'error', title: 'Seuils invalides', description: 'REFUSÉ doit être < ACCORDÉ, tous deux entre 300 et 850.' });
      return;
    }
    setSavingT(true);
    try {
      await adminRepository.updateThresholds(accordeNum, refuseNum);
      toast({ variant: 'success', title: 'Seuils PDO mis à jour' });
    } catch (err: unknown) {
      const detail = (err as any)?.response?.data?.detail;
      toast({ variant: 'error', title: 'Erreur lors de la mise à jour des seuils', description: detail });
    } finally { setSavingT(false); }
  };

  const saveSeuil = async () => {
    if (!seuilValid) {
      toast({ variant: 'error', title: 'Seuil invalide', description: 'Le seuil doit être compris entre 5% et 80%.' });
      return;
    }
    setSavingS(true);
    try {
      await adminRepository.updateSeuilAlertePd(seuilNum);
      toast({ variant: 'success', title: 'Seuil d’alerte PD mis à jour' });
    } catch (err: unknown) {
      const detail = (err as any)?.response?.data?.detail;
      toast({ variant: 'error', title: 'Erreur lors de la mise à jour du seuil', description: detail });
    } finally { setSavingS(false); }
  };

  return (
    <div className="w-full space-y-6">

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/40 flex items-center justify-center shrink-0">
          <Settings className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Seuils PDO & ρc</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Règle de décision, alerte portefeuille et couverture informationnelle</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-sm text-slate-400 dark:text-slate-500">Chargement…</span>
        </div>
      )}
      {loadError && !loading && (
        <Card><ErrorState message={loadError} onRetry={load} /></Card>
      )}

      {!loading && !loadError && (
        <div className="grid grid-cols-3 gap-6 items-start">

          {/* ── Colonne principale : formulaires ── */}
          <div className="col-span-2 space-y-6">

            {/* ── Seuils de décision PDO ── */}
            <Card className="p-7 space-y-5">
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Seuils de décision PDO</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Seuil REFUSÉ</Label>
                  <Input value={refuse} onChange={e => setRefuse(e.target.value)} type="number" min={300} max={850} className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label>Seuil ACCORDÉ</Label>
                  <Input value={accorde} onChange={e => setAccorde(e.target.value)} type="number" min={300} max={850} className="font-mono" />
                </div>
              </div>

              <ThresholdVisualizer refuse={refuseNum} accorde={accordeNum} />

              <div className="flex justify-end">
                <Button onClick={saveThresholds} loading={savingT}>
                  {!savingT && <Save className="w-4 h-4" />}
                  {savingT ? 'Enregistrement…' : 'Enregistrer les seuils PDO'}
                </Button>
              </div>
            </Card>

            {/* ── Seuil d'alerte PD ── */}
            <Card className="p-7 space-y-5">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Seuil d'alerte PD — vue portefeuille superviseur</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 -mt-3">
                Déclenche les bannières d'alerte (ATTENTION / ÉLEVÉ / CRITIQUE) sur le tableau de bord superviseur lorsque la PD moyenne du portefeuille dépasse ce seuil.
              </p>
              <div className="flex items-center gap-4">
                <input type="range" min={5} max={80} value={seuilPct} onChange={e => setSeuilPct(e.target.value)}
                  className="flex-1 accent-amber-500" />
                <Input value={seuilPct} onChange={e => setSeuilPct(e.target.value)} type="number" min={5} max={80}
                  className="w-20 text-center font-mono shrink-0" />
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 w-4">%</span>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={saveSeuil}
                  loading={savingS}
                  className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
                >
                  {!savingS && <Save className="w-4 h-4" />}
                  {savingS ? 'Enregistrement…' : "Enregistrer le seuil d'alerte"}
                </Button>
              </div>
            </Card>
          </div>

          {/* ── Colonne latérale : repères, lecture seule ── */}
          <div className="space-y-6 sticky top-6">

            {/* Résumé en clair de la règle, mis à jour en direct */}
            <div className="bg-blue-50/60 dark:bg-blue-900/10 rounded-xl border border-blue-200/60 dark:border-blue-800/30 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Règle appliquée</p>
              </div>
              {thresholdsValid ? (
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex justify-between gap-2"><span>PDO &lt; {refuseNum}</span><span className="font-semibold text-rose-600 dark:text-rose-400">REFUSÉ</span></li>
                  <li className="flex justify-between gap-2"><span>{refuseNum} ≤ PDO &lt; {accordeNum}</span><span className="font-semibold text-amber-600 dark:text-amber-400">REVUE</span></li>
                  <li className="flex justify-between gap-2"><span>PDO ≥ {accordeNum}</span><span className="font-semibold text-emerald-600 dark:text-emerald-400">ACCORDÉ</span></li>
                </ul>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">Corrigez les seuils pour voir la règle appliquée.</p>
              )}
              <p className="text-[10px] text-blue-500/70 dark:text-blue-400/60">Aperçu basé sur les valeurs saisies, avant enregistrement.</p>
            </div>

            {/* ρc — lecture seule */}
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400" />
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Couverture ρc — lecture seule</p>
              </div>
              <div className="space-y-3">
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                  <p className="text-[11px] font-medium text-amber-500">Seuil bannière</p>
                  <p className="text-xl font-semibold font-mono text-slate-800 dark:text-slate-100 mt-1">{rhoBanniere.toFixed(2)}</p>
                  <p className="text-[11px] text-slate-400 mt-1">En dessous, le dossier est signalé "à enrichir"</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                  <p className="text-[11px] font-medium text-rose-500">Seuil critique</p>
                  <p className="text-xl font-semibold font-mono text-slate-800 dark:text-slate-100 mt-1">{rhoCritique.toFixed(2)}</p>
                  <p className="text-[11px] text-slate-400 mt-1">En dessous, revue manuelle forcée</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Fixés au niveau du pipeline de scoring, non modifiables depuis cette interface.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
