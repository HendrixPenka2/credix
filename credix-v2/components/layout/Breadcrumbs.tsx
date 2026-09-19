"use client";

import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  dashboard: "Tableau de bord",
  clients: "Clients",
  nouveau: "Nouveau",
  score: "Nouveau scoring",
  simul: "Simulateur",
  hist: "Historique",
  rep: "Mes rapports",
  superviseur: "Superviseur",
  revue: "Dossiers en revue",
  "mes-validations": "Mes validations",
  distribution: "Distribution des scores",
  tranches: "Tranches de risque",
  modele: "Modèle IA",
  derive: "Dérive globale (PSI)",
  variables: "Dérive par variable",
  versions: "Versions du modèle",
  admin: "Administration",
  utilisateurs: "Utilisateurs",
  configuration: "Configuration",
  modeles: "Modèles",
  audit: "Journal d'audit",
};

/** Fil d'Ariane dérivé du chemin — pas de config par page, un seul dictionnaire de libellés. */
export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const label = (seg: string) => LABELS[seg] ?? (seg.startsWith("CLT-") ? seg : seg.charAt(0).toUpperCase() + seg.slice(1));

  return (
    <div className="flex items-center gap-1.5 font-headline-sm text-on-surface">
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-outline font-body-sm">/</span>}
          <span className={i === segments.length - 1 ? "text-on-surface" : "text-on-surface-variant"}>{label(seg)}</span>
        </span>
      ))}
    </div>
  );
}
