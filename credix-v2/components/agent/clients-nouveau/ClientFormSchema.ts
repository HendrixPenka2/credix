import { z } from "zod";

export const clientFormSchema = z.object({
  nom: z.string().min(1, "Champ requis"),
  prenom: z.string().min(1, "Champ requis"),
  date_naissance: z.string().min(1, "Champ requis"),
  genre: z.enum(["M", "F"]),
  situation_familiale: z.string().min(1, "Champ requis"),
  nb_enfants: z.coerce.number().min(0).default(0),
  telephone: z.string().optional(),
  agence_saisie: z.string().min(1, "Champ requis"),
  type_emploi: z.string().min(1, "Champ requis"),
  type_revenu: z.string().min(1, "Champ requis"),
  niveau_education: z.string().min(1, "Champ requis"),
  anciennete_emploi_mois: z.coerce.number().min(0, "Doit être positif"),
  anciennete_domicile_mois: z.coerce.number().min(0, "Doit être positif"),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
