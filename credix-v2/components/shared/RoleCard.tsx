import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

/**
 * Carte radio pour le choix de rôle — référence : cr_ation_de_compte_admin_credix.
 * Admin utilise volontairement l'accent "danger" du design system pour signaler
 * le niveau de privilège le plus élevé (choix assumé de la maquette validée).
 *
 * Les classes Tailwind sont écrites en toutes lettres (pas de composition de
 * chaîne dynamique) : le compilateur Tailwind ne scanne que du texte littéral,
 * une classe assemblée à l'exécution (ex. `bg-${tone}`) ne serait jamais générée.
 */
const ROLE_META: Record<
  Role,
  {
    icon: string;
    title: string;
    description: string;
    border: string;
    tint: string;
    solid: string;
    chip: string;
  }
> = {
  AGENT: {
    icon: "support_agent",
    title: "Agent",
    description: "Recherche/crée des clients, lance des scorings, consulte l'historique.",
    border: "border-secondary",
    tint: "bg-secondary/5",
    solid: "bg-secondary text-on-secondary",
    chip: "bg-secondary/10 text-secondary",
  },
  SUPERVISEUR: {
    icon: "shield_person",
    title: "Superviseur",
    description: "Traite la file de revue manuelle, surveille le portefeuille et le modèle IA.",
    border: "border-supervisor-violet",
    tint: "bg-supervisor-violet/5",
    solid: "bg-supervisor-violet text-white",
    chip: "bg-supervisor-violet/10 text-supervisor-violet",
  },
  ADMIN: {
    icon: "admin_panel_settings",
    title: "Administrateur",
    description: "Gère les comptes, les seuils de décision et les versions du modèle.",
    border: "border-danger-rose",
    tint: "bg-danger-rose/5",
    solid: "bg-danger-rose text-white",
    chip: "bg-danger-rose/10 text-danger-rose",
  },
};

export function RoleCard({ role, selected, onSelect }: { role: Role; selected: boolean; onSelect: () => void }) {
  const meta = ROLE_META[role];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors",
        selected ? `${meta.border} ${meta.tint}` : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low"
      )}
    >
      {selected && (
        <span className={cn("absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full", meta.solid)}>
          <Icon name="check" size={14} />
        </span>
      )}
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", selected ? meta.solid : meta.chip)}>
        <Icon name={meta.icon} />
      </span>
      <p className="font-data-sm text-on-surface">{meta.title}</p>
      <p className="font-body-sm text-on-surface-variant">{meta.description}</p>
    </button>
  );
}
