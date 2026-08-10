// DESTINATION: components/client/tabs/ScoringTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { Client, FormSchema, ScoringResult } from '@/lib/types';
import { scoringRepository } from '@/lib/repositories/scoring.repository';
import { ScoringForm } from '@/components/scoring/ScoringForm';
import { ScoringResultDisplay } from '@/components/scoring/ScoringResultDisplay';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

interface Props {
  client: Client;
  /** Permet au parent de rafraîchir l'historique/last_score après un nouveau scoring */
  onScored?: () => void;
}

export function ScoringTab({ client, onScored }: Props) {
  const { toast } = useToast();
  const [schema, setSchema]       = useState<FormSchema | null>(null);
  const [schemaErr, setSchemaErr] = useState(false);
  const [step, setStep]           = useState<'form' | 'result'>('form');
  const [result, setResult]       = useState<ScoringResult | null>(null);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    scoringRepository.getFormSchema()
      .then(setSchema)
      .catch(() => setSchemaErr(true));
  }, []);

  const handleSubmit = async (declaratif: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await scoringRepository.predict(client.client_id, declaratif);
      setResult(res);
      setStep('result');
      onScored?.();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast({ variant: 'error', title: 'Erreur lors du scoring', description: detail ?? 'Vérifiez les champs obligatoires.' });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setStep('form'); setResult(null); };

  if (schemaErr) {
    return (
      <div className="px-5 py-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200/60 rounded-xl text-sm text-rose-700 dark:text-rose-400">
        Impossible de charger le schéma du formulaire. Vérifiez que le backend tourne sur le port 8080.
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Nouveau scoring</h2>
          </div>
          {step === 'result' && (
            <button onClick={reset} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
              Nouveau scoring
            </button>
          )}
        </div>
        {step === 'form' && (
          <ScoringForm schema={schema} client={client} onSubmit={handleSubmit} loading={loading} />
        )}
        {step === 'result' && (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">
            Résultat ci-dessous — cliquez "Nouveau scoring" pour relancer une évaluation.
          </p>
        )}
      </Card>

      {step === 'result' && result && (
        <ScoringResultDisplay result={result} clientId={client.client_id} onReset={reset} />
      )}

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <Card className="shadow-lg p-10 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-sm font-semibold text-slate-800 dark:text-white">Calcul du score en cours…</p>
          </Card>
        </div>
      )}
    </div>
  );
}