import React, { useState } from 'react';
import {
  Settings,
  Shield,
  User,
  Database,
  Download,
  KeyRound,
  CheckCircle2,
  Lock,
  FileSpreadsheet,
  Upload,
  Archive,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { exportPortfolioToExcel } from '../../utils/exportUtils';
import { SnapshotBackupModal } from '../Modals/SnapshotBackupModal';
import { BulkImportModal } from '../Modals/BulkImportModal';
import { AuditLogSection } from './AuditLogSection';
import { AppsScriptDeploymentSection } from './AppsScriptDeploymentSection';

type SettingsTab = 'audit' | 'account' | 'backups' | 'appsscript';

export const SettingsView: React.FC = () => {
  const { currentUser, updateAdminCredentials } = useAuth();
  const { structures, decaissements, schedules, engagements, kpis, auditLogs, addAuditLog } = useFinance();

  const [activeTab, setActiveTab] = useState<SettingsTab>('audit');

  // Modals state
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);

  // Admin Profile Form state
  const [adminName, setAdminName] = useState(currentUser?.nom || 'Administrateur Principal');
  const [adminEmail, setAdminEmail] = useState(currentUser?.email || 'admin@finantrim.fr');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);

    if (newPassword && newPassword !== confirmPassword) {
      setProfileError('Le nouveau mot de passe et sa confirmation ne correspondent pas.');
      return;
    }

    setIsSavingProfile(true);

    try {
      const res = updateAdminCredentials({
        nom: adminName,
        email: adminEmail,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });

      if (res.success) {
        setProfileSuccess('Vos données d’identification et vos paramètres de sécurité ont été mis à jour avec succès.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');

        // Log audit event
        addAuditLog({
          action_type: 'UPDATE_ADMIN_CREDENTIALS',
          target_entity: 'AUTH',
          target_id: currentUser?.id,
          target_label: `${adminName} (${adminEmail})`,
          details: `Mise à jour du profil administrateur (${adminName}, ${adminEmail})${newPassword ? ' et renouvellement du mot de passe de sécurité' : ''}.`,
          severity: 'WARNING',
        });
      } else {
        setProfileError(res.error || 'Erreur lors de la mise à jour des identifiants.');
      }
    } catch {
      setProfileError('Une erreur inattendue est survenue.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="space-y-4 pb-8 max-w-5xl">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-500" />
            <span>Paramètres & Administration</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Journal de traçabilité des opérations, compte administrateur, snapshots et gestion des données
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto">
          <button
            id="tab-audit-logs"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Journal d'Audit</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-extrabold">
              {auditLogs.length}
            </span>
          </button>

          <button
            id="tab-account"
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'account'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Compte Administrateur</span>
          </button>

          <button
            id="tab-backups"
            onClick={() => setActiveTab('backups')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'backups'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Sauvegardes & Données</span>
          </button>

          <button
            id="tab-appsscript"
            onClick={() => setActiveTab('appsscript')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'appsscript'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Déploiement Apps Script</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Journal d'Audit */}
      {activeTab === 'audit' && <AuditLogSection />}

      {/* Tab 4: Apps Script Deployment */}
      {activeTab === 'appsscript' && <AppsScriptDeploymentSection />}

      {/* Tab 2: Admin Profile & Credentials */}
      {activeTab === 'account' && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Compte & Données d'Identification Administrateur
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Modifiez votre nom complet, votre adresse Gmail/Email de récupération et votre mot de passe d'accès
              </p>
            </div>
          </div>

          {profileSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Nom Complet de l'Administrateur *
                </label>
                <input
                  id="settings-admin-name"
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-blue-500" />
                  <span>Adresse Gmail / Email de Récupération *</span>
                </label>
                <input
                  id="settings-admin-email"
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-500" />
                  Changement de Mot de Passe (Optionnel)
                </span>
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {showPasswords ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPasswords ? 'Masquer' : 'Afficher'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    Mot de passe actuel
                  </label>
                  <input
                    id="settings-current-pass"
                    type={showPasswords ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Requis si modification"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    Nouveau mot de passe
                  </label>
                  <input
                    id="settings-new-pass"
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 caractères"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    Confirmation
                  </label>
                  <input
                    id="settings-confirm-pass"
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Répéter le mot de passe"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSnapshotModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Snapshot Identifiants (.json)</span>
                </button>
              </div>

              <button
                id="settings-save-profile-btn"
                type="submit"
                disabled={isSavingProfile}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Enregistrer les Modifications</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Backups & Data Operations */}
      {activeTab === 'backups' && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Sauvegardes & Traitements de Données
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Export/Import de snapshots chiffrés et assistant d'importation en masse
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Card 1: Snapshot Modal */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40 flex flex-col justify-between space-y-2.5">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                  <Archive className="w-4 h-4 text-indigo-500" />
                  <span>Snapshots Chiffrés</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Générez des archives complètes au format JSON sécurisé pour archivage local ou restauration.
                </p>
              </div>
              <button
                id="open-snapshot-modal-btn"
                onClick={() => setIsSnapshotModalOpen(true)}
                className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Gérer les Snapshots</span>
              </button>
            </div>

            {/* Card 2: Bulk Import Modal */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40 flex flex-col justify-between space-y-2.5">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                  <Upload className="w-4 h-4 text-blue-500" />
                  <span>Import en Masse</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Assistant d'importation rapide pour listes de structures et historiques de versements depuis Excel/CSV.
                </p>
              </div>
              <button
                id="open-bulk-import-modal-btn"
                onClick={() => setIsBulkImportModalOpen(true)}
                className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Assistant Import</span>
              </button>
            </div>

            {/* Card 3: Portfolio Excel Export */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40 flex flex-col justify-between space-y-2.5">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  <span>Audit Portefeuille</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Export consolidé multi-feuilles de tous les prêts, remboursements et échéances.
                </p>
              </div>
              <button
                id="settings-export-excel-btn"
                onClick={() => exportPortfolioToExcel(structures, decaissements, schedules, engagements, kpis)}
                className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exporter Portefeuille (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <SnapshotBackupModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
      />

      <BulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
      />
    </div>
  );
};
