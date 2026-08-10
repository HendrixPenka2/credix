import { Role } from './auth';

export interface AdminUser {
  user_id: string;
  username: string;
  role: Role;
  actif: boolean;
  profil: {
    nom: string;
    prenom: string;
    email: string;
    agence?: string;
  };
  statistiques: {
    nb_demandes_soumises: number;
    nb_decisions_accordees: number;
    nb_decisions_refusees: number;
    nb_decisions_revue: number;
    nb_overrides_superviseur: number;
    derniere_connexion?: string;
  };
  created_at: string;
}

export interface Thresholds {
  accorde: number;
  refuse: number;
}