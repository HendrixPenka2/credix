import { Card, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { ClientProfile } from "@/lib/types";

export function RevueProfilCard({ profile }: { profile?: ClientProfile }) {
  if (!profile) return null;

  const rows: [string, string | number | undefined][] = [
    ["Date de naissance", formatDate(profile.date_naissance)],
    ["Genre", profile.genre === "F" ? "Femme" : profile.genre === "M" ? "Homme" : profile.genre],
    ["Situation familiale", profile.situation_familiale],
    ["Enfants à charge", profile.nb_enfants],
    ["Type d'emploi", profile.type_emploi],
    ["Type de revenu", profile.type_revenu],
    ["Niveau d'éducation", profile.niveau_education],
  ];

  return (
    <Card className="p-card-padding">
      <CardTitle className="mb-3">Profil emprunteur</CardTitle>
      <dl className="grid grid-cols-2 gap-3 font-body-sm">
        {rows
          .filter(([, v]) => v !== undefined && v !== null && v !== "")
          .map(([label, value]) => (
            <div key={label}>
              <dt className="text-on-surface-variant">{label}</dt>
              <dd className="text-on-surface font-medium">{value}</dd>
            </div>
          ))}
      </dl>
    </Card>
  );
}
