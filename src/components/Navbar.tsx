import React, { useState } from 'react';
import {
  Bell,
  Sun,
  Moon,
  Plus,
  Search,
  LogOut,
  User,
  Shield,
  CreditCard,
  Building2,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFinance } from '../context/FinanceContext';
import { exportPortfolioToExcel, exportActiveStructuresToExcel } from '../utils/exportUtils';
import { formatCurrency, formatDate } from '../utils/formatters';

interface Props {
  onOpenNewDecaissement: () => void;
  onOpenNewEngagement: () => void;
  onOpenNewStructure: () => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<Props> = ({
  onOpenNewDecaissement,
  onOpenNewEngagement,
  onOpenNewStructure,
  onOpenLogin,
}) => {
  const { currentUser, logout, canEdit } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const {
    alerts,
    urgentAlertsCount,
    setActiveView,
    structures,
    decaissements,
    schedules,
    engagements,
    kpis,
    setSelectedStructureId,
    isSidebarOpen,
    toggleSidebarOpen,
    isSidebarCollapsed,
    toggleSidebarCollapsed,
  } = useFinance();

  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showQuickAddDropdown, setShowQuickAddDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Search filter across structures and decaissements
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return { structures: [], decaissements: [] };
    const q = searchQuery.toLowerCase();
    const matchingStructures = structures.filter(
      (s) =>
        s.raison_sociale.toLowerCase().includes(q) ||
        s.contact_nom.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q))
    );
    const matchingDecs = decaissements.filter(
      (d) =>
        d.reference_unique.toLowerCase().includes(q) ||
        (d.notes && d.notes.toLowerCase().includes(q))
    );
    return { structures: matchingStructures.slice(0, 4), decaissements: matchingDecs.slice(0, 4) };
  }, [searchQuery, structures, decaissements]);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-3 sm:px-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 transition-colors">
      
      {/* Left Area: Mobile Menu Toggle & Brand / Desktop Collapse & Global Search */}
      <div className="flex items-center gap-2.5 flex-1 max-w-xl">
        {/* Mobile Hamburger Toggle Button */}
        <button
          id="navbar-mobile-menu-btn"
          onClick={toggleSidebarOpen}
          className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors md:hidden cursor-pointer"
          title={isSidebarOpen ? 'Fermer le menu' : 'Ouvrir le menu latéral'}
          aria-label="Menu de navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Collapse / Expand Toggle Button */}
        <button
          id="navbar-desktop-collapse-btn"
          onClick={toggleSidebarCollapsed}
          className="hidden md:flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={isSidebarCollapsed ? 'Dérouler le menu latéral' : 'Enrouler le menu latéral'}
          aria-label="Basculer le menu latéral"
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-blue-500" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>

        {/* Brand (Mobile only) */}
        <div
          onClick={() => {
            setActiveView('dashboard');
            setSelectedStructureId(null);
          }}
          className="flex items-center gap-2 md:hidden cursor-pointer select-none"
        >
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-xs">
            <span>G</span>
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">GES-FIN</span>
        </div>

        {/* High-density Search Bar */}
        <div className="relative w-full max-w-xs sm:max-w-sm hidden sm:block">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              id="global-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              placeholder="Rechercher structure, référence prêt..."
              className="w-full h-8 pl-8 pr-3 bg-slate-100 dark:bg-slate-800 rounded-md text-xs border border-transparent focus:border-slate-300 dark:focus:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all"
            />
          </div>

          {/* Quick Search Dropdown */}
          {showSearchResults && searchQuery.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 p-2 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 z-50">
              <div className="flex justify-between items-center px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Résultats rapides</span>
                <button
                  onClick={() => setShowSearchResults(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  Fermer
                </button>
              </div>

              {searchResults.structures.length === 0 && searchResults.decaissements.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400">Aucun résultat trouvé</div>
              ) : (
                <div className="space-y-1">
                  {searchResults.structures.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedStructureId(s.id);
                        setActiveView('structures');
                        setShowSearchResults(false);
                        setSearchQuery('');
                      }}
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-purple-500" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{s.raison_sociale}</span>
                      </div>
                      <span className="text-slate-400 text-[10px]">{s.contact_nom}</span>
                    </div>
                  ))}
                  {searchResults.decaissements.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => {
                        setActiveView('decaissements');
                        setShowSearchResults(false);
                        setSearchQuery('');
                      }}
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{d.reference_unique}</span>
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(d.montant_principal)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Alerts Bell Button */}
        <div className="relative">
          <button
            id="nav-alerts-btn"
            onClick={() => setShowAlertsDropdown((prev) => !prev)}
            className="relative w-8 h-8 flex items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Alertes échéanciers"
          >
            <Bell className="w-4 h-4" />
            {urgentAlertsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>

          {showAlertsDropdown && (
            <div className="absolute right-0 mt-1.5 w-80 sm:w-96 p-3 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Alertes Échéances ({urgentAlertsCount})
                  </span>
                </div>
                <button
                  onClick={() => {
                    setActiveView('alerts');
                    setShowAlertsDropdown(false);
                  }}
                  className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  Voir tout
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 py-1">
                {alerts.slice(0, 5).map((al) => (
                  <div
                    key={al.id}
                    onClick={() => {
                      setActiveView('alerts');
                      setShowAlertsDropdown(false);
                    }}
                    className="py-2 px-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex items-start gap-2.5 transition-colors"
                  >
                    <span
                      className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                        al.severity === 'RED'
                          ? 'bg-red-500'
                          : al.severity === 'ORANGE'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {al.structure_nom}
                        </p>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {al.trimestre} {al.annee}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {al.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          id="theme-toggle-btn"
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={theme === 'dark' ? 'Basculer en mode clair' : 'Basculer en mode sombre'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Profile Button / Login Button */}
        {currentUser ? (
          <div className="relative">
            <button
              id="user-profile-menu-btn"
              onClick={() => setShowUserDropdown((prev) => !prev)}
              className="flex items-center gap-2 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
                {currentUser.nom.slice(0, 2).toUpperCase()}
              </div>
            </button>

            {showUserDropdown && (
              <div
                className="absolute right-0 mt-1.5 w-60 p-2 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 animate-in fade-in slide-in-from-top-2"
                onClick={() => setShowUserDropdown(false)}
              >
                <div className="p-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{currentUser.nom}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</p>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                    <Shield className="w-3 h-3" />
                    Rôle : {currentUser.role}
                  </div>
                </div>

                <button
                  id="user-menu-switch"
                  onClick={onOpenLogin}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-colors text-left"
                >
                  <User className="w-3.5 h-3.5" />
                  Changer de compte
                </button>

                <button
                  id="user-menu-settings"
                  onClick={() => setActiveView('settings')}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors text-left"
                >
                  <User className="w-3.5 h-3.5" />
                  Paramètres & Profil
                </button>

                <button
                  id="user-menu-logout"
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors mt-1 text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            id="nav-login-btn"
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            <span>Se connecter</span>
          </button>
        )}
      </div>
    </header>
  );
};
