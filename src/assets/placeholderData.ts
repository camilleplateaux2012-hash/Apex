/**
 * Constantes et Assets placeholders pour [CYBERSTRIKE // PROTOCOL]
 */

export interface WeaponDef {
  id: string;
  name: string;
  type: string;
  damage: number;
  fireRate: number; // Tirs par minute
  magazineCapacity: number;
  reloadTimeSec: number;
  description: string;
  glowColor: string;
}

export const WEAPON_REGISTRY: Record<string, WeaponDef> = {
  RAILGUN: {
    id: 'RAILGUN',
    name: 'CS-900 COILGUN',
    type: 'Sniper Électromagnétique',
    damage: 95,
    fireRate: 45,
    magazineCapacity: 5,
    reloadTimeSec: 2.2,
    description: 'Accélérateur de particules lourd conçu pour les éliminations nettes à longue distance.',
    glowColor: '#00f0ff',
  },
  PLASMA_RIFLE: {
    id: 'PLASMA_RIFLE',
    name: 'VX-4 PLASMA RIFLE',
    type: 'Fusil d’Assaut à Énergie',
    damage: 28,
    fireRate: 650,
    magazineCapacity: 32,
    reloadTimeSec: 1.6,
    description: 'Arme automatique standard des forces d’intervention corpo. Cadence de tir soutenue.',
    glowColor: '#ff007f',
  },
  PHOTON_PISTOL: {
    id: 'PHOTON_PISTOL',
    name: 'ARC-12 PHOTON HANDGUN',
    type: 'Pistolet Semi-Auto Haute Tension',
    damage: 38,
    fireRate: 350,
    magazineCapacity: 15,
    reloadTimeSec: 1.1,
    description: 'Arme secondaire rapide et létale, alimentée par une cellule à photon dense.',
    glowColor: '#ffaa00',
  }
};

export const ARENA_MAPS = [
  {
    id: 'NEON_DISTRICT_A',
    name: 'NEON DISTRICT - SECTEUR 04',
    location: 'Neo-Shinjuku Underbelly',
    climate: 'Pluie d’acide & Brume néon',
    recommendedPlayers: '4 - 8 Joueurs',
    status: 'ACTIVE',
  },
  {
    id: 'CYBER_VAULT',
    name: 'DATACENTER QUANTIQUE',
    location: 'Zeta Corp Sub-Level 99',
    climate: 'Refroidissement Cryogénique',
    recommendedPlayers: '6 - 10 Joueurs',
    status: 'ACTIVE',
  },
  {
    id: 'SKYSCRAPER_ROOFTOPS',
    name: 'HÉLIPORTS VERTIGINEUX',
    location: 'Megatower Apex Tier',
    climate: 'Vents violents 120 km/h',
    recommendedPlayers: '8 - 12 Joueurs',
    status: 'STANDBY',
  }
];
