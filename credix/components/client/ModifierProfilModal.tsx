'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Save, Lock, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { clientsRepository } from '@/lib/repositories/clients.repository';
import { Client } from '@/lib/types';
import { Button } from '@/components/ui/button';

const OCCUPATION_LIST = [
  'Accountants','Business entity type 3','Cleaning staff','Cooking staff','Core staff',
  'Drivers','HR staff','High skill tech staff','IT staff','Laborers','Low-skill Laborers',
  'Managers','Medicine staff','Private service staff','Realty agents','Sales staff',
  'Secretaries','Security staff','Waiters/barmen staff','XNA',
];
const ORGANIZATION_LIST = [
  'Agriculture','Bank','Business Entity Type 1','Business Entity Type 2','Business Entity Type 3',
  'Cleaning','Construction','Culture','Electricity','Emergency','Government','Hotel','Housing',
  'Industry: type 1','Industry: type 2','Industry: type 3','Industry: type 4','Industry: type 5',
  'Industry: type 6','Industry: type 7','Industry: type 8','Industry: type 9','Industry: type 10',
  'Industry: type 11','Industry: type 12','Insurance','Kindergarten','Legal Services','Medicine',
  'Military','Mobile','Other','Police','Postal','Realtor','Religion','Restaurant','School',
  'Security','Security Ministries','Self-employed','Services','Telecom',
  'Trade: type 1','Trade: type 2','Trade: type 3','Trade: type 4',
  'Trade: type 5','Trade: type 6','Trade: type 7',
  'Transport: type 1','Transport: type 2','Transport: type 3','Transport: type 4',
  'University','XNA',
];
const INCOME_LIST    = ['Working','Commercial associate','Pensioner','State servant','Student','Unemployed','Maternity leave'];
const EDUCATION_LIST = ['Higher education','Secondary / secondary special','Incomplete higher','Lower secondary','Academic degree'];

interface Props { client: Client; onClose: () => void; onSuccess: () => void; }

// ── Champ verrouillé ──────────────────────────────────────────────────────
function LockedField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        <Lock className="w-3 h-3" />{label}
      </label>
      <div className="w-full px-3 py-2.5 text-sm bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 rounded-xl border border-slate-200 dark:border-slate-700/60 cursor-not-allowed truncate">
        {value ?? '—'}
      </div>
    </div>
  );
}

// ── Champ number ──────────────────────────────────────────────────────────
function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const years = value ? (Number(value) / 12).toFixed(1) : null;
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input type="number" min={0} max={600} value={value}
          onChange={e => onChange(e.target.value)} placeholder="Nb de mois"
          className="w-full px-3 py-2.5 pr-20 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-300 dark:placeholder:text-slate-600"
        />
        {years && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">≈ {years} ans</span>}
      </div>
    </div>
  );
}

// ── Combobox — dropdown fixe (échappe à overflow:hidden du modal) ─────────
function ComboField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  const [open, setOpen]     = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef  = useRef<HTMLDivElement>(null);

  const filtered = value
    ? options.filter(o => o.toLowerCase().includes(value.toLowerCase()))
    : options;

  // Calcule la position fixe depuis le rect de l'input
  const openDrop = useCallback(() => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen(true);
  }, []);

  // Ferme si clic en dehors
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        inputRef.current && !inputRef.current.contains(e.target as Node) &&
        dropRef.current  && !dropRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Ferme si scroll dans le modal (position fixe ne suit pas le scroll)
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    document.addEventListener('scroll', handler, true);
    return () => document.removeEventListener('scroll', handler, true);
  }, [open]);

  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input ref={inputRef} type="text" value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={openDrop}
          placeholder="Saisir ou choisir…"
          className="w-full px-3 py-2.5 pr-9 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-300 dark:placeholder:text-slate-600"
        />
        <ChevronDown onClick={() => open ? setOpen(false) : openDrop()}
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 cursor-pointer transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Dropdown en position FIXE — ne dépend d'aucun parent overflow */}
      {open && filtered.length > 0 && (
        <div ref={dropRef} style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
          {filtered.map(o => (
            <div key={o} onMouseDown={() => { onChange(o); setOpen(false); }}
              className={`px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                o === value
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
              }`}>{o}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal principal ───────────────────────────────────────────────────────
export function ModifierProfilModal({ client, onClose, onSuccess }: Props) {
  const f = client.features ?? {};

  const initEmploi   = f.employment_years   != null ? String(Math.round(f.employment_years   * 12)) : '';
  const initDomicile = f.registration_years != null ? String(Math.round(f.registration_years * 12)) : '';

  const [emploiMois,     setEmploiMois]     = useState(initEmploi);
  const [domicileMois,   setDomicileMois]   = useState(initDomicile);
  const [occupationType, setOccupationType] = useState<string>(f.OCCUPATION_TYPE     ?? '');
  const [orgType,        setOrgType]        = useState<string>(f.ORGANIZATION_TYPE   ?? '');
  const [incomeType,     setIncomeType]     = useState<string>(f.NAME_INCOME_TYPE    ?? '');
  const [educationType,  setEducationType]  = useState<string>(f.NAME_EDUCATION_TYPE ?? '');
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const handleSubmit = async () => {
    setLoading(true); setToast(null);
    try {
      const payload: Record<string, unknown> = {};
      if (emploiMois !== '')   payload.anciennete_emploi_mois   = Number(emploiMois);
      if (domicileMois !== '') payload.anciennete_domicile_mois = Number(domicileMois);
      if (occupationType)      payload.OCCUPATION_TYPE          = occupationType;
      if (orgType)             payload.ORGANIZATION_TYPE        = orgType;
      if (incomeType)          payload.NAME_INCOME_TYPE         = incomeType;
      if (educationType)       payload.NAME_EDUCATION_TYPE      = educationType;

      await clientsRepository.updateClientProfile(client.client_id, payload);
      setToast({ type: 'ok', msg: 'Profil mis à jour avec succès.' });
      setTimeout(() => { onSuccess(); onClose(); }, 1400);
    } catch (err: unknown) {
      const d = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setToast({ type: 'err', msg: typeof d === 'string' ? d : 'Erreur lors de la mise à jour.' });
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* max-w-3xl + pas de overflow-hidden sur le panel principal */}
      <div className="relative z-10 w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col animate-credix-zoom-in" style={{ maxHeight: '85vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-slate-800 rounded-t-xl shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Modifier le profil</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {client.profile.prenom} {client.profile.nom}
              <code className="ml-2 text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{client.client_id}</code>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — overflow-y-auto UNIQUEMENT ici (pas le panel) */}
        <div className="px-8 py-7 space-y-8 overflow-y-auto flex-1">
          {toast && (
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border ${
              toast.type === 'ok'
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-700/30'
                : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-700/30'
            }`}>
              {toast.type === 'ok' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {toast.msg}
            </div>
          )}

          {/* Immuables */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" />Données immuables — lecture seule
            </p>
            <div className="grid grid-cols-3 gap-5 p-5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
              <LockedField label="Client ID"      value={client.client_id} />
              <LockedField label="Date naissance" value={client.profile.date_naissance} />
              <LockedField label="Genre"          value={client.profile.genre} />
            </div>
          </div>

          {/* Modifiables */}
          <div className="space-y-5">
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Données modifiables — saisie libre ou choix dans la liste
            </p>
            <div className="grid grid-cols-2 gap-6">
              <NumberField label="Ancienneté emploi (mois)"   value={emploiMois}   onChange={setEmploiMois} />
              <NumberField label="Ancienneté domicile (mois)" value={domicileMois} onChange={setDomicileMois} />
              <ComboField  label="Type de poste"       value={occupationType} onChange={setOccupationType} options={OCCUPATION_LIST} />
              <ComboField  label="Type d'organisation" value={orgType}        onChange={setOrgType}        options={ORGANIZATION_LIST} />
              <ComboField  label="Type de revenu"      value={incomeType}     onChange={setIncomeType}     options={INCOME_LIST} />
              <ComboField  label="Niveau d'éducation"  value={educationType}  onChange={setEducationType}  options={EDUCATION_LIST} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-slate-100 dark:border-slate-800 rounded-b-xl bg-slate-50/80 dark:bg-slate-800/40 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            {!loading && <Save className="w-4 h-4" />}
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}