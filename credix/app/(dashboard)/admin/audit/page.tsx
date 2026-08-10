'use client';

import { useState, useEffect } from 'react';
import { Loader2, FileText, Search, RotateCcw } from 'lucide-react';
import { AuditLog } from '@/lib/types';
import { monitoringRepository } from '@/lib/repositories/monitoring.repository';
import { AuditLogsTable } from '@/components/admin/AuditLogsTable';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/error-state';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

const PAGE_SIZE = 50;
const ALL_ACTIONS = '__toutes__';

export default function AuditPage() {
  const [logs, setLogs]         = useState<AuditLog[]>([]);
  const [actions, setActions]   = useState<string[]>([]);
  const [limite, setLimite]     = useState(PAGE_SIZE);

  const [actionFilter, setActionFilter] = useState('');
  const [userIdInput, setUserIdInput]   = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');

  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const fetchLogs = (lim: number) =>
    monitoringRepository.getAuditLogs({
      action: actionFilter || undefined,
      user_id: userIdFilter || undefined,
      limite: lim,
    });

  const load = () => {
    setLoading(true); setError(null); setLimite(PAGE_SIZE);
    fetchLogs(PAGE_SIZE)
      .then(res => { setLogs(res.logs ?? []); setActions(res.actions_disponibles ?? []); })
      .catch(() => setError('Impossible de charger le journal d’audit. Vérifiez que le backend tourne sur le port 8080.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [actionFilter, userIdFilter]);

  const handleLoadMore = () => {
    const newLimite = limite + PAGE_SIZE;
    setLoadingMore(true);
    fetchLogs(newLimite)
      .then(res => { setLogs(res.logs ?? []); setLimite(newLimite); })
      .catch(() => setError('Erreur lors du chargement des entrées supplémentaires.'))
      .finally(() => setLoadingMore(false));
  };

  const handleSearch = () => setUserIdFilter(userIdInput.trim());
  const handleReset = () => { setActionFilter(''); setUserIdInput(''); setUserIdFilter(''); };

  return (
    <div className="w-full space-y-6">

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/40 flex items-center justify-center shrink-0">
          <FileText className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Journal d'audit</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {logs.length} entrée{logs.length > 1 ? 's' : ''} affichée{logs.length > 1 ? 's' : ''} — traçabilité complète des actions du système
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={actionFilter || ALL_ACTIONS} onValueChange={v => setActionFilter(v === ALL_ACTIONS ? '' : v)}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ACTIONS}>Toutes les actions</SelectItem>
            {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>

        <Input
          value={userIdInput}
          onChange={e => setUserIdInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Filtrer par identifiant utilisateur…"
          icon={<Search />}
          className="w-64"
        />
        <Button size="sm" onClick={handleSearch}>Filtrer</Button>
        {(actionFilter || userIdFilter) && (
          <Button size="sm" variant="ghost" onClick={handleReset}>
            <RotateCcw className="w-3.5 h-3.5" />Réinitialiser
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-sm text-slate-400 dark:text-slate-500">Chargement…</span>
        </div>
      )}
      {error && !loading && (
        <Card><ErrorState message={error} onRetry={load} /></Card>
      )}

      {!loading && !error && (
        <>
          <AuditLogsTable logs={logs} />

          {logs.length === limite && limite < 200 && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleLoadMore} loading={loadingMore}>
                {loadingMore ? 'Chargement…' : `Charger plus (${logs.length} affichées)`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
