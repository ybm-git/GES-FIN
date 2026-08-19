export type UserRole = 'ADMIN' | 'MANAGER' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  nom: string;
  role: UserRole;
  password_hash?: string;
  avatar?: string;
  created_at: string;
}

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface SolvencyScore {
  score: number; // 0 to 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  riskLevel: RiskLevel;
  ponctualiteScore: number; // out of 40
  recouvrementScore: number; // out of 30
  retardMoyenJours: number; // average overdue days
  delaiScore: number; // out of 20
  regulariteScore: number; // out of 10
  totalEcheances: number;
  echeancesEnRetard: number;
  echeancesPayees: number;
  recommendation: string;
}

export interface Structure {
  id: string;
  raison_sociale: string;
  contact_nom: string;
  telephone: string;
  adresse?: string;
  email?: string;
  created_at: string;
}

export type DecaissementStatut = 'ACTIF' | 'CLOTURE';

export interface AvenantRestructuration {
  id: string;
  decaissement_id: string;
  numero_avenant: number;
  date_avenant: string;
  solde_restructure: number;
  nouveau_taux_interet: number;
  penalites_retard?: number;
  nouveau_montant_total: number;
  nombre_trimestres: number;
  motif: string;
  created_by?: string;
}

export interface Decaissement {
  id: string;
  structure_id: string;
  reference_unique: string;
  montant_principal: number;
  taux_interet: number; // percentage (e.g. 5.5 for 5.5%)
  montant_total_a_rembourser: number;
  date_decaissement: string; // ISO string / timestamp
  notes: string;
  statut: DecaissementStatut;
  created_at: string;
  avenants?: AvenantRestructuration[];
}

export type TrimestreCode = 'T1' | 'T2' | 'T3' | 'T4';
export type EcheancierStatut = 'EN_ATTENTE' | 'EN_RETARD' | 'SOLDE';

export interface EcheancierTrimestriel {
  id: string;
  decaissement_id: string;
  annee: number;
  trimestre: TrimestreCode;
  date_limite: string; // YYYY-MM-DD
  montant_prevu: number;
  montant_paye: number;
  statut: EcheancierStatut;
}

export interface Engagement {
  id: string;
  decaissement_id: string;
  echeancier_id?: string;
  montant_verse: number;
  date_paiement: string; // ISO string / timestamp
  reste_a_engager: number; // remaining after this payment
  mode_reglement?: 'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'ESPECES';
  reference_recu?: string;
  notes?: string;
}

export interface FinancialKPIs {
  montantTotalDecaisse: number;
  interetsGeneres: number;
  montantTotalRembourse: number;
  resteARecouvrer: number;
  structuresActivesCount: number;
  totalStructuresCount: number;
  tauxRecouvrementGlobal: number;
  decaissementsActifsCount: number;
  decaissementsCloturesCount: number;
}

export type AlertSeverity = 'GREEN' | 'ORANGE' | 'RED';

export interface AlertItem {
  id: string;
  decaissement_id: string;
  echeancier_id: string;
  structure_id: string;
  structure_nom: string;
  reference_decaissement: string;
  trimestre: TrimestreCode;
  annee: number;
  date_limite: string;
  montant_prevu: number;
  montant_paye: number;
  solde_restant: number;
  jours_restants: number; // negative if overdue
  severity: AlertSeverity; // GREEN: paid/solved, ORANGE: <=15 days left, RED: overdue with balance
  message: string;
}

export type AuditActionType =
  | 'CREATE_STRUCTURE'
  | 'UPDATE_STRUCTURE'
  | 'DELETE_STRUCTURE'
  | 'CREATE_DECAISSEMENT'
  | 'UPDATE_DECAISSEMENT'
  | 'DELETE_DECAISSEMENT'
  | 'CREATE_ENGAGEMENT'
  | 'UPDATE_ENGAGEMENT'
  | 'DELETE_ENGAGEMENT'
  | 'RESTORE_SNAPSHOT'
  | 'RESTORE_AUTH_SNAPSHOT'
  | 'UPDATE_ADMIN_CREDENTIALS'
  | 'RESTRUCTURE_LOAN'
  | 'BULK_IMPORT';

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO string
  user_email: string;
  user_nom: string;
  user_role: string;
  action_type: AuditActionType;
  target_entity: 'STRUCTURE' | 'DECAISSEMENT' | 'ENGAGEMENT' | 'AUTH' | 'BACKUP' | 'SYSTEM';
  target_id?: string;
  target_label?: string;
  details: string;
  severity: AuditSeverity;
  ip_address?: string;
}
