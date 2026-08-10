'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, FlaskConical, ChevronRight, RotateCcw, CircleCheck } from 'lucide-react';
import { Client, FormSchema, SimulationResult } from '@/lib/types';
import { scoringRepository } from '@/lib/repositories/scoring.repository';
import { ClientSelector } from '@/components/scoring/ClientSelector';
import { ScoringForm } from '@/components/scoring/ScoringForm';
import { SimulResultDisplay } from '@/components/simul/SimulResultDisplay';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

type Step = 'select' | 'form' | 'result';

const STEP_LABELS: Record<Step, string> = {
  select: '1. Client',
  form:   '2. Paramètres',
  result: '3. Résultat simulé',
};

function SimulPage() {
  const sp       = useSearchParams();
  const { toast } = useToast();
  const clientId = sp.get('client_id') ?? undefined;

  const [step,      setStep]      = useState<Step>('select');
  const [client,    setClient]    = useState<Client | null>(null);
  const [schema,    setSchema]    = useState<FormSchema | null>(null);
  const [result,    setResult]    = useState<SimulationResult | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [schemaErr, setSchemaErr] = useState(false);

  useEffect(() => {
    scoringRepository.getFormSchema()
      .then(setSchema)
      .catch(() => setSchemaErr(true));
  }, []);

  const handleClientSelect = (c: Client) => {
    setClient(c);
    setResult(null);
    setStep('form');
  };

  const handleSubmit = async (declaratif: Record<string, unknown>) => {
    if (!client) return;
    setLoading(true);
    try {
      const res = await scoringRepository.simulate(client.client_id, declaratif);
      setResult(res);
      setStep('result');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast({ variant: 'error', title: 'Erreur lors de la simulation', description: detail ?? 'Vérifiez les champs obligatoires.' });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('select');
    setClient(null);
    setResult(null);
  };

  const steps: Step[] = ['select', 'form', 'result'];

  return (
    <div className="w-full space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/40 flex items-center justify-center shrink-0">
            <FlaskConical className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Simulation what-if
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Testez des scénarios sans enregistrer de décision
            </p>
          </div>
        </div>
        {step !== 'select' && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="w-3.5 h-3.5" />Recommencer
          </Button>
        )}
      </div>

      {/* ── Bannière simulation ── */}
      <div className="flex items-center gap-3 px-5 py-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl">
        <FlaskConical className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <div className="flex-1">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
            Mode simulation — résultat non enregistré
          </span>
          <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-0.5">
            Aucune décision ne sera créée, aucun historique ne sera modifié.
          </p>
        </div>
        <Badge tone="warning" className="shrink-0">Simulation</Badge>
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
                active ? 'text-amber-600 dark:text-amber-400'
                : done ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-400 dark:text-slate-600'
              )}>
                {done && <CircleCheck className="w-3.5 h-3.5" />}{STEP_LABELS[s]}
              </span>
            </span>
          );
        })}
      </div>

      {/* ── Étape 1 : Client ── */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Client à simuler</h2>
        {step === 'select' ? (
          <ClientSelector onSelect={handleClientSelect} initialClientId={clientId} />
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                {client?.profile.prenom?.[0]}{client?.profile.nom?.[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {client?.profile.prenom} {client?.profile.nom}
                </p>
                <code className="text-xs text-slate-400 dark:text-slate-500">{client?.client_id}</code>
              </div>
            </div>
            <Button variant="link" size="sm" className="text-amber-600 dark:text-amber-400" onClick={reset}>
              Changer de client
            </Button>
          </div>
        )}
      </Card>

      {/* ── Étape 2 : Formulaire ── */}
      {(step === 'form' || step === 'result') && schema && client && (
        <Card className="border-amber-100 dark:border-amber-800/30 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Paramètres de simulation</h2>
            {step === 'result' && (
              <Button variant="link" size="sm" className="text-amber-600 dark:text-amber-400" onClick={() => setStep('form')}>
                Modifier
              </Button>
            )}
          </div>
          {step === 'form' && (
            <ScoringForm
              schema={schema}
              client={client}
              onSubmit={handleSubmit}
              loading={loading}
              submitLabel="Simuler ce scénario"
            />
          )}
          {step === 'result' && (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
              Paramètres soumis — cliquez "Modifier" pour relancer la simulation.
            </p>
          )}
        </Card>
      )}

      {/* Erreur schema */}
      {schemaErr && (
        <div className="px-5 py-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200/60 rounded-xl text-sm text-rose-700 dark:text-rose-400">
          Impossible de charger le schéma de simulation. Vérifiez que le backend tourne sur le port 8080.
        </div>
      )}

      {/* ── Étape 3 : Résultat ── */}
      {step === 'result' && result && client && (
        <SimulResultDisplay
          result={result}
          lastScore={client.last_score}
          clientId={client.client_id}
          onReset={reset}
        />
      )}

      {/* ── Loading overlay ── */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <Card className="shadow-lg p-10 flex flex-col items-center gap-4">
            <FlaskConical className="w-10 h-10 text-amber-500 animate-pulse" />
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">Simulation en cours…</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Calcul indicatif sans enregistrement
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function SimulPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    }>
      <SimulPage />
    </Suspense>
  );
}
