// DESTINATION: lib/types/monitoring.ts
// (patch — ModelVersion : `version` devient optionnel + ajout `nom_version`,
// `description`, `date_upload` pour matcher le document réel inséré par
// POST /api/admin/upload-model, qui écrit `nom_version` et non `version`.
// Remplace le fichier existant.)

export interface ModelDrift {
  psi: number | null;
  statut: string;
  couleur: string;
  message: string;
  nb_scores_reference: number;
  nb_scores_actuels: number;
  periode_reference?: string;
  calcule_le?: string;
}

export interface FeatureDrift {
  statut_global: string;
  nb_features_analysees: number;
  nb_derives: number;
  nb_attention: number;
  nb_stables: number;
  nb_insuffisant: number;
  nb_demandes_reference: number;
  nb_demandes_actuelles: number;
  periode_reference: string;
  calcule_le: string;
  features: Array<{
    feature: string;
    psi: number | null;
    statut: string;
    couleur: string;
    nb_ref: number;
    nb_act: number;
  }>;
  note: string;
}

export interface ModelVersion {
  run_id: string;
  // ⚠️ Le document inséré par upload-model stocke "nom_version", pas "version".
  // Les deux sont donc optionnels ici ; l'UI doit lire l'un OU l'autre
  // (voir nomVersion() dans components/admin/ModelVersionsTable.tsx).
  version?: string;
  nom_version?: string;
  description?: string;
  statut: 'PRODUCTION' | 'STAGING' | 'ARCHIVE';
  metriques?: { auc: number; gini: number; ks: number };
  date_entrainement?: string;
  date_upload?: string;
  promoted_at?: string;
}

export interface AuditLog {
  timestamp: string;
  user_id: string;
  user_role: string;
  action: string;
  ressource: string;
  ressource_id: string;
  ip_address?: string;
  statut: string;
  details: any;
}

// END OF FILE: lib/types/monitoring.ts