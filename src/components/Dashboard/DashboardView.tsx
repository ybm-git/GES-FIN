import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  CreditCard,
  Building2,
  AlertCircle,
  FileSpreadsheet,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ChevronRight,
  Percent,
  Receipt,
  ExternalLink,
  Search,
  Filter,
  ArrowUpDown,
  RotateCcw,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, formatPercent } from '../../utils/formatters';
import { exportPortfolioToExcel } from '../../utils/exportUtils';

interface Props {
  onOpenNewDecaissement: () => void;
  onOpenNewEngagement: (decaissementId?: string, echeancierId?: string) => void;
}

export const DashboardView: React.FC<Props> = ({
  onOpenNewDecaissement,
  onOpenNewEngagement,
}) => {
  const { structures, decaissements, schedules, engagements, kpis, setActiveView, setSelectedStructureId } =
    useFinance();
  const { canEdit } = useAuth();

  // Filters & Sorting State for Dashboard
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStructureId, setFilterStructureId] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIF' | 'CLOTURE'>('ALL');
  const [filterYear, setFilterYear] = useState('ALL');
  const [sortBy, setSortBy] = useState<
    'date_desc' | 'date_asc' | 'montant_desc' | 'montant_asc' | 'reste_desc' | 'structure_asc'
  >('date_desc');

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    decaissements.forEach((d) => {
      if (d.date_decaissement) years.add(d.date_decaissement.slice(0, 4));
    });
    schedules.forEach((s) => {
      if (s.annee) years.add(String(s.annee));
    });
    return Array.from(years).sort().reverse();
  }, [decaissements, schedules]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterStructureId('ALL');
    setFilterStatus('ALL');
    setFilterYear('ALL');
    setSortBy('date_desc');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    filterStructureId !== 'ALL' ||
    filterStatus !== 'ALL' ||
    filterYear !== 'ALL' ||
    sortBy !== 'date_desc';

  // Filtered & Sorted Decaissements
  const filteredAndSortedDecaissements = useMemo(() => {
    const list = decaissements.filter((d) => {
      const struct = structures.find((s) => s.id === d.structure_id);
      const structName = struct?.raison_sociale || '';

      // Search Query
      const matchesSearch =
        d.reference_unique.toLowerCase().includes(searchQuery.toLowerCase()) ||
        structName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.notes && d.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      // Structure filter
      const matchesStruct = filterStructureId === 'ALL' || d.structure_id === filterStructureId;

      // Status filter
      const decEngs = engagements.filter((e) => e.decaissement_id === d.id);
      const paid = decEngs.reduce((sum, e) => sum + e.montant_verse, 0);
      const solde = Math.max(0, d.montant_total_a_rembourser - paid);
      const isCloture = solde <= 0.01 || d.statut === 'CLOTURE';

      const matchesStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'ACTIF' && !isCloture) ||
        (filterStatus === 'CLOTURE' && isCloture);

      // Year filter
      const matchesYear = filterYear === 'ALL' || d.date_decaissement.startsWith(filterYear);

      return matchesSearch && matchesStruct && matchesStatus && matchesYear;
    });

    // Sorting
    return list.sort((a, b) => {
      const structA = structures.find((s) => s.id === a.structure_id)?.raison_sociale || '';
      const structB = structures.find((s) => s.id === b.structure_id)?.raison_sociale || '';

      const paidA = engagements
        .filter((e) => e.decaissement_id === a.id)
        .reduce((sum, e) => sum + e.montant_verse, 0);
      const resteA = Math.max(0, a.montant_total_a_rembourser - paidA);

      const paidB = engagements
        .filter((e) => e.decaissement_id === b.id)
        .reduce((sum, e) => sum + e.montant_verse, 0);
      const resteB = Math.max(0, b.montant_total_a_rembourser - paidB);

      switch (sortBy) {
        case 'date_asc':
          return a.date_decaissement.localeCompare(b.date_decaissement);
        case 'date_desc':
          return b.date_decaissement.localeCompare(a.date_decaissement);
        case 'montant_desc':
          return b.montant_principal - a.montant_principal;
        case 'montant_asc':
          return a.montant_principal - b.montant_principal;
        case 'reste_desc':
          return resteB - resteA;
        case 'structure_asc':
          return structA.localeCompare(structB);
        default:
          return 0;
      }
    });
  }, [decaissements, structures, engagements, searchQuery, filterStructureId, filterStatus, filterYear, sortBy]);

  // Dynamic KPIs calculated from filtered & sorted results
  const dynamicKpis = useMemo(() => {
    const decList = filteredAndSortedDecaissements;
    const decIds = new Set(decList.map((d) => d.id));
    const totalDecaisse = decList.reduce((sum, d) => sum + d.montant_principal, 0);
    const totalDu = decList.reduce((sum, d) => sum + d.montant_total_a_rembourser, 0);
    const interets = Math.max(0, totalDu - totalDecaisse);

    // Engagements corresponding to filtered decaissements
    const relatedEngs = engagements.filter((e) => {
      if (!decIds.has(e.decaissement_id)) return false;
      if (filterYear !== 'ALL' && !e.date_paiement.startsWith(filterYear)) return false;
      return true;
    });
    const totalRembourse = relatedEngs.reduce((sum, e) => sum + e.montant_verse, 0);
    const resteARecouvrer = Math.max(0, totalDu - totalRembourse);
    const tauxRecouvrement = totalDu > 0 ? (totalRembourse / totalDu) * 100 : 0;

    const actifsCount = decList.filter((d) => {
      const paid = engagements
        .filter((e) => e.decaissement_id === d.id)
        .reduce((sum, e) => sum + e.montant_verse, 0);
      return (d.montant_total_a_rembourser - paid) > 0.01 && d.statut !== 'CLOTURE';
    }).length;

    const uniqueStructIds = new Set(decList.map((d) => d.structure_id));
    const structCount = uniqueStructIds.size;

    const avgRate =
      decList.length > 0
        ? decList.reduce((sum, d) => sum + d.taux_interet, 0) / decList.length
        : 0;

    return {
      totalDecaisse,
      interets,
      totalDu,
      totalRembourse,
      resteARecouvrer,
      tauxRecouvrement,
      tauxRecouvrementGlobal: tauxRecouvrement,
      dossiersCount: decList.length,
      versementsCount: relatedEngs.length,
      actifsCount,
      structuresCount: structCount,
      totalStructures: structures.length,
      tauxMoyenInteret: avgRate,
    };
  }, [filteredAndSortedDecaissements, engagements, structures, filterYear]);

  // Chart Data: Évolution Chronologique des Flux (Décaissements vs Remboursements)
  const timelineMonthlyData = useMemo(() => {
    const monthlyMap = new Map<string, { decaisse: number; rembourse: number }>();
    const filteredDecIds = new Set(filteredAndSortedDecaissements.map((d) => d.id));

    filteredAndSortedDecaissements.forEach((d) => {
      const monthKey = d.date_decaissement.slice(0, 7); // YYYY-MM
      const curr = monthlyMap.get(monthKey) || { decaisse: 0, rembourse: 0 };
      curr.decaisse += d.montant_principal;
      monthlyMap.set(monthKey, curr);
    });

    engagements.forEach((e) => {
      if (!filteredDecIds.has(e.decaissement_id)) return;
      if (filterYear !== 'ALL' && !e.date_paiement.startsWith(filterYear)) return;

      const monthKey = e.date_paiement.slice(0, 7);
      const curr = monthlyMap.get(monthKey) || { decaisse: 0, rembourse: 0 };
      curr.rembourse += e.montant_verse;
      monthlyMap.set(monthKey, curr);
    });

    const sortedKeys = Array.from(monthlyMap.keys()).sort();
    if (sortedKeys.length === 0) {
      return [
        { month: 'Actuel', Décaissements: 0, Remboursements: 0 }
      ];
    }

    return sortedKeys.map((key) => {
      const [year, month] = key.split('-');
      const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString('fr-FR', {
        month: 'short',
        year: '2-digit',
      });
      const data = monthlyMap.get(key)!;
      return {
        month: monthName,
        Décaissements: data.decaisse,
        Remboursements: data.rembourse,
      };
    });
  }, [filteredAndSortedDecaissements, engagements, filterYear]);

  // Distribution Donut Chart
  const statusPieData = useMemo(() => {
    return [
      { name: 'Remboursé', value: dynamicKpis.totalRembourse, color: '#10b981' },
      { name: 'Reste à recouvrer', value: dynamicKpis.resteARecouvrer, color: '#f59e0b' },
    ];
  }, [dynamicKpis]);

  return (
    <div className="space-y-4 pb-8">
      
      {/* High-Density Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Tableau de Bord Consolidé</span>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium">
              GES-FIN
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Suivi des flux financiers, échéances et taux de recouvrement en F CFA
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            id="dash-export-excel-btn"
            onClick={() => exportPortfolioToExcel(structures, decaissements, schedules, engagements, kpis)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Excel (.xlsx)</span>
          </button>

          {canEdit && (
            <button
              id="dash-new-decaissement-btn"
              onClick={onOpenNewDecaissement}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nouveau Prêt</span>
            </button>
          )}
        </div>
      </div>

      {/* DASHBOARD FILTER & SORT CONTROLS (DIRECTLY CONTROLS THE KPI CARDS AND VIEWS BELOW) */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Filtres & Options de Tri (Actualisation Dynamique des Indicateurs)
            </h2>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 hover:underline font-medium cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Réinitialiser les filtres
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
          
          {/* 1. Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
            <input
              id="dash-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher réf, structure..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-md text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 2. Filter Structure */}
          <div>
            <select
              id="dash-filter-structure"
              value={filterStructureId}
              onChange={(e) => setFilterStructureId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Toutes les structures ({structures.length})</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.raison_sociale}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Filter Status */}
          <div>
            <select
              id="dash-filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-md text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="ACTIF">En cours (Actifs)</option>
              <option value="CLOTURE">Soldés (Clôturés)</option>
            </select>
          </div>

          {/* 4. Filter Year */}
          <div>
            <select
              id="dash-filter-year"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Toutes les années</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  Année {yr}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Sort By */}
          <div>
            <select
              id="dash-sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-md text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="date_desc">Tri : Date (Plus récent)</option>
              <option value="date_asc">Tri : Date (Plus ancien)</option>
              <option value="montant_desc">Tri : Montant (Décroissant)</option>
              <option value="montant_asc">Tri : Montant (Croissant)</option>
              <option value="reste_desc">Tri : Reste à payer (Élevé)</option>
              <option value="structure_asc">Tri : Structure (A-Z)</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] text-blue-600 dark:text-blue-400">
            <span className="font-semibold">Indicateurs filtrés :</span>
            <span>
              Affichage de {dynamicKpis.dossiersCount} sur {decaissements.length} dossiers ({dynamicKpis.versementsCount} versements comptabilisés)
            </span>
          </div>
        )}
      </div>

      {/* High-Density Dynamic KPI Cards (5 Columns - Recomputed on Filter & Sort) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Card 1: Total Décaissé */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Décaissé</span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
              {dynamicKpis.dossiersCount} {dynamicKpis.dossiersCount > 1 ? 'dossiers' : 'dossier'}
              {hasActiveFilters && ` / ${decaissements.length}`}
            </span>
          </div>
          <div className="my-2">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(dynamicKpis.totalDecaisse)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {hasActiveFilters ? 'Principal filtré' : 'Principal distribué'}
            </div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full w-full" />
          </div>
        </div>

        {/* Card 2: Intérêts Générés */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Intérêts Générés</span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
              Taux moy. {dynamicKpis.tauxMoyenInteret.toFixed(1)}%
            </span>
          </div>
          <div className="my-2">
            <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              +{formatCurrency(dynamicKpis.interets)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Total Dû: {formatCurrency(dynamicKpis.totalDu)}
            </div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full w-4/5" />
          </div>
        </div>

        {/* Card 3: Total Remboursé */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Remboursé</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              {(dynamicKpis.tauxRecouvrement ?? 0).toFixed(1)}%
            </span>
          </div>
          <div className="my-2">
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(dynamicKpis.totalRembourse)}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              +{dynamicKpis.versementsCount} {dynamicKpis.versementsCount > 1 ? 'versements' : 'versement'}
            </div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, dynamicKpis.tauxRecouvrement ?? 0)}%` }}
            />
          </div>
        </div>

        {/* Card 4: Reste à Recouvrer */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Reste à Recouvrer</span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
              {dynamicKpis.actifsCount} {dynamicKpis.actifsCount > 1 ? 'actifs' : 'actif'}
            </span>
          </div>
          <div className="my-2">
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(dynamicKpis.resteARecouvrer)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Échéances en cours</div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full w-2/3" />
          </div>
        </div>

        {/* Card 5: Structures Clientes */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Structures Clientes</span>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">Portefeuille</span>
          </div>
          <div className="my-2">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {dynamicKpis.structuresCount} <span className="text-xs font-normal text-slate-400">/ {dynamicKpis.totalStructures}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Emprunteurs engagés</div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full rounded-full w-3/4" />
          </div>
        </div>
      </div>

      {/* Main Grid: 8 Columns Charts & Tables vs 4 Columns Alerts & Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Section (8 Columns) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Monthly Evolution Area Chart (Replaces Quarterly Histogram) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Évolution Chronologique des Flux
                </h2>
                <p className="text-xs text-slate-900 dark:text-white font-semibold">
                  Décaissements accordés vs Remboursements perçus (F CFA)
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Décaissements
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Remboursements
                </span>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineMonthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorRemb" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) =>
                      v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                    }
                  />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), '']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Décaissements"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDec)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Remboursements"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRemb)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* High Density Table: Filtered & Sorted Disbursements */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Décaissements & Remboursements
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  {filteredAndSortedDecaissements.length}
                </span>
              </div>
              <button
                onClick={() => setActiveView('decaissements')}
                className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
              >
                <span>Vue détaillée</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2.5 px-3">Réf</th>
                    <th className="py-2.5 px-3">Structure</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Principal</th>
                    <th className="py-2.5 px-3">Total Dû</th>
                    <th className="py-2.5 px-3">Solde Dû</th>
                    <th className="py-2.5 px-3">Statut</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAndSortedDecaissements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                        Aucun décaissement ne correspond aux filtres sélectionnés.
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedDecaissements.slice(0, 7).map((dec) => {
                      const struct = structures.find((s) => s.id === dec.structure_id);
                      const decEngs = engagements.filter((e) => e.decaissement_id === dec.id);
                      const paid = decEngs.reduce((sum, e) => sum + e.montant_verse, 0);
                      const solde = Math.max(0, dec.montant_total_a_rembourser - paid);

                      return (
                        <tr key={dec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {dec.reference_unique}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                            <button
                              onClick={() => {
                                setSelectedStructureId(dec.structure_id);
                                setActiveView('structures');
                              }}
                              className="hover:text-blue-600 hover:underline text-left cursor-pointer"
                            >
                              {struct?.raison_sociale || dec.reference_unique || '—'}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {formatDate(dec.date_decaissement)}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(dec.montant_principal)}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-300">
                            {formatCurrency(dec.montant_total_a_rembourser)}
                          </td>
                          <td className="py-2.5 px-3 font-bold">
                            <span className={solde > 0.01 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                              {formatCurrency(solde)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                solde <= 0.01 || dec.statut === 'CLOTURE'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              }`}
                            >
                              {solde <= 0.01 ? 'SOLDÉ' : 'ACTIF'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {canEdit && solde > 0.01 && (
                              <button
                                onClick={() => onOpenNewEngagement(dec.id)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold transition-colors cursor-pointer"
                              >
                                Encaisser
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Section (4 Columns) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Recovery Rate Card (Donut) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Recouvrement Portefeuille
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold">
                {hasActiveFilters ? 'Filtré' : 'Global'}
              </span>
            </div>

            <div className="relative h-40 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), '']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-slate-900 dark:text-white">
                  {(dynamicKpis.tauxRecouvrementGlobal ?? dynamicKpis.tauxRecouvrement ?? 0).toFixed(1)}%
                </span>
                <span className="text-[9px] text-slate-400 uppercase font-semibold">Taux</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">Remboursé</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 block">
                  {formatCurrency(dynamicKpis.totalRembourse)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block">Restant</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 block">
                  {formatCurrency(dynamicKpis.resteARecouvrer)}
                </span>
              </div>
            </div>
          </div>

          {/* Top Structures List */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Structures Clientes
                </h2>
              </div>
              <button
                onClick={() => setActiveView('structures')}
                className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer"
              >
                Gérer ({structures.length})
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {structures.slice(0, 5).map((s) => {
                const structDecs = decaissements.filter((d) => d.structure_id === s.id);
                const totalDu = structDecs.reduce((sum, d) => sum + d.montant_total_a_rembourser, 0);
                const structEngs = engagements.filter((e) =>
                  structDecs.some((d) => d.id === e.decaissement_id)
                );
                const paid = structEngs.reduce((sum, e) => sum + e.montant_verse, 0);
                const progress = totalDu > 0 ? (paid / totalDu) * 100 : 0;

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedStructureId(s.id);
                      setActiveView('structures');
                    }}
                    className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 px-1.5 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                        {s.raison_sociale.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white truncate block">
                          {s.raison_sociale}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {structDecs.length} {structDecs.length > 1 ? 'prêts' : 'prêt'} • {formatCurrency(totalDu)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        {progress.toFixed(0)}%
                      </span>
                      <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
