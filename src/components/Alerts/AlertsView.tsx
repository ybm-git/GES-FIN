import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  CreditCard,
  Building2,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface Props {
  onOpenNewEngagement: (decaissementId: string, echeancierId?: string) => void;
}

export const AlertsView: React.FC<Props> = ({ onOpenNewEngagement }) => {
  const { alerts, urgentAlertsCount, setSelectedStructureId, setActiveView } = useFinance();
  const { canEdit } = useAuth();

  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'URGENT' | 'RED' | 'ORANGE' | 'GREEN'>('URGENT');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAlerts = useMemo(() => {
    return alerts.filter((al) => {
      const matchesSearch =
        al.structure_nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        al.reference_decaissement.toLowerCase().includes(searchQuery.toLowerCase()) ||
        al.message.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesSeverity = true;
      if (filterSeverity === 'URGENT') {
        matchesSeverity = al.severity === 'RED' || al.severity === 'ORANGE';
      } else if (filterSeverity !== 'ALL') {
        matchesSeverity = al.severity === filterSeverity;
      }

      return matchesSearch && matchesSeverity;
    });
  }, [alerts, searchQuery, filterSeverity]);

  const redCount = useMemo(() => alerts.filter((a) => a.severity === 'RED').length, [alerts]);
  const orangeCount = useMemo(() => alerts.filter((a) => a.severity === 'ORANGE').length, [alerts]);
  const greenCount = useMemo(() => alerts.filter((a) => a.severity === 'GREEN').length, [alerts]);

  return (
    <div className="space-y-4 pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Système d'Alertes & Échéances</span>
            {urgentAlertsCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 font-medium">
                {urgentAlertsCount} urgentes
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Surveillance automatique des retards, échéances imminentes (&lt; 15j) et soldes réglés
          </p>
        </div>
      </div>

      {/* Legend & Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Rouge : Retards */}
        <div
          onClick={() => setFilterSeverity('RED')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            filterSeverity === 'RED'
              ? 'ring-1 ring-red-500 bg-red-50/60 dark:bg-red-950/40 border-red-300'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-red-100 dark:ring-red-950" />
              En Retard
            </span>
            <span className="text-base font-bold text-red-600 dark:text-red-400">{redCount}</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Date limite dépassée avec solde restant. Relance requise.
          </p>
        </div>

        {/* Orange : < 15 jours */}
        <div
          onClick={() => setFilterSeverity('ORANGE')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            filterSeverity === 'ORANGE'
              ? 'ring-1 ring-amber-500 bg-amber-50/60 dark:bg-amber-950/40 border-amber-300'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-100 dark:ring-amber-950" />
              &lt; 15 jours
            </span>
            <span className="text-base font-bold text-amber-600 dark:text-amber-400">{orangeCount}</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Échéances imminentes à recouvrer rapidement.
          </p>
        </div>

        {/* Vert : Réglées */}
        <div
          onClick={() => setFilterSeverity('GREEN')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            filterSeverity === 'GREEN'
              ? 'ring-1 ring-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950" />
              Réglées (Soldées)
            </span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{greenCount}</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Montants prévus entièrement honorés par les emprunteurs.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
          <input
            id="alerts-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer structure, référence..."
            className="w-full pl-8 pr-3 py-1.5 rounded-md text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Severity Tabs */}
        <div className="flex flex-wrap items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
          <button
            onClick={() => setFilterSeverity('URGENT')}
            className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
              filterSeverity === 'URGENT'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Urgentes ({urgentAlertsCount})
          </button>
          <button
            onClick={() => setFilterSeverity('ALL')}
            className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
              filterSeverity === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Toutes ({alerts.length})
          </button>
          <button
            onClick={() => setFilterSeverity('RED')}
            className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
              filterSeverity === 'RED'
                ? 'bg-red-500 text-white shadow-xs'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            Retards ({redCount})
          </button>
          <button
            onClick={() => setFilterSeverity('ORANGE')}
            className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
              filterSeverity === 'ORANGE'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            &lt; 15j ({orangeCount})
          </button>
          <button
            onClick={() => setFilterSeverity('GREEN')}
            className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
              filterSeverity === 'GREEN'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            Soldées ({greenCount})
          </button>
        </div>
      </div>

      {/* Alerts Cards List */}
      <div className="space-y-2">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Aucune alerte dans cette catégorie</p>
            <p className="text-xs text-slate-400 mt-1">Toutes les échéances sélectionnées sont à jour.</p>
          </div>
        ) : (
          filteredAlerts.map((al) => (
            <div
              key={al.id}
              className={`p-3 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs ${
                al.severity === 'RED'
                  ? 'bg-red-50/30 dark:bg-red-950/20 border-red-200 dark:border-red-900/40'
                  : al.severity === 'ORANGE'
                  ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Left Info */}
              <div className="flex items-start gap-2.5">
                <div
                  className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    al.severity === 'RED'
                      ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
                      : al.severity === 'ORANGE'
                      ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {al.severity === 'RED' ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : al.severity === 'ORANGE' ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => {
                        setSelectedStructureId(al.structure_id);
                        setActiveView('structures');
                      }}
                      className="font-bold text-xs text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left transition-colors cursor-pointer"
                    >
                      {al.structure_nom}
                    </button>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                      {al.reference_decaissement}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                      {al.trimestre} {al.annee}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {al.message}
                  </p>

                  <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                    <span>Date limite : <strong className="text-slate-700 dark:text-slate-300">{formatDate(al.date_limite)}</strong></span>
                    <span>Prévu : <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(al.montant_prevu)}</strong></span>
                    <span>Payé : <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(al.montant_paye)}</strong></span>
                  </div>
                </div>
              </div>

              {/* Right Action */}
              <div className="flex items-center justify-between md:justify-end gap-2.5 pt-1.5 md:pt-0 border-t md:border-t-0 border-slate-200/60 dark:border-slate-800">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400">Solde Restant</span>
                  <p className={`text-sm font-bold ${al.solde_restant > 0.01 ? 'text-slate-900 dark:text-white' : 'text-emerald-600'}`}>
                    {formatCurrency(al.solde_restant)}
                  </p>
                </div>

                {canEdit && al.solde_restant > 0.01 && (
                  <button
                    onClick={() => onOpenNewEngagement(al.decaissement_id, al.echeancier_id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    <span>Encaisser</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
