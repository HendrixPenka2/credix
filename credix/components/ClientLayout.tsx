'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar, Topbar } from './LayoutParts';
import { useAuth } from '@/contexts/AuthContext';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  // Spinner pendant le chargement ou la redirection
  if (isLoading || !user || !role) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-400" />
          <span className="text-sm text-slate-400 dark:text-slate-500 font-medium">Chargement...</span>
        </div>
      </div>
    );
  }

  // Construction des breadcrumbs depuis l'URL
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = [
    { label: 'Accueil', href: '/' },
    ...segments.map((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      return { label, href };
    }),
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      <Sidebar role={role} user={user} onLogout={logout} />
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <Topbar breadcrumbs={breadcrumbs} />
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}