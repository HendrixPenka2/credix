'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, Send, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Props {
  onSubmit: (decision: 'ACCORDE' | 'REFUSE', commentaire: string) => Promise<void>;
  loading: boolean;
}

const MIN_LEN = 20;

export function OverrideForm({ onSubmit, loading }: Props) {
  const [decision, setDecision]     = useState<'ACCORDE' | 'REFUSE' | null>(null);
  const [commentaire, setCommentaire] = useState('');
  const [error, setError]           = useState<string | null>(null);

  const tropCourt = commentaire.trim().length < MIN_LEN;

  const handleSubmit = async () => {
    if (!decision) { setError('Choisissez ACCORDÉ ou REFUSÉ.'); return; }
    if (tropCourt)  { setError(`Le commentaire doit faire au moins ${MIN_LEN} caractères.`); return; }
    setError(null);
    try {
      await onSubmit(decision, commentaire.trim());
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { detail?: string } } })?.response;
      if (status?.status === 409) setError('Ce dossier a déjà été tranché par un autre superviseur.');
      else if (status?.status === 400) setError(status?.data?.detail ?? 'Ce dossier ne peut plus être tranché.');
      else setError(status?.data?.detail ?? 'Erreur lors de la validation.');
    }
  };

  return (
    <Card className="p-6 space-y-5">
      <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
        Statuer sur ce dossier
      </p>

      {/* Choix décision */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setDecision('ACCORDE')}
          className={cn(
            'flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-semibold border-2 transition-all',
            decision === 'ACCORDE'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-400'
              : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-emerald-300'
          )}
        >
          <CheckCircle2 className="w-4 h-4" />ACCORDÉ
        </button>
        <button
          onClick={() => setDecision('REFUSE')}
          className={cn(
            'flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-semibold border-2 transition-all',
            decision === 'REFUSE'
              ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-500 text-rose-700 dark:text-rose-400'
              : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-rose-300'
          )}
        >
          <XCircle className="w-4 h-4" />REFUSÉ
        </button>
      </div>

      {/* Commentaire */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Commentaire justificatif
          </label>
          <span className={cn('text-[10px] font-medium', tropCourt ? 'text-amber-500' : 'text-emerald-500')}>
            {commentaire.trim().length} / {MIN_LEN} min
          </span>
        </div>
        <Textarea
          value={commentaire}
          onChange={e => setCommentaire(e.target.value)}
          rows={3}
          placeholder="Expliquez votre décision — ce commentaire sera conservé dans le dossier."
        />
      </div>

      {/* Erreur */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200/60 dark:border-rose-700/30 rounded-lg text-xs text-rose-700 dark:text-rose-400 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <Button size="lg" className="w-full" onClick={handleSubmit} loading={loading}>
        {!loading && <Send className="w-4 h-4" />}
        {loading ? 'Enregistrement…' : 'Valider la décision'}
      </Button>
    </Card>
  );
}
