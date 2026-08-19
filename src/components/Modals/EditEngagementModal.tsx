import React, { useState, useEffect, useMemo } from 'react';
import { X, Edit3, Calendar, CreditCard, CheckCircle2, ArrowRight } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Engagement } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  engagement: Engagement | null;
}

export const EditEngagementModal: React.FC<Props> = ({ isOpen, onClose, engagement }) => {
  const { decaissements, structures, schedules, engagements, updateEngagement } = useFinance();

  const [montantVerse, setMontantVerse] = useState<number>(0);
  const [datePaiement, setDatePaiement] = useState<string>('');
  const [modeReglement, setModeReglement] = useState<'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'ESPECES'>('VIREMENT');
  const [echeancierId, setEcheancierId] = useState<string>('');
  const [referenceRecu, setReferenceRecu] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (engagement) {
      setMontantVerse(engagement.montant_verse);
      setDatePaiement(
        engagement.date_paiement
          ? engagement.date_paiement.slice(0, 16)
          : new Date().toISOString().slice(0, 16)
      );
      setModeReglement(engagement.mode_reglement || 'VIREMENT');
      setEcheancierId(engagement.echeancier_id || '');
      setReferenceRecu(engagement.reference_recu || '');
      setNotes(engagement.notes || '');
    }
  }, [engagement]);

  const targetDec = useMemo(() => {
    if (!engagement) return null;
    return decaissements.find((d) => d.id === engagement.decaissement_id);
  }, [decaissements, engagement]);

  const targetStruct = useMemo(() => {
    if (!targetDec) return null;
    return structures.find((s) => s.id === targetDec.structure_id);
  }, [structures, targetDec]);

  const availableSchedules = useMemo(() => {
    if (!engagement) return [];
    return schedules.filter((s) => s.decaissement_id === engagement.decaissement_id);
  }, [schedules, engagement]);

  // Projected new remaining balance
  const projectedRemaining = useMemo(() => {
    if (!targetDec || !engagement) return 0;
    const otherEngs = engagements.filter((e) => e.decaissement_id === targetDec.id && e.id !== engagement.id);
    const otherPaid = otherEngs.reduce((sum, e) => sum + e.montant_verse, 0);
    const newTotalPaid = otherPaid + (montantVerse || 0);
    return Math.max(0, Number((targetDec.montant_total_a_rembourser - newTotalPaid).toFixed(2)));
  }, [targetDec, engagement, engagements, montantVerse]);

  if (!isOpen || !engagement) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (montantVerse <= 0) return;

    setIsSubmitting(true);
    try {
      updateEngagement(engagement.id, {
        montant_verse: Number(montantVerse),
        date_paiement: new Date(datePaiement).toISOString(),
        mode_reglement: modeReglement,
        echeancier_id: echeancierId || undefined,
        reference_recu: referenceRecu.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden my-4">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/70 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Modifier le Remboursement / Engagement
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {targetStruct?.raison_sociale} • Prêt {targetDec?.reference_unique}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          
          {/* Montant Versé */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Montant Versé Saisi (F CFA) *
            </label>
            <div className="relative">
              <input
                id="edit-engagement-montant-input"
                type="number"
                min="0"
                step="any"
                value={montantVerse || ''}
                onChange={(e) => setMontantVerse(parseFloat(e.target.value) || 0)}
                required
                placeholder="ex: 35000"
                className="w-full pl-3 pr-14 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
              />
              <span className="absolute right-2 top-1.5 text-slate-400 text-[11px] font-semibold">F CFA</span>
            </div>
          </div>

          {/* Échéance Trimestrielle Ciblée */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Affectation à un Trimestre (optionnel)
            </label>
            <select
              id="edit-engagement-echeancier-select"
              value={echeancierId}
              onChange={(e) => setEcheancierId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
            >
              <option value="">-- Répartition chronologique automatique (Waterfall) --</option>
              {availableSchedules.map((ech) => (
                <option key={ech.id} value={ech.id}>
                  {ech.trimestre} {ech.annee} — Limite : {formatDate(ech.date_limite)} | Prévu : {formatCurrency(ech.montant_prevu)}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Date & Heure du Paiement *
              </label>
              <input
                id="edit-engagement-date-input"
                type="datetime-local"
                value={datePaiement}
                onChange={(e) => setDatePaiement(e.target.value)}
                required
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <CreditCard className="w-3 h-3" /> Mode de Règlement
              </label>
              <select
                id="edit-engagement-mode-select"
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
                Référence Reçu / Quittance
              </label>
              <input
                id="edit-engagement-ref-input"
                type="text"
                value={referenceRecu}
                onChange={(e) => setReferenceRecu(e.target.value)}
                placeholder="ex: VIR-2026-0816"
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Notes
              </label>
              <input
                id="edit-engagement-notes-input"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ex: Régularisation"
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-shadow"
              />
            </div>
          </div>

          {/* Impact Prévisionnel */}
          {targetDec && (
            <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-emerald-900 dark:text-emerald-300 font-bold uppercase tracking-wider">
                <span>Nouveau Reste à Recouvrer Calculé</span>
                <span>{formatCurrency(projectedRemaining)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-1.5 bg-emerald-600 text-white rounded">
                  <p className="text-[10px] text-emerald-100">Nouveau Montant Versé</p>
                  <p className="text-xs font-extrabold">{formatCurrency(montantVerse)}</p>
                </div>
                <div className="p-1.5 bg-white dark:bg-slate-800 rounded border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Statut Projeté du Prêt</p>
                  <p className={`text-xs font-bold ${projectedRemaining <= 0.01 ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {projectedRemaining <= 0.01 ? 'SOLDÉ (CLÔTURÉ)' : 'EN COURS (ACTIF)'}
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
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              id="edit-engagement-submit-btn"
              type="submit"
              disabled={isSubmitting || montantVerse <= 0}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 rounded-md shadow-xs transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sauvegarder les Modifications
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
