import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Receipt,
  AlertTriangle,
  Settings,
  CreditCard,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  ChevronRight,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { exportPortfolioToExcel, exportActiveStructuresToExcel } from '../utils/exportUtils';

interface SidebarProps {
  onOpenLogin?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenLogin }) => {
  const {
    activeView,
    setActiveView,
    urgentAlertsCount,
    setSelectedStructureId,
    structures,
    decaissements,
    schedules,
    engagements,
    kpis,
    isSidebarOpen,
    setIsSidebarOpen,
    isSidebarCollapsed,
    toggleSidebarCollapsed,
  } = useFinance();
  const { currentUser } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'structures',
      label: 'Structures',
      icon: Building2,
      badge: structures.length,
    },
    {
      id: 'decaissements',
      label: 'Décaissements',
      icon: CreditCard,
      badge: decaissements.length,
    },
    {
      id: 'engagements',
      label: 'Remboursements',
      icon: Receipt,
      badge: engagements.length,
    },
    {
      id: 'alerts',
      label: 'Alertes Échéances',
      icon: AlertTriangle,
      badge: urgentAlertsCount > 0 ? urgentAlertsCount : null,
      badgeColor: 'bg-red-500 text-white',
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: Settings,
      badge: null,
    },
  ];

  const handleNavClick = (id: string) => {
    setActiveView(id);
    if (id === 'structures') {
      setSelectedStructureId(null);
    }
    // Close sidebar on mobile after clicking
    setIsSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`
          fixed md:static inset-y-0 left-0 z-50
          bg-slate-900 text-white flex flex-col shrink-0 border-r border-slate-800 select-none
          transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
          ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'}
          w-72 max-w-[85vw]
        `}
      >
        {/* Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
          <div
            onClick={() => handleNavClick('dashboard')}
            className={`flex items-center gap-3 cursor-pointer overflow-hidden transition-all ${
              isSidebarCollapsed ? 'md:justify-center md:w-full' : ''
            }`}
            title="GES-FIN - Tableau de Bord"
          >
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shadow-blue-600/30 shrink-0">
              <span className="text-base font-extrabold">G</span>
            </div>
            {(!isSidebarCollapsed || isSidebarOpen) && (
              <div className="flex-1 min-w-0 transition-opacity duration-200">
                <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  <span>GES-FIN</span>
                  <span className="text-blue-400 text-[9px] font-mono px-1.5 py-0.2 bg-blue-950 border border-blue-800 rounded">
                    v2.5
                  </span>
                </h1>
                <p className="text-[10px] text-slate-400 truncate">Gestion Décaissements</p>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle Button (Inside header when expanded) */}
          <button
            id="sidebar-desktop-collapse-btn"
            onClick={toggleSidebarCollapsed}
            className={`hidden md:flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ${
              isSidebarCollapsed ? 'md:hidden' : ''
            }`}
            title="Enrouler le menu latéral"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>

          {/* Mobile Close Button */}
          <button
            id="sidebar-mobile-close-btn"
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop Expand Icon Bar (when collapsed) */}
        {isSidebarCollapsed && (
          <div className="hidden md:flex items-center justify-center py-2 border-b border-slate-800">
            <button
              onClick={toggleSidebarCollapsed}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Dérouler le menu latéral"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 px-2.5 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {(!isSidebarCollapsed || isSidebarOpen) && (
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Menu Principal
            </p>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-link-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                title={item.label}
                className={`w-full flex items-center rounded-xl text-xs font-medium transition-all cursor-pointer group ${
                  isSidebarCollapsed && !isSidebarOpen
                    ? 'justify-center p-2.5'
                    : 'justify-between px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  {(!isSidebarCollapsed || isSidebarOpen) && (
                    <span className="truncate">{item.label}</span>
                  )}
                </div>

                {/* Badges */}
                {item.badge !== null && (
                  <>
                    {(!isSidebarCollapsed || isSidebarOpen) ? (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.badgeColor || 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : (
                      /* Collapsed dot badge */
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.badgeColor ? 'bg-red-500 animate-pulse' : 'bg-blue-400'
                        }`}
                      />
                    )}
                  </>
                )}
              </button>
            );
          })}

          {/* Quick Reports Widget */}
          {(!isSidebarCollapsed || isSidebarOpen) ? (
            <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
              <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Exports Rapides
              </p>
              <div className="space-y-1">
                <button
                  id="sidebar-export-portfolio"
                  onClick={() => exportPortfolioToExcel(structures, decaissements, schedules, engagements, kpis)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors text-left cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Portefeuille .XLSX</span>
                </button>
                <button
                  id="sidebar-export-structures"
                  onClick={() => exportActiveStructuresToExcel(structures, decaissements, engagements)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors text-left cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">Structures Actives</span>
                </button>
              </div>
            </div>
          ) : (
            /* Collapsed Quick Actions */
            <div className="pt-3 mt-3 border-t border-slate-800 flex flex-col items-center gap-2">
              <button
                onClick={() => exportPortfolioToExcel(structures, decaissements, schedules, engagements, kpis)}
                className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Exporter Portefeuille .XLSX"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          )}
        </nav>

        {/* Footer Info & User Card */}
        <div className="p-3 border-t border-slate-800 text-xs bg-slate-950/60">
          {(!isSidebarCollapsed || isSidebarOpen) && (
            <div className="flex items-center justify-between mb-2.5 px-1 text-[10px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>En ligne</span>
              </div>
              <span className="font-mono text-[10px] text-slate-500">GESFIN</span>
            </div>
          )}

          {currentUser ? (
            <div
              onClick={() => handleNavClick('settings')}
              className={`flex items-center rounded-xl bg-slate-800/60 hover:bg-slate-800 cursor-pointer transition-colors ${
                isSidebarCollapsed && !isSidebarOpen ? 'justify-center p-2' : 'gap-2.5 p-2'
              }`}
              title={`Connecté en tant que ${currentUser.nom}`}
            >
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {currentUser.nom.slice(0, 2).toUpperCase()}
              </div>
              {(!isSidebarCollapsed || isSidebarOpen) && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{currentUser.nom}</p>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {currentUser.role === 'ADMIN' ? 'Administrateur' : currentUser.role === 'MANAGER' ? 'Gestionnaire' : 'Lecteur'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                if (onOpenLogin) onOpenLogin();
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer shadow-sm transition-colors ${
                isSidebarCollapsed && !isSidebarOpen ? 'p-2' : 'gap-2 p-2'
              }`}
              title="Se Connecter"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {(!isSidebarCollapsed || isSidebarOpen) && <span>Se Connecter</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
