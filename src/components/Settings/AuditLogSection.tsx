import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  Trash2,
  Calendar,
  Clock,
  User,
  PlusCircle,
  Edit,
  Trash,
  FileCheck,
  KeyRound,
  Database,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { AuditLogEntry, AuditActionType, AuditSeverity } from '../../types';
import { formatDateTime } from '../../utils/formatters';
import * as XLSX from 'xlsx';

export const AuditLogSection: React.FC = () => {
  const { auditLogs, clearAuditLogs } = useFinance();
  const { canEdit, currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [filterEntity, setFilterEntity] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // Search
      const matchesSearch =
        searchQuery.trim() === '' ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.target_label && log.target_label.toLowerCase().includes(searchQuery.toLowerCase())) ||
        log.user_nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action_type.toLowerCase().includes(searchQuery.toLowerCase());

      // Action type filter
      let matchesAction = true;
      if (filterAction === 'CREATE') {
        matchesAction = log.action_type.startsWith('CREATE');
      } else if (filterAction === 'UPDATE') {
        matchesAction = log.action_type.startsWith('UPDATE');
      } else if (filterAction === 'DELETE') {
        matchesAction = log.action_type.startsWith('DELETE');
      } else if (filterAction === 'RESTRUCTURE') {
        matchesAction = log.action_type === 'RESTRUCTURE_LOAN';
      } else if (filterAction === 'BACKUP_AUTH') {
        matchesAction =
          log.action_type.includes('SNAPSHOT') ||
          log.action_type === 'UPDATE_ADMIN_CREDENTIALS' ||
          log.action_type === 'BULK_IMPORT';
      }

      // Entity filter
      const matchesEntity = filterEntity === 'ALL' || log.target_entity === filterEntity;

      // Severity filter
      const matchesSeverity = filterSeverity === 'ALL' || log.severity === filterSeverity;

      return matchesSearch && matchesAction && matchesEntity && matchesSeverity;
    });
  }, [auditLogs, searchQuery, filterAction, filterEntity, filterSeverity]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  // Counts
  const createCount = useMemo(
    () => auditLogs.filter((l) => l.action_type.startsWith('CREATE')).length,
    [auditLogs]
  );
  const updateCount = useMemo(
    () => auditLogs.filter((l) => l.action_type.startsWith('UPDATE') || l.action_type === 'RESTRUCTURE_LOAN').length,
    [auditLogs]
  );
  const deleteCount = useMemo(
    () => auditLogs.filter((l) => l.action_type.startsWith('DELETE')).length,
    [auditLogs]
  );
  const criticalCount = useMemo(
    () => auditLogs.filter((l) => l.severity === 'CRITICAL').length,
    [auditLogs]
  );

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredLogs.map((log) => ({
      'ID Événement': log.id,
      'Horodatage (UTC/Local)': formatDateTime(log.timestamp),
      'Utilisateur / Admin': log.user_nom,
      'Email Administrateur': log.user_email,
      'Rôle': log.user_role,
      'Type d\'Action': log.action_type,
      'Entité Cible': log.target_entity,
      'Élément / Référence': log.target_label || log.target_id || '-',
      'Détails de l\'opération': log.details,
      'Gravité': log.severity,
      'Adresse IP': log.ip_address || '127.0.0.1',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Journal Audit');

    const fileName = `GES_FIN_Journal_Audit_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Export to JSON
  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gesfin-audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper for rendering Action Badge
  const renderActionBadge = (action: AuditActionType) => {
    if (action.startsWith('CREATE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
          <PlusCircle className="w-3 h-3" />
          <span>Création</span>
        </span>
      );
    }
    if (action.startsWith('UPDATE') && action !== 'UPDATE_ADMIN_CREDENTIALS') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
          <Edit className="w-3 h-3" />
          <span>Modification</span>
        </span>
      );
    }
    if (action === 'RESTRUCTURE_LOAN') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
          <RefreshCw className="w-3 h-3" />
          <span>Restructuration</span>
        </span>
      );
    }
    if (action.startsWith('DELETE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60">
          <Trash className="w-3 h-3" />
          <span>Suppression</span>
        </span>
      );
    }
    if (action === 'RESTORE_SNAPSHOT' || action === 'RESTORE_AUTH_SNAPSHOT') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
          <Database className="w-3 h-3" />
          <span>Restauration</span>
        </span>
      );
    }
    if (action === 'BULK_IMPORT') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
          <FileSpreadsheet className="w-3 h-3" />
          <span>Import Masse</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
        <KeyRound className="w-3 h-3" />
        <span>Sécurité</span>
      </span>
    );
  };

  // Helper for Severity Badge
  const renderSeverityBadge = (sev: AuditSeverity) => {
    if (sev === 'CRITICAL') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-red-600 text-white">
          Critique
        </span>
      );
    }
    if (sev === 'WARNING') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-500 text-white">
          Important
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
        Info
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Section Header Banner */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-blue-400 border border-slate-700">
            <ShieldAlert className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span>Journal d'Audit & Traçabilité des Actions</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
                {auditLogs.length} événements
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enregistrement immuable et horodaté de toutes les créations, modifications, suppressions et restaurations
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="audit-export-excel-btn"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Exporter l'historique complet au format Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            id="audit-export-json-btn"
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-300 dark:border-slate-700"
            title="Télécharger l'archive JSON brute du journal d'audit"
          >
            <Database className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          {canEdit && (
            <button
              id="audit-clear-logs-btn"
              onClick={() => setIsConfirmClearOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-red-200 dark:border-red-800/60"
              title="Vider l'historique"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Créations</span>
            <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{createCount}</p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <PlusCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Modifications</span>
            <p className="text-base font-extrabold text-blue-600 dark:text-blue-400">{updateCount}</p>
          </div>
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <Edit className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Suppressions</span>
            <p className="text-base font-extrabold text-red-600 dark:text-red-400">{deleteCount}</p>
          </div>
          <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400">
            <Trash className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Opérations Critiques</span>
            <p className="text-base font-extrabold text-amber-600 dark:text-amber-400">{criticalCount}</p>
          </div>
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-2.5 justify-between">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              id="audit-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Rechercher action, structure, prêt, détails..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Filters Selectors */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Filter Action */}
            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Toutes les Actions</option>
              <option value="CREATE">Créations</option>
              <option value="UPDATE">Modifications</option>
              <option value="RESTRUCTURE">Restructurations</option>
              <option value="DELETE">Suppressions</option>
              <option value="BACKUP_AUTH">Sauvegardes / Imports / Sécurité</option>
            </select>

            {/* Filter Entity */}
            <select
              value={filterEntity}
              onChange={(e) => {
                setFilterEntity(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Toutes les Entités</option>
              <option value="STRUCTURE">Structures Emprunteurs</option>
              <option value="DECAISSEMENT">Décaissements / Prêts</option>
              <option value="ENGAGEMENT">Engagements / Versements</option>
              <option value="AUTH">Authentification & Accès</option>
              <option value="BACKUP">Sauvegardes & Snapshots</option>
              <option value="SYSTEM">Système Global</option>
            </select>

            {/* Filter Severity */}
            <select
              value={filterSeverity}
              onChange={(e) => {
                setFilterSeverity(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Toutes Gravités</option>
              <option value="INFO">Information (INFO)</option>
              <option value="WARNING">Important (WARNING)</option>
              <option value="CRITICAL">Critique (CRITICAL)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3.5 whitespace-nowrap">Horodatage</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Administrateur</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Action</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Cible & Référence</th>
                <th className="py-2.5 px-4">Détails de l'Opération</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Niveau</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <CheckCircle2 className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">Aucun événement ne correspond aux filtres</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Modifiez vos critères ou votre recherche pour afficher plus de logs.</p>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-semibold font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatDateTime(log.timestamp)}</span>
                      </div>
                    </td>

                    {/* Admin User */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                          {log.user_nom ? log.user_nom.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white leading-tight text-[11px]">
                            {log.user_nom || 'Admin'}
                          </p>
                          <p className="text-[10px] text-slate-400 leading-tight">
                            {log.user_email || 'admin@finantrim.fr'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Action Badge */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {renderActionBadge(log.action_type)}
                    </td>

                    {/* Target */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-white text-[11px]">
                        {log.target_label || log.target_id || '—'}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                        {log.target_entity}
                      </div>
                    </td>

                    {/* Details */}
                    <td className="py-2.5 px-4">
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                        {log.details}
                      </p>
                    </td>

                    {/* Severity */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {renderSeverityBadge(log.severity)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Affichage de <strong className="text-slate-900 dark:text-white">{filteredLogs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> à{' '}
            <strong className="text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</strong> sur{' '}
            <strong className="text-slate-900 dark:text-white">{filteredLogs.length}</strong> événements
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-xs"
            >
              Précédent
            </button>
            <span className="px-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              Page {currentPage} sur {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-xs"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal to Clear Logs */}
      {isConfirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Vider le Journal d'Audit ?
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Êtes-vous certain de vouloir réinitialiser l'historique d'audit ? Cette action archivera un événement de réinitialisation et supprimera les traces antérieures locales.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmClearOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAuditLogs();
                  setIsConfirmClearOpen(false);
                  setCurrentPage(1);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                Confirmer l'effacement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
