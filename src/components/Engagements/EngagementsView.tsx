import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Calendar,
  CreditCard,
  Building2,
  CheckCircle2,
  Trash2,
  FileSpreadsheet,
  ArrowUpRight,
  Filter,
  Edit3,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { Engagement } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface Props {
  onOpenNewEngagement: () => void;
  onOpenEditEngagement: (engagement: Engagement) => void;
  onOpenDeleteEngagement?: (engagement: Engagement) => void;
}

export const EngagementsView: React.FC<Props> = ({
  onOpenNewEngagement,
  onOpenEditEngagement,
  onOpenDeleteEngagement,
}) => {
  const {
    engagements,
    decaissements,
    structures,
    schedules,
    deleteEngagement,
    setSelectedStructureId,
    setActiveView,
  } = useFinance();
  const { canEdit, isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const engagementsDetailed = useMemo(() => {
    return engagements.map((eng) => {
      const dec = decaissements.find((d) => d.id === eng.decaissement_id);
      const struct = structures.find((s) => s.id === dec?.structure_id);
      const ech = schedules.find((s) => s.id === eng.echeancier_id);

      return {
        ...eng,
        decaissement: dec,
        structure: struct,
        echeancier: ech,
        structure_nom: struct?.raison_sociale || (dec?.reference_unique ? `Prêt ${dec.reference_unique}` : '—'),
        reference_dec: dec?.reference_unique || '-',
      };
    });
  }, [engagements, decaissements, structures, schedules]);

  const filteredEngagements = useMemo(() => {
    return engagementsDetailed.filter((eng) => {
      const matchesSearch =
        eng.reference_dec.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eng.structure_nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (eng.reference_recu && eng.reference_recu.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (eng.notes && eng.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesMode = filterMode === 'ALL' || eng.mode_reglement === filterMode;

      return matchesSearch && matchesMode;
    });
  }, [engagementsDetailed, searchQuery, filterMode]);

  // Filtered engagements summary calculations
  const totalCollected = useMemo(() => {
    return filteredEngagements.reduce((sum, e) => sum + e.montant_verse, 0);
  }, [filteredEngagements]);

  const hasActiveFilters = searchQuery.trim() !== '' || filterMode !== 'ALL';

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredEngagements.length / itemsPerPage));
  const paginatedEngs = filteredEngagements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-4 pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Engagements & Remboursements</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-medium">
              {filteredEngagements.length} {hasActiveFilters ? `/ ${engagements.length}` : ''} reçus
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Journal comptable des encaissements effectifs avec mise à jour immédiate du reste à engager
          </p>
        </div>

        {canEdit && (
          <button
            id="engagements-new-btn"
            onClick={onOpenNewEngagement}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-medium shadow-sm transition-all cursor-pointer w-fit"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nouveau Versement</span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
          <input
            id="engagements-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Rechercher structure, réf prêt, reçu..."
            className="w-full pl-8 pr-3 py-1.5 rounded-md text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
          />
        </div>

        {/* Mode filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            id="engagements-filter-mode"
            value={filterMode}
            onChange={(e) => {
              setFilterMode(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="ALL">Tous les modes de règlement</option>
            <option value="VIREMENT">Virement bancaire</option>
            <option value="CHEQUE">Chèque</option>
            <option value="ESPECES">Espèces</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="AUTRE">Autre</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterMode('ALL');
                setCurrentPage(1);
              }}
              className="text-xs text-red-500 hover:underline whitespace-nowrap"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Summary Banner (Dynamically recomputed based on active filters) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Encaissé</span>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 my-1">
            {formatCurrency(totalCollected)}
          </p>
          <span className="text-[10px] text-slate-400">
            {hasActiveFilters ? 'Somme des versements filtrés' : 'Somme cumulée'}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Transactions</span>
          <p className="text-lg font-bold text-slate-900 dark:text-white my-1">
            {filteredEngagements.length} {filteredEngagements.length > 1 ? 'versements' : 'versement'}
            {hasActiveFilters && <span className="text-xs font-normal text-slate-400"> / {engagements.length}</span>}
          </p>
          <span className="text-[10px] text-slate-400">
            {hasActiveFilters ? 'Résultats correspondants' : 'Historique complet'}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Moyenne / Versement</span>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400 my-1">
            {filteredEngagements.length > 0 ? formatCurrency(totalCollected / filteredEngagements.length) : formatCurrency(0)}
          </p>
          <span className="text-[10px] text-slate-400">Ticket moyen sélectionné</span>
        </div>
      </div>

      {/* Engagements Ledger Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold text-[10px]">
                <th className="py-2.5 px-3">Date & Heure</th>
                <th className="py-2.5 px-3">Structure</th>
                <th className="py-2.5 px-3">Réf. Prêt</th>
                <th className="py-2.5 px-3">Échéance</th>
                <th className="py-2.5 px-3">Montant Versé</th>
                <th className="py-2.5 px-3">Reste Dû</th>
                <th className="py-2.5 px-3">Mode</th>
                <th className="py-2.5 px-3">Reçu</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedEngs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Aucun remboursement correspondant.
                  </td>
                </tr>
              ) : (
                paginatedEngs.map((eng) => (
                  <tr key={eng.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {formatDateTime(eng.date_paiement)}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                      {eng.structure ? (
                        <button
                          id={`eng-struct-btn-${eng.id}`}
                          onClick={() => {
                            setSelectedStructureId(eng.structure!.id);
                            setActiveView('structures');
                          }}
                          className="hover:text-purple-600 dark:hover:text-purple-400 hover:underline text-left cursor-pointer transition-colors"
                          title="Voir la fiche détaillée de la structure"
                        >
                          {eng.structure_nom}
                        </button>
                      ) : (
                        <span>{eng.structure_nom}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {eng.reference_dec}
                    </td>
                    <td className="py-2.5 px-3">
                      {eng.echeancier ? (
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold text-[9px]">
                          {eng.echeancier.trimestre} {eng.echeancier.annee}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Auto</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(eng.montant_verse)}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-300">
                      {formatCurrency(eng.reste_a_engager)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {eng.mode_reglement || 'VIREMENT'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">
                      {eng.reference_recu || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button
                            id={`edit-eng-btn-${eng.id}`}
                            onClick={() => onOpenEditEngagement(eng)}
                            className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                            title="Modifier ce versement (montant, date, mode...)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            id={`delete-eng-btn-${eng.id}`}
                            onClick={() => {
                              if (onOpenDeleteEngagement) {
                                onOpenDeleteEngagement(eng);
                              } else {
                                deleteEngagement(eng.id);
                              }
                            }}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Supprimer / Annuler ce versement"
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
            {paginatedEngs.length} sur {filteredEngagements.length} versements
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
    </div>
  );
};
