import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  Shield,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  Lock,
  Database,
  Archive,
  RefreshCw,
  KeyRound,
  UserCheck,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import {
  exportSnapshotJSON,
  exportAuthSnapshotJSON,
  parseAndValidateSnapshot,
  ParsedSnapshotResult,
} from '../../utils/backupUtils';
import { formatDate } from '../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SnapshotBackupModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { structures, decaissements, schedules, engagements, restoreFullSnapshot, addAuditLog } = useFinance();
  const { usersList, currentUser, restoreAuthSnapshot, exportAuthSnapshot } = useAuth();

  const [activeTab, setActiveTab] = useState<'EXPORT' | 'RESTORE'>('EXPORT');
  const [exportType, setExportType] = useState<'FULL' | 'AUTH_ONLY'>('FULL');

  // Export options
  const [encryptExport, setEncryptExport] = useState<boolean>(true);
  const [passphrase, setPassphrase] = useState<string>('GESFIN-ARCHIVE-SECURE');
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Restore state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedSnapshotResult | null>(null);
  const [restorePassphrase, setRestorePassphrase] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    if (exportType === 'FULL') {
      exportSnapshotJSON(
        structures,
        decaissements,
        schedules,
        engagements,
        usersList,
        encryptExport ? { encrypt: true, passphrase } : undefined
      );
      setExportSuccess('Le snapshot complet (données + accès) a été téléchargé avec succès.');
    } else {
      exportAuthSnapshot(encryptExport ? { encrypt: true, passphrase } : undefined);
      setExportSuccess('Le snapshot dédié de vos identifiants & accès a été téléchargé avec succès.');
    }
    setTimeout(() => setExportSuccess(null), 5000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsProcessing(true);
    setErrorMessage(null);
    setRestoreSuccessMessage(null);

    try {
      const text = await file.text();
      const res = parseAndValidateSnapshot(text, restorePassphrase);

      if (res.success && res.result) {
        setParsedResult(res.result);
      } else {
        setErrorMessage(res.error || 'Fichier snapshot non valide.');
        setParsedResult(null);
      }
    } catch (err: any) {
      setErrorMessage(`Erreur lors de la lecture du fichier : ${err?.message || 'Erreur inconnue'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmRestore = () => {
    if (!parsedResult) return;

    setErrorMessage(null);

    if (parsedResult.kind === 'FULL') {
      const res = restoreFullSnapshot(parsedResult.snapshot.data);
      if (res.success) {
        setRestoreSuccessMessage('Snapshot complet restauré avec succès ! Les données financières et accès sont à jour.');
        setParsedResult(null);
        setSelectedFile(null);
      } else {
        setErrorMessage(res.error || 'Échec de la restauration des données.');
      }
    } else if (parsedResult.kind === 'AUTH_ONLY') {
      const res = restoreAuthSnapshot(parsedResult.authSnapshot);
      if (res.success) {
        setRestoreSuccessMessage(
          'Identifiants & paramètres de connexion restaurés avec succès ! Vos structures et données financières restent inchangées.'
        );
        addAuditLog({
          action_type: 'RESTORE_AUTH_SNAPSHOT',
          target_entity: 'AUTH',
          target_label: 'Snapshot Identifiants Connexion',
          details: `Restauration des paramètres de connexion et profils utilisateurs (${parsedResult.authSnapshot.data.users.length} comptes rechargés).`,
          severity: 'WARNING',
        });
        setParsedResult(null);
        setSelectedFile(null);
      } else {
        setErrorMessage(res.error || 'Échec de la restauration des identifiants.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Sauvegarde & Restauration Instantanée
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Snapshots JSON complets ou dédiés uniquement aux paramètres de connexion
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('EXPORT')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'EXPORT'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Exporter un Snapshot</span>
          </button>

          <button
            onClick={() => setActiveTab('RESTORE')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'RESTORE'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Restaurer un Snapshot</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* TAB 1: EXPORT */}
          {activeTab === 'EXPORT' && (
            <div className="space-y-4">
              
              {exportSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{exportSuccess}</span>
                </div>
              )}

              {/* Export Type Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setExportType('FULL')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    exportType === 'FULL'
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Sauvegarde Complète
                    </span>
                    {exportType === 'FULL' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Inclut tout le portefeuille : structures, prêts, échéanciers, versements et identifiants.
                  </p>
                </div>

                <div
                  onClick={() => setExportType('AUTH_ONLY')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    exportType === 'AUTH_ONLY'
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Identifiants Uniquement
                    </span>
                    {exportType === 'AUTH_ONLY' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sauvegarde isolée de vos accès. Sa restauration n'aura aucun impact sur vos données financières.
                  </p>
                </div>
              </div>

              {/* Data Summary Card for Full */}
              {exportType === 'FULL' ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-indigo-500" />
                    Contenu du Snapshot Complet
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 block">Structures</span>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">{structures.length}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 block">Décaissements</span>
                      <span className="font-extrabold text-sm text-blue-600">{decaissements.length}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 block">Échéanciers</span>
                      <span className="font-extrabold text-sm text-purple-600">{schedules.length}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 block">Versements</span>
                      <span className="font-extrabold text-sm text-emerald-600">{engagements.length}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Contenu du Snapshot d'Identifiants
                  </span>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {currentUser?.nom || 'Administrateur Principal'}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Email : {currentUser?.email || 'admin@finantrim.fr'}
                    </p>
                    <p className="text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                      Comptes enregistrés : {usersList.length} profil(s) sécurisé(s)
                    </p>
                  </div>
                </div>
              )}

              {/* Encryption Toggle */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-500" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Chiffrement et Protection d'Intégrité (Recommandé)
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        Génère une signature numérique et chiffre le contenu JSON.
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={encryptExport}
                    onChange={(e) => setEncryptExport(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* Download Action */}
              <button
                type="button"
                onClick={handleExport}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>
                  {exportType === 'FULL'
                    ? 'Télécharger le Snapshot Complet (.JSON)'
                    : 'Télécharger le Snapshot Identifiants (.JSON)'}
                </span>
              </button>
            </div>
          )}

          {/* TAB 2: RESTORE */}
          {activeTab === 'RESTORE' && (
            <div className="space-y-4">
              
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {restoreSuccessMessage && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{restoreSuccessMessage}</span>
                </div>
              )}

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/20"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {selectedFile ? selectedFile.name : 'Sélectionnez votre fichier Snapshot JSON'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Détection automatique : Snapshot complet ou Snapshot d'identifiants
                </p>
              </div>

              {/* Parsed Snapshot Preview */}
              {parsedResult && (
                <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-3">
                  
                  {parsedResult.kind === 'FULL' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                          <FileCheck className="w-4 h-4 text-emerald-500" />
                          Archive Complète Détectée (Exportée le {formatDate(parsedResult.summary.date)})
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2 rounded bg-white dark:bg-slate-800 text-center">
                          <span className="text-[10px] text-slate-400 block">Structures</span>
                          <span className="font-bold text-slate-900 dark:text-white">{parsedResult.summary.structuresCount}</span>
                        </div>
                        <div className="p-2 rounded bg-white dark:bg-slate-800 text-center">
                          <span className="text-[10px] text-slate-400 block">Décaissements</span>
                          <span className="font-bold text-blue-600">{parsedResult.summary.decaissementsCount}</span>
                        </div>
                        <div className="p-2 rounded bg-white dark:bg-slate-800 text-center">
                          <span className="text-[10px] text-slate-400 block">Échéances</span>
                          <span className="font-bold text-purple-600">{parsedResult.summary.schedulesCount}</span>
                        </div>
                        <div className="p-2 rounded bg-white dark:bg-slate-800 text-center">
                          <span className="text-[10px] text-slate-400 block">Versements</span>
                          <span className="font-bold text-emerald-600">{parsedResult.summary.engagementsCount}</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                        <strong>Attention :</strong> La restauration remplacera l'état actuel de votre portefeuille par les données du snapshot.
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                          <KeyRound className="w-4 h-4 text-emerald-500" />
                          Snapshot d'Identifiants & Paramètres de Connexion Détecté
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                        <p className="font-bold text-slate-900 dark:text-white">
                          Compte : {parsedResult.summary.adminNom}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                          Email de récupération : {parsedResult.summary.adminEmail}
                        </p>
                        <p className="text-slate-400 text-[10px]">
                          Date du snapshot : {formatDate(parsedResult.summary.date)}
                        </p>
                      </div>

                      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                        <strong>Sécurité garantie :</strong> Cette restauration mettra à jour <u>uniquement vos accès et mots de passe</u>. Aucune structure, prêt ou versement existant ne sera altéré.
                      </div>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleConfirmRestore}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>
                      {parsedResult.kind === 'FULL'
                        ? 'Confirmer la Restauration Complète'
                        : 'Restaurer ces Paramètres de Connexion Uniquement'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
