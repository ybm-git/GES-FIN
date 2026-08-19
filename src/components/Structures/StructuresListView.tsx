import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  Plus,
  FileSpreadsheet,
  FileText,
  ChevronRight,
  Eye,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Filter,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { StructureDetailView } from './StructureDetailView';
import { EditStructureModal } from '../Modals/EditStructureModal';
import { DeleteStructureModal } from '../Modals/DeleteStructureModal';
import { Structure, Decaissement, Engagement } from '../../types';
import {
  exportActiveStructuresToExcel,
  exportStructureToExcel,
  exportStructureToWord,
} from '../../utils/exportUtils';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface Props {
  onOpenNewStructure: () => void;
  onOpenNewDecaissement: (structureId?: string) => void;
  onOpenNewEngagement: (decaissementId?: string) => void;
  onOpenEditDecaissement?: (decaissement: Decaissement) => void;
  onOpenEditEngagement?: (engagement: Engagement) => void;
  onOpenDeleteEngagement?: (engagement: Engagement) => void;
}

export const StructuresListView: React.FC<Props> = ({
  onOpenNewStructure,
  onOpenNewDecaissement,
  onOpenNewEngagement,
  onOpenEditDecaissement,
  onOpenEditEngagement,
  onOpenDeleteEngagement,
}) => {
  const {
    structures,
    decaissements,
    schedules,
    engagements,
    selectedStructureId,
    setSelectedStructureId,
  } = useFinance();
  const { canEdit, isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'SOLDE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modals state
  const [editingStructure, setEditingStructure] = useState<Structure | null>(null);
  const [deletingStructure, setDeletingStructure] = useState<Structure | null>(null);

  // Calculate stats per structure
  const structuresWithStats = useMemo(() => {
    return structures.map((s) => {
      const structDecs = decaissements.filter((d) => d.structure_id === s.id);
      const totalPrincipal = structDecs.reduce((sum, d) => sum + d.montant_principal, 0);
      const totalDu = structDecs.reduce((sum, d) => sum + d.montant_total_a_rembourser, 0);

      const structEngs = engagements.filter((e) =>
        structDecs.some((d) => d.id === e.decaissement_id)
      );
      const totalRembourse = structEngs.reduce((sum, e) => sum + e.montant_verse, 0);
      const soldeRestant = Math.max(0, totalDu - totalRembourse);
      const progress = totalDu > 0 ? (totalRembourse / totalDu) * 100 : 0;
      const isActif = soldeRestant > 0.01;

      return {
        ...s,
        totalPrincipal,
        totalDu,
        totalRembourse,
        soldeRestant,
        progress,
        isActif,
        decaissementsCount: structDecs.length,
      };
    });
  }, [structures, decaissements, engagements]);

  // Filter & Search
  const filteredStructures = useMemo(() => {
    return structuresWithStats.filter((s) => {
      const matchesSearch =
        s.raison_sociale.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.contact_nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.telephone && s.telephone.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'ACTIVE' && s.isActif) ||
        (filterStatus === 'SOLDE' && !s.isActif);

      return matchesSearch && matchesStatus;
    });
  }, [structuresWithStats, searchQuery, filterStatus]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredStructures.length / itemsPerPage));
  const paginatedStructures = filteredStructures.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // If a structure is currently selected, show its dedicated view
  if (selectedStructureId) {
    return (
      <StructureDetailView
        structureId={selectedStructureId}
        onBack={() => setSelectedStructureId(null)}
        onOpenNewDecaissement={onOpenNewDecaissement}
        onOpenNewEngagement={onOpenNewEngagement}
        onOpenEditDecaissement={onOpenEditDecaissement}
        onOpenEditEngagement={onOpenEditEngagement}
        onOpenDeleteEngagement={onOpenDeleteEngagement}
      />
    );
  }

  return (
    <div className="space-y-4 pb-8">
      
      {/* High-Density Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Structures Emprunteurs</span>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 font-medium">
              {structures.length} entités
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Répertoire des bénéficiaires, suivi individuel des remboursements et exports
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            id="structures-export-all-btn"
            onClick={() => exportActiveStructuresToExcel(structures, decaissements, engagements)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Excel (.xlsx)</span>
          </button>

          {canEdit && (
            <button
              id="structures-add-btn"
              onClick={onOpenNewStructure}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nouvelle Structure</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-2.5 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
          <input
            id="structures-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Rechercher raison sociale, contact..."
            className="w-full pl-8 pr-3 py-1.5 rounded-md text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status filter */}
          <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
            <button
              onClick={() => {
                setFilterStatus('ALL');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer ${
                filterStatus === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Toutes ({structures.length})
            </button>
            <button
              onClick={() => {
                setFilterStatus('ACTIVE');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer ${
                filterStatus === 'ACTIVE'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              En cours
            </button>
            <button
              onClick={() => {
                setFilterStatus('SOLDE');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer ${
                filterStatus === 'SOLDE'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Soldées
            </button>
          </div>
        </div>
      </div>

      {/* Structures Grid / Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold text-[10px]">
                <th className="py-2.5 px-3.5">Structure Emprunteur</th>
                <th className="py-2.5 px-3.5">Contact</th>
                <th className="py-2.5 px-3.5">Prêts</th>
                <th className="py-2.5 px-3.5">Total Dû</th>
                <th className="py-2.5 px-3.5">Remboursé</th>
                <th className="py-2.5 px-3.5">Solde Restant</th>
                <th className="py-2.5 px-3.5">Avancement</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedStructures.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Aucune structure correspondant aux critères de recherche.
                  </td>
                </tr>
              ) : (
                paginatedStructures.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Structure Info */}
                    <td className="py-2.5 px-3.5">
                      <div
                        onClick={() => setSelectedStructureId(s.id)}
                        className="flex items-center gap-2.5 cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {s.raison_sociale.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">
                            {s.raison_sociale}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-300">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{s.contact_nom}</p>
                      <p className="text-[10px] text-slate-400">{s.telephone}</p>
                    </td>

                    {/* Prêts count */}
                    <td className="py-2.5 px-3.5">
                      <span className="inline-block px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold text-[11px]">
                        {s.decaissementsCount} prêt(s)
                      </span>
                    </td>

                    {/* Total Dû */}
                    <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white">
                      {formatCurrency(s.totalDu)}
                    </td>

                    {/* Total Remboursé */}
                    <td className="py-2.5 px-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(s.totalRembourse)}
                    </td>

                    {/* Solde Restant */}
                    <td className="py-2.5 px-3.5">
                      <span
                        className={`font-bold ${
                          s.soldeRestant > 0.01
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {formatCurrency(s.soldeRestant)}
                      </span>
                    </td>

                    {/* Progress Bar */}
                    <td className="py-2.5 px-3.5 min-w-[120px]">
                      <div className="flex items-center justify-between text-[10px] mb-1 font-semibold">
                        <span className="text-slate-500">{s.progress.toFixed(0)}%</span>
                        <span
                          className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                            s.isActif ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {s.isActif ? 'En cours' : 'Soldé'}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.min(100, s.progress)}%` }}
                        />
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          id={`structure-view-btn-${s.id}`}
                          onClick={() => setSelectedStructureId(s.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
                          title="Consulter la fiche détaillée"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {canEdit && (
                          <button
                            id={`structure-edit-btn-${s.id}`}
                            onClick={() => setEditingStructure(s)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
                            title="Modifier les coordonnées"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          id={`structure-export-excel-btn-${s.id}`}
                          onClick={() =>
                            exportStructureToExcel(
                              s,
                              decaissements.filter((d) => d.structure_id === s.id),
                              schedules,
                              engagements
                            )
                          }
                          className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                          title="Export Excel (.xlsx)"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </button>

                        <button
                          id={`structure-export-word-btn-${s.id}`}
                          onClick={() =>
                            exportStructureToWord(
                              s,
                              decaissements.filter((d) => d.structure_id === s.id),
                              schedules,
                              engagements
                            )
                          }
                          className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                          title="Export Word (.docx)"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        {canEdit && (
                          <button
                            id={`structure-add-loan-btn-${s.id}`}
                            onClick={() => onOpenNewDecaissement(s.id)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                            title="Ajouter un décaissement"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canEdit && (
                          <button
                            id={`structure-delete-btn-${s.id}`}
                            onClick={() => setDeletingStructure(s)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Supprimer la structure"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between p-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
          <span>
            {paginatedStructures.length} sur {filteredStructures.length} structures
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Précédent
            </button>
            <span className="px-1.5 font-medium text-slate-700 dark:text-slate-300">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>

      {/* Modals for Edit and Delete */}
      <EditStructureModal
        isOpen={!!editingStructure}
        onClose={() => setEditingStructure(null)}
        structure={editingStructure}
      />

      <DeleteStructureModal
        isOpen={!!deletingStructure}
        onClose={() => setDeletingStructure(null)}
        structure={deletingStructure}
      />
    </div>
  );
};
