import React, { useState, useEffect, useMemo } from 'react';
import { X, Edit3, Calendar, Building2, Percent, FileText, Check, AlertTriangle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Decaissement } from '../../types';
import { calculateTotalToRepay, generateQuarterlySchedule } from '../../utils/financialCalculations';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  decaissement: Decaissement | null;
}

export const EditDecaissementModal: React.FC<Props> = ({ isOpen, onClose, decaissement }) => {
  const { structures, updateDecaissement } = useFinance();

  const [structureId, setStructureId] = useState('');
  const [reference, setReference] = useState('');
  const [montantPrincipal, setMontantPrincipal] = useState<number>(0);
  const [tauxInteret, setTauxInteret] = useState<number>(0);
  const [dateDecaissement, setDateDecaissement] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (decaissement) {
      setStructureId(decaissement.structure_id);
      setReference(decaissement.reference_unique);
      setMontantPrincipal(decaissement.montant_principal);
      setTauxInteret(decaissement.taux_interet);
      setDateDecaissement(
        decaissement.date_decaissement
          ? decaissement.date_decaissement.slice(0, 10)
          : new Date().toISOString().slice(0, 10)
      );
      setNotes(decaissement.notes || '');
    }
  }, [decaissement]);

  const totalToRepay = useMemo(() => {
    return calculateTotalToRepay(montantPrincipal, tauxInteret);
  }, [montantPrincipal, tauxInteret]);

  const interets = useMemo(() => {
    return Math.max(0, totalToRepay - montantPrincipal);
  }, [totalToRepay, montantPrincipal]);

  const simulatedSchedules = useMemo(() => {
    if (!montantPrincipal || montantPrincipal <= 0) return [];
    return generateQuarterlySchedule('preview', totalToRepay, dateDecaissement || new Date().toISOString());
  }, [totalToRepay, dateDecaissement, montantPrincipal]);

  if (!isOpen || !decaissement) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!structureId || montantPrincipal <= 0) return;

    setIsSubmitting(true);
    try {
      updateDecaissement(decaissement.id, {
        structure_id: structureId,
        reference_unique: reference.trim(),
        montant_principal: Number(montantPrincipal),
        taux_interet: Number(tauxInteret),
        date_decaissement: new Date(dateDecaissement).toISOString(),
        notes: notes.trim(),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden my-4">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-blue-50/70 dark:bg-blue-950/30">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Modifier le Décaissement ({decaissement.reference_unique})
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Mise à jour du montant, du taux d'intérêt et réajustement des 4 trimestres
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            {/* Structure Emprunteur */}
            <div className="space-y-1 md:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3 h-3" /> Structure Bénéficiaire *
              </label>
              <select
                id="edit-decaissement-structure-select"
                value={structureId}
                onChange={(e) => setStructureId(e.target.value)}
                required
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-shadow"
              >
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.raison_sociale} — {s.contact_nom}
                  </option>
                ))}
              </select>
            </div>

            {/* Référence Unique */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Référence Unique *
              </label>
              <input
                id="edit-decaissement-ref-input"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-shadow"
              />
            </div>

            {/* Date de Décaissement */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Date du Décaissement *
              </label>
              <input
                id="edit-decaissement-date-input"
                type="date"
                value={dateDecaissement}
                onChange={(e) => setDateDecaissement(e.target.value)}
                required
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-shadow"
              />
            </div>

            {/* Montant Principal */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Montant Principal Saisi (F CFA) *
              </label>
              <div className="relative">
                <input
                  id="edit-decaissement-montant-input"
                  type="number"
                  min="0"
                  step="any"
                  value={montantPrincipal || ''}
                  onChange={(e) => setMontantPrincipal(parseFloat(e.target.value) || 0)}
                  required
                  placeholder="ex: 120000"
                  className="w-full pl-3 pr-14 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none transition-shadow"
                />
                <span className="absolute right-2 top-1.5 text-slate-400 text-[11px] font-semibold">F CFA</span>
              </div>
            </div>

            {/* Taux d'intérêt */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Percent className="w-3 h-3" /> Taux d'intérêt annuel (%) *
              </label>
              <div className="relative">
                <input
                  id="edit-decaissement-taux-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={tauxInteret}
                  onChange={(e) => setTauxInteret(Math.max(0, parseFloat(e.target.value) || 0))}
                  required
                  className="w-full pl-3 pr-7 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none transition-shadow"
                />
                <span className="absolute right-2.5 top-1.5 text-slate-400 text-xs font-semibold">%</span>
              </div>
            </div>

            {/* Notes / Objet */}
            <div className="space-y-1 md:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Notes & Objet du Financement
              </label>
              <textarea
                id="edit-decaissement-notes-input"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-shadow"
              />
            </div>
          </div>

          {/* Synthèse Financière Automatique */}
          <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-blue-900 dark:text-blue-300 font-bold uppercase tracking-wider">
              <span>Recalcul Automatique du Prêt</span>
              <span>Total : {formatCurrency(totalToRepay)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-white dark:bg-slate-800 rounded border border-blue-100 dark:border-blue-900/30">
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Principal Modifié</p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{formatCurrency(montantPrincipal)}</p>
              </div>
              <div className="p-2 bg-white dark:bg-slate-800 rounded border border-blue-100 dark:border-blue-900/30">
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Intérêts ({tauxInteret}%)</p>
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400">+{formatCurrency(interets)}</p>
              </div>
              <div className="p-2 bg-blue-600 text-white rounded shadow-xs">
                <p className="text-[10px] text-blue-100">Nouveau Total Dû</p>
                <p className="text-xs font-extrabold">{formatCurrency(totalToRepay)}</p>
              </div>
            </div>

            {/* Aperçu des trimestres */}
            <div className="pt-1.5 border-t border-blue-200/50 dark:border-blue-900/40">
              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nouvelle répartition trimestrielle (Total divisé en 4) :
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {simulatedSchedules.map((ech) => (
                  <div key={ech.id} className="p-1.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="inline-block px-1 py-0.2 text-[9px] font-bold rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 mb-0.5">
                      {ech.trimestre} {ech.annee}
                    </span>
                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100">{formatCurrency(ech.montant_prevu)}</p>
                  </div>
                ))}
              </div>
            </div>
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
              id="edit-decaissement-submit-btn"
              type="submit"
              disabled={isSubmitting || montantPrincipal <= 0}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-md shadow-xs transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Enregistrer les Modifications
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
