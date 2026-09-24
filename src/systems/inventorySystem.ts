/**
 * Système d'Inventaire et de Customisation
 * 
 * Gère le déblocage des skins d'armes, des visières et du loadout sélectionné
 */

import type { WeaponSkin } from '../types/game.ts';

export const INITIAL_WEAPON_SKINS: WeaponSkin[] = [
  {
    id: 'skin_default_railgun',
    name: 'MK-1 PROTOCOL',
    weaponType: 'RAILGUN',
    rarity: 'COMMON',
    glowColor: '#00f0ff', // Cyan
    unlocked: true,
    costCredits: 0,
  },
  {
    id: 'skin_neon_strike_railgun',
    name: 'NEON SPECTER',
    weaponType: 'RAILGUN',
    rarity: 'RARE',
    glowColor: '#ff007f', // Magenta
    unlocked: false,
    costCredits: 1200,
  },
  {
    id: 'skin_default_plasma',
    name: 'HYPERION PULSE',
    weaponType: 'PLASMA_RIFLE',
    rarity: 'COMMON',
    glowColor: '#00f0ff',
    unlocked: true,
    costCredits: 0,
  },
  {
    id: 'skin_void_plasma',
    name: 'DARK MATTER 2099',
    weaponType: 'PLASMA_RIFLE',
    rarity: 'LEGENDARY',
    glowColor: '#9d00ff', // Violet cyber
    unlocked: false,
    costCredits: 2500,
  },
  {
    id: 'skin_golden_photon',
    name: 'SOLAR FLARE',
    weaponType: 'PHOTON_PISTOL',
    rarity: 'EPIC',
    glowColor: '#ffaa00', // Gold tech
    unlocked: false,
    costCredits: 1800,
  }
];

class InventorySystem {
  public getAllSkins(): WeaponSkin[] {
    return [...INITIAL_WEAPON_SKINS];
  }

  public getSkinById(id: string): WeaponSkin | undefined {
    return INITIAL_WEAPON_SKINS.find(s => s.id === id);
  }
}

export const inventorySystem = new InventorySystem();
