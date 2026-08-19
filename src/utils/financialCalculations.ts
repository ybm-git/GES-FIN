import {
  Decaissement,
  EcheancierTrimestriel,
  Engagement,
  TrimestreCode,
  EcheancierStatut,
  AlertItem,
  Structure,
  FinancialKPIs,
  SolvencyScore,
} from '../types';
import { getDaysDifference, formatCurrency } from './formatters';

/**
 * Calcul du montant total à rembourser
 * Formule : Principal * (1 + Taux / 100)
 */
export function calculateTotalToRepay(principal: number, interestRate: number): number {
  if (principal <= 0) return 0;
  const rate = Math.max(0, interestRate);
  return Number((principal * (1 + rate / 100)).toFixed(2));
}

/**
 * Génération automatique d'un échéancier sur 4 trimestres consécutifs
 * à partir de la date du décaissement.
 */
export function generateQuarterlySchedule(
  decaissementId: string,
  totalAmount: number,
  disbursementDateStr: string
): EcheancierTrimestriel[] {
  return generateCustomQuarterlySchedule(decaissementId, totalAmount, disbursementDateStr, 4);
}

/**
 * Génération d'un échéancier trimestriel sur N trimestres consécutifs
 * (utilisé pour les créations standard et les restructurations)
 */
export function generateCustomQuarterlySchedule(
  decaissementId: string,
  totalAmount: number,
  startDateStr: string,
  quarterCount: number = 4
): EcheancierTrimestriel[] {
  const dDate = new Date(startDateStr);
  const startYear = isNaN(dDate.getTime()) ? new Date().getFullYear() : dDate.getFullYear();
  const startMonth = isNaN(dDate.getTime()) ? new Date().getMonth() : dDate.getMonth(); // 0-indexed

  const count = Math.max(1, quarterCount);
  let currentQuarterIndex = Math.floor(startMonth / 3);
  let currentYear = startYear;

  const quarters: TrimestreCode[] = ['T1', 'T2', 'T3', 'T4'];
  const quarterEndDates = [
    { month: 2, day: 31, code: 'T1' as TrimestreCode }, // March 31
    { month: 5, day: 30, code: 'T2' as TrimestreCode }, // June 30
    { month: 8, day: 30, code: 'T3' as TrimestreCode }, // Sept 30
    { month: 11, day: 31, code: 'T4' as TrimestreCode }, // Dec 31
  ];

  const portion = Number((totalAmount / count).toFixed(2));
  const lastPortion = Number((totalAmount - portion * (count - 1)).toFixed(2));

  const schedule: EcheancierTrimestriel[] = [];

  for (let i = 0; i < count; i++) {
    const qCode = quarters[currentQuarterIndex];
    const qInfo = quarterEndDates[currentQuarterIndex];

    const monthStr = String(qInfo.month + 1).padStart(2, '0');
    const dayStr = String(qInfo.day).padStart(2, '0');
    const dateLimiteStr = `${currentYear}-${monthStr}-${dayStr}`;

    const amountForThisQuarter = i === count - 1 ? lastPortion : portion;

    schedule.push({
      id: `ech-${decaissementId}-${currentYear}-${qCode}-${i + 1}`,
      decaissement_id: decaissementId,
      annee: currentYear,
      trimestre: qCode,
      date_limite: dateLimiteStr,
      montant_prevu: amountForThisQuarter,
      montant_paye: 0,
      statut: 'EN_ATTENTE',
    });

    currentQuarterIndex++;
    if (currentQuarterIndex > 3) {
      currentQuarterIndex = 0;
      currentYear++;
    }
  }

  return schedule;
}

/**
 * Recalcul des montants payés et des statuts des échéanciers
 * en fonction des engagements enregistrés pour un décaissement
 */
export function recalculateSchedules(
  schedules: EcheancierTrimestriel[],
  engagements: Engagement[]
): EcheancierTrimestriel[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Group schedules by decaissement_id
  const schedulesByDecaissement = new Map<string, EcheancierTrimestriel[]>();
  for (const ech of schedules) {
    const list = schedulesByDecaissement.get(ech.decaissement_id) || [];
    list.push(ech);
    schedulesByDecaissement.set(ech.decaissement_id, list);
  }

  // Group engagements by decaissement_id
  const engagementsByDecaissement = new Map<string, Engagement[]>();
  for (const eng of engagements) {
    const list = engagementsByDecaissement.get(eng.decaissement_id) || [];
    list.push(eng);
    engagementsByDecaissement.set(eng.decaissement_id, list);
  }

  const updatedSchedules: EcheancierTrimestriel[] = [];

  // Process each decaissement independently to avoid cross-loan or multi-quarter over-validation
  for (const [decId, decSchedules] of schedulesByDecaissement.entries()) {
    // Sort schedules chronologically by date_limite
    const sortedDecSchedules = [...decSchedules].sort(
      (a, b) => new Date(a.date_limite).getTime() - new Date(b.date_limite).getTime()
    );

    const decEngagements = engagementsByDecaissement.get(decId) || [];
    // Sort engagements chronologically by date_paiement
    const sortedEngagements = [...decEngagements].sort(
      (a, b) => new Date(a.date_paiement).getTime() - new Date(b.date_paiement).getTime()
    );

    // Track remaining balance needed for each schedule and total paid amount allocated
    const balanceNeeded = new Map<string, number>();
    const paidAmount = new Map<string, number>();

    for (const ech of sortedDecSchedules) {
      balanceNeeded.set(ech.id, ech.montant_prevu);
      paidAmount.set(ech.id, 0);
    }

    // Step 1: Apply engagements targeted to a specific echeancier_id
    const unallocatedEngagements: Engagement[] = [];

    for (const eng of sortedEngagements) {
      if (eng.echeancier_id && balanceNeeded.has(eng.echeancier_id)) {
        const echId = eng.echeancier_id;
        const currentNeeded = balanceNeeded.get(echId)!;
        const allocated = Math.min(eng.montant_verse, currentNeeded);

        paidAmount.set(echId, Number(((paidAmount.get(echId) || 0) + allocated).toFixed(2)));
        balanceNeeded.set(echId, Number(Math.max(0, currentNeeded - allocated).toFixed(2)));

        const surplus = Number((eng.montant_verse - allocated).toFixed(2));
        if (surplus > 0.001) {
          // surplus flows into general waterfall
          unallocatedEngagements.push({
            ...eng,
            montant_verse: surplus,
            echeancier_id: undefined,
          });
        }
      } else {
        unallocatedEngagements.push(eng);
      }
    }

    // Step 2: Waterfall any general/unallocated payments chronologically to unpaid schedules
    for (const eng of unallocatedEngagements) {
      let remToPay = eng.montant_verse;

      for (const ech of sortedDecSchedules) {
        if (remToPay <= 0.001) break;

        const needed = balanceNeeded.get(ech.id) || 0;
        if (needed > 0.001) {
          const alloc = Math.min(remToPay, needed);
          paidAmount.set(ech.id, Number(((paidAmount.get(ech.id) || 0) + alloc).toFixed(2)));
          balanceNeeded.set(ech.id, Number(Math.max(0, needed - alloc).toFixed(2)));
          remToPay = Number((remToPay - alloc).toFixed(2));
        }
      }
    }

    // Step 3: Compute final status for each schedule
    for (const ech of sortedDecSchedules) {
      const finalPaid = Number((paidAmount.get(ech.id) || 0).toFixed(2));
      const soldeRestant = Number((ech.montant_prevu - finalPaid).toFixed(2));
      const targetDate = new Date(ech.date_limite);
      targetDate.setHours(0, 0, 0, 0);

      let statut: EcheancierStatut = 'EN_ATTENTE';
      if (soldeRestant <= 0.01) {
        statut = 'SOLDE';
      } else if (targetDate < today) {
        statut = 'EN_RETARD';
      } else {
        statut = 'EN_ATTENTE';
      }

      updatedSchedules.push({
        ...ech,
        montant_paye: finalPaid,
        statut,
      });
    }
  }

  // Preserve initial order of schedules
  const updatedMap = new Map(updatedSchedules.map((s) => [s.id, s]));
  return schedules.map((s) => updatedMap.get(s.id) || s);
}

/**
 * Calcul des alertes d'échéances
 * - Vert (GREEN) : Échéance réglée
 * - Orange (ORANGE) : Échéance à venir dans les 15 jours
 * - Rouge (RED) : Échéance dépassée avec solde restant
 */
export function generateAlerts(
  structures: Structure[],
  decaissements: Decaissement[],
  schedules: EcheancierTrimestriel[]
): AlertItem[] {
  const structureMap = new Map(structures.map((s) => [s.id, s.raison_sociale]));
  const decaissementMap = new Map(decaissements.map((d) => [d.id, d]));

  const alerts: AlertItem[] = [];

  for (const ech of schedules) {
    const dec = decaissementMap.get(ech.decaissement_id);
    if (!dec) continue;

    const structNom = structureMap.get(dec.structure_id) || dec.reference_unique || '—';
    const joursRestants = getDaysDifference(ech.date_limite);
    const soldeRestant = Number((ech.montant_prevu - ech.montant_paye).toFixed(2));

    let severity: AlertItem['severity'] = 'GREEN';
    let message = '';

    if (ech.statut === 'SOLDE' || soldeRestant <= 0.01) {
      severity = 'GREEN';
      message = `Échéance ${ech.trimestre} ${ech.annee} entièrement réglée.`;
    } else if (joursRestants < 0) {
      severity = 'RED';
      message = `Échéance ${ech.trimestre} ${ech.annee} en retard de ${Math.abs(joursRestants)} jours (Reste dû : ${formatCurrency(soldeRestant)}).`;
    } else if (joursRestants <= 15) {
      severity = 'ORANGE';
      message = `Échéance ${ech.trimestre} ${ech.annee} arrive à expiration dans ${joursRestants} jours (${formatCurrency(soldeRestant)} à régler).`;
    } else {
      // Future normal expectation
      continue;
    }

    alerts.push({
      id: `alert-${ech.id}`,
      decaissement_id: ech.decaissement_id,
      echeancier_id: ech.id,
      structure_id: dec.structure_id,
      structure_nom: structNom,
      reference_decaissement: dec.reference_unique,
      trimestre: ech.trimestre,
      annee: ech.annee,
      date_limite: ech.date_limite,
      montant_prevu: ech.montant_prevu,
      montant_paye: ech.montant_paye,
      solde_restant: soldeRestant,
      jours_restants: joursRestants,
      severity,
      message,
    });
  }

  // Sort: Red first (most overdue), then Orange (closest due), then Green
  return alerts.sort((a, b) => {
    const priority = { RED: 0, ORANGE: 1, GREEN: 2 };
    if (priority[a.severity] !== priority[b.severity]) {
      return priority[a.severity] - priority[b.severity];
    }
    return a.jours_restants - b.jours_restants;
  });
}

/**
 * Calcul des KPI Globaux du Portefeuille
 */
export function computeGlobalKPIs(
  structures: Structure[],
  decaissements: Decaissement[],
  engagements: Engagement[]
): FinancialKPIs {
  const montantTotalDecaisse = decaissements.reduce((sum, d) => sum + d.montant_principal, 0);
  const montantTotalDu = decaissements.reduce((sum, d) => sum + d.montant_total_a_rembourser, 0);
  const interetsGeneres = Math.max(0, montantTotalDu - montantTotalDecaisse);
  const montantTotalRembourse = engagements.reduce((sum, e) => sum + e.montant_verse, 0);
  const resteARecouvrer = Math.max(0, montantTotalDu - montantTotalRembourse);

  // Active structures: has at least one active decaissement with balance > 0
  const structureWithBalance = new Set<string>();
  for (const d of decaissements) {
    const decEngs = engagements.filter((e) => e.decaissement_id === d.id);
    const paid = decEngs.reduce((s, e) => s + e.montant_verse, 0);
    if (d.montant_total_a_rembourser - paid > 0.01) {
      structureWithBalance.add(d.structure_id);
    }
  }

  const decaissementsActifsCount = decaissements.filter((d) => d.statut === 'ACTIF').length;
  const decaissementsCloturesCount = decaissements.filter((d) => d.statut === 'CLOTURE').length;
  const tauxRecouvrementGlobal = montantTotalDu > 0 ? (montantTotalRembourse / montantTotalDu) * 100 : 0;

  return {
    montantTotalDecaisse,
    interetsGeneres,
    montantTotalRembourse,
    resteARecouvrer,
    structuresActivesCount: structureWithBalance.size,
    totalStructuresCount: structures.length,
    tauxRecouvrementGlobal,
    decaissementsActifsCount,
    decaissementsCloturesCount,
  };
}

/**
 * Calcul du Score de Solvabilité et Analyse de Risque par Structure (0 à 100)
 */
export function calculateSolvencyScore(
  structureId: string,
  decaissements: Decaissement[],
  schedules: EcheancierTrimestriel[],
  engagements: Engagement[]
): SolvencyScore {
  const structDecs = decaissements.filter((d) => d.structure_id === structureId);
  if (structDecs.length === 0) {
    return {
      score: 100,
      grade: 'A+',
      riskLevel: 'LOW',
      ponctualiteScore: 40,
      recouvrementScore: 30,
      retardMoyenJours: 0,
      delaiScore: 20,
      regulariteScore: 10,
      totalEcheances: 0,
      echeancesEnRetard: 0,
      echeancesPayees: 0,
      recommendation: 'Aucun engagement antérieur. Profil vierge sans antécédent d’impayé.',
    };
  }

  const decIds = new Set(structDecs.map((d) => d.id));
  const structSchedules = schedules.filter((s) => decIds.has(s.decaissement_id));
  const structEngagements = engagements.filter((e) => decIds.has(e.decaissement_id));

  const totalDu = structDecs.reduce((sum, d) => sum + d.montant_total_a_rembourser, 0);
  const totalRembourse = structEngagements.reduce((sum, e) => sum + e.montant_verse, 0);

  // 1. Ponctualité (max 40 pts)
  let echeancesPayees = 0;
  let echeancesEnRetard = 0;
  let totalRetardDays = 0;
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (const ech of structSchedules) {
    const dueDate = new Date(ech.date_limite);
    dueDate.setHours(0, 0, 0, 0);
    const isOverdue = now > dueDate && ech.montant_paye < ech.montant_prevu - 0.01;
    if (ech.montant_paye >= ech.montant_prevu - 0.01) {
      echeancesPayees++;
    } else if (isOverdue) {
      echeancesEnRetard++;
      const days = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      totalRetardDays += Math.max(0, days);
    }
  }

  const totalEch = structSchedules.length;
  let ponctualiteScore = 40;
  if (totalEch > 0) {
    const onTimeRate = Math.max(0, totalEch - echeancesEnRetard) / totalEch;
    ponctualiteScore = Math.max(0, Math.round(onTimeRate * 40));
  }

  // 2. Taux de Recouvrement (max 30 pts)
  const recoveryRatio = totalDu > 0 ? Math.min(1, totalRembourse / totalDu) : 1;
  const recouvrementScore = Math.round(recoveryRatio * 30);

  // 3. Délai de Retard Moyen (max 20 pts)
  const retardMoyenJours = echeancesEnRetard > 0 ? Math.round(totalRetardDays / echeancesEnRetard) : 0;
  let delaiScore = 20;
  if (retardMoyenJours > 60) delaiScore = 0;
  else if (retardMoyenJours > 30) delaiScore = 5;
  else if (retardMoyenJours > 15) delaiScore = 10;
  else if (retardMoyenJours > 0) delaiScore = 15;

  // 4. Régularité & Antécédents (max 10 pts)
  const versementsCount = structEngagements.length;
  const regulariteScore = Math.min(10, Math.round((versementsCount / (totalEch || 1)) * 10));

  const totalScore = Math.min(100, Math.max(0, ponctualiteScore + recouvrementScore + delaiScore + regulariteScore));

  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'D';
  let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'CRITICAL';
  let recommendation = '';

  if (totalScore >= 90) {
    grade = 'A+';
    riskLevel = 'LOW';
    recommendation = 'Excellente solvabilité. Emprunteur de premier rang avec respect exemplaire des échéances.';
  } else if (totalScore >= 75) {
    grade = 'A';
    riskLevel = 'LOW';
    recommendation = 'Très bonne solvabilité. Respect régulier des engagements et faible exposition au risque.';
  } else if (totalScore >= 60) {
    grade = 'B';
    riskLevel = 'MODERATE';
    recommendation = 'Solvabilité convenable avec retards occasionnels modérés. Surveillance périodique recommandée.';
  } else if (totalScore >= 40) {
    grade = 'C';
    riskLevel = 'HIGH';
    recommendation = 'Risque élevé. Retards récurrents constatés. Prévoir un plan d’apurement ou une restructuration de créance.';
  } else {
    grade = 'D';
    riskLevel = 'CRITICAL';
    recommendation = 'Risque critique d’insolvabilité. Impayés majeurs. Procédure de mise en demeure et contentieux requise.';
  }

  return {
    score: totalScore,
    grade,
    riskLevel,
    ponctualiteScore,
    recouvrementScore,
    retardMoyenJours,
    delaiScore,
    regulariteScore,
    totalEcheances: totalEch,
    echeancesEnRetard,
    echeancesPayees,
    recommendation,
  };
}
