import { Banner } from "@/components/shared/Banner";
import { Button } from "@/components/ui/button";

/** Cas de conflit : dossier déjà tranché par un collègue entre-temps (409). */
export function RevueConflictBanner({ onRefresh }: { onRefresh: () => void }) {
  return (
    <Banner variant="warning" title="Dossier déjà tranché" description="Ce dossier a été traité par un autre superviseur entre-temps.">
      <Button size="sm" variant="outline" className="mt-2" onClick={onRefresh}>
        Actualiser la file
      </Button>
    </Banner>
  );
}
