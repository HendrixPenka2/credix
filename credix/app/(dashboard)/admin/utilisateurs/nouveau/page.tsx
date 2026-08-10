'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, UserPlus, AlertCircle, CheckCircle2, Eye, EyeOff,
  User, Mail, Building2, KeyRound, Users,
} from 'lucide-react';
import { adminRepository } from '@/lib/repositories/admin.repository';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const ROLES = [
  { value: 'AGENT',       cls: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
  { value: 'SUPERVISEUR', cls: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
  { value: 'ADMIN',       cls: 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400' },
] as const;

function Field({ label, icon, type = 'text', value, onChange, placeholder, ok }:
  { label: string; icon?: React.ReactNode; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; ok?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label required>{label}</Label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} icon={icon} error={ok === false} />
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-3 px-7 py-4 border-b border-slate-100 dark:border-slate-800 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10">
        <Icon className="w-4 h-4" /><h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-7 space-y-5">{children}</div>
    </Card>
  );
}

export default function NouveauComptePage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '', password2: '', role: '', nom: '', prenom: '', email: '', agence: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const usernameOk = form.username.trim().length >= 3;
  const passwordOk = form.password.length >= 8;
  const matchOk    = form.password2 !== '' && form.password === form.password2;
  const canSubmit  = usernameOk && passwordOk && matchOk && !!form.role &&
    form.nom.trim() !== '' && form.prenom.trim() !== '' && form.email.trim() !== '';

  const handleSubmit = async () => {
    if (!canSubmit) { setError('Vérifiez les champs incomplets ou invalides ci-dessous.'); return; }
    setLoading(true); setError(null);
    try {
      const res = await adminRepository.createUser({
        username: form.username.trim(), password: form.password, role: form.role,
        nom: form.nom.trim(), prenom: form.prenom.trim(), email: form.email.trim(),
        agence: form.agence.trim() || undefined,
      });
      setCreated(res.username);
    } catch (err: unknown) {
      const status = (err as any)?.response?.status;
      const detail = (err as any)?.response?.data?.detail;
      setError(status === 409 ? `Le nom d'utilisateur "${form.username}" est déjà pris.` : (detail ?? 'Erreur lors de la création du compte.'));
    } finally { setLoading(false); }
  };

  if (created) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 flex flex-col items-center text-center space-y-5">
        <div className="w-14 h-14 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-700/30 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Compte créé</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Le compte <strong>@{created}</strong> est actif et peut se connecter dès maintenant.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setCreated(null); setForm({ username: '', password: '', password2: '', role: '', nom: '', prenom: '', email: '', agence: '' }); }}>
            Créer un autre compte
          </Button>
          <Button onClick={() => router.push('/admin/utilisateurs')}>
            Voir la liste des comptes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      <div>
        <Link href="/admin/utilisateurs" className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-2 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />Retour à la liste
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Nouveau compte</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Créer un accès agent, superviseur ou administrateur</p>
      </div>

      <Section icon={User} title="Identité">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Prénom" value={form.prenom} onChange={set('prenom')} placeholder="Hendrix" />
          <Field label="Nom" value={form.nom} onChange={set('nom')} placeholder="Singhe Penka" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" icon={<Mail />} type="email" value={form.email} onChange={set('email')} placeholder="hendrix@credix.com" />
          <div className="space-y-1.5">
            <Label>Agence</Label>
            <Input value={form.agence} onChange={e => set('agence')(e.target.value)} placeholder="Yaoundé Centre" icon={<Building2 />} />
          </div>
        </div>
      </Section>

      <Section icon={KeyRound} title="Compte & accès">
        <div>
          <Label required>Rôle</Label>
          <div className="grid grid-cols-3 gap-3 mt-2">
            {ROLES.map(r => (
              <button key={r.value} onClick={() => set('role')(r.value)}
                className={cn(
                  'py-3 rounded-lg text-sm font-semibold border-2 transition-all',
                  form.role === r.value ? r.cls : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-slate-300'
                )}>
                {r.value}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Field label="Nom d'utilisateur" icon={<Users />} value={form.username} onChange={set('username')} placeholder="hendrix.singhe" ok={form.username === '' || usernameOk} />
          {form.username !== '' && !usernameOk && <p className="text-[11px] text-amber-500">3 caractères minimum</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label required>Mot de passe</Label>
            <div className="relative">
              <Input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => set('password')(e.target.value)} placeholder="••••••••"
                className="pr-10" error={form.password !== '' && !passwordOk} />
              <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {form.password !== '' && !passwordOk && <p className="text-[11px] text-amber-500 mt-1.5">8 caractères minimum</p>}
          </div>
          <div className="space-y-1.5">
            <Label required>Confirmer</Label>
            <Input type={showPwd ? 'text' : 'password'} value={form.password2} onChange={e => set('password2')(e.target.value)} placeholder="••••••••"
              error={form.password2 !== '' && !matchOk} />
            {form.password2 !== '' && !matchOk && <p className="text-[11px] text-rose-500 mt-1.5">Les mots de passe ne correspondent pas</p>}
          </div>
        </div>
      </Section>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200/60 dark:border-rose-700/30 rounded-lg text-xs text-rose-700 dark:text-rose-400 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} loading={loading}>
          {!loading && <UserPlus className="w-4 h-4" />}
          {loading ? 'Création…' : 'Créer le compte'}
        </Button>
      </div>
    </div>
  );
}
