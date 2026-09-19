import { Banner } from "@/components/shared/Banner";

/** Bandeau lecture seule — cf. versions_du_mod_le_superviseur : le superviseur consulte, seul l'admin agit. */
export function ReadOnlyBanner({ description }: { description: string }) {
  return <Banner variant="readonly" title="Vue en lecture seule" description={description} />;
}
