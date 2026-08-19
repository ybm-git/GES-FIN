import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  Calendar,
  Building2,
  Percent,
  ChevronDown,
  ChevronUp,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  Edit3,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { Decaissement } from '../../types';
import { formatCurrency, formatDate, formatDateTime, formatPercent } from '../../utils/formatters';

interface Props {
  onOpenNewDecaissement: () => void;
  onOpenNewEngagement: (decaissementId: string, echeancierId?: string) => void;
  onOpenEditDecaissement: (decaissement: Decaissement) => void;
}

export const DecaissementsView: React.FC<Props> = ({
  onOpenNewDecaissement,
  onOpenNewEngagement,
  onOpenEditDecaissement,
}) => {
  const {
    decaissements,
    structures,
    schedules,
    engagements,
    setSelectedStructureId,
    setActiveView,
  } = useFinance();
  const { canEdit } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatut, setFilterStatut] = useState<'ALL' | 'ACTIF' | 'CLOTURE'>('ALL');
  const [expandedDecIds, setExpandedDecIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const toggleExpand = (id: string) => {
    setExpandedDecIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const decaissementsDetailed = useMemo(() => {
    return decaissements.map((d) => {
      const struct = structures.find((s) => s.id === d.structure_id);
      const decEngs = engagements.filter((e) => e.decaissement_id === d.id);
      const totalRembourse = decEngs.reduce((sum, e) => sum + e.montant_verse, 0);
      const soldeRestant = Math.max(0, Number((d.montant_total_a_rembourser - totalRembourse).toFixed(2)));
      const structSchedules = schedules.filter((s) => s.decaissement_id === d.id);
      const progress = d.montant_total_a_rembourser > 0 ? (totalRembourse / d.montant_total_a_rembourser) * 100 : 0;

      return {
        ...d,
        structure: struct,
        structure_nom: struct?.raison_sociale || d.reference_unique || '—',
        totalRembourse,
        soldeRestant,
        schedules: structSchedules,
        engagements: decEngs,
        progress,
      };
    });
  }, [decaissements, structures, engagements, schedules]);

  const filteredDecaissements = useMemo(() => {
    return decaissementsDetailed.filter((d) => {
      const matchesSearch =
        d.reference_unique.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.structure_nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.notes && d.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatut = filterStatut === 'ALL' || d.statut === filterStatut;

      return matchesSearch && matchesStatut;
    });
  }, [decaissementsDetailed, searchQuery, filterStatut]);

  const hasActiveFilters = searchQuery.trim() !== '' || filterStatut !== 'ALL';

  const filteredStats = useMemo(() => {
    const totalPrincipal = filteredDecaissements.reduce((sum, d) => sum + d.montant_principal, 0);
    const totalDu = filteredDecaissements.reduce((sum, d) => sum + d.montant_total_a_rembourser, 0);
    const totalRembourse = filteredDecaissements.reduce((sum, d) => sum + d.total_rembourse, 0);
    const resteARecouvrer = filteredDecaissements.reduce((sum, d) => sum + d.reste_a_payer, 0);
    return { totalPrincipal, totalDu, totalRembourse, resteARecouvrer };
  }, [filteredDecaissements]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredDecaissements.length / itemsPerPage));
  const paginatedDecs = filteredDecaissements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-4 pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Décaissements & Prêts Trimestriels</span>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium">
              {filteredDecaissements.length} {hasActiveFilters ? `/ ${decaissements.length}` : ''} dossiers
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Enregistrement des prêts, calculs des intérêts et ventilation de l'échéancier sur 4 trimestres
          </p>
        </div>

        {canEdit && (
          <button
            id="decaissements-new-btn"
            onClick={onOpenNewDecaissement}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-medium shadow-sm transition-all cursor-pointer w-fit"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nouveau Prêt</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-2.5 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
          <input
            id="decaissements-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Rechercher référence, structure..."
            className="w-full pl-8 pr-3 py-1.5 rounded-md text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
          <button
            onClick={() => {
              setFilterStatut('ALL');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
              filterStatut === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Tous ({decaissements.length})
          </button>
          <button
            onClick={() => {
              setFilterStatut('ACTIF');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
              filterStatut === 'ACTIF'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            En cours
          </button>
          <button
            onClick={() => {
              setFilterStatut('CLOTURE');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
              filterStatut === 'CLOTURE'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Soldés
          </button>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Principal Filtré</span>
          <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
            {formatCurrency(filteredStats.totalPrincipal)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Dû</span>
          <p className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
            {formatCurrency(filteredStats.totalDu)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Déjà Remboursé</span>
          <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatCurrency(filteredStats.totalRembourse)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Reste à Recouvrer</span>
          <p className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">
            {formatCurrency(filteredStats.resteARecouvrer)}
          </p>
        </div>
      </div>

      {/* Main Disbursements Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold text-[10px]">
                <th className="py-2.5 px-3">Réf</th>
                <th className="py-2.5 px-3">Structure</th>
                <th className="py-2.5 px-3">Date Prêt</th>
                <th className="py-2.5 px-3">Principal</th>
                <th className="py-2.5 px-3">Taux</th>
                <th className="py-2.5 px-3">Total Dû</th>
                <th className="py-2.5 px-3">Remboursé</th>
                <th className="py-2.5 px-3">Solde</th>
                <th className="py-2.5 px-3">Statut</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedDecs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Aucun décaissement correspondant trouvé.
                  </td>
                </tr>
              ) : (
                paginatedDecs.map((d) => {
                  const isExpanded = expandedDecIds.has(d.id);
                  return (
                    <React.Fragment key={d.id}>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        
                        {/* Reference with expand button */}
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          <button
                            onClick={() => toggleExpand(d.id)}
                            className="flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            <span>{d.reference_unique}</span>
                          </button>
                        </td>

                        {/* Structure */}
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => {
                              setSelectedStructureId(d.structure_id);
                              setActiveView('structures');
                            }}
                            className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left transition-colors cursor-pointer"
                          >
                            {d.structure_nom}
                          </button>
                          {d.notes && (
                            <p className="text-[10px] text-slate-400 truncate max-w-xs">{d.notes}</p>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                          {formatDateTime(d.date_decaissement)}
                        </td>

                        {/* Principal */}
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(d.montant_principal)}
                        </td>

                        {/* Taux */}
                        <td className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-300">
                          {formatPercent(d.taux_interet)}
                        </td>

                        {/* Total Dû */}
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                          {formatCurrency(d.montant_total_a_rembourser)}
                        </td>

                        {/* Remboursé */}
                        <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(d.totalRembourse)}
                        </td>

                        {/* Solde Restant */}
                        <td className="py-2.5 px-3">
                          <span
                            className={`font-bold ${
                              d.soldeRestant > 0.01
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {formatCurrency(d.soldeRestant)}
                          </span>
                        </td>

                        {/* Statut */}
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              d.statut === 'CLOTURE' || d.soldeRestant <= 0.01
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {d.statut === 'CLOTURE' ? 'SOLDÉ' : 'EN COURS'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canEdit && (
                              <button
                                id={`edit-dec-btn-${d.id}`}
                                onClick={() => onOpenEditDecaissement(d)}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                                title="Modifier les montants et conditions de ce prêt"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canEdit && d.soldeRestant > 0.01 && (
                              <button
                                onClick={() => onOpenNewEngagement(d.id)}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] shadow-xs transition-colors cursor-pointer"
                              >
                                Encaisser
                              </button>
                            )}
                            <button
                              onClick={() => toggleExpand(d.id)}
                              className="p-1 rounded border border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              title="Afficher l'échéancier"
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Quarterly Schedule Drawer */}
                      {isExpanded && (
                        <tr className="bg-blue-50/20 dark:bg-blue-950/20 border-y border-blue-100 dark:border-blue-900/30">
                          <td colSpan={10} className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                                <span>Échéances trimestrielles associées ({d.schedules.length}) :</span>
                                <span className="text-[10px] font-normal text-slate-500">
                                  Ventilation : 4 trimestres consécutifs de {formatCurrency(d.montant_total_a_rembourser / 4)}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                                {(d.schedules || []).map((ech) => {
                                  const echSolde = Math.max(0, ech.montant_prevu - ech.montant_paye);
                                  return (
                                    <div
                                      key={ech.id}
                                      className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                                          {ech.trimestre} {ech.annee}
                                        </span>
                                        <span
                                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                            ech.statut === 'SOLDE'
                                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                              : ech.statut === 'EN_RETARD'
                                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                          }`}
                                        >
                                          {ech.statut === 'SOLDE' ? 'RÉGLÉ' : ech.statut === 'EN_RETARD' ? 'EN RETARD' : 'EN ATTENTE'}
                                        </span>
                                      </div>

                                      <div className="text-[10px] space-y-0.5">
                                        <p className="text-slate-500 dark:text-slate-400">
                                          Limite : <span className="font-medium text-slate-700 dark:text-slate-300">{formatDate(ech.date_limite)}</span>
                                        </p>
                                        <p className="text-slate-500 dark:text-slate-400">
                                          Prévu : <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(ech.montant_prevu)}</span>
                                        </p>
                                        <p className="text-slate-500 dark:text-slate-400">
                                          Payé : <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(ech.montant_paye)}</span>
                                        </p>
                                        {echSolde > 0.01 && (
                                          <p className="text-amber-600 dark:text-amber-400 font-bold">
                                            Reste : {formatCurrency(echSolde)}
                                          </p>
                                        )}
                                      </div>

                                      {canEdit && echSolde > 0.01 && (
                                        <button
                                          onClick={() => onOpenNewEngagement(d.id, ech.id)}
                                          className="w-full mt-1 px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold transition-colors cursor-pointer"
                                        >
                                          Régler échéance
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between p-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
          <span>
            {paginatedDecs.length} sur {filteredDecaissements.length} décaissements
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
