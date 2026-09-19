import { z } from "zod";

export const userFormSchema = z
  .object({
    prenom: z.string().min(1, "Champ requis"),
    nom: z.string().min(1, "Champ requis"),
    email: z.string().email("Email invalide"),
    agence: z.string().optional(),
    role: z.enum(["AGENT", "SUPERVISEUR", "ADMIN"]),
    username: z.string().min(3, "3 caractères minimum"),
    password: z.string().min(8, "8 caractères minimum"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type UserFormValues = z.infer<typeof userFormSchema>;
