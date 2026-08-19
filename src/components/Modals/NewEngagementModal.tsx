import React, { useState, useMemo } from 'react';
import { X, CreditCard, Calendar, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultDecaissementId?: string;
  defaultEcheancierId?: string;
}

export const NewEngagementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  defaultDecaissementId,
  defaultEcheancierId,
}) => {
  const { structures, decaissements, schedules, engagements, addEngagement } = useFinance();

  const activeDecaissements = useMemo(() => {
    return decaissements.map((d) => {
      const struct = structures.find((s) => s.id === d.structure_id);
      const decEngs = engagements.filter((e) => e.decaissement_id === d.id);
      const paid = decEngs.reduce((sum, e) => sum + e.montant_verse, 0);
      const solde = Math.max(0, Number((d.montant_total_a_rembourser - paid).toFixed(2)));
      return {
        ...d,
        structure_nom: struct?.raison_sociale || d.reference_unique || '—',
        deja_paye: paid,
        solde_restant: solde,
      };
    });
  }, [decaissements, structures, engagements]);

  const [selectedDecId, setSelectedDecId] = useState<string>(
    defaultDecaissementId || (activeDecaissements[0]?.id ?? '')
  );
  const [selectedEchId, setSelectedEchId] = useState<string>(defaultEcheancierId || '');
  const [montantVerse, setMontantVerse] = useState<number>(0);
  const [datePaiement, setDatePaiement] = useState<string>(new Date().toISOString().slice(0, 16));
  const [modeReglement, setModeReglement] = useState<'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'ESPECES'>('VIREMENT');
  const [refRecu, setRefRecu] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync defaults
  React.useEffect(() => {
    if (defaultDecaissementId) {
      setSelectedDecId(defaultDecaissementId);
    } else if (activeDecaissements.length > 0 && !selectedDecId) {
      setSelectedDecId(activeDecaissements[0].id);
    }
  }, [defaultDecaissementId, activeDecaissements]);

  React.useEffect(() => {
    if (defaultEcheancierId) {
      setSelectedEchId(defaultEcheancierId);
    }
  }, [defaultEcheancierId]);

  const currentDec = useMemo(() => {
    return activeDecaissements.find((d) => d.id === selectedDecId);
  }, [activeDecaissements, selectedDecId]);

  const availableSchedules = useMemo(() => {
    if (!selectedDecId) return [];
    return schedules.filter((s) => s.decaissement_id === selectedDecId);
  }, [schedules, selectedDecId]);

  const currentEch = useMemo(() => {
    return availableSchedules.find((s) => s.id === selectedEchId);
  }, [availableSchedules, selectedEchId]);

  // Set default initial amount based on selected schedule or remaining balance
  React.useEffect(() => {
    if (currentEch) {
      const remainingEch = Math.max(0, currentEch.montant_prevu - currentEch.montant_paye);
      if (remainingEch > 0) {
        setMontantVerse(remainingEch);
      }
    } else if (currentDec && montantVerse === 0) {
      setMontantVerse(currentDec.solde_restant);
    }
  }, [currentEch, currentDec]);

  const projectedRemaining = useMemo(() => {
    if (!currentDec) return 0;
    return Math.max(0, Number((currentDec.solde_restant - montantVerse).toFixed(2)));
  }, [currentDec, montantVerse]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDecId || montantVerse <= 0) return;

    setIsSubmitting(true);
    try {
      addEngagement({
        decaissement_id: selectedDecId,
        echeancier_id: selectedEchId || undefined,
        montant_verse: Number(montantVerse),
        date_paiement: new Date(datePaiement).toISOString(),
        mode_reglement: modeReglement,
        reference_recu: refRecu.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      // If full payment completed, trigger festive confetti
      if (projectedRemaining <= 0.01) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore confetti fallback
        }
      }

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden my-4">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/60 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Enregistrer un Engagement (Remboursement)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Imputation financière immédiate et mise à jour du reste à engager
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          
          {/* Sélection Décaissement */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Prêt / Décaissement concerné *
            </label>
            <select
              id="engagement-decaissement-select"
              value={selectedDecId}
              onChange={(e) => {
                setSelectedDecId(e.target.value);
                setSelectedEchId('');
              }}
              required
              className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
            >
              {activeDecaissements.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.reference_unique} — {d.structure_nom} (Reste : {formatCurrency(d.solde_restant)})
                </option>
              ))}
            </select>
          </div>

          {/* Échéance Trimestrielle Spécifique (Optionnel) */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Affecter à une échéance trimestrielle (optionnel)
            </label>
            <select
              id="engagement-echeancier-select"
              value={selectedEchId}
              onChange={(e) => setSelectedEchId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
            >
              <option value="">-- Répartition chronologique automatique (Waterfall) --</option>
              {availableSchedules.map((ech) => {
                const rest = Math.max(0, ech.montant_prevu - ech.montant_paye);
                return (
                  <option key={ech.id} value={ech.id}>
                    {ech.trimestre} {ech.annee} — Limite : {formatDate(ech.date_limite)} | Prévu : {formatCurrency(ech.montant_prevu)} (Reste : {formatCurrency(rest)})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Montant Versé */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Montant Versé (F CFA) *
              </label>
              {currentDec && (
                <button
                  type="button"
                  onClick={() => setMontantVerse(currentDec.solde_restant)}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Régler le solde ({formatCurrency(currentDec.solde_restant)})
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="engagement-montant-input"
                type="number"
                min="0"
                step="any"
                value={montantVerse || ''}
                onChange={(e) => setMontantVerse(parseFloat(e.target.value) || 0)}
                required
                placeholder="ex: 5000000"
                className="w-full pl-3 pr-14 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
              />
              <span className="absolute right-2 top-1.5 text-slate-400 text-[11px] font-semibold">F CFA</span>
            </div>
          </div>

          {/* Date de Paiement & Mode de Règlement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Date & Heure du Paiement *
              </label>
              <input
                id="engagement-date-input"
                type="datetime-local"
                value={datePaiement}
                onChange={(e) => setDatePaiement(e.target.value)}
                required
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Mode de Règlement
              </label>
              <select
                id="engagement-mode-select"
                value={modeReglement}
                onChange={(e) => setModeReglement(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
              >
                <option value="VIREMENT">Virement bancaire</option>
                <option value="PRELEVEMENT">Prélèvement automatique</option>
                <option value="CHEQUE">Chèque de banque</option>
                <option value="ESPECES">Espèces</option>
              </select>
            </div>
          </div>

          {/* Référence Reçu & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Référence Reçu / Transaction
              </label>
              <input
                id="engagement-ref-input"
                type="text"
                value={refRecu}
                onChange={(e) => setRefRecu(e.target.value)}
                placeholder="ex: VIR-2026-0816"
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Notes
              </label>
              <input
                id="engagement-notes-input"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ex: Règlement anticipé"
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
              />
            </div>
          </div>

          {/* Calcul d'impact financier */}
          {currentDec && (
            <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-emerald-900 dark:text-emerald-300 font-bold uppercase tracking-wider">
                <span>Impact sur le Reste à Engager</span>
                <span className="flex items-center gap-1">
                  {formatCurrency(currentDec.solde_restant)} <ArrowRight className="w-3 h-3" /> {formatCurrency(projectedRemaining)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-1.5 bg-white dark:bg-slate-800 rounded border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Solde Actuel</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{formatCurrency(currentDec.solde_restant)}</p>
                </div>
                <div className="p-1.5 bg-emerald-600 text-white rounded">
                  <p className="text-[10px] text-emerald-100">Montant Versé</p>
                  <p className="text-xs font-extrabold">{formatCurrency(montantVerse)}</p>
                </div>
                <div className="p-1.5 bg-white dark:bg-slate-800 rounded border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Nouveau Reste</p>
                  <p className={`text-xs font-bold ${projectedRemaining <= 0.01 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {projectedRemaining <= 0.01 ? '0 F CFA (SOLDÉ)' : formatCurrency(projectedRemaining)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              Annuler
            </button>
            <button
              id="engagement-submit-btn"
              type="submit"
              disabled={isSubmitting || montantVerse <= 0}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 rounded-md shadow-xs transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Valider le Remboursement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
