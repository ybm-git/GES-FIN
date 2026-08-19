import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { INITIAL_USERS } from '../data/mockData';
import { AuthSnapshot, exportAuthSnapshotJSON } from '../utils/backupUtils';

interface ResetRequest {
  email: string;
  code: string;
  expiresAt: number;
}

interface AuthContextType {
  currentUser: User | null;
  user: User | null;
  isAuthenticated: boolean;
  usersList: User[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateAdminCredentials: (data: {
    nom: string;
    email: string;
    currentPassword?: string;
    newPassword?: string;
  }) => { success: boolean; error?: string };
  requestPasswordResetCode: (email: string) => { success: boolean; code?: string; error?: string };
  resetPasswordWithCode: (
    email: string,
    code: string,
    newPassword: string
  ) => { success: boolean; error?: string };
  exportAuthSnapshot: (options?: { encrypt?: boolean; passphrase?: string }) => void;
  restoreAuthSnapshot: (snapshot: AuthSnapshot) => { success: boolean; error?: string };
  canEdit: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'gesfin_current_user_session';
const USERS_STORAGE_KEY = 'gesfin_users_database';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usersList, setUsersList] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  // Strict authentication: only restore if a valid active session is saved
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [pendingReset, setPendingReset] = useState<ResetRequest | null>(null);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersList));
  }, [usersList]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const user = usersList.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, error: 'Aucun compte administrateur associé à cette adresse email.' };
    }

    if (user.password_hash && user.password_hash !== password) {
      return { success: false, error: 'Mot de passe incorrect. Vérifiez vos identifiants.' };
    }

    setCurrentUser(user);
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const updateAdminCredentials = (data: {
    nom: string;
    email: string;
    currentPassword?: string;
    newPassword?: string;
  }): { success: boolean; error?: string } => {
    if (!currentUser) {
      return { success: false, error: 'Utilisateur non authentifié.' };
    }

    const cleanEmail = data.email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: 'Veuillez saisir une adresse email/Gmail valide.' };
    }

    // Check if another user has this email
    const duplicate = usersList.find(
      (u) => u.id !== currentUser.id && u.email.toLowerCase() === cleanEmail
    );
    if (duplicate) {
      return { success: false, error: 'Cette adresse email est déjà utilisée par un autre compte.' };
    }

    let updatedPassword = currentUser.password_hash;

    if (data.newPassword) {
      if (!data.currentPassword) {
        return { success: false, error: 'Le mot de passe actuel est requis pour définir un nouveau mot de passe.' };
      }
      if (currentUser.password_hash && currentUser.password_hash !== data.currentPassword) {
        return { success: false, error: 'Le mot de passe actuel est incorrect.' };
      }
      if (data.newPassword.length < 6) {
        return { success: false, error: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' };
      }
      updatedPassword = data.newPassword;
    }

    const updatedUser: User = {
      ...currentUser,
      nom: data.nom.trim() || currentUser.nom,
      email: cleanEmail,
      password_hash: updatedPassword,
    };

    setCurrentUser(updatedUser);
    setUsersList((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));

    return { success: true };
  };

  const requestPasswordResetCode = (email: string): { success: boolean; code?: string; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const user = usersList.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return {
        success: false,
        error: 'Aucun compte administrateur enregistré avec cette adresse Gmail/Email.',
      };
    }

    // Generate a secure 6-digit numeric verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity

    setPendingReset({
      email: cleanEmail,
      code,
      expiresAt,
    });

    return { success: true, code };
  };

  const resetPasswordWithCode = (
    email: string,
    code: string,
    newPassword: string
  ): { success: boolean; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();

    if (!pendingReset || pendingReset.email !== cleanEmail) {
      return { success: false, error: 'Aucune demande de réinitialisation en attente pour cet email.' };
    }

    if (Date.now() > pendingReset.expiresAt) {
      return { success: false, error: 'Le code de vérification a expiré. Veuillez refaire une demande.' };
    }

    if (pendingReset.code !== code.trim()) {
      return { success: false, error: 'Code de vérification invalide. Vérifiez le code reçu.' };
    }

    if (newPassword.length < 6) {
      return { success: false, error: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' };
    }

    const targetUser = usersList.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!targetUser) {
      return { success: false, error: 'Compte utilisateur introuvable.' };
    }

    const updatedUser: User = {
      ...targetUser,
      password_hash: newPassword,
    };

    setUsersList((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    setCurrentUser(updatedUser);
    setPendingReset(null);

    return { success: true };
  };

  /**
   * Exporte un snapshot dédié aux identifiants et accès
   */
  const exportAuthSnapshot = (options?: { encrypt?: boolean; passphrase?: string }) => {
    exportAuthSnapshotJSON(usersList, currentUser, options);
  };

  /**
   * Restaure UNIQUEMENT les comptes et identifiants sans toucher aux structures, décaissements ou remboursements
   */
  const restoreAuthSnapshot = (snapshot: AuthSnapshot): { success: boolean; error?: string } => {
    try {
      if (!snapshot.users || !Array.isArray(snapshot.users) || snapshot.users.length === 0) {
        return { success: false, error: 'Le snapshot ne contient aucun utilisateur valide.' };
      }

      setUsersList(snapshot.users);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(snapshot.users));

      // If an admin exists in the restored snapshot, update current user session
      const adminUser = snapshot.users.find((u) => u.role === 'ADMIN') || snapshot.users[0];
      if (adminUser) {
        setCurrentUser(adminUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminUser));
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erreur lors de la restauration du snapshot de connexion.' };
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN';
  const canEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        user: currentUser,
        isAuthenticated: !!currentUser,
        usersList,
        login,
        logout,
        updateAdminCredentials,
        requestPasswordResetCode,
        resetPasswordWithCode,
        exportAuthSnapshot,
        restoreAuthSnapshot,
        canEdit,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
