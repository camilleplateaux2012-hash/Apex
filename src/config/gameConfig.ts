/**
 * Game Configuration & Metadata
 * 
 * Modifiez le nom du jeu ici ou via vos variables d'environnement.
 */
export const GAME_CONFIG = {
  // Nom du jeu (facilement modifiable ici)
  TITLE: "CYBERSTRIKE // PROTOCOL",
  CODENAME: "PROJECT_CYBERSTRIKE",
  VERSION: "0.1.0-ALPHA",
  SUBTITLE: "TACTICAL MULTIPLAYER CYBERPUNK FPS",
  
  // Paramètres d'ambiance et thématiques
  THEME: {
    PRIMARY_COLOR: "#00f0ff",   // Cyan Néon
    SECONDARY_COLOR: "#ff007f", // Magenta Néon
    ACCENT_COLOR: "#ffaa00",    // Ambre Tech
    BG_DARK: "#050811",         // Noir / Bleu Nuit Profond
    BG_CARD: "#0c1222",         // Bleu Nuit UI
  },

  // Configuration par défaut du joueur (chargé avant Firebase)
  DEFAULT_PLAYER: {
    callsign: "NETRUNNER_01",
    credits: 2500,
    neonCores: 15,
    rank: "ROOKIE",
    rankScore: 120,
    stats: {
      matches: 0,
      kills: 0,
      deaths: 0,
      wins: 0,
    }
  },

  // Réglages par défaut
  SETTINGS: {
    fov: 90,
    mouseSensitivity: 2.0,
    masterVolume: 80,
    sfxVolume: 85,
    musicVolume: 65,
    postProcessing: true,
    shadows: "medium" as const,
  }
};
