'use client';

import { useState } from 'react';
import { UploadCloud, AlertCircle, CheckCircle2, FileUp } from 'lucide-react';
import { adminRepository } from '@/lib/repositories/admin.repository';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FileKey =
  | 'woe_transformers' | 'nap_features' | 'lgbm_model' | 'iv_scores' | 'feature_stats'
  | 'isotonic_calibrator' | 'decision_config'
  | 'autoencoder' | 'ae_metadata' | 'isolation_forest' | 'if_metadata'
  | 'scaler_if' | 'encoder_hybrid' | 'colonnes_ordonnees_61';

interface FieldDef { key: FileKey; label: string; hint: string; }

const FLUX_A: FieldDef[] = [
  { key: 'woe_transformers', label: 'WoE transformers', hint: '.pkl' },
  { key: 'nap_features',     label: 'Features NAP',      hint: '.pkl' },
  { key: 'lgbm_model',       label: 'Modèle LightGBM',   hint: '.pkl' },
  { key: 'iv_scores',        label: 'Scores IV',         hint: '.csv' },
  { key: 'feature_stats',    label: 'Statistiques des features', hint: '.json' },
];
const FLUX_A_CALIBRATION: FieldDef[] = [
  { key: 'isotonic_calibrator', label: 'Calibrateur isotonique (BK.1)', hint: '.pkl' },
  { key: 'decision_config',     label: 'Configuration de décision (BK.1)', hint: '.json' },
];
const FLUX_B_SHARED: FieldDef[] = [
  { key: 'scaler_if',              label: 'Scaler (partagé AE + IF)',              hint: '.pkl' },
  { key: 'encoder_hybrid',         label: 'Encodeur hybride 61 dims (partagé AE + IF)', hint: '.pkl' },
  { key: 'colonnes_ordonnees_61',  label: 'Ordre des colonnes (61 dims)',          hint: '.json' },
  { key: 'if_metadata',            label: 'Métadonnées détection (partagé AE + IF)', hint: '.json' },
  { key: 'isolation_forest',       label: 'Isolation Forest (filet de secours)',   hint: '.pkl' },
];
const FLUX_B_AE: FieldDef[] = [
  { key: 'autoencoder', label: 'Autoencoder Keras (prioritaire)', hint: '.keras' },
  { key: 'ae_metadata', label: 'Métadonnées Autoencoder',         hint: '.json' },
];
const ALL_KEYS: FileKey[] = [...FLUX_A, ...FLUX_A_CALIBRATION, ...FLUX_B_SHARED, ...FLUX_B_AE].map(f => f.key);

interface Props {
  onSuccess: (runId: string) => void;
  onClose: () => void;
}

function FileField({ def, file, onPick }: { def: FieldDef; file: File | null; onPick: (f: File | null) => void }) {
  return (
    <label className={cn(
      'flex items-center gap-3 px-3.5 py-2.5 rounded-lg border cursor-pointer transition-colors',
      file
        ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/50 dark:bg-emerald-900/10'
        : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-800'
    )}>
      {file ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <FileUp className="w-4 h-4 text-slate-400 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{def.label}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
          {file ? file.name : `Fichier attendu ${def.hint}`}
        </p>
      </div>
      <input type="file" className="hidden" onChange={e => onPick(e.target.files?.[0] ?? null)} />
    </label>
  );
}

export function UploadModelModal({ onSuccess, onClose }: Props) {
  const [files, setFiles] = useState<Record<FileKey, File | null>>(
    Object.fromEntries(ALL_KEYS.map(k => [k, null])) as Record<FileKey, File | null>
  );
  const [nomVersion, setNomVersion]   = useState('');
  const [description, setDescription] = useState('');
  const [auc, setAuc] = useState(''); const [gini, setGini] = useState(''); const [ks, setKs] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const manquants = ALL_KEYS.filter(k => !files[k]);
  const pretACharger = nomVersion.trim().length > 0 && description.trim().length > 0 && manquants.length === 0;

  const handleSubmit = async () => {
    if (!pretACharger) {
      setError(manquants.length > 0 ? `${manquants.length} fichier(s) manquant(s).` : 'Nom de version et description requis.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const metriques: Record<string, number> = {};
      if (auc.trim())  metriques.auc  = parseFloat(auc);
      if (gini.trim()) metriques.gini = parseFloat(gini);
      if (ks.trim())   metriques.ks   = parseFloat(ks);

      const fd = new FormData();
      ALL_KEYS.forEach(k => fd.append(k, files[k] as File));
      fd.append('nom_version', nomVersion.trim());
      fd.append('description', description.trim());
      fd.append('metriques', JSON.stringify(metriques));

      const res = await adminRepository.uploadModel(fd);
      onSuccess(res.run_id);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? 'Erreur lors de l\'upload des artefacts.');
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="max-w-2xl p-0 flex flex-col">
        <DialogHeader className="flex-row items-center gap-2.5 px-6 py-4 border-b border-slate-100 dark:border-slate-800 pt-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-700/30 flex items-center justify-center shrink-0">
            <UploadCloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <DialogTitle>Uploader un nouveau modèle</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-5 max-h-[65vh] overflow-y-auto custom-scrollbar">

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nom de la version</Label>
              <Input value={nomVersion} onChange={e => setNomVersion(e.target.value)} placeholder="lgbm-v3-juillet2026" />
            </div>
            <div className="space-y-1.5">
              <Label>Métriques (optionnel)</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {([['AUC', auc, setAuc], ['Gini', gini, setGini], ['KS', ks, setKs]] as const).map(([lbl, val, set]) => (
                  <Input key={lbl} value={val} onChange={e => set(e.target.value)} placeholder={lbl} type="number" step="0.0001" />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Ex : réentraînement juillet 2026, ajout de 3 mois de données" />
          </div>

          {([
            [`Flux A — Pipeline LightGBM (${FLUX_A.length})`, FLUX_A],
            [`Flux A — Calibration & décision BK.1 (${FLUX_A_CALIBRATION.length})`, FLUX_A_CALIBRATION],
            [`Flux B — Prétraitement partagé + Isolation Forest (${FLUX_B_SHARED.length})`, FLUX_B_SHARED],
            [`Flux B — Autoencoder (${FLUX_B_AE.length})`, FLUX_B_AE],
          ] as const).map(([title, defs]) => (
            <div key={title} className="space-y-2">
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{title}</p>
              <div className="grid grid-cols-2 gap-2">
                {defs.map(def => (
                  <FileField key={def.key} def={def} file={files[def.key]}
                    onPick={f => setFiles(prev => ({ ...prev, [def.key]: f }))} />
                ))}
              </div>
            </div>
          ))}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200/60 dark:border-rose-700/30 rounded-lg text-xs text-rose-700 dark:text-rose-400 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            {!loading && <UploadCloud className="w-4 h-4" />}
            {loading ? 'Envoi en cours…' : `Uploader (${ALL_KEYS.length - manquants.length}/${ALL_KEYS.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
