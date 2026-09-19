import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export interface UsersFilters {
  query: string;
  role: "all" | "AGENT" | "SUPERVISEUR" | "ADMIN";
}

export function UsersFilterBar({ filters, onChange }: { filters: UsersFilters; onChange: (f: UsersFilters) => void }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Input
        icon={<Icon name="search" size={18} />}
        placeholder="Rechercher un utilisateur..."
        value={filters.query}
        onChange={(e) => onChange({ ...filters, query: e.target.value })}
        className="flex-1"
      />
      <Select value={filters.role} onValueChange={(v) => onChange({ ...filters, role: v as UsersFilters["role"] })}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les rôles</SelectItem>
          <SelectItem value="AGENT">Agent</SelectItem>
          <SelectItem value="SUPERVISEUR">Superviseur</SelectItem>
          <SelectItem value="ADMIN">Admin</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
