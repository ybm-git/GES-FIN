import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/Dashboard/DashboardView';
import { StructuresListView } from './components/Structures/StructuresListView';
import { DecaissementsView } from './components/Decaissements/DecaissementsView';
import { EngagementsView } from './components/Engagements/EngagementsView';
import { AlertsView } from './components/Alerts/AlertsView';
import { SettingsView } from './components/Settings/SettingsView';

import { NewDecaissementModal } from './components/Modals/NewDecaissementModal';
import { NewEngagementModal } from './components/Modals/NewEngagementModal';
import { NewStructureModal } from './components/Modals/NewStructureModal';
import { EditDecaissementModal } from './components/Modals/EditDecaissementModal';
import { EditEngagementModal } from './components/Modals/EditEngagementModal';
import { DeleteEngagementModal } from './components/Modals/DeleteEngagementModal';
import { LoginModal } from './components/Modals/LoginModal';
import { LoginScreen } from './components/Auth/LoginScreen';

import { Decaissement, Engagement } from './types';

import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Receipt,
  AlertTriangle,
  Settings,
  Menu,
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const {
    activeView,
    setActiveView,
    urgentAlertsCount,
    setSelectedStructureId,
    isSidebarOpen,
    toggleSidebarOpen,
  } = useFinance();
  const { currentUser } = useAuth();

  // Modals state
  const [isDecaissementModalOpen, setIsDecaissementModalOpen] = useState(false);
  const [initialStructureIdForDec, setInitialStructureIdForDec] = useState<string | undefined>();

  const [isEngagementModalOpen, setIsEngagementModalOpen] = useState(false);
  const [initialDecaissementIdForEng, setInitialDecaissementIdForEng] = useState<string | undefined>();
  const [initialEcheancierIdForEng, setInitialEcheancierIdForEng] = useState<string | undefined>();

  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);

  // Edit Modals state
  const [isEditDecaissementModalOpen, setIsEditDecaissementModalOpen] = useState(false);
  const [editingDecaissement, setEditingDecaissement] = useState<Decaissement | null>(null);

  const [isEditEngagementModalOpen, setIsEditEngagementModalOpen] = useState(false);
  const [editingEngagement, setEditingEngagement] = useState<Engagement | null>(null);

  // Delete Engagement Modal state
  const [isDeleteEngagementModalOpen, setIsDeleteEngagementModalOpen] = useState(false);
  const [deletingEngagement, setDeletingEngagement] = useState<Engagement | null>(null);

  // Login Modal state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Handlers
  const handleOpenNewDecaissement = (structureId?: string) => {
    setInitialStructureIdForDec(structureId);
    setIsDecaissementModalOpen(true);
  };

  const handleOpenNewEngagement = (decaissementId?: string, echeancierId?: string) => {
    setInitialDecaissementIdForEng(decaissementId);
    setInitialEcheancierIdForEng(echeancierId);
    setIsEngagementModalOpen(true);
  };

  const handleOpenNewStructure = () => {
    setIsStructureModalOpen(true);
  };

  const handleOpenEditDecaissement = (dec: Decaissement) => {
    setEditingDecaissement(dec);
    setIsEditDecaissementModalOpen(true);
  };

  const handleOpenEditEngagement = (eng: Engagement) => {
    setEditingEngagement(eng);
    setIsEditEngagementModalOpen(true);
  };

  const handleOpenDeleteEngagement = (eng: Engagement) => {
    setDeletingEngagement(eng);
    setIsDeleteEngagementModalOpen(true);
  };

  const handleOpenLogin = () => {
    setIsLoginModalOpen(true);
  };

  // Render view
  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView
            onOpenNewDecaissement={() => handleOpenNewDecaissement()}
            onOpenNewEngagement={handleOpenNewEngagement}
          />
        );
      case 'structures':
        return (
          <StructuresListView
            onOpenNewStructure={handleOpenNewStructure}
            onOpenNewDecaissement={handleOpenNewDecaissement}
            onOpenNewEngagement={handleOpenNewEngagement}
            onOpenEditDecaissement={handleOpenEditDecaissement}
            onOpenEditEngagement={handleOpenEditEngagement}
            onOpenDeleteEngagement={handleOpenDeleteEngagement}
          />
        );
      case 'decaissements':
        return (
          <DecaissementsView
            onOpenNewDecaissement={() => handleOpenNewDecaissement()}
            onOpenNewEngagement={handleOpenNewEngagement}
            onOpenEditDecaissement={handleOpenEditDecaissement}
          />
        );
      case 'engagements':
        return (
          <EngagementsView
            onOpenNewEngagement={() => handleOpenNewEngagement()}
            onOpenEditEngagement={handleOpenEditEngagement}
            onOpenDeleteEngagement={handleOpenDeleteEngagement}
          />
        );
      case 'alerts':
        return <AlertsView onOpenNewEngagement={handleOpenNewEngagement} />;
      case 'settings':
        return <SettingsView />;
      default:
        return (
          <DashboardView
            onOpenNewDecaissement={() => handleOpenNewDecaissement()}
            onOpenNewEngagement={handleOpenNewEngagement}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors">
      
      {/* Top Navigation Bar */}
      <Navbar
        onOpenNewDecaissement={() => handleOpenNewDecaissement()}
        onOpenNewEngagement={() => handleOpenNewEngagement()}
        onOpenNewStructure={handleOpenNewStructure}
        onOpenLogin={handleOpenLogin}
      />

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Desktop High-Density Sidebar */}
        <Sidebar onOpenLogin={handleOpenLogin} />

        {/* Dynamic High-Density Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 sm:p-5">
          <div className="w-full max-w-[1600px] mx-auto">{renderActiveView()}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden flex items-center justify-around py-1.5 px-3 bg-slate-900 text-white border-t border-slate-800 shrink-0 z-20">
        <button
          onClick={() => setActiveView('dashboard')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg ${
            activeView === 'dashboard' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => {
            setSelectedStructureId(null);
            setActiveView('structures');
          }}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg ${
            activeView === 'structures' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Structures</span>
        </button>

        <button
          onClick={() => setActiveView('decaissements')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg ${
            activeView === 'decaissements' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Prêts</span>
        </button>

        <button
          onClick={() => setActiveView('engagements')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg ${
            activeView === 'engagements' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Remb.</span>
        </button>

        <button
          id="mobile-bottom-menu-btn"
          onClick={toggleSidebarOpen}
          className={`relative flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg cursor-pointer ${
            isSidebarOpen ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Menu className="w-4 h-4" />
          <span>Menu</span>
          {urgentAlertsCount > 0 && (
            <span className="absolute top-0.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>
      </nav>

      {/* Global Modals */}
      <NewDecaissementModal
        isOpen={isDecaissementModalOpen}
        onClose={() => setIsDecaissementModalOpen(false)}
        defaultStructureId={initialStructureIdForDec}
      />

      <NewEngagementModal
        isOpen={isEngagementModalOpen}
        onClose={() => setIsEngagementModalOpen(false)}
        defaultDecaissementId={initialDecaissementIdForEng}
        defaultEcheancierId={initialEcheancierIdForEng}
      />

      <NewStructureModal
        isOpen={isStructureModalOpen}
        onClose={() => setIsStructureModalOpen(false)}
      />

      <EditDecaissementModal
        isOpen={isEditDecaissementModalOpen}
        onClose={() => {
          setIsEditDecaissementModalOpen(false);
          setEditingDecaissement(null);
        }}
        decaissement={editingDecaissement}
      />

      <EditEngagementModal
        isOpen={isEditEngagementModalOpen}
        onClose={() => {
          setIsEditEngagementModalOpen(false);
          setEditingEngagement(null);
        }}
        engagement={editingEngagement}
      />

      <DeleteEngagementModal
        isOpen={isDeleteEngagementModalOpen}
        onClose={() => {
          setIsDeleteEngagementModalOpen(false);
          setDeletingEngagement(null);
        }}
        engagement={deletingEngagement}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        canClose={true}
      />
    </div>
  );
};

const AppRoot: React.FC = () => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <LoginScreen />;
  }

  return <MainAppContent />;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FinanceProvider>
          <AppRoot />
        </FinanceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
