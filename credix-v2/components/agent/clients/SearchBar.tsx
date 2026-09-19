import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";

export function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Input
      icon={<Icon name="search" size={18} />}
      placeholder="Rechercher par nom, prénom ou identifiant..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1"
    />
  );
}
