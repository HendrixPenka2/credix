// DESTINATION: components/client/tabs/SimulationTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { Loader2, FlaskConical } from 'lucide-react';
import { Client, FormSchema, SimulationResult } from '@/lib/types';
import { scoringRepository } from '@/lib/repositories/scoring.repository';
import { ScoringForm } from '@/components/scoring/ScoringForm';
import { SimulResultDisplay } from '@/components/simul/SimulResultDisplay';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

interface Props { client: Client; }

export function SimulationTab({ client }: Props) {
  const { toast } = useToast();
  const [schema, setSchema]       = useState<FormSchema | null>(null);
  const [schemaErr, setSchemaErr] = useState(false);
  const [step, setStep]           = useState<'form' | 'result'>('form');
  const [result, setResult]       = useState<SimulationResult | null>(null);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    scoringRepository.getFormSchema()
      .then(setSchema)
      .catch(() => setSchemaErr(true));
  }, []);

  const handleSubmit = async (declaratif: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await scoringRepository.simulate(client.client_id, declaratif);
      setResult(res);
      setStep('result');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast({ variant: 'error', title: 'Erreur lors de la simulation', description: detail });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setStep('form'); setResult(null); };

  if (schemaErr) {
    return (
      <div className="px-5 py-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200/60 rounded-xl text-sm text-rose-700 dark:text-rose-400">
        Impossible de charger le schéma de simulation. Vérifiez que le backend tourne sur le port 8080.
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 px-5 py-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl">
        <FlaskConical className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
          Mode simulation — résultat non enregistré
        </span>
      </div>

      <Card className="border-amber-100 dark:border-amber-800/30 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Paramètres de simulation</h2>
          {step === 'result' && (
            <button onClick={reset} className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline">
              Modifier
            </button>
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

      {step === 'result' && result && (
        <SimulResultDisplay result={result} lastScore={client.last_score} clientId={client.client_id} onReset={reset} />
      )}

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <Card className="shadow-lg p-10 flex flex-col items-center gap-4">
            <FlaskConical className="w-10 h-10 text-amber-500 animate-pulse" />
            <p className="text-sm font-semibold text-slate-800 dark:text-white">Simulation en cours…</p>
          </Card>
        </div>
      )}
    </div>
  );
}