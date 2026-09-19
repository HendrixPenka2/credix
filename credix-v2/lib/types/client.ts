import { LastScore } from "./scoring";

export interface ClientProfile {
  nom: string;
  prenom: string;
  date_naissance?: string;
  genre?: string;
  situation_familiale?: string;
  nb_enfants?: number;
  type_emploi?: string;
  type_revenu?: string;
  niveau_education?: string;
  telephone?: string;
  agence_saisie?: string;
}

export interface Coverage {
  rho: number; // 0 à 1 — passer directement à CoverageRing
  sources_disponibles: string[];
  sources_manquantes: string[];
  has_history: boolean;
}

export interface Client {
  client_id: string;
  profile: ClientProfile;
  coverage: Coverage;
  features: Record<string, any>;
  last_score?: LastScore;
  is_new_client: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ClientSearchResult {
  client_id: string;
  profile: {
    nom: string;
    prenom: string;
    type_emploi?: string;
  };
  coverage: {
    rho: number; // 0 à 1
  };
  last_score?: LastScore;
  created_at: string;
}
