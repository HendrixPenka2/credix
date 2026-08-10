'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, ChevronRight, RotateCcw, CircleCheck } from 'lucide-react';
import { Client, FormSchema, ScoringResult } from '@/lib/types';
import { scoringRepository } from '@/lib/repositories/scoring.repository';
import { ClientSelector } from '@/components/scoring/ClientSelector';
import { ScoringForm } from '@/components/scoring/ScoringForm';
import { ScoringResultDisplay } from '@/components/scoring/ScoringResultDisplay';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InitialsAvatar } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

type Step = 'select' | 'form' | 'result';
const STEP_LABELS: Record<Step, string> = {
  select: '1. Sélection client',
  form:   '2. Données scoring',
  result: '3. Résultat IA',
};

function ScorePage() {
  const sp       = useSearchParams();
  const { toast } = useToast();
  const clientId = sp.get('client_id') ?? undefined;

  const [step,   setStep]   = useState<Step>('select');
  const [client, setClient] = useState<Client | null>(null);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [scoring, setScoring] = useState(false);
  const [schemaErr, setSchemaErr] = useState(false);

  useEffect(() => {
    scoringRepository.getFormSchema()
      .then(setSchema)
      .catch(() => setSchemaErr(true));
  }, []);

  const handleClientSelect = (c: Client) => {
    setClient(c); setResult(null); setStep('form');
  };

  const handleSubmit = async (declaratif: Record<string, unknown>) => {
    if (!client) return;
    setScoring(true);
    try {
      const res = await scoringRepository.predict(client.client_id, declaratif);
      setResult(res); setStep('result');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast({ variant: 'error', title: 'Erreur lors du scoring', description: detail ?? 'Vérifiez les champs obligatoires.' });
    } finally { setScoring(false); }
  };

  const reset = () => { setStep('select'); setClient(null); setResult(null); };

  const steps: Step[] = ['select', 'form', 'result'];

  return (
    <div className="w-full space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Nouveau scoring
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Évaluation IA du risque de crédit
          </p>
        </div>
        {step !== 'select' && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="w-3.5 h-3.5" />Recommencer
          </Button>
        )}
      </div>

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-xs">
        {steps.map((s, i) => {
          const done   = steps.indexOf(step) > i;
          const active = s === step;
          return (
            <span key={s} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />}
              <span className={cn(
                'flex items-center gap-1 font-semibold transition-colors',
                active ? 'text-blue-600 dark:text-blue-400'
                : done ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-400 dark:text-slate-600'
              )}>
                {done && <CircleCheck className="w-3.5 h-3.5" />}{STEP_LABELS[s]}
              </span>
            </span>
          );
        })}
      </div>

      {/* ── Étape 1 : Sélection client ── */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Client</h2>
        {step === 'select' ? (
          <ClientSelector onSelect={handleClientSelect} initialClientId={clientId} />
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <InitialsAvatar firstName={client?.profile.prenom} lastName={client?.profile.nom} className="w-9 h-9 text-xs" />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {client?.profile.prenom} {client?.profile.nom}
                </p>
                <code className="text-xs text-slate-400 dark:text-slate-500">{client?.client_id}</code>
                {client?.is_new_client && <Badge tone="brand" className="ml-2">Nouveau</Badge>}
              </div>
            </div>
            <Button variant="link" size="sm" onClick={reset}>Changer de client</Button>
          </div>
        )}
      </Card>

      {/* ── Étape 2 : Formulaire ── */}
      {(step === 'form' || step === 'result') && schema && client && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Données de la demande</h2>
            {step === 'result' && (
              <Button variant="link" size="sm" onClick={() => setStep('form')}>Modifier les données</Button>
            )}
          </div>
          {step === 'form' && (
            <ScoringForm schema={schema} client={client} onSubmit={handleSubmit} loading={scoring} />
          )}
          {step === 'result' && (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
              Données soumises — cliquez "Modifier" pour refaire un scoring.
            </p>
          )}
        </Card>
      )}

      {/* Erreur schema */}
      {schemaErr && (
        <div className="px-5 py-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200/60 rounded-xl text-sm text-rose-700 dark:text-rose-400">
          Impossible de charger le schéma du formulaire. Vérifiez que le backend tourne sur le port 8080.
        </div>
      )}

      {/* ── Étape 3 : Résultat ── */}
      {step === 'result' && result && client && (
        <ScoringResultDisplay result={result} clientId={client.client_id} onReset={reset} />
      )}

      {/* ── Loading overlay ── */}
      {scoring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <Card className="shadow-lg p-10 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">Calcul du score en cours…</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Analyse IA en cours...</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function ScorePageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500"/>
      </div>
    }>
      <ScorePage />
    </Suspense>
  );
}
