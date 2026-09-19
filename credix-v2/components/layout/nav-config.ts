import type { Role } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Affiche le compteur de dossiers en attente (revue superviseur/admin). */
  badge?: "pending-review";
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

/**
 * Navigation par rôle — reconstruite depuis cdc_credix.md §4 (36 routes),
 * jamais copiée d'une seule maquette Stitch : plusieurs d'entre elles ont
 * des sidebars qui divergent de la vraie arborescence (voir audit design).
 * `/clients` et `/clients/[id]` sont partagées entre les 3 rôles.
 */
export const NAV_BY_ROLE: Record<Role, NavGroup[]> = {
  AGENT: [
    {
      items: [{ href: "/dashboard", label: "Tableau de bord", icon: "dashboard" }],
    },
    {
      title: "Clients",
      items: [
        { href: "/clients", label: "Rechercher", icon: "search" },
        { href: "/clients/nouveau", label: "Nouveau client", icon: "person_add" },
      ],
    },
    {
      title: "Dossiers",
      items: [
        { href: "/score", label: "Nouveau scoring", icon: "analytics" },
        { href: "/simul", label: "Simulateur", icon: "science" },
        { href: "/hist", label: "Historique", icon: "history" },
        { href: "/rep", label: "Mes rapports", icon: "description" },
      ],
    },
  ],
  SUPERVISEUR: [
    {
      items: [
        { href: "/superviseur", label: "Vue d'ensemble", icon: "dashboard" },
        { href: "/superviseur/revue", label: "Dossiers en revue", icon: "fact_check", badge: "pending-review" },
        { href: "/superviseur/mes-validations", label: "Mes validations", icon: "task_alt" },
      ],
    },
    {
      title: "Portefeuille",
      items: [
        { href: "/superviseur/distribution", label: "Distribution des scores", icon: "bar_chart" },
        { href: "/superviseur/tranches", label: "Tranches de risque", icon: "table_chart" },
      ],
    },
    {
      title: "Modèle IA",
      items: [
        { href: "/superviseur/modele/derive", label: "Dérive globale (PSI)", icon: "monitoring" },
        { href: "/superviseur/modele/variables", label: "Dérive par variable", icon: "tune" },
        { href: "/superviseur/modele/versions", label: "Versions du modèle", icon: "layers" },
      ],
    },
    {
      title: "Clients",
      items: [{ href: "/clients", label: "Tous les clients", icon: "group" }],
    },
  ],
  ADMIN: [
    {
      items: [{ href: "/admin", label: "Vue générale", icon: "dashboard" }],
    },
    {
      title: "Gestion",
      items: [
        { href: "/admin/utilisateurs", label: "Utilisateurs", icon: "group" },
        { href: "/admin/configuration", label: "Configuration", icon: "tune" },
      ],
    },
    {
      title: "Modèle IA",
      items: [
        { href: "/admin/modeles", label: "Versions du modèle", icon: "layers" },
        { href: "/admin/modeles/derive", label: "Dérive globale (PSI)", icon: "monitoring" },
        { href: "/admin/modeles/variables", label: "Dérive par variable", icon: "tune" },
      ],
    },
    {
      title: "Audit",
      items: [
        { href: "/admin/audit", label: "Journal d'audit", icon: "history" },
        { href: "/clients", label: "Tous les clients", icon: "group" },
      ],
    },
  ],
};

/** Routes dont le surlignage actif ne doit PAS s'étendre à tous leurs enfants (cf. ancien projet, Sidebar). */
export const EXACT_ONLY = ["/clients", "/superviseur", "/admin"];

export function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (EXACT_ONLY.includes(href)) return false;
  return pathname.startsWith(`${href}/`);
}
