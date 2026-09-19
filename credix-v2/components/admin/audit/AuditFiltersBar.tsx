import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export interface AuditFilters {
  userId: string;
  action: string;
}

export function AuditFiltersBar({
  filters,
  onChange,
  actionsDisponibles,
}: {
  filters: AuditFilters;
  onChange: (f: AuditFilters) => void;
  actionsDisponibles: string[];
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Input
        icon={<Icon name="person" size={18} />}
        placeholder="Filtrer par identifiant utilisateur..."
        value={filters.userId}
        onChange={(e) => onChange({ ...filters, userId: e.target.value })}
        className="flex-1"
      />
      <Select value={filters.action} onValueChange={(v) => onChange({ ...filters, action: v })}>
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Type d'action" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les actions</SelectItem>
          {actionsDisponibles.map((a) => (
            <SelectItem key={a} value={a}>
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
