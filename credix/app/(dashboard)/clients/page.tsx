'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, UserPlus, AlertTriangle, XCircle, Users, RotateCcw, ChevronRight, History,
} from 'lucide-react';
import { clientsRepository } from '@/lib/repositories/clients.repository';
import { ClientSearchResult } from '@/lib/types';
import { formatRho } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DecisionBadge, RhoBadge } from '@/components/ui/badge';
import { InitialsAvatar } from '@/components/ui/avatar';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { getRhoStyle } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'credix_client_search';

type DecisionFilter = '' | 'ACCORDE' | 'REFUSE' | 'REVUE_MANUELLE';
type RhoFilter      = '' | 0.25 | 0.40;

const RHO_FILTERS: { label: string; value: RhoFilter }[] = [
  { label: 'Tous les ρc', value: '' },
  { label: 'ρc < 25% — Critique', value: 0.25 },
  { label: 'ρc < 40% — Partiel', value: 0.40 },
];

const DECISION_FILTERS: { label: string; value: DecisionFilter }[] = [
  { label: 'Toutes décisions', value: '' },
  { label: 'Accordé', value: 'ACCORDE' },
  { label: 'En revue', value: 'REVUE_MANUELLE' },
  { label: 'Refusé', value: 'REFUSE' },
];

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
        active
          ? 'bg-blue-600 border-blue-600 text-white'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
      )}
    >
      {children}
    </button>
  );
}

export default function ClientsPage() {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query,          setQuery]          = useState('');
  const [rhoMax,         setRhoMax]         = useState<RhoFilter>('');
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>('');
  const [results,        setResults]        = useState<ClientSearchResult[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [loadingRecent,  setLoadingRecent]  = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [hasSearched,    setHasSearched]    = useState(false);
  const [isRecent,       setIsRecent]       = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { q, rho, decision, res } = JSON.parse(saved);
        setQuery(q || ''); setRhoMax(rho || ''); setDecisionFilter(decision || '');
        if (res?.length > 0) {
          setResults(res); setHasSearched(true); setIsRecent(false);
          setLoadingRecent(false); return;
        }
      } catch {}
    }
    loadRecent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRecent() {
    setLoadingRecent(true);
    try {
      const res = await clientsRepository.searchClients({ rho_max: 1.0, limit: 30 });
      const sorted = [...res.clients].sort((a, b) => {
        const dA = a.last_score?.date ? new Date(a.last_score.date).getTime() : 0;
        const dB = b.last_score?.date ? new Date(b.last_score.date).getTime() : 0;
        return dB - dA;
      });
      setResults(sorted.slice(0, 10)); setIsRecent(true);
    } catch { setResults([]); }
    finally { setLoadingRecent(false); }
  }

  const doSearch = useCallback(async (q: string, rho: RhoFilter, decision: DecisionFilter) => {
    const hasQ = q.trim().length >= 2, hasRho = rho !== '', hasDec = decision !== '';
    if (!hasQ && !hasRho && !hasDec) return;
    setLoading(true); setError(null); setHasSearched(true); setIsRecent(false);
    try {
      const params: any = { limit: 30 };
      if (hasQ)  params.q                = q.trim();
      if (hasRho) params.rho_max         = rho;
      if (hasDec) params.decision_derniere = decision;
      const res = await clientsRepository.searchClients(params);
      setResults(res.clients);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ q, rho, decision, res: res.clients }));
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Erreur lors de la recherche'); setResults([]);
    } finally { setLoading(false); }
  }, []);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); doSearch(query, rhoMax, decisionFilter); };

  const handleReset = () => {
    setQuery(''); setRhoMax(''); setDecisionFilter('');
    setHasSearched(false); setError(null);
    sessionStorage.removeItem(STORAGE_KEY);
    loadRecent();
    inputRef.current?.focus();
  };

  const handleClientClick = (clientId: string) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ q: query, rho: rhoMax, decision: decisionFilter, res: results }));
    router.push(`/clients/${clientId}`);
  };

  const setRhoAndSearch      = (v: RhoFilter)      => { setRhoMax(v);          doSearch(query, v, decisionFilter); };
  const setDecisionAndSearch = (v: DecisionFilter) => { setDecisionFilter(v); doSearch(query, rhoMax, v); };
  const thinFile = results.filter(c => c.last_score != null && (c.coverage?.rho ?? 0) < 0.25).length;
  const showTable = loadingRecent || loading || results.length > 0 || (hasSearched && !loading);

  return (
    <div className="w-full space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Gestion clients</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Recherchez et analysez les profils emprunteurs</p>
        </div>
        <Button asChild>
          <Link href="/clients/nouveau"><UserPlus className="w-4 h-4" />Nouveau client</Link>
        </Button>
      </div>

      {/* Recherche */}
      <div className="space-y-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1">
            <Input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Nom, prénom, identifiant client..."
              icon={<Search />}
              className="h-10"
            />
          </div>
          <Button type="submit" variant="secondary" loading={loading || loadingRecent} className="h-10">
            {!(loading || loadingRecent) && <Search className="w-4 h-4" />}
            Rechercher
          </Button>
          {(hasSearched || rhoMax !== '' || decisionFilter !== '') && (
            <Button type="button" variant="ghost" size="icon" className="h-10 w-10" onClick={handleReset} title="Réinitialiser">
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </form>

        {/* Chips filtres */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 pr-1">Filtres :</span>
          {RHO_FILTERS.map(opt => (
            <FilterChip key={String(opt.value)} active={rhoMax === opt.value && rhoMax !== ''} onClick={() => setRhoAndSearch(opt.value)}>
              {opt.label}
            </FilterChip>
          ))}
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
          {DECISION_FILTERS.map(opt => (
            <FilterChip key={opt.value} active={decisionFilter === opt.value && decisionFilter !== ''} onClick={() => setDecisionAndSearch(opt.value)}>
              {opt.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-500/20 text-rose-700 dark:text-rose-400">
          <XCircle className="w-4 h-4 shrink-0" /><p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Table */}
      {showTable && (
        <div className="space-y-0">
          {!loading && !loadingRecent && results.length > 0 && (
            <div className="flex items-center justify-between px-1 pb-3 text-xs">
              <div className="flex items-center gap-3">
                {isRecent
                  ? <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium"><History className="w-3.5 h-3.5 text-blue-500" />{results.length} derniers clients scorés</span>
                  : <span className="font-semibold text-slate-700 dark:text-slate-300">{results.length} client{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}</span>
                }
                {thinFile > 0 && <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium"><AlertTriangle className="w-3 h-3" />{thinFile} thin-file</span>}
              </div>
              <span className="text-slate-400 dark:text-slate-500">{isRecent ? 'Triés par date de scoring' : 'Triés par ρc croissant'}</span>
            </div>
          )}

          {(loading || loadingRecent) ? (
            <SkeletonTable rows={6} cols={6} />
          ) : results.length === 0 && hasSearched ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800">
              <EmptyState
                icon={Users}
                title={`Aucun client trouvé${query ? ` pour « ${query} »` : ''}`}
                description="Ce client n'existe pas encore dans le système."
                action={{ label: 'Créer ce client', onClick: () => router.push(`/clients/nouveau${query ? `?q=${encodeURIComponent(query)}` : ''}`) }}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Identifiant</TableHead>
                  <TableHead>Emploi</TableHead>
                  <TableHead>Couverture ρc</TableHead>
                  <TableHead>Dernier score</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map(client => {
                  const rho = client.coverage?.rho ?? 0;
                  const rhoStyle = getRhoStyle(rho);
                  const last = client.last_score;
                  return (
                    <TableRow key={client.client_id} clickable onClick={() => handleClientClick(client.client_id)} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <InitialsAvatar firstName={client.profile.prenom} lastName={client.profile.nom} className="w-8 h-8 text-xs" />
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {client.profile.prenom} {client.profile.nom}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell><code className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{client.client_id}</code></TableCell>
                      <TableCell>{client.profile.type_emploi ?? <span className="italic text-slate-300 dark:text-slate-600 text-xs">—</span>}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-14 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full', rhoStyle.dot)} style={{ width: `${Math.max(rho * 100, 4)}%` }} />
                          </div>
                          <RhoBadge rho={rho} />
                        </div>
                      </TableCell>
                      <TableCell>
                        {last ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-slate-900 dark:text-white">{last.score_pdo}</span>
                            <DecisionBadge decision={last.decision} />
                          </div>
                        ) : <span className="text-xs text-slate-300 dark:text-slate-600 italic">Aucun</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors ml-auto" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* État initial */}
      {!hasSearched && !loading && !loadingRecent && results.length === 0 && (
        <EmptyState
          icon={Search}
          title="Rechercher un client"
          description="Tapez un nom ou un identifiant pour commencer, ou utilisez un raccourci ci-dessous."
          className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-24"
        />
      )}
      {!hasSearched && !loading && !loadingRecent && results.length === 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 -mt-20">
          <Button variant="outline" size="sm" className="border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20" onClick={() => setRhoAndSearch(0.40)}>
            <AlertTriangle className="w-4 h-4" />Voir les thin-files
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/clients/nouveau"><UserPlus className="w-4 h-4" />Créer un profil</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
