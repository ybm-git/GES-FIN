import React, { useState, useMemo } from 'react';
import {
  FileSignature,
  Calendar,
  Percent,
  AlertTriangle,
  CheckCircle2,
  X,
  Building2,
  Receipt,
  Scale,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { calculateTotalToRepay, generateCustomQuarterlySchedule } from '../../utils/financialCalculations';
import { Decaissement } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialDecaissementId?: string;
}

export const RestructureLoanModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialDecaissementId,
}) => {
  const { structures, decaissements, engagements, restructureDecaissement } = useFinance();

  const activeLoans = useMemo(() => {
    return decaissements.filter((d) => d.statut === 'ACTIF');
  }, [decaissements]);

  const [selectedDecId, setSelectedDecId] = useState<string>(
    initialDecaissementId || activeLoans[0]?.id || ''
  );

  const [quarterCount, setQuarterCount] = useState<number>(6);
  const [newInterestRate, setNewInterestRate] = useState<number>(3.0);
  const [penaliteMontant, setPenaliteMontant] = useState<number>(0);
  const [motif, setMotif] = useState<string>(
    'Accord amiable de rééchelonnement de créance pour soulager la trésorerie.'
  );
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successAvenant, setSuccessAvenant] = useState<any | null>(null);

  if (!isOpen) return null;

  const currentDec = decaissements.find((d) => d.id === selectedDecId);
  const currentStructure = currentDec ? structures.find((s) => s.id === currentDec.structure_id) : null;

  const loanEngagements = currentDec ? engagements.filter((e) => e.decaissement_id === currentDec.id) : [];
  const alreadyPaid = loanEngagements.reduce((sum, e) => sum + e.montant_verse, 0);
  const soldeRestantActuel = currentDec
    ? Math.max(0, currentDec.montant_total_a_rembourser - alreadyPaid)
    : 0;

  // Real-time calculation of restructured figures
  const baseRestructuree = soldeRestantActuel + penaliteMontant;
  const nouveauTotalSurSolde = calculateTotalToRepay(baseRestructuree, newInterestRate);
  const nouveauTotalGlobal = alreadyPaid + nouveauTotalSurSolde;

  const simulatedSchedule = currentDec
    ? generateCustomQuarterlySchedule(currentDec.id, nouveauTotalSurSolde, startDate, quarterCount)
    : [];

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentDec) {
      setErrorMessage('Veuillez sélectionner un dossier de prêt.');
      return;
    }

    if (soldeRestantActuel <= 0.01) {
      setErrorMessage('Ce dossier est déjà totalement remboursé.');
      return;
    }

    if (!motif.trim()) {
      setErrorMessage('Veuillez préciser le motif de la renégociation.');
      return;
    }

    const res = restructureDecaissement(currentDec.id, {
      nombre_trimestres: quarterCount,
      nouveau_taux_interet: newInterestRate,
      penalites_retard: penaliteMontant > 0 ? penaliteMontant : undefined,
      motif: motif.trim(),
      date_debut: startDate,
    });

    if (res.success && res.avenant) {
      setSuccessAvenant(res.avenant);
    } else {
      setErrorMessage(res.error || 'Erreur lors de la restructuration.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-950/30 dark:to-orange-950/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Restructuration & Rééchelonnement de Créance
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Édition d'un avenant contractuel, étalement des échéances et ajustement des pénalités
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

        {/* Modal Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          
          {successAvenant ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Avenant N°{successAvenant.numero_avenant} Enregistré avec Succès !
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Le dossier de prêt a été restructuré sur {successAvenant.nombre_trimestres} nouveaux trimestres. Les échéanciers et les KPIs du portefeuille ont été recalculés automatiquement.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-left text-xs space-y-2 max-w-md mx-auto font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Solde restructuré :</span>
                  <span className="font-bold">{formatCurrency(successAvenant.solde_restructure)}</span>
                </div>
                {successAvenant.penalites_retard && (
                  <div className="flex justify-between text-amber-600">
                    <span>Pénalités intégrées :</span>
                    <span className="font-bold">+{formatCurrency(successAvenant.penalites_retard)}</span>
                  </div>
                )}
                <div className="flex justify-between text-blue-600">
                  <span>Nouveau total à recouvrer :</span>
                  <span className="font-bold">{formatCurrency(successAvenant.nouveau_montant_total)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
              >
                Terminer et Fermer
              </button>
            </div>
          ) : (
            <form onSubmit={handleApply} className="space-y-4">
              
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Step 1: Select Loan */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Sélectionner le Prêt / Engagement à Restructurer *</span>
                </label>
                <select
                  value={selectedDecId}
                  onChange={(e) => setSelectedDecId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {activeLoans.map((d) => {
                    const st = structures.find((s) => s.id === d.structure_id);
                    return (
                      <option key={d.id} value={d.id}>
                        {d.reference_unique || d.id} — {st?.raison_sociale || 'Structure'} (Principal: {formatCurrency(d.montant_principal)})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Loan Diagnostics Box */}
              {currentDec && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Emprunteur</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate block">
                      {currentStructure?.raison_sociale}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Déjà Remboursé</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(alreadyPaid)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Solde Restant à Traiter</span>
                    <span className="font-bold text-amber-600">{formatCurrency(soldeRestantActuel)}</span>
                  </div>
                </div>
              )}

              {/* Step 2: Restructuring Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-500" />
                    <span>Nouveau Délai (Trimestres)</span>
                  </label>
                  <select
                    value={quarterCount}
                    onChange={(e) => setQuarterCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value={2}>2 Trimestres (6 mois)</option>
                    <option value={3}>3 Trimestres (9 mois)</option>
                    <option value={4}>4 Trimestres (1 an)</option>
                    <option value={6}>6 Trimestres (1 an et demi)</option>
                    <option value={8}>8 Trimestres (2 ans)</option>
                    <option value={12}>12 Trimestres (3 ans)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Percent className="w-3 h-3 text-blue-500" />
                    <span>Nouveau Taux d'Intérêt (%)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="30"
                    value={newInterestRate}
                    onChange={(e) => setNewInterestRate(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Scale className="w-3 h-3 text-red-500" />
                    <span>Pénalités Retard (F CFA)</span>
                  </label>
                  <input
                    type="number"
                    step="10000"
                    min="0"
                    value={penaliteMontant}
                    onChange={(e) => setPenaliteMontant(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Step 3: Date & Motif */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Date d'Effet du Nouvel Échéancier
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Motif Contractuel de l'Avenant *
                  </label>
                  <input
                    type="text"
                    required
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Simulation Result */}
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Simulation du Rééchelonnement
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {quarterCount} trimestres d'environ {formatCurrency(nouveauTotalSurSolde / quarterCount)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  {simulatedSchedule.map((ech, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-white dark:bg-slate-800 border border-amber-200/60 dark:border-amber-900/40 text-center"
                    >
                      <span className="text-[10px] text-slate-400 block">{ech.trimestre} {ech.annee}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        {formatCurrency(ech.montant_prevu)}
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        Échéance : {formatDate(ech.date_limite)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={soldeRestantActuel <= 0.01}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs rounded-lg shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <FileSignature className="w-4 h-4" />
                  <span>Générer l'Avenant & Rééchelonner</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
