import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

const ACTIONS = [
  { href: "/score", label: "Nouveau scoring", icon: "add_box", tone: "text-on-surface" },
  { href: "/simul", label: "Simulateur", icon: "science", tone: "text-simulation-orange" },
  { href: "/clients/nouveau", label: "Nouveau client", icon: "person_add", tone: "text-secondary" },
  { href: "/clients", label: "Rechercher", icon: "search", tone: "text-on-surface" },
];

export function QuickActions() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Actions rapides</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex-1">
        <div className="grid grid-cols-2 gap-3 h-full">
          {ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="bg-surface-container-low hover:bg-surface-container-high border border-outline-variant rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-colors group"
            >
              <span className="w-10 h-10 bg-surface-container-lowest rounded-full flex items-center justify-center shadow-sm border border-outline-variant/60 group-hover:scale-110 transition-transform">
                <Icon name={action.icon} className={action.tone} />
              </span>
              <span className="font-data-sm text-on-surface text-center">{action.label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
