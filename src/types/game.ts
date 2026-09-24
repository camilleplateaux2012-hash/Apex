/**
 * Types globaux pour le jeu FPS
 */

export type ScreenState = 
  | 'BOOT_LOADING'
  | 'MAIN_MENU'
  | 'LOBBY_BROWSER'
  | 'LOADOUT'
  | 'STATS'
  | 'SETTINGS'
  | 'IN_GAME_PREPARE'
  | 'IN_GAME';

export interface PlayerStats {
  matches: number;
  kills: number;
  deaths: number;
  wins: number;
  kdRatio?: number;
  winRate?: number;
}

export interface WeaponSkin {
  id: string;
  name: string;
  weaponType: 'RAILGUN' | 'PLASMA_RIFLE' | 'PHOTON_PISTOL' | 'NEO_BLADE';
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  glowColor: string;
  unlocked: boolean;
  costCredits: number;
}

export interface PlayerProfile {
  uid: string;
  callsign: string;
  isAnonymous: boolean;
  credits: number;
  neonCores: number;
  rank: string;
  rankScore: number;
  selectedSkinId: string;
  unlockedSkinIds: string[];
  stats: PlayerStats;
  createdAt: string;
  lastLoginAt: string;
}

export interface GameSettings {
  fov: number;
  mouseSensitivity: number;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  postProcessing: boolean;
  shadows: 'low' | 'medium' | 'high';
}
