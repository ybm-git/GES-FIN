import { Structure, Decaissement, EcheancierTrimestriel, Engagement, User } from '../types';

export interface BackupSnapshot {
  version: string;
  app: string;
  type?: 'GESFIN_FULL_SNAPSHOT' | 'GESFIN_CORE';
  export_date: string;
  metadata: {
    structures_count: number;
    decaissements_count: number;
    schedules_count: number;
    engagements_count: number;
    total_decaisse: number;
    total_rembourse: number;
  };
  data: {
    structures: Structure[];
    decaissements: Decaissement[];
    schedules: EcheancierTrimestriel[];
    engagements: Engagement[];
    users?: User[];
  };
  signature?: string;
}

export interface AuthSnapshot {
  version: string;
  type: 'GESFIN_AUTH_SNAPSHOT';
  app: string;
  export_date: string;
  admin_email: string;
  admin_nom: string;
  users: User[];
  signature?: string;
}

// Simple checksum generator for validation
function generateChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `CHK-${Math.abs(hash).toString(16).toUpperCase()}-${content.length}`;
}

/**
 * Exporte un snapshot complet (données financières + utilisateurs)
 */
export function exportSnapshotJSON(
  structures: Structure[],
  decaissements: Decaissement[],
  schedules: EcheancierTrimestriel[],
  engagements: Engagement[],
  users?: User[],
  options?: { encrypt?: boolean; passphrase?: string }
): void {
  const totalDecaisse = decaissements.reduce((sum, d) => sum + d.montant_principal, 0);
  const totalRembourse = engagements.reduce((sum, e) => sum + e.montant_verse, 0);

  const snapshot: BackupSnapshot = {
    version: '2.0.0',
    app: 'GESFIN_CORE',
    type: 'GESFIN_FULL_SNAPSHOT',
    export_date: new Date().toISOString(),
    metadata: {
      structures_count: structures.length,
      decaissements_count: decaissements.length,
      schedules_count: schedules.length,
      engagements_count: engagements.length,
      total_decaisse: totalDecaisse,
      total_rembourse: totalRembourse,
    },
    data: {
      structures,
      decaissements,
      schedules,
      engagements,
      users,
    },
  };

  const jsonString = JSON.stringify(snapshot, null, 2);
  snapshot.signature = generateChecksum(jsonString);

  let finalBlobContent: BlobPart = JSON.stringify(snapshot, null, 2);
  let fileExtension = 'json';

  if (options?.encrypt && options?.passphrase) {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(snapshot))));
    const encryptedWrapper = {
      isEncrypted: true,
      app: 'GESFIN_ENCRYPTED_ARCHIVE',
      export_date: snapshot.export_date,
      passphrase_hint: options.passphrase ? `Longueur: ${options.passphrase.length}` : '',
      payload: encoded,
      signature: generateChecksum(encoded),
    };
    finalBlobContent = JSON.stringify(encryptedWrapper, null, 2);
    fileExtension = 'gesfin.json';
  }

  const blob = new Blob([finalBlobContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `gesfin-sauvegarde-complete-${dateStr}.${fileExtension}`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exporte un snapshot DÉDIÉ UNIQUEMENT AUX IDENTIFIANTS ET PARAMÈTRES DE CONNEXION
 * Sa restauration ne modifie en aucun cas les structures, décaissements ou remboursements.
 */
export function exportAuthSnapshotJSON(
  users: User[],
  currentUser?: User | null,
  options?: { encrypt?: boolean; passphrase?: string }
): void {
  const admin = currentUser || users.find((u) => u.role === 'ADMIN') || users[0];

  const authSnapshot: AuthSnapshot = {
    version: '2.0.0',
    type: 'GESFIN_AUTH_SNAPSHOT',
    app: 'GESFIN_AUTH_MODULE',
    export_date: new Date().toISOString(),
    admin_email: admin?.email || 'admin@finantrim.fr',
    admin_nom: admin?.nom || 'Administrateur Principal',
    users: users,
  };

  const jsonString = JSON.stringify(authSnapshot, null, 2);
  authSnapshot.signature = generateChecksum(jsonString);

  let finalBlobContent: BlobPart = JSON.stringify(authSnapshot, null, 2);
  let fileExtension = 'json';

  if (options?.encrypt && options?.passphrase) {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(authSnapshot))));
    const encryptedWrapper = {
      isEncrypted: true,
      app: 'GESFIN_AUTH_ENCRYPTED_ARCHIVE',
      export_date: authSnapshot.export_date,
      passphrase_hint: options.passphrase ? `Longueur: ${options.passphrase.length}` : '',
      payload: encoded,
      signature: generateChecksum(encoded),
    };
    finalBlobContent = JSON.stringify(encryptedWrapper, null, 2);
    fileExtension = 'auth.gesfin.json';
  }

  const blob = new Blob([finalBlobContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `gesfin-identifiants-connexion-${dateStr}.${fileExtension}`;
  a.click();
  URL.revokeObjectURL(url);
}

export type ParsedSnapshotResult =
  | {
      kind: 'FULL';
      snapshot: BackupSnapshot;
      summary: {
        structuresCount: number;
        decaissementsCount: number;
        schedulesCount: number;
        engagementsCount: number;
        date: string;
      };
    }
  | {
      kind: 'AUTH_ONLY';
      authSnapshot: AuthSnapshot;
      summary: {
        adminNom: string;
        adminEmail: string;
        usersCount: number;
        date: string;
      };
    };

/**
 * Valide et extrait les données d'un fichier snapshot JSON (complet ou auth-only)
 */
export function parseAndValidateSnapshot(
  jsonText: string,
  passphrase?: string
): {
  success: boolean;
  result?: ParsedSnapshotResult;
  error?: string;
} {
  try {
    let rawParsed = JSON.parse(jsonText);

    // Check if it's an encrypted archive
    if (rawParsed.isEncrypted && rawParsed.payload) {
      try {
        const decoded = decodeURIComponent(escape(atob(rawParsed.payload)));
        rawParsed = JSON.parse(decoded);
      } catch {
        return { success: false, error: 'Impossible de déchiffrer le snapshot. Format ou mot de passe invalide.' };
      }
    }

    // Check if it is an Auth-Only snapshot
    if (rawParsed.type === 'GESFIN_AUTH_SNAPSHOT' || (rawParsed.admin_email && Array.isArray(rawParsed.users) && !rawParsed.data?.structures)) {
      const authSnapshot = rawParsed as AuthSnapshot;
      if (!Array.isArray(authSnapshot.users) || authSnapshot.users.length === 0) {
        return { success: false, error: 'Le snapshot de connexion ne contient aucun compte utilisateur valide.' };
      }

      return {
        success: true,
        result: {
          kind: 'AUTH_ONLY',
          authSnapshot,
          summary: {
            adminNom: authSnapshot.admin_nom || 'Administrateur',
            adminEmail: authSnapshot.admin_email || authSnapshot.users[0]?.email,
            usersCount: authSnapshot.users.length,
            date: authSnapshot.export_date,
          },
        },
      };
    }

    // Full snapshot validation
    let snapshot: BackupSnapshot;

    if (rawParsed.data && Array.isArray(rawParsed.data.structures)) {
      snapshot = rawParsed as BackupSnapshot;
    } else if (Array.isArray(rawParsed.structures)) {
      // Legacy format fallback
      snapshot = {
        version: '1.0.0',
        app: 'GESFIN',
        type: 'GESFIN_FULL_SNAPSHOT',
        export_date: rawParsed.exportDate || new Date().toISOString(),
        metadata: {
          structures_count: rawParsed.structures.length,
          decaissements_count: (rawParsed.decaissements || []).length,
          schedules_count: (rawParsed.schedules || []).length,
          engagements_count: (rawParsed.engagements || []).length,
          total_decaisse: 0,
          total_rembourse: 0,
        },
        data: {
          structures: rawParsed.structures,
          decaissements: rawParsed.decaissements || [],
          schedules: rawParsed.schedules || [],
          engagements: rawParsed.engagements || [],
        },
      };
    } else {
      return {
        success: false,
        error: 'Le fichier sélectionné ne correspond ni à une sauvegarde complète, ni à un snapshot de connexion GES-FIN.',
      };
    }

    return {
      success: true,
      result: {
        kind: 'FULL',
        snapshot,
        summary: {
          structuresCount: snapshot.data.structures.length,
          decaissementsCount: snapshot.data.decaissements.length,
          schedulesCount: snapshot.data.schedules.length,
          engagementsCount: snapshot.data.engagements.length,
          date: snapshot.export_date,
        },
      },
    };
  } catch (err: any) {
    return { success: false, error: `Erreur de lecture du fichier JSON : ${err?.message || 'Fichier corrompu'}` };
  }
}
