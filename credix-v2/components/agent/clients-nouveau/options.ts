/**
 * Listes de valeurs catégorielles Home Credit — les `value` envoyées au backend
 * doivent rester en anglais (features du modèle), seuls les `label` sont traduits.
 */

export const OCCUPATION_TYPES = [
  "Laborers",
  "Core staff",
  "Accountants",
  "Managers",
  "Drivers",
  "Sales staff",
  "Cleaning staff",
  "Cooking staff",
  "Private service staff",
  "Medicine staff",
  "Security staff",
  "High skill tech staff",
  "Waiters/barmen staff",
  "Low-skill Laborers",
  "Realty agents",
  "Secretaries",
  "IT staff",
  "HR staff",
].map((v) => ({ value: v, label: v }));

export const INCOME_TYPES = [
  { value: "Working", label: "Salarié" },
  { value: "Commercial associate", label: "Associé commercial" },
  { value: "Pensioner", label: "Retraité" },
  { value: "State servant", label: "Fonctionnaire" },
  { value: "Unemployed", label: "Sans emploi" },
  { value: "Student", label: "Étudiant" },
  { value: "Businessman", label: "Chef d'entreprise" },
  { value: "Maternity leave", label: "Congé maternité" },
];

export const EDUCATION_TYPES = [
  { value: "Secondary / secondary special", label: "Secondaire" },
  { value: "Higher education", label: "Supérieur" },
  { value: "Incomplete higher", label: "Supérieur incomplet" },
  { value: "Lower secondary", label: "Collège" },
  { value: "Academic degree", label: "Diplôme académique (doctorat...)" },
];

export const FAMILY_STATUSES = [
  { value: "Married", label: "Marié(e)" },
  { value: "Single / not married", label: "Célibataire" },
  { value: "Civil marriage", label: "Union libre" },
  { value: "Separated", label: "Séparé(e)" },
  { value: "Widow", label: "Veuf/Veuve" },
];

export const GENDERS = [
  { value: "F", label: "Femme" },
  { value: "M", label: "Homme" },
];
