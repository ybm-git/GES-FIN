import React, { useState, useMemo } from 'react';
import {
  Building2,
  Phone,
  Calendar,
  CreditCard,
  Receipt,
  FileSpreadsheet,
  FileText,
  Plus,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Percent,
  Check,
  AlertCircle,
  Edit3,
  Trash2,
  FileSignature,
  ShieldCheck,
  ShieldAlert,
  Gauge,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { Decaissement, Engagement } from '../../types';
import { EditStructureModal } from '../Modals/EditStructureModal';
import { DeleteStructureModal } from '../Modals/DeleteStructureModal';
import { RestructureLoanModal } from '../Modals/RestructureLoanModal';
import {
  exportStructureToExcel,
  exportStructureToWord,
} from '../../utils/exportUtils';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPercent,
} from '../../utils/formatters';
import { calculateSolvencyScore } from '../../utils/financialCalculations';

interface Props {
  structureId: string;
  onBack: () => void;
  onOpenNewDecaissement: (structureId: string) => void;
  onOpenNewEngagement: (decaissementId: string, echeancierId?: string) => void;
  onOpenEditDecaissement?: (decaissement: Decaissement) => void;
  onOpenEditEngagement?: (engagement: Engagement) => void;
  onOpenDeleteEngagement?: (engagement: Engagement) => void;
}

export const StructureDetailView: React.FC<Props> = ({
  structureId,
  onBack,
  onOpenNewDecaissement,
  onOpenNewEngagement,
  onOpenEditDecaissement,
  onOpenEditEngagement,
  onOpenDeleteEngagement,
}) => {
  const { structures, decaissements, schedules, engagements } = useFinance();
  const { canEdit } = useAuth();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRestructureModalOpen, setIsRestructureModalOpen] = useState(false);
  const [selectedRestructureDecId, setSelectedRestructureDecId] = useState<string | undefined>(undefined);

  const structure = useMemo(() => {
    return structures.find((s) => s.id === structureId);
  }, [structures, structureId]);

  // Associated Disbursements
  const structDecaissements = useMemo(() => {
    return decaissements.filter((d) => d.structure_id === structureId);
  }, [decaissements, structureId]);

  // Associated Engagements
  const structEngagements = useMemo(() => {
    return engagements.filter((e) =>
      structDecaissements.some((d) => d.id === e.decaissement_id)
    );
  }, [engagements, structDecaissements]);

  // Associated Schedules
  const structSchedules = useMemo(() => {
    return schedules.filter((s) =>
      structDecaissements.some((d) => d.id === s.decaissement_id)
    );
  }, [schedules, structDecaissements]);

  // Solvency Score Calculation
  const solvencyScore = useMemo(() => {
    return calculateSolvencyScore(structureId, decaissements, schedules, engagements);
  }, [structureId, decaissements, schedules, engagements]);

  // Financial Totals
  const totalPrincipal = useMemo(() => {
    return structDecaissements.reduce((sum, d) => sum + d.montant_principal, 0);
  }, [structDecaissements]);

  const totalDu = useMemo(() => {
    return structDecaissements.reduce((sum, d) => sum + d.montant_total_a_rembourser, 0);
  }, [structDecaissements]);

  const totalInterets = useMemo(() => {
    return Math.max(0, totalDu - totalPrincipal);
  }, [totalDu, totalPrincipal]);

  const totalRembourse = useMemo(() => {
    return structEngagements.reduce((sum, e) => sum + e.montant_verse, 0);
  }, [structEngagements]);

  const soldeRestant = useMemo(() => {
    return Math.max(0, totalDu - totalRembourse);
  }, [totalDu, totalRembourse]);

  const progressionPercent = totalDu > 0 ? (totalRembourse / totalDu) * 100 : 100;

  if (!structure) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <p className="text-slate-500">Structure introuvable.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl"
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 pb-8">
      
      {/* Top Navigation & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <button
          id="structure-detail-back-btn"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Retour aux structures</span>
        </button>

        {/* Exports & Actions */}
        <div className="flex items-center flex-wrap gap-1.5">
          <button
            id="structure-export-excel-btn"
            onClick={() =>
              exportStructureToExcel(
                structure,
                structDecaissements,
                structSchedules,
                structEngagements
              )
            }
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
            title="Exporter en feuille de calcul Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            id="structure-export-word-btn"
            onClick={() =>
              exportStructureToWord(
                structure,
                structDecaissements,
                structSchedules,
                structEngagements
              )
            }
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
            title="Générer un rapport Word (.docx)"
          >
            <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>Word (.docx)</span>
          </button>

          {canEdit && soldeRestant > 0.01 && (
            <button
              id="structure-restructure-btn"
              onClick={() => {
                setSelectedRestructureDecId(structDecaissements[0]?.id);
                setIsRestructureModalOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-medium transition-colors cursor-pointer"
              title="Restructurer / Rééchelonner une créance"
            >
              <FileSignature className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>Restructurer</span>
            </button>
          )}

          {canEdit && (
            <button
              id="structure-detail-edit-btn"
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-medium transition-colors cursor-pointer"
              title="Modifier les informations de la structure"
            >
              <Edit3 className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              <span>Modifier</span>
            </button>
          )}

          {canEdit && (
            <button
              id="structure-detail-delete-btn"
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium transition-colors cursor-pointer"
              title="Supprimer cette structure"
            >
              <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
              <span>Supprimer</span>
            </button>
          )}

          {canEdit && (
            <button
              id="structure-detail-add-dec-btn"
              onClick={() => onOpenNewDecaissement(structure.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>+ Prêt</span>
            </button>
          )}
        </div>
      </div>

      {/* Structure Header Card */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center text-white font-extrabold text-base shrink-0">
              {structure.raison_sociale.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 dark:text-white">
                  {structure.raison_sociale}
                </h1>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    soldeRestant > 0
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                      : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {soldeRestant > 0 ? 'EN COURS' : 'SOLDÉ'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Contact légal : <span className="font-semibold text-slate-700 dark:text-slate-300">{structure.contact_nom}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">{structure.telephone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Solvency Score & Risk Analysis Card */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-800/40 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative flex items-center justify-center">
              <div
                className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-extrabold shadow-inner border ${
                  solvencyScore.grade === 'A+' || solvencyScore.grade === 'A'
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-400'
                    : solvencyScore.grade === 'B'
                    ? 'bg-blue-500/20 border-blue-400/50 text-blue-400'
                    : solvencyScore.grade === 'C'
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-400'
                    : 'bg-red-500/20 border-red-400/50 text-red-400'
                }`}
              >
                <span className="text-lg leading-none">{solvencyScore.grade}</span>
                <span className="text-[10px] opacity-80 mt-0.5">{solvencyScore.score}/100</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                  Indice de Solvabilité & Risque Emprunteur
                </span>
                <span
                  className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                    solvencyScore.riskLevel === 'LOW'
                      ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-500/40'
                      : solvencyScore.riskLevel === 'MODERATE'
                      ? 'bg-blue-400/20 text-blue-300 border border-blue-500/40'
                      : solvencyScore.riskLevel === 'HIGH'
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-500/40'
                      : 'bg-red-400/20 text-red-300 border border-red-500/40'
                  }`}
                >
                  RISQUE {solvencyScore.riskLevel === 'LOW' ? 'FAIBLE' : solvencyScore.riskLevel === 'MODERATE' ? 'MODÉRÉ' : solvencyScore.riskLevel === 'HIGH' ? 'ÉLEVÉ' : 'CRITIQUE'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                {solvencyScore.recommendation}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
              <span className="text-[10px] text-slate-400 block">Ponctualité</span>
              <span className="font-bold text-white text-xs">{solvencyScore.ponctualiteScore}/40 pts</span>
            </div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
              <span className="text-[10px] text-slate-400 block">Recouvrement</span>
              <span className="font-bold text-emerald-400 text-xs">{solvencyScore.recouvrementScore}/30 pts</span>
            </div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
              <span className="text-[10px] text-slate-400 block">Retard Moyen</span>
              <span className="font-bold text-amber-400 text-xs">{solvencyScore.retardMoyenJours} j ({solvencyScore.delaiScore}/20)</span>
            </div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
              <span className="text-[10px] text-slate-400 block">Régularité</span>
              <span className="font-bold text-indigo-300 text-xs">{solvencyScore.regulariteScore}/10 pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Synthesis KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Total Emprunté */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Emprunté</span>
          <p className="text-lg font-bold text-slate-900 dark:text-white my-1">
            {formatCurrency(totalPrincipal)}
          </p>
          <p className="text-[10px] text-slate-400">{structDecaissements.length} dossier(s)</p>
        </div>

        {/* Total Dû avec Intérêts */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Dû (avec intérêts)</span>
          <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 my-1">
            {formatCurrency(totalDu)}
          </p>
          <p className="text-[10px] text-slate-400">Intérêts : +{formatCurrency(totalInterets)}</p>
        </div>

        {/* Total Remboursé */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Remboursé</span>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 my-1">
            {formatCurrency(totalRembourse)}
          </p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {progressionPercent.toFixed(1)}% couvert
          </p>
        </div>

        {/* Solde Restant */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Reste à Recouvrer</span>
          <p className={`text-lg font-bold my-1 ${soldeRestant > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatCurrency(soldeRestant)}
          </p>
          <p className="text-[10px] text-slate-400">
            {soldeRestant > 0 ? 'En cours' : 'Soldé'}
          </p>
        </div>
      </div>

      {/* Avancement Recouvrement Progress Card */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Avancement du Recouvrement
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Versements effectués par rapport au montant total dû
            </p>
          </div>
          <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
            {progressionPercent.toFixed(1)}%
          </span>
        </div>

        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${Math.min(100, progressionPercent)}%` }}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
          <span className="text-slate-600 dark:text-slate-300 font-medium">
            Remboursé : <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(totalRembourse)}</strong> / {formatCurrency(totalDu)}
          </span>
          <div className="p-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-[11px]">
            {soldeRestant <= 0.01 ? (
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Tous les engagements ont été intégralement soldés.</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>Solde restant à recouvrer : {formatCurrency(soldeRestant)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Disbursements Section */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Décaissements & Prêts Accordés
          </h2>
          {canEdit && soldeRestant > 0.01 && (
            <button
              onClick={() => {
                setSelectedRestructureDecId(structDecaissements[0]?.id);
                setIsRestructureModalOpen(true);
              }}
              className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer"
            >
              <FileSignature className="w-3.5 h-3.5" />
              <span>Négocier un rééchelonnement</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold text-[10px]">
                <th className="py-2 px-3">Réf</th>
                <th className="py-2 px-3">Date Décaissement</th>
                <th className="py-2 px-3">Principal</th>
                <th className="py-2 px-3">Taux</th>
                <th className="py-2 px-3">Total à Rembourser</th>
                <th className="py-2 px-3">Remboursé</th>
                <th className="py-2 px-3">Solde</th>
                <th className="py-2 px-3">Statut</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {structDecaissements.map((dec) => {
                const decEngs = engagements.filter((e) => e.decaissement_id === dec.id);
                const paid = decEngs.reduce((sum, e) => sum + e.montant_verse, 0);
                const solde = Math.max(0, dec.montant_total_a_rembourser - paid);

                return (
                  <tr key={dec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {dec.reference_unique}
                    </td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                      {formatDateTime(dec.date_decaissement)}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(dec.montant_principal)}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-600 dark:text-slate-300">
                      {formatPercent(dec.taux_interet)}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                      {formatCurrency(dec.montant_total_a_rembourser)}
                    </td>
                    <td className="py-2 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(paid)}
                    </td>
                    <td className="py-2 px-3 font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrency(solde)}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          dec.statut === 'CLOTURE' || solde <= 0.01
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {dec.statut}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && onOpenEditDecaissement && (
                          <button
                            id={`struct-detail-edit-dec-${dec.id}`}
                            onClick={() => onOpenEditDecaissement(dec)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors cursor-pointer"
                            title="Modifier ce décaissement"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                        {canEdit && solde > 0.01 && (
                          <button
                            onClick={() => onOpenNewEngagement(dec.id)}
                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] rounded transition-colors cursor-pointer"
                          >
                            Encaisser
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Schedules and Engagements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        
        {/* Échéanciers Trimestriels Table */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Échéancier Trimestriel
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold text-[10px]">
                  <th className="py-1.5 px-2.5">Trimestre</th>
                  <th className="py-1.5 px-2.5">Limite</th>
                  <th className="py-1.5 px-2.5">Prévu</th>
                  <th className="py-1.5 px-2.5">Payé</th>
                  <th className="py-1.5 px-2.5">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {structSchedules.map((ech) => {
                  return (
                    <tr key={ech.id}>
                      <td className="py-2 px-2.5 font-bold text-slate-800 dark:text-slate-200">
                        {ech.trimestre} {ech.annee}
                      </td>
                      <td className="py-2 px-2.5 text-slate-600 dark:text-slate-400">
                        {formatDate(ech.date_limite)}
                      </td>
                      <td className="py-2 px-2.5 font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(ech.montant_prevu)}
                      </td>
                      <td className="py-2 px-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(ech.montant_paye)}
                      </td>
                      <td className="py-2 px-2.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            ech.statut === 'SOLDE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : ech.statut === 'EN_RETARD'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {ech.statut === 'SOLDE'
                            ? 'RÉGLÉ'
                            : ech.statut === 'EN_RETARD'
                            ? 'EN RETARD'
                            : 'EN ATTENTE'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Historique des Engagements */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Journal des Règlements
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold text-[10px]">
                  <th className="py-1.5 px-2.5">Date</th>
                  <th className="py-1.5 px-2.5">Montant</th>
                  <th className="py-1.5 px-2.5">Reste</th>
                  <th className="py-1.5 px-2.5">Mode</th>
                  <th className="py-1.5 px-2.5">Reçu</th>
                  <th className="py-1.5 px-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {structEngagements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-400">
                      Aucun versement effectué à ce jour.
                    </td>
                  </tr>
                ) : (
                  structEngagements.map((eng) => (
                    <tr key={eng.id}>
                      <td className="py-2 px-2.5 text-slate-600 dark:text-slate-300">
                        {formatDateTime(eng.date_paiement)}
                      </td>
                      <td className="py-2 px-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(eng.montant_verse)}
                      </td>
                      <td className="py-2 px-2.5 text-slate-500 font-medium">
                        {formatCurrency(eng.reste_a_engager)}
                      </td>
                      <td className="py-2 px-2.5 text-slate-600 dark:text-slate-400">
                        {eng.mode_reglement}
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[10px] text-slate-500">
                        {eng.reference_recu || '-'}
                      </td>
                      <td className="py-2 px-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && onOpenEditEngagement && (
                            <button
                              id={`struct-detail-edit-eng-${eng.id}`}
                              onClick={() => onOpenEditEngagement(eng)}
                              className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors cursor-pointer"
                              title="Modifier ce versement"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              id={`struct-detail-delete-eng-${eng.id}`}
                              onClick={() => {
                                if (onOpenDeleteEngagement) {
                                  onOpenDeleteEngagement(eng);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                              title="Supprimer ce versement"
                            >
                              <Trash2 className="w-3 h-3" />
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
        </div>
      </div>

      {/* Edit Structure Modal */}
      <EditStructureModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        structure={structure}
      />

      {/* Delete Structure Modal */}
      <DeleteStructureModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        structure={structure}
        onDeleted={onBack}
      />

      {/* Restructure Loan Modal */}
      <RestructureLoanModal
        isOpen={isRestructureModalOpen}
        onClose={() => setIsRestructureModalOpen(false)}
        initialDecaissementId={selectedRestructureDecId}
      />
    </div>
  );
};
