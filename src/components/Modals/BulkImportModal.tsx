import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  Building2,
  Receipt,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  downloadImportTemplate,
  parseStructuresFile,
  parseEngagementsFile,
  StructureImportRow,
  EngagementImportRow,
} from '../../utils/importUtils';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'STRUCTURES' | 'ENGAGEMENTS';
}

export const BulkImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  defaultType = 'STRUCTURES',
}) => {
  const { structures, decaissements, bulkImportStructures, bulkImportEngagements } = useFinance();

  const [activeTab, setActiveTab] = useState<'STRUCTURES' | 'ENGAGEMENTS'>(defaultType);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<string | null>(null);

  // Parsed rows
  const [structureRows, setStructureRows] = useState<StructureImportRow[]>([]);
  const [engagementRows, setEngagementRows] = useState<EngagementImportRow[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setSelectedFile(null);
    setStructureRows([]);
    setEngagementRows([]);
    setErrorMessage(null);
    setSuccessReport(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessReport(null);

    try {
      if (activeTab === 'STRUCTURES') {
        const parsed = await parseStructuresFile(file);
        if (parsed.length === 0) {
          setErrorMessage('Aucune ligne de données détectée dans le fichier.');
        }
        setStructureRows(parsed);
      } else {
        const parsed = await parseEngagementsFile(file, decaissements, structures);
        if (parsed.length === 0) {
          setErrorMessage('Aucune ligne de données détectée dans le fichier.');
        }
        setEngagementRows(parsed);
      }
    } catch (err: any) {
      setErrorMessage(`Erreur d'analyse du fichier : ${err?.message || 'Format non reconnu'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyImport = () => {
    setErrorMessage(null);

    if (activeTab === 'STRUCTURES') {
      const validRows = structureRows.filter((r) => r.isValid);
      if (validRows.length === 0) {
        setErrorMessage('Aucune ligne valide à importer.');
        return;
      }

      const formatted = validRows.map((r) => ({
        raison_sociale: r.raison_sociale,
        contact_nom: r.contact_nom,
        telephone: r.telephone,
        email: r.email,
        adresse: r.adresse,
      }));

      const res = bulkImportStructures(formatted);
      setSuccessReport(`${res.count} structures clientes importées avec succès dans le portefeuille !`);
      setStructureRows([]);
      setSelectedFile(null);
    } else {
      const validRows = engagementRows.filter((r) => r.isValid && r.matchedDecaissementId);
      if (validRows.length === 0) {
        setErrorMessage('Aucune ligne valide à importer.');
        return;
      }

      const formatted = validRows.map((r) => ({
        decaissement_id: r.matchedDecaissementId!,
        montant_verse: r.montant_verse,
        date_paiement: r.date_paiement,
        mode_reglement: r.mode_reglement,
        reference_recu: r.reference_recu,
        notes: r.notes,
      }));

      const res = bulkImportEngagements(formatted);
      setSuccessReport(`${res.count} versements / remboursements enregistrés et ventilés avec succès !`);
      setEngagementRows([]);
      setSelectedFile(null);
    }
  };

  const totalRowsCount = activeTab === 'STRUCTURES' ? structureRows.length : engagementRows.length;
  const validRowsCount =
    activeTab === 'STRUCTURES'
      ? structureRows.filter((r) => r.isValid).length
      : engagementRows.filter((r) => r.isValid && r.matchedDecaissementId).length;
  const invalidRowsCount = totalRowsCount - validRowsCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Assistant d'Importation en Masse
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chargez des structures ou des historiques de versements depuis Excel (.xlsx) ou CSV (.csv)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* Tab Switcher */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <button
              onClick={() => {
                setActiveTab('STRUCTURES');
                handleReset();
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'STRUCTURES'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Structures Clientes</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('ENGAGEMENTS');
                handleReset();
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ENGAGEMENTS'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Engagements & Remboursements</span>
            </button>
          </div>

          {/* Templates Download Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Modèles de fichiers prêts à l'emploi
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                Téléchargez le gabarit pré-formaté pour préparer vos données sans erreur.
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => downloadImportTemplate(activeTab, 'xlsx')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Modèle Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => downloadImportTemplate(activeTab, 'csv')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Modèle CSV (.csv)</span>
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/20 hover:bg-blue-50/20"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {selectedFile ? selectedFile.name : 'Cliquez ou glissez-déposez votre fichier Excel ou CSV'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Formats supportés : .xlsx, .csv, .xls (Taille max : 10 Mo)
            </p>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successReport && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successReport}</span>
            </div>
          )}

          {/* Preview Table */}
          {totalRowsCount > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Prévisualisation des données détectées ({totalRowsCount} lignes)
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                    {validRowsCount} valides
                  </span>
                  {invalidRowsCount > 0 && (
                    <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold text-[10px]">
                      {invalidRowsCount} erreurs
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0">
                    <tr>
                      <th className="p-2">Statut</th>
                      {activeTab === 'STRUCTURES' ? (
                        <>
                          <th className="p-2">Raison Sociale</th>
                          <th className="p-2">Contact</th>
                          <th className="p-2">Téléphone</th>
                          <th className="p-2">Email</th>
                        </>
                      ) : (
                        <>
                          <th className="p-2">Réf. Prêt</th>
                          <th className="p-2">Structure</th>
                          <th className="p-2">Montant Versé</th>
                          <th className="p-2">Date Paiement</th>
                          <th className="p-2">Mode</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeTab === 'STRUCTURES'
                      ? structureRows.map((r, i) => (
                          <tr
                            key={i}
                            className={r.isValid ? 'bg-white dark:bg-slate-900' : 'bg-red-50/50 dark:bg-red-950/20'}
                          >
                            <td className="p-2 font-bold">
                              {r.isValid ? (
                                <span className="text-emerald-600 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Valide
                                </span>
                              ) : (
                                <span className="text-red-500 font-semibold" title={r.errors.join(', ')}>
                                  {r.errors[0]}
                                </span>
                              )}
                            </td>
                            <td className="p-2 font-semibold text-slate-900 dark:text-white">{r.raison_sociale}</td>
                            <td className="p-2 text-slate-600 dark:text-slate-300">{r.contact_nom}</td>
                            <td className="p-2 text-slate-600 dark:text-slate-300">{r.telephone}</td>
                            <td className="p-2 text-slate-400">{r.email || '-'}</td>
                          </tr>
                        ))
                      : engagementRows.map((r, i) => (
                          <tr
                            key={i}
                            className={r.isValid ? 'bg-white dark:bg-slate-900' : 'bg-red-50/50 dark:bg-red-950/20'}
                          >
                            <td className="p-2 font-bold">
                              {r.isValid ? (
                                <span className="text-emerald-600 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Valide
                                </span>
                              ) : (
                                <span className="text-red-500 font-semibold" title={r.errors.join(', ')}>
                                  {r.errors[0]}
                                </span>
                              )}
                            </td>
                            <td className="p-2 font-mono text-blue-600">{r.decaissement_ref_or_id}</td>
                            <td className="p-2 font-semibold text-slate-900 dark:text-white">{r.structure_nom || '-'}</td>
                            <td className="p-2 font-bold text-emerald-600">{formatCurrency(r.montant_verse)}</td>
                            <td className="p-2 text-slate-600 dark:text-slate-300">{r.date_paiement}</td>
                            <td className="p-2 text-slate-500">{r.mode_reglement}</td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Fermer
          </button>

          {validRowsCount > 0 && (
            <button
              onClick={handleApplyImport}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Valider & Importer {validRowsCount} enregistrements</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
