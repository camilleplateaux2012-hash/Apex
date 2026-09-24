/**
 * ============================================================================
 * CONFIGURATION PHOTON REALTIME - [CYBERSTRIKE // PROTOCOL]
 * ============================================================================
 * 
 * Ce fichier configure le client Photon Realtime pour le multijoueur :
 *  - Synchronisation des positions & rotations des joueurs
 *  - Matchmaking, gestion des salons (Rooms / Lobbies)
 *  - Envoi d'événements réseau en temps réel (tirs, impacts, spawn)
 * 
 * INSTRUCTIONS POUR OBTENIR VOTRE APP ID PHOTON :
 * 1. Créez un compte gratuit sur https://dashboard.photonengine.com/
 * 2. Cliquez sur "Create a new App"
 * 3. Choisissez le type : "Photon Realtime"
 * 4. Donnez un nom (ex: "Cyberstrike FPS")
 * 5. Copiez l'App ID (GUID de 36 caractères) et collez-le ci-dessous
 *    ou dans votre fichier `.env` : VITE_PHOTON_APP_ID="votre-app-id"
 */

export interface PhotonAppConfig {
  appId: string;
  appVersion: string;
  region: 'eu' | 'us' | 'asia' | 'jp' | 'sa';
  maxPlayersPerRoom: number;
  sendRateHz: number;
  serializationRateHz: number;
}

export const PHOTON_CONFIG: PhotonAppConfig = {
  // App ID Photon Realtime officiel fourni
  appId: import.meta.env.VITE_PHOTON_APP_ID || "ab997dee-1b20-4da1-bea4-3e54682b459e",
  
  // Version de l'application (les joueurs sur des versions différentes ne se croisent pas)
  appVersion: import.meta.env.VITE_PHOTON_APP_VERSION || "1.0",
  
  // Région Photon par défaut (eu = Europe, us = USA Est, etc.)
  region: (import.meta.env.VITE_PHOTON_REGION as any) || "eu",

  // Paramètres de salon et synchronisation
  maxPlayersPerRoom: 8,
  sendRateHz: 30,           // Fréquence d'envoi réseau des paquets (30 Hz)
  serializationRateHz: 20,  // Fréquence de sérialisation des états (20 Hz)
};

/**
 * Vérifie si un App ID Photon valide a été configuré
 */
export function isPhotonConfigured(): boolean {
  return (
    Boolean(PHOTON_CONFIG.appId) &&
    PHOTON_CONFIG.appId !== "VOTRE_PHOTON_APP_ID_ICI" &&
    !PHOTON_CONFIG.appId.startsWith("VOTRE_")
  );
}
