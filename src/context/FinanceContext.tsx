import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Structure,
  Decaissement,
  EcheancierTrimestriel,
  Engagement,
  FinancialKPIs,
  AlertItem,
  AvenantRestructuration,
  AuditLogEntry,
  AuditActionType,
  AuditSeverity,
} from '../types';
import {
  INITIAL_STRUCTURES,
  INITIAL_DECAISSEMENTS,
  INITIAL_ECHEANCIERS,
  INITIAL_ENGAGEMENTS,
  INITIAL_AUDIT_LOGS,
} from '../data/mockData';
import {
  calculateTotalToRepay,
  generateQuarterlySchedule,
  generateCustomQuarterlySchedule,
  recalculateSchedules,
  generateAlerts,
  computeGlobalKPIs,
} from '../utils/financialCalculations';
import { formatCurrency } from '../utils/formatters';

interface RestructurePayload {
  nombre_trimestres: number;
  nouveau_taux_interet: number;
  penalites_retard?: number;
  motif: string;
  date_debut?: string;
}

interface FinanceContextType {
  structures: Structure[];
  decaissements: Decaissement[];
  schedules: EcheancierTrimestriel[];
  engagements: Engagement[];
  kpis: FinancialKPIs;
  alerts: AlertItem[];
  urgentAlertsCount: number;
  activeView: string;
  setActiveView: (view: string) => void;
  selectedStructureId: string | null;
  setSelectedStructureId: (id: string | null) => void;

  // Sidebar Adaptive States
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebarOpen: () => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebarCollapsed: () => void;

  // Audit Logs
  auditLogs: AuditLogEntry[];
  addAuditLog: (entry: {
    action_type: AuditActionType;
    target_entity: 'STRUCTURE' | 'DECAISSEMENT' | 'ENGAGEMENT' | 'AUTH' | 'BACKUP' | 'SYSTEM';
    target_id?: string;
    target_label?: string;
    details: string;
    severity?: AuditSeverity;
  }) => void;
  clearAuditLogs: () => void;

  // Actions
  addStructure: (data: Omit<Structure, 'id' | 'created_at'>) => Structure;
  updateStructure: (id: string, data: Partial<Structure>) => void;
  deleteStructure: (id: string) => boolean;

  addDecaissement: (data: {
    structure_id: string;
    reference_unique?: string;
    montant_principal: number;
    taux_interet: number;
    date_decaissement: string;
    notes?: string;
  }) => Decaissement;
  updateDecaissement: (id: string, data: Partial<Decaissement>) => void;
  deleteDecaissement: (id: string) => void;

  addEngagement: (data: {
    decaissement_id: string;
    echeancier_id?: string;
    montant_verse: number;
    date_paiement: string;
    mode_reglement?: 'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'ESPECES';
    reference_recu?: string;
    notes?: string;
  }) => Engagement;
  updateEngagement: (id: string, data: Partial<Engagement>) => void;
  deleteEngagement: (id: string) => void;

  // Restructuration
  restructureDecaissement: (
    decaissementId: string,
    payload: RestructurePayload
  ) => { success: boolean; error?: string; avenant?: AvenantRestructuration };

  // Bulk Imports
  bulkImportStructures: (
    newStructures: Array<Omit<Structure, 'id' | 'created_at'>>
  ) => { count: number };
  bulkImportEngagements: (
    newEngagements: Array<{
      decaissement_id: string;
      montant_verse: number;
      date_paiement: string;
      mode_reglement?: 'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'ESPECES';
      reference_recu?: string;
      notes?: string;
    }>
  ) => { count: number };

  // Snapshot Restoration
  restoreFullSnapshot: (snapshotData: {
    structures: Structure[];
    decaissements: Decaissement[];
    schedules: EcheancierTrimestriel[];
    engagements: Engagement[];
  }) => { success: boolean; error?: string };
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const STORAGE_STRUCTURES = 'gesfin_structures_db';
const STORAGE_DECAISSEMENTS = 'gesfin_decaissements_db';
const STORAGE_ECHEANCIERS = 'gesfin_echeanciers_db';
const STORAGE_ENGAGEMENTS = 'gesfin_engagements_db';
const STORAGE_AUDIT_LOGS = 'gesfin_audit_logs_db';

function getCurrentAdminSession() {
  try {
    const raw = localStorage.getItem('gesfin_current_user_session');
    if (raw) {
      const u = JSON.parse(raw);
      return {
        email: u.email || 'admin@finantrim.fr',
        nom: u.nom || 'Administrateur Principal',
        role: u.role || 'ADMIN',
      };
    }
  } catch {}
  return {
    email: 'admin@finantrim.fr',
    nom: 'Administrateur Principal',
    role: 'ADMIN',
  };
}

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [structures, setStructures] = useState<Structure[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STRUCTURES);
      if (!saved) return INITIAL_STRUCTURES;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_STRUCTURES;
    } catch {
      return INITIAL_STRUCTURES;
    }
  });

  const [decaissements, setDecaissements] = useState<Decaissement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DECAISSEMENTS);
      if (!saved) return INITIAL_DECAISSEMENTS;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_DECAISSEMENTS;
    } catch {
      return INITIAL_DECAISSEMENTS;
    }
  });

  const [schedules, setSchedules] = useState<EcheancierTrimestriel[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ECHEANCIERS);
      if (!saved) return INITIAL_ECHEANCIERS;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_ECHEANCIERS;
    } catch {
      return INITIAL_ECHEANCIERS;
    }
  });

  const [engagements, setEngagements] = useState<Engagement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ENGAGEMENTS);
      if (!saved) return INITIAL_ENGAGEMENTS;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_ENGAGEMENTS;
    } catch {
      return INITIAL_ENGAGEMENTS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_AUDIT_LOGS);
      if (!saved) return INITIAL_AUDIT_LOGS;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  const [activeView, setActiveView] = useState<string>('dashboard');
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);

  // Sidebar Adaptive States
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('gesfin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarOpen = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('gesfin_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Close mobile sidebar automatically on view change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [activeView, selectedStructureId]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_STRUCTURES, JSON.stringify(structures));
  }, [structures]);

  useEffect(() => {
    localStorage.setItem(STORAGE_DECAISSEMENTS, JSON.stringify(decaissements));
  }, [decaissements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_ECHEANCIERS, JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_ENGAGEMENTS, JSON.stringify(engagements));
  }, [engagements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_AUDIT_LOGS, JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Recalculate schedules whenever engagements change
  const currentSchedules = React.useMemo(() => {
    return recalculateSchedules(schedules, engagements);
  }, [schedules, engagements]);

  // Computed KPIs & Alerts
  const kpis = React.useMemo(() => {
    return computeGlobalKPIs(structures, decaissements, engagements);
  }, [structures, decaissements, engagements]);

  const alerts = React.useMemo(() => {
    return generateAlerts(structures, decaissements, currentSchedules);
  }, [structures, decaissements, currentSchedules]);

  const urgentAlertsCount = alerts.filter((a) => a.severity === 'RED' || a.severity === 'ORANGE').length;

  // Helper for adding Audit Log
  const addAuditLog = (entry: {
    action_type: AuditActionType;
    target_entity: 'STRUCTURE' | 'DECAISSEMENT' | 'ENGAGEMENT' | 'AUTH' | 'BACKUP' | 'SYSTEM';
    target_id?: string;
    target_label?: string;
    details: string;
    severity?: AuditSeverity;
  }) => {
    const admin = getCurrentAdminSession();
    const newLog: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      user_email: admin.email,
      user_nom: admin.nom,
      user_role: admin.role,
      action_type: entry.action_type,
      target_entity: entry.target_entity,
      target_id: entry.target_id,
      target_label: entry.target_label,
      details: entry.details,
      severity: entry.severity || 'INFO',
      ip_address: '127.0.0.1 (Local Session)',
    };

    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const clearAuditLogs = () => {
    const admin = getCurrentAdminSession();
    const resetLog: AuditLogEntry = {
      id: `audit-reset-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user_email: admin.email,
      user_nom: admin.nom,
      user_role: admin.role,
      action_type: 'UPDATE_ADMIN_CREDENTIALS',
      target_entity: 'SYSTEM',
      target_label: 'Journal d\'Audit',
      details: 'Réinitialisation de l\'historique du journal d\'audit par l\'administrateur.',
      severity: 'WARNING',
      ip_address: '127.0.0.1',
    };
    setAuditLogs([resetLog]);
  };

  // --- ACTIONS ---

  const addStructure = (data: Omit<Structure, 'id' | 'created_at'>): Structure => {
    const newStruct: Structure = {
      ...data,
      id: `struct-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString(),
    };
    setStructures((prev) => [newStruct, ...prev]);

    addAuditLog({
      action_type: 'CREATE_STRUCTURE',
      target_entity: 'STRUCTURE',
      target_id: newStruct.id,
      target_label: newStruct.raison_sociale,
      details: `Création du dossier emprunteur « ${newStruct.raison_sociale} » (Contact : ${newStruct.contact_nom}, Tél : ${newStruct.telephone}).`,
      severity: 'INFO',
    });

    return newStruct;
  };

  const updateStructure = (id: string, data: Partial<Structure>) => {
    const current = structures.find((s) => s.id === id);
    setStructures((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));

    addAuditLog({
      action_type: 'UPDATE_STRUCTURE',
      target_entity: 'STRUCTURE',
      target_id: id,
      target_label: data.raison_sociale || current?.raison_sociale || 'Structure',
      details: `Modification des informations de la structure « ${data.raison_sociale || current?.raison_sociale || id} ».`,
      severity: 'INFO',
    });
  };

  const deleteStructure = (id: string): boolean => {
    const struct = structures.find((s) => s.id === id);
    const structDecs = decaissements.filter((d) => d.structure_id === id);
    const decIds = new Set(structDecs.map((d) => d.id));

    if (decIds.size > 0) {
      setEngagements((prev) => prev.filter((e) => !decIds.has(e.decaissement_id)));
      setSchedules((prev) => prev.filter((s) => !decIds.has(s.decaissement_id)));
      setDecaissements((prev) => prev.filter((d) => d.structure_id !== id));
    }

    setStructures((prev) => prev.filter((s) => s.id !== id));

    if (selectedStructureId === id) {
      setSelectedStructureId(null);
    }

    addAuditLog({
      action_type: 'DELETE_STRUCTURE',
      target_entity: 'STRUCTURE',
      target_id: id,
      target_label: struct?.raison_sociale || id,
      details: `Suppression définitive du dossier « ${struct?.raison_sociale || id} » (${structDecs.length} prêts associés supprimés).`,
      severity: 'CRITICAL',
    });

    return true;
  };

  const addDecaissement = (data: {
    structure_id: string;
    reference_unique?: string;
    montant_principal: number;
    taux_interet: number;
    date_decaissement: string;
    notes?: string;
  }): Decaissement => {
    const decId = `dec-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const totalToRepay = calculateTotalToRepay(data.montant_principal, data.taux_interet);
    const ref =
      data.reference_unique?.trim() ||
      `DEC-${new Date().getFullYear()}-${String(decaissements.length + 1).padStart(3, '0')}`;

    const newDec: Decaissement = {
      id: decId,
      structure_id: data.structure_id,
      reference_unique: ref,
      montant_principal: Number(data.montant_principal),
      taux_interet: Number(data.taux_interet),
      montant_total_a_rembourser: totalToRepay,
      date_decaissement: data.date_decaissement || new Date().toISOString(),
      notes: data.notes || '',
      statut: 'ACTIF',
      created_at: new Date().toISOString(),
      avenants: [],
    };

    const newSchedules = generateQuarterlySchedule(decId, totalToRepay, newDec.date_decaissement);

    setDecaissements((prev) => [newDec, ...prev]);
    setSchedules((prev) => [...prev, ...newSchedules]);

    const struct = structures.find((s) => s.id === data.structure_id);
    addAuditLog({
      action_type: 'CREATE_DECAISSEMENT',
      target_entity: 'DECAISSEMENT',
      target_id: decId,
      target_label: `${struct?.raison_sociale || 'Structure'} (${ref})`,
      details: `Octroi d'un prêt de ${formatCurrency(data.montant_principal)} (Taux : ${data.taux_interet} %, Total : ${formatCurrency(totalToRepay)}). Échéancier généré sur 4 trimestres.`,
      severity: 'INFO',
    });

    return newDec;
  };

  const updateDecaissement = (id: string, data: Partial<Decaissement>) => {
    let updatedTotal: number | undefined;

    setDecaissements((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const p = data.montant_principal !== undefined ? Number(data.montant_principal) : d.montant_principal;
        const r = data.taux_interet !== undefined ? Number(data.taux_interet) : d.taux_interet;
        const newTotal = calculateTotalToRepay(p, r);
        updatedTotal = newTotal;

        const decEngs = engagements.filter((e) => e.decaissement_id === id);
        const totalPaid = decEngs.reduce((sum, e) => sum + e.montant_verse, 0);
        const newStatut = totalPaid >= newTotal - 0.01 ? 'CLOTURE' : 'ACTIF';

        return {
          ...d,
          ...data,
          montant_principal: p,
          taux_interet: r,
          montant_total_a_rembourser: newTotal,
          statut: data.statut || newStatut,
        };
      })
    );

    if (
      data.montant_principal !== undefined ||
      data.taux_interet !== undefined ||
      data.date_decaissement !== undefined
    ) {
      setSchedules((prev) => {
        const targetSchedules = prev.filter((s) => s.decaissement_id === id);
        if (targetSchedules.length === 0) return prev;

        const targetDec = decaissements.find((d) => d.id === id);
        const finalTotal = updatedTotal ?? (targetDec ? targetDec.montant_total_a_rembourser : 0);

        const count = targetSchedules.length;
        const portion = Number((finalTotal / count).toFixed(2));
        const lastPortion = Number((finalTotal - portion * (count - 1)).toFixed(2));

        return prev.map((s) => {
          if (s.decaissement_id !== id) return s;
          const idx = targetSchedules.findIndex((ts) => ts.id === s.id);
          const amt = idx === count - 1 ? lastPortion : portion;
          return {
            ...s,
            montant_prevu: amt,
          };
        });
      });
    }

    const currentDec = decaissements.find((d) => d.id === id);
    const struct = structures.find((s) => s.id === currentDec?.structure_id);
    addAuditLog({
      action_type: 'UPDATE_DECAISSEMENT',
      target_entity: 'DECAISSEMENT',
      target_id: id,
      target_label: `${struct?.raison_sociale || 'Structure'} (${currentDec?.reference_unique || id})`,
      details: `Modification des paramètres financiers du prêt ${currentDec?.reference_unique || id}.`,
      severity: 'WARNING',
    });
  };

  const deleteDecaissement = (id: string) => {
    const targetDec = decaissements.find((d) => d.id === id);
    const struct = structures.find((s) => s.id === targetDec?.structure_id);

    setEngagements((prev) => prev.filter((e) => e.decaissement_id !== id));
    setSchedules((prev) => prev.filter((s) => s.decaissement_id !== id));
    setDecaissements((prev) => prev.filter((d) => d.id !== id));

    addAuditLog({
      action_type: 'DELETE_DECAISSEMENT',
      target_entity: 'DECAISSEMENT',
      target_id: id,
      target_label: `${struct?.raison_sociale || 'Structure'} (${targetDec?.reference_unique || id})`,
      details: `Suppression définitive du prêt ${targetDec?.reference_unique || id} et de tous ses remboursements associés.`,
      severity: 'CRITICAL',
    });
  };

  const addEngagement = (data: {
    decaissement_id: string;
    echeancier_id?: string;
    montant_verse: number;
    date_paiement: string;
    mode_reglement?: 'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'ESPECES';
    reference_recu?: string;
    notes?: string;
  }): Engagement => {
    const engId = `eng-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const targetDec = decaissements.find((d) => d.id === data.decaissement_id);
    const prevEngs = engagements.filter((e) => e.decaissement_id === data.decaissement_id);
    const totalPaidBefore = prevEngs.reduce((sum, e) => sum + e.montant_verse, 0);
    const totalDue = targetDec ? targetDec.montant_total_a_rembourser : 0;
    const newTotalPaid = totalPaidBefore + Number(data.montant_verse);
    const resteAEngager = Math.max(0, Number((totalDue - newTotalPaid).toFixed(2)));

    const newEng: Engagement = {
      id: engId,
      decaissement_id: data.decaissement_id,
      echeancier_id: data.echeancier_id,
      montant_verse: Number(data.montant_verse),
      date_paiement: data.date_paiement || new Date().toISOString(),
      reste_a_engager: resteAEngager,
      mode_reglement: data.mode_reglement || 'VIREMENT',
      reference_recu: data.reference_recu,
      notes: data.notes,
    };

    setEngagements((prev) => [newEng, ...prev]);

    if (resteAEngager <= 0.01 && targetDec) {
      setDecaissements((prev) =>
        prev.map((d) => (d.id === data.decaissement_id ? { ...d, statut: 'CLOTURE' } : d))
      );
    }

    const struct = structures.find((s) => s.id === targetDec?.structure_id);
    addAuditLog({
      action_type: 'CREATE_ENGAGEMENT',
      target_entity: 'ENGAGEMENT',
      target_id: engId,
      target_label: `${struct?.raison_sociale || 'Structure'} (${targetDec?.reference_unique || ''})`,
      details: `Enregistrement d'un versement de ${formatCurrency(data.montant_verse)} (Mode : ${data.mode_reglement || 'VIREMENT'}, Réf : ${data.reference_recu || 'N/A'}). Solde restant : ${formatCurrency(resteAEngager)}.`,
      severity: 'INFO',
    });

    return newEng;
  };

  const updateEngagement = (id: string, data: Partial<Engagement>) => {
    setEngagements((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, ...data } : e));
      const targetEng = updated.find((e) => e.id === id);
      if (!targetEng) return updated;

      const decId = targetEng.decaissement_id;
      const targetDec = decaissements.find((d) => d.id === decId);
      const decEngs = updated.filter((e) => e.decaissement_id === decId);
      const totalPaid = decEngs.reduce((sum, e) => sum + e.montant_verse, 0);
      const totalDue = targetDec ? targetDec.montant_total_a_rembourser : 0;

      if (targetDec) {
        const isCloture = totalPaid >= totalDue - 0.01;
        setDecaissements((prevDecs) =>
          prevDecs.map((d) => (d.id === decId ? { ...d, statut: isCloture ? 'CLOTURE' : 'ACTIF' } : d))
        );
      }

      return updated;
    });

    const eng = engagements.find((e) => e.id === id);
    const targetDec = decaissements.find((d) => d.id === eng?.decaissement_id);
    addAuditLog({
      action_type: 'UPDATE_ENGAGEMENT',
      target_entity: 'ENGAGEMENT',
      target_id: id,
      target_label: `Versement ${id} (${targetDec?.reference_unique || ''})`,
      details: `Modification des données de l'engagement de remboursement ${id}.`,
      severity: 'WARNING',
    });
  };

  const deleteEngagement = (id: string) => {
    const targetEng = engagements.find((e) => e.id === id);
    if (!targetEng) return;

    const decId = targetEng.decaissement_id;
    const targetDec = decaissements.find((d) => d.id === decId);

    setEngagements((prev) => {
      const filtered = prev.filter((e) => e.id !== id);
      const decEngs = filtered.filter((e) => e.decaissement_id === decId);
      const totalPaid = decEngs.reduce((sum, e) => sum + e.montant_verse, 0);
      const totalDue = targetDec ? targetDec.montant_total_a_rembourser : 0;

      if (targetDec && totalPaid < totalDue - 0.01) {
        setDecaissements((prevDecs) =>
          prevDecs.map((d) => (d.id === decId ? { ...d, statut: 'ACTIF' } : d))
        );
      }
      return filtered;
    });

    const struct = structures.find((s) => s.id === targetDec?.structure_id);
    addAuditLog({
      action_type: 'DELETE_ENGAGEMENT',
      target_entity: 'ENGAGEMENT',
      target_id: id,
      target_label: `${struct?.raison_sociale || 'Structure'} (${targetDec?.reference_unique || ''})`,
      details: `Suppression du versement de ${formatCurrency(targetEng.montant_verse)} (Réf : ${targetEng.reference_recu || id}).`,
      severity: 'CRITICAL',
    });
  };

  // --- RESTRUCTURATION ---
  const restructureDecaissement = (
    decaissementId: string,
    payload: RestructurePayload
  ): { success: boolean; error?: string; avenant?: AvenantRestructuration } => {
    const dec = decaissements.find((d) => d.id === decaissementId);
    if (!dec) return { success: false, error: 'Décaissement introuvable' };

    const decEngs = engagements.filter((e) => e.decaissement_id === decaissementId);
    const totalPaid = decEngs.reduce((sum, e) => sum + e.montant_verse, 0);
    const soldeInitialRestant = Math.max(0, dec.montant_total_a_rembourser - totalPaid);

    if (soldeInitialRestant <= 0.01) {
      return { success: false, error: 'Ce prêt est déjà intégralement remboursé.' };
    }

    const rate = Math.max(0, payload.nouveau_taux_interet);
    const penalites = Math.max(0, payload.penalites_retard || 0);
    const soldeAvecPenalite = soldeInitialRestant + penalites;
    const nouveauMontantTotalSurSolde = calculateTotalToRepay(soldeAvecPenalite, rate);
    const nouveauMontantTotalGlobal = Number((totalPaid + nouveauMontantTotalSurSolde).toFixed(2));

    const nextAvenantNumber = (dec.avenants?.length || 0) + 1;
    const avenantId = `av-${decaissementId}-${nextAvenantNumber}-${Date.now()}`;

    const admin = getCurrentAdminSession();

    const avenant: AvenantRestructuration = {
      id: avenantId,
      decaissement_id: decaissementId,
      numero_avenant: nextAvenantNumber,
      date_avenant: new Date().toISOString(),
      solde_restructure: soldeInitialRestant,
      nouveau_taux_interet: rate,
      penalites_retard: penalites,
      nouveau_montant_total: nouveauMontantTotalGlobal,
      nombre_trimestres: payload.nombre_trimestres,
      motif: payload.motif,
      created_by: admin.nom,
    };

    const startDate = payload.date_debut || new Date().toISOString();
    const newSchedules = generateCustomQuarterlySchedule(
      decaissementId,
      nouveauMontantTotalSurSolde,
      startDate,
      payload.nombre_trimestres
    );

    // Update Decaissement
    setDecaissements((prev) =>
      prev.map((d) => {
        if (d.id !== decaissementId) return d;
        const prevAvenants = d.avenants || [];
        return {
          ...d,
          montant_total_a_rembourser: nouveauMontantTotalGlobal,
          taux_interet: rate,
          notes: `${d.notes ? d.notes + '\n' : ''}[AVENANT N°${nextAvenantNumber} du ${new Date().toLocaleDateString('fr-FR')}]: Rééchelonnement sur ${payload.nombre_trimestres} trimestres. Motif: ${payload.motif}`,
          statut: 'ACTIF',
          avenants: [...prevAvenants, avenant],
        };
      })
    );

    // Replace unpaid schedules with the newly restructured schedules
    setSchedules((prev) => {
      const otherLoansSchedules = prev.filter((s) => s.decaissement_id !== decaissementId);
      return [...otherLoansSchedules, ...newSchedules];
    });

    const struct = structures.find((s) => s.id === dec.structure_id);
    addAuditLog({
      action_type: 'RESTRUCTURE_LOAN',
      target_entity: 'DECAISSEMENT',
      target_id: decaissementId,
      target_label: `${struct?.raison_sociale || 'Structure'} (${dec.reference_unique})`,
      details: `Signature Avenant N°${nextAvenantNumber} : rééchelonnement du solde de ${formatCurrency(soldeInitialRestant)} sur ${payload.nombre_trimestres} trimestres (Taux : ${rate} %, Pénalités : ${formatCurrency(penalites)}). Motif : ${payload.motif}.`,
      severity: 'WARNING',
    });

    return { success: true, avenant };
  };

  // --- BULK IMPORTS ---
  const bulkImportStructures = (
    newStructures: Array<Omit<Structure, 'id' | 'created_at'>>
  ): { count: number } => {
    const formatted: Structure[] = newStructures.map((s, idx) => ({
      ...s,
      id: `struct-imp-${Date.now()}-${idx}`,
      created_at: new Date().toISOString(),
    }));

    setStructures((prev) => [...formatted, ...prev]);

    addAuditLog({
      action_type: 'BULK_IMPORT',
      target_entity: 'STRUCTURE',
      target_label: 'Import en Masse Structures',
      details: `Importation groupée réussie de ${formatted.length} structures emprunteurs via fichier de données.`,
      severity: 'INFO',
    });

    return { count: formatted.length };
  };

  const bulkImportEngagements = (
    newEngagements: Array<{
      decaissement_id: string;
      montant_verse: number;
      date_paiement: string;
      mode_reglement?: 'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'ESPECES';
      reference_recu?: string;
      notes?: string;
    }>
  ): { count: number } => {
    let importedCount = 0;
    const createdEngs: Engagement[] = [];

    newEngagements.forEach((data, idx) => {
      const targetDec = decaissements.find((d) => d.id === data.decaissement_id);
      const prevEngs = [...engagements, ...createdEngs].filter(
        (e) => e.decaissement_id === data.decaissement_id
      );
      const totalPaid = prevEngs.reduce((sum, e) => sum + e.montant_verse, 0);
      const totalDue = targetDec ? targetDec.montant_total_a_rembourser : 0;
      const reste = Math.max(0, Number((totalDue - (totalPaid + Number(data.montant_verse))).toFixed(2)));

      const eng: Engagement = {
        id: `eng-imp-${Date.now()}-${idx}`,
        decaissement_id: data.decaissement_id,
        montant_verse: Number(data.montant_verse),
        date_paiement: data.date_paiement || new Date().toISOString(),
        reste_a_engager: reste,
        mode_reglement: data.mode_reglement || 'VIREMENT',
        reference_recu: data.reference_recu,
        notes: data.notes,
      };

      createdEngs.push(eng);
      importedCount++;
    });

    setEngagements((prev) => [...createdEngs, ...prev]);

    addAuditLog({
      action_type: 'BULK_IMPORT',
      target_entity: 'ENGAGEMENT',
      target_label: 'Import en Masse Règlements',
      details: `Importation groupée réussie de ${importedCount} versements financiers dans le grand livre.`,
      severity: 'INFO',
    });

    return { count: importedCount };
  };

  // --- SNAPSHOT RESTORATION ---
  const restoreFullSnapshot = (snapshotData: {
    structures: Structure[];
    decaissements: Decaissement[];
    schedules: EcheancierTrimestriel[];
    engagements: Engagement[];
  }): { success: boolean; error?: string } => {
    try {
      if (!Array.isArray(snapshotData.structures)) {
        return { success: false, error: 'Snapshot incomplet ou format invalide.' };
      }

      setStructures(snapshotData.structures);
      setDecaissements(snapshotData.decaissements || []);
      setSchedules(snapshotData.schedules || []);
      setEngagements(snapshotData.engagements || []);

      addAuditLog({
        action_type: 'RESTORE_SNAPSHOT',
        target_entity: 'BACKUP',
        target_label: 'Snapshot Global Portefeuille',
        details: `Restauration complète effectuée : ${snapshotData.structures.length} structures, ${snapshotData.decaissements?.length || 0} prêts et ${snapshotData.engagements?.length || 0} versements rechargés.`,
        severity: 'CRITICAL',
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erreur lors de la restauration du snapshot.' };
    }
  };

  return (
    <FinanceContext.Provider
      value={{
        structures,
        decaissements,
        schedules: currentSchedules,
        engagements,
        kpis,
        alerts,
        urgentAlertsCount,
        activeView,
        setActiveView,
        selectedStructureId,
        setSelectedStructureId,
        isSidebarOpen,
        setIsSidebarOpen,
        toggleSidebarOpen,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebarCollapsed,
        auditLogs,
        addAuditLog,
        clearAuditLogs,
        addStructure,
        updateStructure,
        deleteStructure,
        addDecaissement,
        updateDecaissement,
        deleteDecaissement,
        addEngagement,
        updateEngagement,
        deleteEngagement,
        restructureDecaissement,
        bulkImportStructures,
        bulkImportEngagements,
        restoreFullSnapshot,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
