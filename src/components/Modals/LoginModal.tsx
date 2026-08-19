import React, { useState } from 'react';
import { Lock, Mail, KeyRound, Eye, EyeOff, CheckCircle2, Shield, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  canClose?: boolean;
}

export const LoginModal: React.FC<Props> = ({ isOpen, onClose, canClose = true }) => {
  const { login, availableUsers, isAuthenticated, currentUser } = useAuth();

  const [identifiant, setIdentifiant] = useState('admin@finantrim.fr');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await login(identifiant, password);
      if (result.success) {
        onClose();
      } else {
        setErrorMessage(result.error || 'Identifiant ou mot de passe incorrect.');
      }
    } catch {
      setErrorMessage('Une erreur est survenue lors de la connexion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectQuickUser = (email: string, pass: string) => {
    setIdentifiant(email);
    setPassword(pass);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center relative">
          {canClose && (
            <button
              id="login-modal-close-btn"
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="w-12 h-12 mx-auto mb-3 bg-white/15 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-inner">
            <Lock className="w-6 h-6 text-white" />
          </div>

          <h2 className="text-xl font-bold tracking-tight">GES-FIN</h2>
          <p className="text-xs text-blue-100 mt-1">
            Espace Sécurisé de Gestion des Décaissements & Remboursements
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div
              id="login-error-alert"
              className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Identifiant */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Identifiant / Email *
            </label>
            <input
              id="login-identifiant-input"
              type="text"
              required
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              placeholder="ex: admin@finantrim.fr"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
          </div>

          {/* Mot de passe */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Mot de passe *
            </label>
            <div className="relative">
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe..."
                className="w-full pl-3.5 pr-10 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="login-submit-btn"
            type="submit"
            disabled={isSubmitting || !identifiant || !password}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Connexion en cours...' : 'Se Connecter'}</span>
          </button>

          {/* Quick Demo Credentials Switcher */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Comptes de démonstration (1 clic)
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                id="quick-login-admin"
                onClick={() => handleSelectQuickUser('admin@finantrim.fr', 'admin123')}
                className="p-1.5 rounded-lg border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/30 hover:bg-purple-100 text-center transition-colors cursor-pointer"
              >
                <span className="block text-[10px] font-bold text-purple-700 dark:text-purple-300">Admin</span>
                <span className="text-[9px] text-slate-500 truncate block">Marc Dupond</span>
              </button>

              <button
                type="button"
                id="quick-login-manager"
                onClick={() => handleSelectQuickUser('claire.bernard@finantrim.fr', 'manager123')}
                className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100 text-center transition-colors cursor-pointer"
              >
                <span className="block text-[10px] font-bold text-blue-700 dark:text-blue-300">Gestionnaire</span>
                <span className="text-[9px] text-slate-500 truncate block">Claire B.</span>
              </button>

              <button
                type="button"
                id="quick-login-viewer"
                onClick={() => handleSelectQuickUser('thomas.leroy@finantrim.fr', 'viewer123')}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-center transition-colors cursor-pointer"
              >
                <span className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">Lecteur</span>
                <span className="text-[9px] text-slate-500 truncate block">Thomas L.</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
