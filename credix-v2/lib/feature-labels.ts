/**
 * Libellés lisibles pour les clés de variables brutes (features du modèle +
 * champs déclaratifs). Utilisé partout où on affiche un vecteur de variables
 * "brut" à un humain (fiche client agent, revue superviseur) au lieu d'un
 * dump JSON — cf. retour utilisateur : "je vois seulement des 0 et des 1".
 */
export const FEATURE_LABELS: Record<string, string> = {
  // Scores externes
  EXT_SOURCE_1: "Indice de fiabilité du crédit externe",
  EXT_SOURCE_2: "Indice de solvabilité externe 2",
  EXT_SOURCE_3: "Indice de fiabilité externe 3",
  // Ratios / montants
  annuity_to_credit: "Taux d'endettement potentiel sur le crédit",
  goods_to_credit: "Ratio biens / crédit",
  avg_payment_diff: "Délai/avance moyen de paiement",
  avg_payment_ratio: "Ratio moyen de paiement",
  std_payment_ratio: "Écart-type du ratio de paiement",
  prev_avg_down_payment: "Montant moyen des acomptes versés précédemment",
  prev_refused_ratio: "Taux de refus de crédit antérieur",
  bureau_debt_total: "Encours de crédit total (bureau)",
  bureau_active_count: "Nombre de crédits actifs aux bureaux",
  pos_avg_dpd_all: "Retard moyen de paiement POS (jours)",
  inst_ever_late: "Historique de retards de paiement",
  history_length_days: "Ancienneté du client (jours)",
  // Démographie / emploi
  age_years: "Âge (années)",
  employment_years: "Ancienneté professionnelle (années)",
  registration_years: "Ancienneté d'enregistrement (années)",
  CODE_GENDER: "Genre",
  CODE_GENDER_bin: "Genre (indicateur binaire)",
  NAME_INCOME_TYPE: "Type de revenu",
  NAME_EDUCATION_TYPE: "Niveau d'éducation",
  NAME_CONTRACT_TYPE: "Type de contrat",
  OCCUPATION_TYPE: "Profession du demandeur",
  ORGANIZATION_TYPE: "Secteur d'activité de l'employeur",
  REGION_RATING_CLIENT: "Notation régionale du client",
  EMERGENCYSTATE_MODE: "État d'urgence du logement",
  // Champs déclaratifs (saisis à la demande)
  montant_annuite: "Annuité mensuelle (FCFA)",
  montant_credit_demande: "Montant du crédit demandé (FCFA)",
  valeur_bien: "Valeur du bien financé (FCFA)",
  type_contrat: "Type de contrat",
  anciennete_emploi_mois: "Ancienneté dans l'emploi actuel (mois)",
  anciennete_domicile_mois: "Ancienneté à l'adresse actuelle (mois)",
  niveau_education: "Niveau d'éducation",
  type_revenu: "Type de revenu",
  genre: "Genre",
  date_naissance: "Date de naissance",
  // Profil client
  nom: "Nom",
  prenom: "Prénom",
  situation_familiale: "Situation familiale",
  nb_enfants: "Enfants à charge",
  nb_membres_foyer: "Membres du foyer",
  type_emploi: "Type d'emploi",
  region_rating: "Notation régionale",
  possession_vehicule: "Possède un véhicule",
  propriete_immobiliere: "Propriétaire immobilier",
  telephone: "Téléphone",
  agence_saisie: "Agence de saisie",
};

/** Repli si la clé n'est pas dans le dictionnaire : "NAME_FOO_bar" → "Name foo bar". */
export function labelFor(key: string): string {
  if (FEATURE_LABELS[key]) return FEATURE_LABELS[key];
  const spaced = key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** Formatte une valeur brute (bool/nombre/null/chaîne) pour affichage humain. */
export function formatFeatureValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value);
}
