import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface AvatarNameRowProps {
  firstName?: string;
  lastName?: string;
  subtitle?: string;
  size?: "sm" | "md";
  trailing?: React.ReactNode;
  className?: string;
}

/**
 * Ligne "avatar + nom + sous-titre" — motif répété sur toutes les listes de
 * clients/dossiers/utilisateurs (tableaux, files d'attente).
 */
export function AvatarNameRow({ firstName, lastName, subtitle, size = "md", trailing, className }: AvatarNameRowProps) {
  const initials = `${firstName?.charAt(0) ?? ""}${lastName?.charAt(0) ?? ""}`.toUpperCase() || "?";
  const avatarSize = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Avatar className={avatarSize}>
        <AvatarFallback className={size === "sm" ? "font-label-md" : "font-data-sm"}>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col min-w-0">
        <span className="font-data-sm text-on-surface truncate">
          {firstName} {lastName}
        </span>
        {subtitle && <span className="font-body-sm text-on-surface-variant truncate">{subtitle}</span>}
      </div>
      {trailing}
    </div>
  );
}
