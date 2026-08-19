import * as XLSX from 'xlsx';
import { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx';
import { Structure, Decaissement, EcheancierTrimestriel, Engagement, FinancialKPIs } from '../types';
import { formatCurrency, formatDate, formatDateTime, formatPercent } from './formatters';

/**
 * 1. Export Excel (.xlsx) du Portefeuille Global
 */
export function exportPortfolioToExcel(
  structures: Structure[],
  decaissements: Decaissement[],
  schedules: EcheancierTrimestriel[],
  engagements: Engagement[],
  kpis: FinancialKPIs
) {
  const structureMap = new Map(structures.map((s) => [s.id, s]));
  const decaissementMap = new Map(decaissements.map((d) => [d.id, d]));

  // Sheet 1: Synthèse Globale
  const kpiData = [
    ['RAPPORT FINANCIER GLOBAL - GES-FIN', ''],
    ['Date d\'exportation', new Date().toLocaleDateString('fr-FR')],
    ['', ''],
    ['Indicateur Clé', 'Valeur'],
    ['Montant Total Principal Décaissé', formatCurrency(kpis.montantTotalDecaisse)],
    ['Intérêts Générés Totaux', formatCurrency(kpis.interetsGeneres)],
    ['Montant Total Dû (Principal + Intérêts)', formatCurrency(kpis.montantTotalDecaisse + kpis.interetsGeneres)],
    ['Montant Total Remboursé (Engagé)', formatCurrency(kpis.montantTotalRembourse)],
    ['Reste à Recouvrer Global', formatCurrency(kpis.resteARecouvrer)],
    ['Taux Global de Recouvrement', `${kpis.tauxRecouvrementGlobal.toFixed(2)} %`],
    ['Nombre de Structures Actives', kpis.structuresActivesCount],
    ['Nombre Total de Décaissements', decaissements.length],
    ['Décaissements Actifs', kpis.decaissementsActifsCount],
    ['Décaissements Clôturés', kpis.decaissementsCloturesCount],
  ];

  // Sheet 2: Liste des Décaissements
  const decaissementsRows = decaissements.map((d) => {
    const struct = structureMap.get(d.structure_id);
    const relatedEngs = engagements.filter((e) => e.decaissement_id === d.id);
    const totalRembourse = relatedEngs.reduce((sum, e) => sum + e.montant_verse, 0);
    const resteADevoir = Math.max(0, d.montant_total_a_rembourser - totalRembourse);
    const tauxRembourse = d.montant_total_a_rembourser > 0 ? (totalRembourse / d.montant_total_a_rembourser) * 100 : 0;

    return {
      'Référence Unique': d.reference_unique,
      'Structure (Emprunteur)': struct?.raison_sociale || '-',
      'Contact Nom': struct?.contact_nom || '-',
      'Téléphone': struct?.telephone || '-',
      'Date Décaissement': formatDate(d.date_decaissement),
      'Montant Principal (F CFA)': d.montant_principal,
      'Taux d\'Intérêt (%)': d.taux_interet,
      'Montant Total à Rembourser (F CFA)': d.montant_total_a_rembourser,
      'Total Remboursé (F CFA)': totalRembourse,
      'Solde Restant (F CFA)': resteADevoir,
      'Progression (%)': `${tauxRembourse.toFixed(1)}%`,
      'Statut': d.statut,
      'Notes': d.notes || '',
    };
  });

  // Sheet 3: Échéanciers Trimestriels
  const schedulesRows = schedules.map((ech) => {
    const dec = decaissementMap.get(ech.decaissement_id);
    const struct = dec ? structureMap.get(dec.structure_id) : undefined;
    const soldeRestant = Math.max(0, ech.montant_prevu - ech.montant_paye);

    return {
      'Référence Décaissement': dec?.reference_unique || '-',
      'Structure': struct?.raison_sociale || '-',
      'Exercice (Année)': ech.annee,
      'Trimestre': ech.trimestre,
      'Date Limite': formatDate(ech.date_limite),
      'Montant Prévu (F CFA)': ech.montant_prevu,
      'Montant Payé (F CFA)': ech.montant_paye,
      'Solde Restant (F CFA)': soldeRestant,
      'Statut Échéance': ech.statut,
    };
  });

  // Sheet 4: Historique des Engagements (Remboursements)
  const engagementsRows = engagements.map((eng) => {
    const dec = decaissementMap.get(eng.decaissement_id);
    const struct = dec ? structureMap.get(dec.structure_id) : undefined;

    return {
      'ID Engagement': eng.id,
      'Référence Décaissement': dec?.reference_unique || '-',
      'Structure': struct?.raison_sociale || '-',
      'Date Paiement': formatDateTime(eng.date_paiement),
      'Montant Versé (F CFA)': eng.montant_verse,
      'Reste à Engager Après Versement (F CFA)': eng.reste_a_engager,
      'Mode de Règlement': eng.mode_reglement || 'VIREMENT',
      'Référence Reçu': eng.reference_recu || '-',
      'Notes': eng.notes || '',
    };
  });

  const wb = XLSX.utils.book_new();

  const wsKpi = XLSX.utils.aoa_to_sheet(kpiData);
  const wsDec = XLSX.utils.json_to_sheet(decaissementsRows);
  const wsSch = XLSX.utils.json_to_sheet(schedulesRows);
  const wsEng = XLSX.utils.json_to_sheet(engagementsRows);

  XLSX.utils.book_append_sheet(wb, wsKpi, 'Synthèse KPI');
  XLSX.utils.book_append_sheet(wb, wsDec, 'Décaissements');
  XLSX.utils.book_append_sheet(wb, wsSch, 'Échéanciers Trimestriels');
  XLSX.utils.book_append_sheet(wb, wsEng, 'Engagements Remboursements');

  const fileName = `GES_FIN_Portefeuille_Complet_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 2. Export Excel (.xlsx) des Structures Actives avec leur état
 */
export function exportActiveStructuresToExcel(
  structures: Structure[],
  decaissements: Decaissement[],
  engagements: Engagement[]
) {
  const rows = structures.map((struct) => {
    const structDecs = decaissements.filter((d) => d.structure_id === struct.id);
    const totalPrincipal = structDecs.reduce((sum, d) => sum + d.montant_principal, 0);
    const totalDu = structDecs.reduce((sum, d) => sum + d.montant_total_a_rembourser, 0);

    const structEngs = engagements.filter((e) =>
      structDecs.some((d) => d.id === e.decaissement_id)
    );
    const totalRembourse = structEngs.reduce((sum, e) => sum + e.montant_verse, 0);
    const soldeRestant = Math.max(0, totalDu - totalRembourse);
    const tauxRembourse = totalDu > 0 ? (totalRembourse / totalDu) * 100 : 0;
    const decActifs = structDecs.filter((d) => d.statut === 'ACTIF').length;

    return {
      'Raison Sociale': struct.raison_sociale,
      'Contact': struct.contact_nom,
      'Téléphone': struct.telephone,
      'Nb Prêts Actifs': decActifs,
      'Nb Total Prêts': structDecs.length,
      'Total Emprunté (F CFA)': totalPrincipal,
      'Total Dû avec Intérêts (F CFA)': totalDu,
      'Total Remboursé (F CFA)': totalRembourse,
      'Solde Restant Dû (F CFA)': soldeRestant,
      'Taux d\'Avancement (%)': `${tauxRembourse.toFixed(1)}%`,
      'Statut Global': soldeRestant > 0 ? 'EN COURS (ACTIF)' : 'SOLDÉ',
      'Date Enregistrement': formatDate(struct.created_at),
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Structures Actives');

  const fileName = `GES_FIN_Structures_Actives_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 3. Export Excel (.xlsx) Fiche Individuelle de Structure
 */
export function exportStructureToExcel(
  structure: Structure,
  decaissements: Decaissement[],
  schedules: EcheancierTrimestriel[],
  engagements: Engagement[]
) {
  const structDecs = decaissements.filter((d) => d.structure_id === structure.id);
  const totalPrincipal = structDecs.reduce((sum, d) => sum + d.montant_principal, 0);
  const totalDu = structDecs.reduce((sum, d) => sum + d.montant_total_a_rembourser, 0);
  const structEngs = engagements.filter((e) =>
    structDecs.some((d) => d.id === e.decaissement_id)
  );
  const totalRembourse = structEngs.reduce((sum, e) => sum + e.montant_verse, 0);
  const soldeRestant = Math.max(0, totalDu - totalRembourse);

  const synthese = [
    ['FICHE DE SYNTHÈSE FINANCIÈRE - STRUCTURE EMPRUNTEUR', ''],
    ['Raison Sociale', structure.raison_sociale],
    ['Contact Responsable', structure.contact_nom],
    ['Téléphone', structure.telephone],
    ['Date d\'enregistrement', formatDate(structure.created_at)],
    ['', ''],
    ['INDICATEURS FINANCIERS DE LA STRUCTURE', ''],
    ['Total Principal Emprunté', formatCurrency(totalPrincipal)],
    ['Total Dû (Principal + Intérêts)', formatCurrency(totalDu)],
    ['Total Remboursé Effectif', formatCurrency(totalRembourse)],
    ['Solde Restant à Rembourser', formatCurrency(soldeRestant)],
    ['Taux de Remboursement', totalDu > 0 ? `${((totalRembourse / totalDu) * 100).toFixed(2)} %` : '100 %'],
  ];

  const decsData = structDecs.map((d) => {
    const dEngs = engagements.filter((e) => e.decaissement_id === d.id);
    const paid = dEngs.reduce((s, e) => s + e.montant_verse, 0);
    return {
      'Référence': d.reference_unique,
      'Date': formatDate(d.date_decaissement),
      'Principal (F CFA)': d.montant_principal,
      'Taux (%)': d.taux_interet,
      'Total Dû (F CFA)': d.montant_total_a_rembourser,
      'Remboursé (F CFA)': paid,
      'Reste Dû (F CFA)': Math.max(0, d.montant_total_a_rembourser - paid),
      'Statut': d.statut,
      'Notes': d.notes || '',
    };
  });

  const structSchedules = schedules.filter((s) =>
    structDecs.some((d) => d.id === s.decaissement_id)
  );
  const schedData = structSchedules.map((s) => ({
    'Décaissement': decaissements.find((d) => d.id === s.decaissement_id)?.reference_unique || '-',
    'Année': s.annee,
    'Trimestre': s.trimestre,
    'Date Limite': formatDate(s.date_limite),
    'Montant Prévu (F CFA)': s.montant_prevu,
    'Montant Payé (F CFA)': s.montant_paye,
    'Solde (F CFA)': Math.max(0, s.montant_prevu - s.montant_paye),
    'Statut': s.statut,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(synthese), 'Fiche Structure');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(decsData), 'Historique Décaissements');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(schedData), 'Échéanciers');

  const cleanName = structure.raison_sociale.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `Structure_${cleanName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * 4. Export Word (.docx) Fiche Structure Officielle
 */
export async function exportStructureToWord(
  structure: Structure,
  decaissements: Decaissement[],
  schedules: EcheancierTrimestriel[],
  engagements: Engagement[]
) {
  const structDecs = decaissements.filter((d) => d.structure_id === structure.id);
  const totalPrincipal = structDecs.reduce((sum, d) => sum + d.montant_principal, 0);
  const totalDu = structDecs.reduce((sum, d) => sum + d.montant_total_a_rembourser, 0);
  const structEngs = engagements.filter((e) =>
    structDecs.some((d) => d.id === e.decaissement_id)
  );
  const totalRembourse = structEngs.reduce((sum, e) => sum + e.montant_verse, 0);
  const soldeRestant = Math.max(0, totalDu - totalRembourse);
  const tauxRembourse = totalDu > 0 ? (totalRembourse / totalDu) * 100 : 0;

  // Build table rows for disbursements
  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Réf.', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Date', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Principal', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Taux', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total Dû', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Remboursé', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Solde', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Statut', bold: true })] })] }),
      ],
    }),
  ];

  for (const d of structDecs) {
    const paid = engagements.filter((e) => e.decaissement_id === d.id).reduce((s, e) => s + e.montant_verse, 0);
    const solde = Math.max(0, d.montant_total_a_rembourser - paid);

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(d.reference_unique)] }),
          new TableCell({ children: [new Paragraph(formatDate(d.date_decaissement))] }),
          new TableCell({ children: [new Paragraph(formatCurrency(d.montant_principal))] }),
          new TableCell({ children: [new Paragraph(formatPercent(d.taux_interet))] }),
          new TableCell({ children: [new Paragraph(formatCurrency(d.montant_total_a_rembourser))] }),
          new TableCell({ children: [new Paragraph(formatCurrency(paid))] }),
          new TableCell({ children: [new Paragraph(formatCurrency(solde))] }),
          new TableCell({ children: [new Paragraph(d.statut)] }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'RAPPORT DE SITUATION FINANCIÈRE',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Structure : ${structure.raison_sociale}`,
                bold: true,
                size: 28,
              }),
            ],
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Contact : ${structure.contact_nom} | Téléphone : ${structure.telephone}\n` }),
              new TextRun({ text: `Date d'édition du rapport : ${new Date().toLocaleDateString('fr-FR')}\n` }),
            ],
            spacing: { after: 300 },
          }),
          new Paragraph({
            text: '1. Synthèse Financière Globale de la Structure',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `• Total Principal Emprunté : `, bold: true }),
              new TextRun(formatCurrency(totalPrincipal)),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `• Total Dû (Principal + Intérêts) : `, bold: true }),
              new TextRun(formatCurrency(totalDu)),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `• Montant Total Déjà Remboursé : `, bold: true }),
              new TextRun(formatCurrency(totalRembourse)),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `• Solde Restant à Recouvrer : `, bold: true }),
              new TextRun(formatCurrency(soldeRestant)),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `• Taux de Couverture / Remboursement : `, bold: true }),
              new TextRun(`${tauxRembourse.toFixed(2)} %`),
            ],
            spacing: { after: 300 },
          }),
          new Paragraph({
            text: '2. Historique Détaillé des Décaissements',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          }),
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
          new Paragraph({
            text: '\nDocument généré automatiquement par le système GES-FIN - Gestion des Décaissements et Remboursements.',
            spacing: { before: 400 },
          }),
        ],
      },
    ],
  });

  const { Packer } = await import('docx');
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanName = structure.raison_sociale.replace(/[^a-zA-Z0-9]/g, '_');
  a.download = `Fiche_Structure_${cleanName}_${new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
