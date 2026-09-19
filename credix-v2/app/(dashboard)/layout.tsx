"use client";

import { useAuth } from "@/contexts/AuthContext";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { role, user, logout } = useAuth();

  if (!role) return null;

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar role={role} user={user} onLogout={logout} />
      <div className="lg:pl-[260px] flex min-h-screen flex-col">
        <Topbar role={role} />
        <main className="flex-1 p-gutter max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard>
      <DashboardShell>{children}</DashboardShell>
    </RoleGuard>
  );
}
