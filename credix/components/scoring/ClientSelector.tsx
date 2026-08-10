'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, AlertTriangle, Clock, CheckCircle, X, Loader2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { clientsRepository } from '@/lib/repositories/clients.repository';
import { ClientSearchResult, Client } from '@/lib/types';
import { formatRho } from '@/lib/utils';
import { getRhoStyle } from '@/lib/design-tokens';
import { InitialsAvatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Props {
  onSelect: (client: Client) => void;
  initialClientId?: string;
}

const RHO_ICON = {
  danger: <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />,
  warning: <Clock className="w-4 h-4 text-amber-500 shrink-0" />,
  success: <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />,
} as const;

export function ClientSelector({ onSelect, initialClientId }: Props) {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<ClientSearchResult[]>([]);
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Client | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const dropRef     = useRef<HTMLDivElement>(null);

  // Pré-charger si ?client_id= dans URL
  useEffect(() => {
    if (!initialClientId) return;
    clientsRepository.getClientById(initialClientId).then(c => {
      setSelected(c);
      setQuery(`${c.profile.prenom} ${c.profile.nom}`);
      onSelect(c);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialClientId]);

  // Fermer au clic extérieur
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!inputRef.current?.contains(e.target as Node) && !dropRef.current?.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    try {
      const r = await clientsRepository.searchClients({ q, limit: 8 });
      setResults(r.clients);
      setSearched(true);
    } catch { setResults([]); setSearched(true); }
    finally { setLoading(false); }
  }, []);

  const handleChange = (v: string) => {
    setQuery(v); setSelected(null); setSearched(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { search(v); setOpen(true); }, 300);
  };

  const handleSelect = async (c: ClientSearchResult) => {
    setQuery(`${c.profile.prenom} ${c.profile.nom}`);
    setOpen(false); setResults([]); setSearched(false);
    const full = await clientsRepository.getClientById(c.client_id);
    setSelected(full); onSelect(full);
  };

  const clear = () => {
    setQuery(''); setSelected(null); setResults([]);
    setOpen(false); setSearched(false);
    inputRef.current?.focus();
  };

  const rho = selected?.coverage?.rho ?? 0;
  const col = getRhoStyle(rho);
  const noResults = searched && results.length === 0 && query.length >= 2 && !loading;

  return (
    <div className="space-y-3">
      {/* Input de recherche */}
      <div className="relative">
        {loading
          ? <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
          : <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />}
        <input
          ref={inputRef} type="text" value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => (results.length > 0 || noResults) && setOpen(true)}
          placeholder="Nom, prénom ou identifiant (ex : HC-100001)…"
          className="w-full pl-11 pr-10 py-3.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
        />
        {query && (
          <button onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Dropdown résultats */}
        {open && (results.length > 0 || noResults) && (
          <div ref={dropRef} className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">

            {/* Résultats */}
            {results.map(c => {
              const r = c.coverage?.rho ?? 0;
              return (
                <div key={c.client_id} onClick={() => handleSelect(c)}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer border-b border-slate-50 dark:border-slate-700/50 last:border-0 transition-colors">
                  <div className="flex items-center gap-3">
                    <InitialsAvatar firstName={c.profile.prenom} lastName={c.profile.nom} className="w-8 h-8 text-xs" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{c.profile.prenom} {c.profile.nom}</p>
                      <code className="text-xs text-slate-400 dark:text-slate-500">{c.client_id}</code>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.last_score && <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">{c.last_score.score_pdo}</span>}
                    <Badge tone={getRhoStyle(r).tone}>ρc {formatRho(r)}</Badge>
                  </div>
                </div>
              );
            })}

            {/* Empty state — client introuvable */}
            {noResults && (
              <div className="px-5 py-5 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Aucun client trouvé pour <em>« {query} »</em>
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Ce client n'est pas encore dans le système.
                </p>
                <Button asChild size="sm">
                  <Link href={`/clients/nouveau?q=${encodeURIComponent(query)}`} onClick={() => setOpen(false)}>
                    <UserPlus className="w-4 h-4" />
                    Créer ce client
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Conseil de recherche */}
      {!selected && !query && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Conseil : cherchez par prénom, nom, ou identifiant complet (HC-100001). Si le client n'existe pas, créez-le d'abord.
        </p>
      )}

      {/* Bannière client sélectionné */}
      {selected && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${col.badge}`}>
          {RHO_ICON[col.tone as keyof typeof RHO_ICON]}
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-slate-800 dark:text-slate-100">{selected.profile.prenom} {selected.profile.nom}</span>
            <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
            <code className="text-xs text-slate-500 dark:text-slate-400">{selected.client_id}</code>
            <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
            <span className={`text-xs font-semibold ${col.text}`}>ρc {formatRho(rho)} — {col.label}</span>
            {selected.is_new_client && <Badge tone="brand" className="ml-2">Nouveau</Badge>}
          </div>
        </div>
      )}
    </div>
  );
}