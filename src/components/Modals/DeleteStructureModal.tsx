import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, AlertOctagon, Building2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Structure } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  structure: Structure | null;
  onDeleted?: () => void;
}

export const DeleteStructureModal: React.FC<Props> = ({
  isOpen,
  onClose,
  structure,
  onDeleted,
}) => {
  const { decaissements, engagements, deleteStructure } = useFinance();
  const [confirmCascade, setConfirmCascade] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !structure) return null;

  const structDecs = decaissements.filter((d) => d.structure_id === structure.id);
  const structEngs = engagements.filter((e) =>
    structDecs.some((d) => d.id === e.decaissement_id)
  );

  const totalPrincipal = structDecs.reduce((sum, d) => sum + d.montant_principal, 0);
  const totalRembourse = structEngs.reduce((sum, e) => sum + e.montant_verse, 0);
  const totalDu = structDecs.reduce((sum, d) => sum + d.montant_total_a_rembourser, 0);
  const soldeRestant = Math.max(0, totalDu - totalRembourse);

  const hasLoans = structDecs.length > 0;

  const handleDelete = () => {
    setIsDeleting(true);
    try {
      const success = deleteStructure(structure.id);
      if (success) {
        onClose();
        if (onDeleted) {
          onDeleted();
        }
      }
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
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Supprimer la Structure
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Action irréversible sur le dossier de l'emprunteur
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

        {/* Content */}
        <div className="p-4 space-y-3.5">
          
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center shrink-0 text-xs">
              {structure.raison_sociale.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                {structure.raison_sociale}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Responsable : {structure.contact_nom} • {structure.secteur || 'Général'}
              </p>
            </div>
          </div>

          {hasLoans ? (
            <div className="space-y-2.5">
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertOctagon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Données financières associées détectées</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Cette structure possède <strong className="font-semibold">{structDecs.length} décaissement(s)</strong> pour un total de <strong className="font-semibold">{formatCurrency(totalPrincipal)}</strong> et <strong className="font-semibold">{structEngs.length} versement(s)</strong> enregistrés.
                </p>
                {soldeRestant > 0.01 && (
                  <p className="text-[11px] font-bold text-red-600 dark:text-red-400">
                    ⚠️ Reste à recouvrer : {formatCurrency(soldeRestant)}
                  </p>
                )}
              </div>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer text-xs">
                <input
                  id="confirm-cascade-delete-checkbox"
                  type="checkbox"
                  checked={confirmCascade}
                  onChange={(e) => setConfirmCascade(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-slate-700 dark:text-slate-300 text-[11px] leading-tight">
                  Je confirme vouloir supprimer définitivement cette structure ainsi que tous ses décaissements, échéanciers et historiques de remboursement associés.
                </span>
              </label>
            </div>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Cette structure ne possède aucun prêt ni transaction active. Êtes-vous sûr de vouloir la supprimer ?
            </p>
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
              id="confirm-delete-structure-btn"
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || (hasLoans && !confirmCascade)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-md shadow-xs transition-all cursor-pointer"
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
