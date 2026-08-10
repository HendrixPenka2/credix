'use client';

import { useState } from 'react';
import { Send, Info, CheckCircle } from 'lucide-react';
import { FormSchema, FormChamp, Client } from '@/lib/types';
import { Button } from '@/components/ui/button';

const OCCUPATION_LIST = [
  'Accountants','Business entity type 3','Cleaning staff','Cooking staff',
  'Core staff','Drivers','HR staff','High skill tech staff','IT staff','Laborers',
  'Low-skill Laborers','Managers','Medicine staff','Private service staff','Realty agents',
  'Sales staff','Secretaries','Security staff','Waiters/barmen staff','XNA',
];

interface Props {
  schema: FormSchema;
  client: Client;
  onSubmit: (declaratif: Record<string, unknown>) => Promise<void>;
  loading: boolean;
  /** Texte du bouton de soumission (défaut : "Lancer le scoring IA") */
  submitLabel?: string;
}

const INPUT = 'w-full px-4 py-3 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600';
const LBL   = 'block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2';

// ── Pré-remplissage depuis les données client déjà en DB ──────────────────────
function getPreFill(client: Client): Record<string, string> {
  const f = client.features ?? {};
  const p = client.profile  ?? {};
  return {
    'date_naissance':           p.date_naissance ?? '',
    'genre':                    p.genre ?? (f.CODE_GENDER as string) ?? '',
    'type_revenu':              p.type_revenu ?? (f.NAME_INCOME_TYPE as string) ?? '',
    'niveau_education':         p.niveau_education ?? (f.NAME_EDUCATION_TYPE as string) ?? '',
    'OCCUPATION_TYPE':          (f.OCCUPATION_TYPE as string) ?? p.type_emploi ?? '',
    'anciennete_emploi_mois':   f.employment_years   != null ? String(Math.round((f.employment_years   as number) * 12)) : '',
    'anciennete_domicile_mois': f.registration_years != null ? String(Math.round((f.registration_years as number) * 12)) : '',
  };
}

function ChampField({
  champ, value, onChange, prefilled,
}: {
  champ: FormChamp;
  value: string;
  onChange: (v: string) => void;
  prefilled: boolean;
}) {
  const options = champ.nom === 'OCCUPATION_TYPE' ? OCCUPATION_LIST : (champ.options ?? []);
  const wrapCls = prefilled ? 'ring-1 ring-emerald-300 dark:ring-emerald-600 rounded-xl' : '';

  if (champ.type === 'select') {
    return (
      <div>
        <label className={LBL}>
          {champ.label}
          {champ.obligatoire && <span className="text-rose-400 ml-0.5">*</span>}
          {prefilled && <span className="ml-2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">pré-rempli</span>}
        </label>
        <div className={wrapCls}>
          <select value={value} onChange={e => onChange(e.target.value)} className={INPUT}>
            <option value="">— Sélectionner —</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className={LBL}>
        {champ.label}
        {champ.obligatoire && <span className="text-rose-400 ml-0.5">*</span>}
        {prefilled && <span className="ml-2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">pré-rempli</span>}
      </label>
      <div className={wrapCls}>
        <input
          type={champ.type === 'boolean' ? 'text' : champ.type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={champ.type === 'number' ? '0' : ''}
          className={INPUT}
        />
      </div>
    </div>
  );
}

export function ScoringForm({ schema, client, onSubmit, loading, submitLabel }: Props) {
  const preFill = getPreFill(client);
  const [values, setValues] = useState<Record<string, string>>(preFill);
  const [error, setError]   = useState<string | null>(null);

  const champs = client.is_new_client
    ? schema.champs
    : schema.champs.filter(c => c.is_request_specific);

  const set = (nom: string) => (v: string) => setValues(prev => ({ ...prev, [nom]: v }));
  const preFillCount = champs.filter(c => !!preFill[c.nom]).length;

  const handleSubmit = async () => {
    const missing = champs.filter(c => c.obligatoire && c.is_request_specific && !values[c.nom]?.trim());
    if (missing.length > 0) {
      setError(`Champs obligatoires manquants : ${missing.map(c => c.label).join(', ')}`);
      return;
    }
    setError(null);
    const declaratif: Record<string, unknown> = {};
    champs.forEach(c => {
      const v = values[c.nom];
      if (!v && v !== '0') return;
      declaratif[c.nom] = c.type === 'number' ? Number(v) : v;
    });
    await onSubmit(declaratif);
  };

  const reqChamps  = champs.filter(c => c.is_request_specific);
  const profChamps = champs.filter(c => !c.is_request_specific);

  return (
    <div className="space-y-6">

      {/* Bannière contextuelle */}
      <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-medium border ${
        client.is_new_client
          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800/30'
          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800'
      }`}>
        <Info className="w-3.5 h-3.5 shrink-0" />
        {client.is_new_client
          ? `Nouveau client — ${champs.length} champs requis`
          : `Client existant — ${reqChamps.length} champ${reqChamps.length > 1 ? 's' : ''} spécifique${reqChamps.length > 1 ? 's' : ''} à la demande`}
      </div>

      {/* Bannière pré-remplissage */}
      {preFillCount > 0 && client.is_new_client && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-medium border bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/30">
          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          {preFillCount} champ{preFillCount > 1 ? 's' : ''} pré-rempli{preFillCount > 1 ? 's' : ''} depuis le profil client. Vérifiez et complétez si nécessaire.
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="px-4 py-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200/60 dark:border-rose-700/30 rounded-xl text-sm text-rose-700 dark:text-rose-400 font-medium">
          {error}
        </div>
      )}

      {/* Champs demande */}
      {reqChamps.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />Données de la demande
          </p>
          <div className="grid grid-cols-2 gap-5">
            {reqChamps.map(c => (
              <ChampField key={c.nom} champ={c} value={values[c.nom] ?? ''} onChange={set(c.nom)} prefilled={!!preFill[c.nom]} />
            ))}
          </div>
        </div>
      )}

      {/* Champs profil emprunteur */}
      {profChamps.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />Données du profil emprunteur
          </p>
          <div className="grid grid-cols-2 gap-5">
            {profChamps.map(c => (
              <ChampField key={c.nom} champ={c} value={values[c.nom] ?? ''} onChange={set(c.nom)} prefilled={!!preFill[c.nom]} />
            ))}
          </div>
        </div>
      )}

      {/* Submit */}
      <Button size="lg" className="w-full" onClick={handleSubmit} loading={loading}>
        {!loading && <Send className="w-4 h-4" />}
        {loading ? 'Calcul en cours…' : (submitLabel ?? 'Lancer le scoring IA')}
      </Button>
    </div>
  );
}