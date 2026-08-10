'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Loader2, AlertCircle, ChevronDown, User, Briefcase, Clock } from 'lucide-react';
import { clientsRepository } from '@/lib/repositories/clients.repository';
import { Button } from '@/components/ui/button';

const SITUATION_OPTIONS = ['Single / not married','Married','Separated','Civil marriage','Widow'];
const OCCUPATION_LIST   = ['Accountants','Business entity type 3','Cleaning staff','Cooking staff','Core staff','Drivers','HR staff','High skill tech staff','IT staff','Laborers','Low-skill Laborers','Managers','Medicine staff','Private service staff','Realty agents','Sales staff','Secretaries','Security staff','Waiters/barmen staff','XNA'];
const INCOME_LIST       = ['Working','Commercial associate','Pensioner','State servant','Student','Unemployed','Maternity leave'];
const EDUCATION_LIST    = ['Higher education','Secondary / secondary special','Incomplete higher','Lower secondary','Academic degree'];

const INPUT = 'w-full px-4 py-3 text-sm bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-all';
const LBL   = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2';

function Field({ label, type='text', value, onChange, placeholder, required, span }: { label:string; type?:string; value:string; onChange:(v:string)=>void; placeholder?:string; required?:boolean; span?:string }) {
  return (
    <div className={span}>
      <label className={LBL}>{label}{required && <span className="text-rose-400 ml-0.5">*</span>}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className={INPUT} />
    </div>
  );
}

function Sel({ label, value, onChange, options, required }: { label:string; value:string; onChange:(v:string)=>void; options:{label:string;value:string}[]; required?:boolean }) {
  return (
    <div>
      <label className={LBL}>{label}{required && <span className="text-rose-400 ml-0.5">*</span>}</label>
      <select value={value} onChange={e=>onChange(e.target.value)} className={INPUT}>
        <option value="">— Sélectionner —</option>
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Combo({ label, value, onChange, options }: { label:string; value:string; onChange:(v:string)=>void; options:string[] }) {
  const [open,setOpen]=useState(false);
  const [pos,setPos]=useState({top:0,left:0,width:0});
  const iRef=useRef<HTMLInputElement>(null);
  const dRef=useRef<HTMLDivElement>(null);
  const filtered=value?options.filter(o=>o.toLowerCase().includes(value.toLowerCase())):options;

  const openDrop=useCallback(()=>{
    if(iRef.current){const r=iRef.current.getBoundingClientRect();setPos({top:r.bottom+4,left:r.left,width:r.width});}
    setOpen(true);
  },[]);

  useEffect(()=>{
    if(!open)return;
    const h=(e:MouseEvent)=>{if(!iRef.current?.contains(e.target as Node)&&!dRef.current?.contains(e.target as Node))setOpen(false);};
    document.addEventListener('mousedown',h);
    return()=>document.removeEventListener('mousedown',h);
  },[open]);

  useEffect(()=>{if(!open)return;const h=()=>setOpen(false);document.addEventListener('scroll',h,true);return()=>document.removeEventListener('scroll',h,true);},[open]);

  return (
    <div>
      <label className={LBL}>{label}</label>
      <div className="relative">
        <input ref={iRef} type="text" value={value} onChange={e=>{onChange(e.target.value);setOpen(true);}} onFocus={openDrop} placeholder="Saisir ou choisir…" className={`${INPUT} pr-10`}/>
        <ChevronDown onClick={()=>open?setOpen(false):openDrop()} className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 cursor-pointer transition-transform ${open?'rotate-180':''}`}/>
      </div>
      {open&&filtered.length>0&&(
        <div ref={dRef} style={{position:'fixed',top:pos.top,left:pos.left,width:pos.width,zIndex:9999}} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.map(o=><div key={o} onMouseDown={()=>{onChange(o);setOpen(false);}} className={`px-4 py-2.5 text-sm cursor-pointer ${o===value?'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold':'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'}`}>{o}</div>)}
        </div>
      )}
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────
function Section({ icon: Icon, title, color, children }: { icon:React.ElementType; title:string; color:string; children:React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-none overflow-hidden">
      <div className={`flex items-center gap-3 px-7 py-4 border-b border-slate-100 dark:border-slate-800 ${color}`}>
        <Icon className="w-4 h-4" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-7">{children}</div>
    </div>
  );
}

// ── Formulaire principal ──────────────────────────────────────────────────
function NouveauClientForm() {
  const router=useRouter();
  const sp=useSearchParams();
  const q=sp.get('q')??'';
  const parts=q.trim().split(' ');

  const [form,setForm]=useState({
    prenom:parts[0]??'', nom:parts.slice(1).join(' ')??'',
    date_naissance:'', genre:'', situation_familiale:'', nb_enfants:'',
    telephone:'', agence_saisie:'', type_emploi:'', type_revenu:'',
    niveau_education:'', anciennete_emploi_mois:'', anciennete_domicile_mois:'',
  });
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const set=(k:keyof typeof form)=>(v:string)=>setForm(f=>({...f,[k]:v}));

  const handleSubmit=async()=>{
    if(!form.prenom.trim()||!form.nom.trim()){setError('Le nom et le prénom sont obligatoires.');return;}
    setLoading(true);setError(null);
    try{
      const p:Record<string,unknown>={prenom:form.prenom.trim(),nom:form.nom.trim()};
      if(form.date_naissance)             p.date_naissance           =form.date_naissance;
      if(form.genre)                      p.genre                    =form.genre;
      if(form.situation_familiale)        p.situation_familiale      =form.situation_familiale;
      if(form.nb_enfants!=='')            p.nb_enfants               =Number(form.nb_enfants);
      if(form.telephone)                  p.telephone                =form.telephone;
      if(form.agence_saisie)              p.agence_saisie            =form.agence_saisie;
      if(form.type_emploi)                p.type_emploi              =form.type_emploi;
      if(form.type_revenu)                p.type_revenu              =form.type_revenu;
      if(form.niveau_education)           p.niveau_education         =form.niveau_education;
      if(form.anciennete_emploi_mois!=='')  p.anciennete_emploi_mois  =Number(form.anciennete_emploi_mois);
      if(form.anciennete_domicile_mois!=='')p.anciennete_domicile_mois=Number(form.anciennete_domicile_mois);
      const res=await clientsRepository.createClient(p);
      router.push(`/clients/${res.client_id}`);
    }catch(err:unknown){
      const status=(err as any)?.response?.status;
      const detail=(err as any)?.response?.data?.detail;
      setError(status===409?'Un client avec ces informations existe déjà dans le système.':(typeof detail==='string'?detail:'Erreur lors de la création.'));
    }finally{setLoading(false);}
  };

  const Btn=()=>(
    <Button onClick={handleSubmit} loading={loading}>
      {!loading&&<UserPlus className="w-4 h-4"/>}
      {loading?'Création...':'Créer le client'}
    </Button>
  );

  return (
    <div className="w-full space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/clients" className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-2 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5"/>Retour à la liste
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Nouveau client</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Créez un profil emprunteur pour lancer un premier scoring</p>
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Button asChild variant="outline"><Link href="/clients">Annuler</Link></Button>
          <Btn/>
        </div>
      </div>

      {/* ── Erreur ── */}
      {error&&(
        <div className="flex items-center gap-3 px-5 py-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200/60 dark:border-rose-700/30 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500"/>
          <p className="text-sm font-medium text-rose-700 dark:text-rose-400">{error}</p>
        </div>
      )}

      {/* ── Section 1 — Identité ── */}
      <Section icon={User} title="Identité civile" color="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
        <div className="grid grid-cols-4 gap-5">
          <Field label="Prénom" value={form.prenom} onChange={set('prenom')} placeholder="ex : Jean" required/>
          <Field label="Nom"    value={form.nom}    onChange={set('nom')}    placeholder="ex : Kamga" required/>
          <Field label="Date de naissance" type="date" value={form.date_naissance} onChange={set('date_naissance')}/>
          <Sel   label="Genre" value={form.genre} onChange={set('genre')} options={[{label:'Masculin',value:'M'},{label:'Féminin',value:'F'}]}/>
          <Sel   label="Situation familiale" value={form.situation_familiale} onChange={set('situation_familiale')} options={SITUATION_OPTIONS.map(o=>({label:o,value:o}))}/>
          <Field label="Nombre d'enfants" type="number" value={form.nb_enfants} onChange={set('nb_enfants')} placeholder="0"/>
          <Field label="Téléphone"        value={form.telephone}     onChange={set('telephone')}     placeholder="ex : 677 123 456"/>
          <Field label="Agence de saisie" value={form.agence_saisie} onChange={set('agence_saisie')} placeholder="ex : Agence Centrale"/>
        </div>
      </Section>

      {/* ── Section 2 — Profil professionnel ── */}
      <Section icon={Briefcase} title="Profil professionnel" color="bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300">
        <div className="grid grid-cols-3 gap-5">
          <Combo label="Type de poste"      value={form.type_emploi}      onChange={set('type_emploi')}      options={OCCUPATION_LIST}/>
          <Combo label="Type de revenu"     value={form.type_revenu}      onChange={set('type_revenu')}      options={INCOME_LIST}/>
          <Combo label="Niveau d'éducation" value={form.niveau_education} onChange={set('niveau_education')} options={EDUCATION_LIST}/>
        </div>
      </Section>

      {/* ── Section 3 — Ancienneté ── */}
      <Section icon={Clock} title="Ancienneté déclarative" color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
        <div className="p-4 mb-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
          <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
            Optionnel — améliore la couverture ρc et réduit le risque de revue forcée.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-5">
          <div className="col-span-2">
            <label className={LBL}>Ancienneté emploi (mois)</label>
            <div className="relative">
              <input type="number" min={0} max={600} value={form.anciennete_emploi_mois} onChange={e=>set('anciennete_emploi_mois')(e.target.value)} placeholder="Nb de mois" className={`${INPUT} pr-20`}/>
              {form.anciennete_emploi_mois&&<span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">≈ {(Number(form.anciennete_emploi_mois)/12).toFixed(1)} ans</span>}
            </div>
          </div>
          <div className="col-span-2">
            <label className={LBL}>Ancienneté domicile (mois)</label>
            <div className="relative">
              <input type="number" min={0} max={600} value={form.anciennete_domicile_mois} onChange={e=>set('anciennete_domicile_mois')(e.target.value)} placeholder="Nb de mois" className={`${INPUT} pr-20`}/>
              {form.anciennete_domicile_mois&&<span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">≈ {(Number(form.anciennete_domicile_mois)/12).toFixed(1)} ans</span>}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between py-2">
        <p className="text-xs text-slate-400 dark:text-slate-500"><span className="text-rose-400">*</span> Champs obligatoires</p>
        <div className="flex gap-3">
          <Button asChild variant="outline"><Link href="/clients">Annuler</Link></Button>
          <Btn/>
        </div>
      </div>
    </div>
  );
}

export default function NouveauClientPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-blue-500"/></div>}>
      <NouveauClientForm/>
    </Suspense>
  );
}