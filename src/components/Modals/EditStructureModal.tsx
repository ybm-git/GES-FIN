import React, { useState, useEffect } from 'react';
import { X, Building2, User, Phone, CheckCircle2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Structure } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  structure: Structure | null;
}

export const EditStructureModal: React.FC<Props> = ({ isOpen, onClose, structure }) => {
  const { updateStructure } = useFinance();

  const [raisonSociale, setRaisonSociale] = useState('');
  const [contactNom, setContactNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (structure) {
      setRaisonSociale(structure.raison_sociale || '');
      setContactNom(structure.contact_nom || '');
      setTelephone(structure.telephone || '');
    }
  }, [structure, isOpen]);

  if (!isOpen || !structure) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!raisonSociale.trim() || !contactNom.trim()) return;

    setIsSubmitting(true);
    try {
      updateStructure(structure.id, {
        raison_sociale: raisonSociale.trim(),
        contact_nom: contactNom.trim(),
        telephone: telephone.trim() || '+221 77 000 00 00',
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden my-4">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-purple-50/60 dark:bg-purple-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Modifier la Structure
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Mise à jour des coordonnées et informations administratives
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-3 h-3" /> Raison Sociale / Dénomination *
            </label>
            <input
              id="edit-structure-raison-input"
              type="text"
              required
              value={raisonSociale}
              onChange={(e) => setRaisonSociale(e.target.value)}
              placeholder="ex: SAS Énergies Nouvelles du Sud"
              className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none transition-shadow"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3 h-3" /> Contact Responsable *
            </label>
            <input
              id="edit-structure-contact-input"
              type="text"
              required
              value={contactNom}
              onChange={(e) => setContactNom(e.target.value)}
              placeholder="ex: Jean Dupont"
              className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none transition-shadow"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Phone className="w-3 h-3" /> Numéro de Téléphone
            </label>
            <input
              id="edit-structure-tel-input"
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="+221 77 123 45 67"
              className="w-full px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none transition-shadow"
            />
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
              id="edit-structure-submit-btn"
              type="submit"
              disabled={isSubmitting || !raisonSociale.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 rounded-md shadow-xs transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
