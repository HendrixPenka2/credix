'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, UserRound } from 'lucide-react';
import { clientsRepository } from '@/lib/repositories/clients.repository';
import { ClientSearchResult } from '@/lib/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { RhoBadge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Recherche globale de la Topbar — tape un nom/id client, résultats en direct
 * (debounce 300ms), clic → profil client. TODO 6.4.
 */
export function GlobalSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    clientsRepository
      .searchClients({ q: debouncedQuery, limit: 6 })
      .then((res) => { if (!cancelled) setResults(res.clients); })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function goTo(clientId: string) {
    setOpen(false);
    setQuery('');
    router.push(`/clients/${clientId}`);
  }

  const showPanel = open && debouncedQuery.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <Input
        icon={loading ? <Loader2 className="animate-spin" /> : <Search />}
        placeholder="Rechercher un client..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        className="w-64 h-8 text-xs"
      />

      {showPanel && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 overflow-hidden z-50 animate-credix-slide-in-top">
          {loading && results.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">Recherche…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
              Aucun client trouvé pour « {debouncedQuery} »
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto custom-scrollbar py-1">
              {results.map((c) => (
                <li key={c.client_id}>
                  <button
                    onClick={() => goTo(c.client_id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      'hover:bg-slate-50 dark:hover:bg-slate-800'
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <UserRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {c.profile.prenom} {c.profile.nom}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{c.client_id}</p>
                    </div>
                    <RhoBadge rho={c.coverage.rho} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
