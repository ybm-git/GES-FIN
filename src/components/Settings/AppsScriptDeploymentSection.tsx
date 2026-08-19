import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Sparkles,
  Layers,
  HelpCircle,
  Database,
  ArrowRight,
} from 'lucide-react';

const CODE_GS_CONTENT = `/**
 * =========================================================================
 * GES-FIN (v2.5.0) - BACKEND GOOGLE APPS SCRIPT & GOOGLE SHEETS
 * Base de données relationnelle automatisée
 * =========================================================================
 */

const SHEETS = {
  STRUCTURES: 'Structures',
  DECAISSEMENTS: 'Decaissements',
  ECHEANCIERS: 'Echeanciers',
  ENGAGEMENTS: 'Engagements',
  AUDIT_LOGS: 'AuditLogs'
};

function doGet(e) {
  initDatabaseStructure();
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('GES-FIN - Gestion Financière')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function initDatabaseStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const headers = {
    [SHEETS.STRUCTURES]: ['id', 'raison_sociale', 'contact_nom', 'telephone', 'email', 'secteur', 'adresse', 'statut', 'notes', 'created_at'],
    [SHEETS.DECAISSEMENTS]: ['id', 'structure_id', 'reference_unique', 'date_decaissement', 'montant_decaisse', 'taux_interet', 'duree_trimestres', 'periode_grace', 'type_amortissement', 'notes', 'statut', 'created_at'],
    [SHEETS.ECHEANCIERS]: ['id', 'decaissement_id', 'structure_id', 'annee', 'trimestre', 'date_echeance', 'capital_restant_debut', 'principal_du', 'interets_dus', 'echeance_totale', 'principal_paye', 'interets_payes', 'total_regle', 'reste_a_payer', 'capital_restant_fin', 'statut'],
    [SHEETS.ENGAGEMENTS]: ['id', 'structure_id', 'decaissement_id', 'echeancier_id', 'date_engagement', 'montant_paye', 'reference_piece', 'type_imputation', 'notes', 'created_at'],
    [SHEETS.AUDIT_LOGS]: ['id', 'timestamp', 'user_id', 'user_nom', 'action_type', 'target_entity', 'target_id', 'target_label', 'details', 'severity']
  };

  for (const sheetName in headers) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers[sheetName]);
      sheet.getRange(1, 1, 1, headers[sheetName].length)
        .setBackground('#1e293b')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }
}

function apiGetInitialData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return {
      success: true,
      data: {
        structures: readSheetAsObjects(ss.getSheetByName(SHEETS.STRUCTURES)),
        decaissements: readSheetAsObjects(ss.getSheetByName(SHEETS.DECAISSEMENTS)),
        schedules: readSheetAsObjects(ss.getSheetByName(SHEETS.ECHEANCIERS)),
        engagements: readSheetAsObjects(ss.getSheetByName(SHEETS.ENGAGEMENTS)),
        auditLogs: readSheetAsObjects(ss.getSheetByName(SHEETS.AUDIT_LOGS))
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function apiSaveEntity(sheetName, item) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(item.id)) {
        rowIndex = i + 1;
        break;
      }
    }

    const rowValues = headers.map(header => {
      const val = item[header];
      return val !== undefined && val !== null ? val : '';
    });

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }

    return { success: true, item: item };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function apiDeleteEntity(sheetName, id) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    return { success: false, error: 'Enregistrement introuvable' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function readSheetAsObjects(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const range = sheet.getDataRange();
  const values = range.getValues();
  const headers = values[0];
  const results = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    results.push(obj);
  }
  return results;
}`;

export const AppsScriptDeploymentSection: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [isDownloadingIndex, setIsDownloadingIndex] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(CODE_GS_CONTENT);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleDownloadCodeGs = () => {
    const blob = new Blob([CODE_GS_CONTENT], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Code.gs';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadIndexHtml = async () => {
    setIsDownloadingIndex(true);
    try {
      // Direct API endpoint provided by Vite dev server
      const res = await fetch('/api/download-gas-index');
      if (res.ok) {
        const text = await res.text();
        const blob = new Blob([text], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Index.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        window.open('/api/download-gas-index', '_blank');
      }
    } catch {
      window.open('/api/download-gas-index', '_blank');
    } finally {
      setIsDownloadingIndex(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Banner Intro */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-900/30 to-blue-900/30 border border-emerald-500/30 dark:border-emerald-500/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-md">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Déploiement sur Google Apps Script & Google Sheets
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                100% Autonome
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Téléchargez directement les fichiers prêts à l’emploi pour héberger gratuitement votre application GES-FIN sur Google Apps Script avec Google Sheet comme base de données sécurisée.
            </p>
          </div>
        </div>
      </div>

      {/* Action Cards: 2 Files to deploy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Index.html */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  1
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Fichier Frontend : <span className="font-mono text-blue-500">Index.html</span>
                </h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono">
                Bundle Complet
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Contient toute l’interface React, le responsive mobile, Tailwind CSS, Recharts et le menu adaptatif réunis dans un seul fichier.
            </p>
          </div>

          <button
            id="download-index-html-btn"
            onClick={handleDownloadIndexHtml}
            disabled={isDownloadingIndex}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloadingIndex ? 'Génération...' : 'Télécharger Index.html'}</span>
          </button>
        </div>

        {/* Card 2: Code.gs */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                  2
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Fichier Backend : <span className="font-mono text-emerald-500">Code.gs</span>
                </h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono">
                Google Script
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Le script Apps Script qui initialise automatiquement les 5 onglets dans votre Google Sheet et gère les sauvegardes en direct.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Copié !' : 'Copier le Code.gs'}</span>
            </button>
            <button
              onClick={handleDownloadCodeGs}
              className="flex items-center justify-center p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
              title="Télécharger Code.gs"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Step by Step Guide */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-500" />
          <span>Procédure de Déploiement en 4 étapes (2 minutes)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase">
              Étape 1
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Créer le Sheet</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Ouvrez un nouveau classeur vierge sur Google Sheets (ex: <i>GES-FIN_DB</i>).
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase">
              Étape 2
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Ouvrir Apps Script</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Cliquez sur <b>Extensions &gt; Apps Script</b> dans le menu de votre Google Sheet.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase">
              Étape 3
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Coller les 2 fichiers</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Collez <b>Code.gs</b> puis créez un fichier HTML nommé <b>Index</b> et collez <b>Index.html</b>.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">
              Étape 4
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Déployer Web App</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Cliquez sur <b>Déployer &gt; Nouveau déploiement &gt; Application Web</b> et ouvrez l’URL !
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
