import * as XLSX from 'xlsx';
import { Structure, Decaissement, Engagement } from '../types';

export interface StructureImportRow {
  raison_sociale: string;
  contact_nom: string;
  telephone: string;
  email?: string;
  adresse?: string;
  isValid: boolean;
  errors: string[];
}

export interface EngagementImportRow {
  decaissement_ref_or_id: string;
  structure_nom?: string;
  montant_verse: number;
  date_paiement: string;
  mode_reglement?: 'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'ESPECES';
  reference_recu?: string;
  notes?: string;
  matchedDecaissementId?: string;
  isValid: boolean;
  errors: string[];
}

/**
 * Télécharge un modèle de fichier CSV ou Excel prêt à l'emploi
 */
export function downloadImportTemplate(type: 'STRUCTURES' | 'ENGAGEMENTS', format: 'csv' | 'xlsx'): void {
  if (type === 'STRUCTURES') {
    const data = [
      {
        'Raison Sociale *': 'Entreprise Exemple SA',
        'Contact Principal *': 'M. Paul Martin',
        'Téléphone *': '+221 77 000 00 00',
        'Email': 'contact@exemple.sn',
        'Adresse': '12 Avenue des Affaires, Dakar',
      },
      {
        'Raison Sociale *': 'GIE Teranga Développement',
        'Contact Principal *': 'Mme Aminata Diallo',
        'Téléphone *': '+221 78 111 22 33',
        'Email': 'gie.teranga@gmail.com',
        'Adresse': 'Km 4 Boulevard du Centenaire',
      },
    ];

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Structures_Template');
      XLSX.writeFile(wb, 'modele_import_structures.xlsx');
    } else {
      const csvContent =
        'Raison Sociale *;Contact Principal *;Téléphone *;Email;Adresse\n' +
        'Entreprise Exemple SA;M. Paul Martin;+221 77 000 00 00;contact@exemple.sn;12 Avenue des Affaires, Dakar\n' +
        'GIE Teranga Développement;Mme Aminata Diallo;+221 78 111 22 33;gie.teranga@gmail.com;Km 4 Boulevard du Centenaire\n';
      downloadRawCsv(csvContent, 'modele_import_structures.csv');
    }
  } else {
    const data = [
      {
        'Référence Prêt ou ID *': 'DEC-2025-001',
        'Montant Versé (F CFA) *': 2500000,
        'Date Paiement (AAAA-MM-JJ) *': '2025-06-15',
        'Mode Règlement': 'VIREMENT',
        'Référence Reçu / Quittance': 'REC-2025-089',
        'Notes': 'Règlement échéance T2 reçu par virement bancaire',
      },
      {
        'Référence Prêt ou ID *': 'DEC-2025-002',
        'Montant Versé (F CFA) *': 1800000,
        'Date Paiement (AAAA-MM-JJ) *': '2025-06-20',
        'Mode Règlement': 'CHEQUE',
        'Référence Reçu / Quittance': 'CHQ-889021',
        'Notes': 'Chèque encaissé',
      },
    ];

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Engagements_Template');
      XLSX.writeFile(wb, 'modele_import_engagements.xlsx');
    } else {
      const csvContent =
        'Référence Prêt ou ID *;Montant Versé (F CFA) *;Date Paiement (AAAA-MM-JJ) *;Mode Règlement;Référence Reçu / Quittance;Notes\n' +
        'DEC-2025-001;2500000;2025-06-15;VIREMENT;REC-2025-089;Règlement échéance T2 reçu par virement bancaire\n' +
        'DEC-2025-002;1800000;2025-06-20;CHEQUE;CHQ-889021;Chèque encaissé\n';
      downloadRawCsv(csvContent, 'modele_import_engagements.csv');
    }
  }
}

function downloadRawCsv(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Analyse et valide un fichier pour l'import de structures
 */
export async function parseStructuresFile(file: File): Promise<StructureImportRow[]> {
  const data = await readFileData(file);
  const rows: StructureImportRow[] = [];

  for (const raw of data) {
    const raisonSociale = String(
      raw['Raison Sociale *'] ||
      raw['Raison Sociale'] ||
      raw['raison_sociale'] ||
      raw['Nom'] ||
      raw['Structure'] ||
      ''
    ).trim();

    const contactNom = String(
      raw['Contact Principal *'] ||
      raw['Contact Principal'] ||
      raw['contact_nom'] ||
      raw['Contact'] ||
      ''
    ).trim();

    const telephone = String(
      raw['Téléphone *'] ||
      raw['Téléphone'] ||
      raw['telephone'] ||
      raw['Tel'] ||
      ''
    ).trim();

    const email = String(raw['Email'] || raw['email'] || '').trim();
    const adresse = String(raw['Adresse'] || raw['adresse'] || '').trim();

    const errors: string[] = [];
    if (!raisonSociale) errors.push('Raison Sociale manquante');
    if (!contactNom) errors.push('Contact Principal manquant');
    if (!telephone) errors.push('Téléphone manquant');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Format email invalide');
    }

    rows.push({
      raison_sociale: raisonSociale,
      contact_nom: contactNom,
      telephone: telephone,
      email: email || undefined,
      adresse: adresse || undefined,
      isValid: errors.length === 0,
      errors,
    });
  }

  return rows;
}

/**
 * Analyse et valide un fichier pour l'import d'engagements / versements
 */
export async function parseEngagementsFile(
  file: File,
  decaissements: Decaissement[],
  structures: Structure[]
): Promise<EngagementImportRow[]> {
  const data = await readFileData(file);
  const rows: EngagementImportRow[] = [];

  for (const raw of data) {
    const decRef = String(
      raw['Référence Prêt ou ID *'] ||
      raw['Référence Prêt'] ||
      raw['decaissement_ref_or_id'] ||
      raw['decaissement_id'] ||
      raw['Reference'] ||
      ''
    ).trim();

    const montantRaw = raw['Montant Versé (F CFA) *'] || raw['Montant Versé'] || raw['montant_verse'] || raw['Montant'] || 0;
    const montantVerse = typeof montantRaw === 'number' ? montantRaw : parseFloat(String(montantRaw).replace(/\s/g, '').replace(',', '.'));

    const datePaiement = String(
      raw['Date Paiement (AAAA-MM-JJ) *'] ||
      raw['Date Paiement'] ||
      raw['date_paiement'] ||
      raw['Date'] ||
      ''
    ).trim();

    const modeReglementRaw = String(raw['Mode Règlement'] || raw['mode_reglement'] || 'VIREMENT').toUpperCase().trim();
    let modeReglement: 'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'ESPECES' = 'VIREMENT';
    if (['VIREMENT', 'CHEQUE', 'PRELEVEMENT', 'ESPECES'].includes(modeReglementRaw)) {
      modeReglement = modeReglementRaw as any;
    }

    const referenceRecu = String(raw['Référence Reçu / Quittance'] || raw['reference_recu'] || raw['Reçu'] || '').trim();
    const notes = String(raw['Notes'] || raw['notes'] || '').trim();

    const errors: string[] = [];

    // Match decaissement
    const matchedDec = decaissements.find(
      (d) =>
        d.id === decRef ||
        d.reference_unique?.toLowerCase() === decRef.toLowerCase() ||
        d.id.toLowerCase().includes(decRef.toLowerCase())
    );

    let structureNom: string | undefined;
    if (matchedDec) {
      const struct = structures.find((s) => s.id === matchedDec.structure_id);
      structureNom = struct?.raison_sociale;
    } else {
      errors.push(`Prêt / Dossier "${decRef}" introuvable`);
    }

    if (isNaN(montantVerse) || montantVerse <= 0) {
      errors.push('Montant invalide ou négatif');
    }

    if (!datePaiement || isNaN(new Date(datePaiement).getTime())) {
      errors.push('Date de paiement invalide (Format attendu: AAAA-MM-JJ)');
    }

    rows.push({
      decaissement_ref_or_id: decRef,
      structure_nom: structureNom,
      montant_verse: isNaN(montantVerse) ? 0 : montantVerse,
      date_paiement: datePaiement || new Date().toISOString().slice(0, 10),
      mode_reglement: modeReglement,
      reference_recu: referenceRecu || undefined,
      notes: notes || undefined,
      matchedDecaissementId: matchedDec?.id,
      isValid: errors.length === 0,
      errors,
    });
  }

  return rows;
}

/**
 * Lit un fichier CSV ou Excel et retourne un tableau d'objets bruts
 */
async function readFileData(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          resolve([]);
          return;
        }

        const workbook = XLSX.read(buffer, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}
