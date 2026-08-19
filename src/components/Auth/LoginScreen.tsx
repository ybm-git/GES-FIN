import React, { useState, useRef } from 'react';
import {
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Upload,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { parseAndValidateSnapshot } from '../../utils/backupUtils';

export const LoginScreen: React.FC = () => {
  const { login, requestPasswordResetCode, resetPasswordWithCode, restoreAuthSnapshot } = useAuth();

  const [mode, setMode] = useState<'LOGIN' | 'FORGOT_REQUEST' | 'FORGOT_VERIFY'>('LOGIN');

  // Login form state
  const [identifiant, setIdentifiant] = useState('admin@finantrim.fr');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCodeHint, setGeneratedCodeHint] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Feedback messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Restore snapshot from login
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const result = await login(identifiant, password);
      if (!result.success) {
        setErrorMessage(result.error || 'Identifiant ou mot de passe incorrect.');
      }
    } catch {
      setErrorMessage('Une erreur est survenue lors de la tentative de connexion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await requestPasswordResetCode(resetEmail);
      if (res.success && res.code) {
        setGeneratedCodeHint(res.code);
        setVerificationCode(res.code); // prefill code for seamless UX
        setSuccessMessage(`Code de récupération sécurisé envoyé à votre adresse ${resetEmail}.`);
        setMode('FORGOT_VERIFY');
      } else {
        setErrorMessage(res.error || 'Impossible de trouver ce compte.');
      }
    } catch {
      setErrorMessage('Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReset = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage('Les deux mots de passe ne correspondent pas.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = resetPasswordWithCode(resetEmail, verificationCode, newPassword);
      if (res.success) {
        setSuccessMessage('Votre mot de passe a été mis à jour avec succès. Vous êtes maintenant connecté.');
      } else {
        setErrorMessage(res.error || 'Échec de la réinitialisation.');
      }
    } catch {
      setErrorMessage('Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestoreAuthFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const text = await file.text();
      const res = parseAndValidateSnapshot(text);

      if (res.success && res.result) {
        if (res.result.kind === 'AUTH_ONLY') {
          const restoreRes = restoreAuthSnapshot(res.result.authSnapshot);
          if (restoreRes.success) {
            setSuccessMessage('Identifiants restaurés avec succès ! Connexion automatique en cours...');
          } else {
            setErrorMessage(restoreRes.error || 'Erreur lors de la restauration du snapshot de connexion.');
          }
        } else if (res.result.kind === 'FULL' && res.result.snapshot.data.users) {
          const users = res.result.snapshot.data.users;
          const adminUser = users.find((u) => u.role === 'ADMIN') || users[0];
          restoreAuthSnapshot({
            version: '2.0.0',
            type: 'GESFIN_AUTH_SNAPSHOT',
            app: 'GESFIN',
            export_date: res.result.snapshot.export_date,
            admin_email: adminUser.email,
            admin_nom: adminUser.nom,
            users: users,
          });
          setSuccessMessage('Identifiants extraits du snapshot complet avec succès ! Connexion en cours...');
        } else {
          setErrorMessage('Ce fichier ne contient aucun profil administrateur exploitable.');
        }
      } else {
        setErrorMessage(res.error || 'Fichier de sauvegarde non reconnu.');
      }
    } catch (err: any) {
      setErrorMessage(`Erreur lors de la lecture du fichier : ${err?.message || 'Erreur inconnue'}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center relative">
          <div className="w-12 h-12 mx-auto mb-3 bg-white/15 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-inner">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">GES-FIN PORTAIL</h1>
          <p className="text-xs text-blue-100 mt-1 font-medium">
            Gestion Sécurisée des Décaissements & Recouvrements
          </p>
        </div>

        {/* Form Container */}
        <div className="p-6 sm:p-7 space-y-4">
          
          {/* Notifications */}
          {errorMessage && (
            <div
              id="login-error-message"
              className="p-3 rounded-lg bg-red-950/50 border border-red-800/80 text-red-300 text-xs flex items-center gap-2 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              id="login-success-message"
              className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* MODE: STANDARD LOGIN */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span>Identifiant / Email Administrateur *</span>
                </label>
                <input
                  id="admin-login-email"
                  type="email"
                  required
                  value={identifiant}
                  onChange={(e) => setIdentifiant(e.target.value)}
                  placeholder="admin@finantrim.fr"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                    <span>Mot de passe *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      setResetEmail(identifiant);
                      setMode('FORGOT_REQUEST');
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="admin-login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Votre mot de passe..."
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="admin-login-btn"
                type="submit"
                disabled={isSubmitting || !identifiant || !password}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isSubmitting ? 'Authentification...' : 'Se Connecter à l\'Application'}</span>
              </button>

              {/* Restore Auth Snapshot option */}
              <div className="pt-2 border-t border-slate-800 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleRestoreAuthFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer py-1"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Restaurer mes accès via un Snapshot (.json)</span>
                </button>
              </div>
            </form>
          )}

          {/* MODE: FORGOT PASSWORD - STEP 1 REQUEST */}
          {mode === 'FORGOT_REQUEST' && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="p-3 bg-blue-950/40 border border-blue-900/60 rounded-lg text-xs text-blue-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Récupération de Compte Administrateur
                </p>
                <p className="text-[11px] text-slate-400">
                  Saisissez l'adresse email ou Gmail associée à votre compte pour recevoir un code de vérification.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span>Votre Adresse Email / Gmail *</span>
                </label>
                <input
                  id="forgot-email-input"
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="ex: admin@finantrim.fr ou ybm.inter@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                id="request-reset-code-btn"
                type="submit"
                disabled={isSubmitting || !resetEmail}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>Envoyer le code de vérification</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setMode('LOGIN');
                  }}
                  className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  ← Retour à la connexion
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  <span>Restaurer Snapshot JSON</span>
                </button>
              </div>
            </form>
          )}

          {/* MODE: FORGOT PASSWORD - STEP 2 VERIFY & SET NEW PASSWORD */}
          {mode === 'FORGOT_VERIFY' && (
            <form onSubmit={handleConfirmReset} className="space-y-3.5">
              <div className="p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-lg text-xs text-emerald-200">
                <span className="font-bold block">Code de sécurité généré :</span>
                <span className="font-mono text-sm tracking-widest text-emerald-400 font-extrabold block mt-0.5">
                  {generatedCodeHint}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Valable pendant 15 minutes pour votre adresse {resetEmail}.
                </span>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Code de vérification (6 chiffres) *
                </label>
                <input
                  id="reset-otp-input"
                  type="text"
                  required
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  className="w-full font-mono text-center tracking-widest text-sm px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Nouveau mot de passe *
                </label>
                <div className="relative">
                  <input
                    id="reset-new-password-input"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Au moins 6 caractères..."
                    className="w-full pl-3.5 pr-10 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-200"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Confirmer le mot de passe *
                </label>
                <input
                  id="reset-confirm-password-input"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le nouveau mot de passe..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                id="save-new-password-btn"
                type="submit"
                disabled={isSubmitting || !verificationCode || !newPassword || !confirmPassword}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-3"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Enregistrer & Se Connecter</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setMode('LOGIN');
                }}
                className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors cursor-pointer pt-1"
              >
                Annuler
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-950 border-t border-slate-800/80 text-center text-[10px] text-slate-500">
          Système Sécurisé &bull; Chiffrement & Intégrité Comptable
        </div>
      </div>
    </div>
  );
};
