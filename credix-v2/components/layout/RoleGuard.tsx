"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Icon } from "@/components/ui/icon";

/** Garde d'accès côté client — redirige vers /login si aucune session valide. */
export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  if (isLoading || !user || !role) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-container-lowest">
        <Icon name="progress_activity" size={32} className="animate-spin text-on-surface-variant" />
      </div>
    );
  }

  return <>{children}</>;
}
