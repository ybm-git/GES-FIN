import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, Receipt, Building2, CreditCard, ArrowRight } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Engagement } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  engagement: Engagement | null;
}

export const DeleteEngagementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  engagement,
}) => {
  const { decaissements, structures, engagements, deleteEngagement } = useFinance();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !engagement) return null;

  const targetDec = decaissements.find((d) => d.id === engagement.decaissement_id);
  const targetStructure = structures.find((s) => s.id === targetDec?.structure_id);

  // Compute current total paid for this loan and after-deletion total
  const loanEngagements = engagements.filter((e) => e.decaissement_id === engagement.decaissement_id);
  const currentTotalPaid = loanEngagements.reduce((sum, e) => sum + e.montant_verse, 0);
  const newTotalPaid = Math.max(0, currentTotalPaid - engagement.montant_verse);
  const totalDue = targetDec ? targetDec.montant_total_a_rembourser : 0;
  const currentRemaining = Math.max(0, totalDue - currentTotalPaid);
  const newRemaining = Math.max(0, totalDue - newTotalPaid);

  const handleDelete = () => {
    setIsDeleting(true);
    try {
      deleteEngagement(engagement.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-red-200 dark:border-red-900/50 overflow-hidden my-4">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-red-50/70 dark:bg-red-950/30">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Supprimer le Remboursement
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Annulation d'un encaissement avec réajustement du solde
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

        {/* Body */}
        <div className="p-4 space-y-3.5">
          
          {/* Details of repayment to delete */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Structure bénéficiaire :</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {targetStructure?.raison_sociale || (targetDec ? `Prêt ${targetDec.reference_unique}` : '—')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Prêt concerné :</span>
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                {targetDec?.reference_unique || '-'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400">Date du règlement :</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {formatDateTime(engagement.date_paiement)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Montant du versement :</span>
              <span className="font-bold text-base text-red-600 dark:text-red-400">
                {formatCurrency(engagement.montant_verse)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Mode / Réf reçu :</span>
              <span className="text-slate-700 dark:text-slate-300">
                {engagement.mode_reglement || 'VIREMENT'} {engagement.reference_recu ? `• #${engagement.reference_recu}` : ''}
              </span>
            </div>
          </div>

          {/* Impact Alert */}
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Conséquence comptable de la suppression</span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
              Le montant de <strong className="font-bold">{formatCurrency(engagement.montant_verse)}</strong> sera déduit des sommes remboursées et réintégré dans le solde restant à recouvrer.
            </p>

            <div className="flex items-center justify-between pt-1 text-[11px] font-medium text-amber-900 dark:text-amber-200 bg-amber-100/50 dark:bg-amber-900/40 p-2 rounded">
              <span>Nouveau solde restant dû :</span>
              <div className="flex items-center gap-1.5">
                <span className="line-through text-slate-500">{formatCurrency(currentRemaining)}</span>
                <ArrowRight className="w-3 h-3 text-amber-600" />
                <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(newRemaining)}</span>
              </div>
            </div>

            {targetDec?.statut === 'CLOTURE' && newRemaining > 0.01 && (
              <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold">
                ℹ️ Le prêt repassera automatiquement en statut « ACTIF / EN COURS ».
              </p>
            )}
          </div>

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
              id="confirm-delete-engagement-btn"
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-40 rounded-md shadow-xs transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Suppression...' : 'Supprimer définitivement'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
