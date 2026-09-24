/**
 * Configuration Modulaire de l'Arsenal (Weapons Configuration)
 * 
 * Architecture de données modulaire pour toutes les armes du jeu :
 * - Chaque arme est définie par un objet de données complet
 * - Pour ajouter une nouvelle arme (4e, 5e, etc.), il suffit d'ajouter une entrée
 *   dans cette liste sans modifier le code de gameplay ou de rendu.
 */

export type WeaponCategory = 'smg' | 'rifle' | 'sniper' | 'pistol' | 'shotgun' | 'heavy';

export type WeaponSoundType = 'pulse_smg' | 'laser_rifle' | 'rail_sniper' | 'plasma_shotgun';

export type ProjectileShape = 'laser_beam' | 'plasma_bolt' | 'rail_pierce';

export interface WeaponModelTheme {
  primaryColor: string;       // Couleur du métal principal (ex: '#0c1322')
  accentColor: string;        // Couleur des LED / liserés néon (ex: '#00f0ff')
  bodyWidth: number;          // Largeur du boîtier
  bodyHeight: number;         // Hauteur du boîtier
  bodyLength: number;         // Longueur du châssis
  barrelLength: number;       // Longueur du canon
  barrelRadius: number;       // Rayon du canon
  hasLongScope?: boolean;     // Présence d'une lunette de visée longue (Sniper)
  hasFrontGrip?: boolean;     // Présence d'une poignée tactique avant (SMG / Fusil)
  hasEnergyCoils?: boolean;   // Anneaux accélérateurs d'énergie le long du canon
  coilCount?: number;         // Nombre d'anneaux d'énergie
}

export interface WeaponVisualConfig {
  beamColor: string;          // Couleur du faisceau laser / projectile en vol
  beamRadius: number;         // Épaisseur visuelle du faisceau
  beamDuration: number;       // Durée de rémanence du rayon (secondes)
  muzzleFlashColor: string;   // Couleur du flash à la bouche
  muzzleFlashScale: number;   // Taille du flash
  impactColor: string;        // Couleur des étincelles à l'impact
  projectileShape: ProjectileShape;
  modelTheme: WeaponModelTheme;
}

export interface WeaponDefinition {
  id: string;
  name: string;
  type: WeaponCategory;
  categoryLabel: string;      // Libellé de catégorie affiché sur l'UI (ex: "MITRAILLETTE RAPIDE")
  description: string;
  damage: number;             // Dégâts de base par projectile
  headshotMultiplier: number; // Multiplicateur de coup critique à la tête
  fireRateSeconds: number;    // Intervalle minimal entre deux tirs (cadence)
  magazineSize: number;       // Munitions par chargeur
  reserveAmmo: number;        // Munitions en réserve
  reloadTimeSeconds: number;  // Durée du rechargement
  range: number;              // Portée maximale effective (mètres)
  recoilKickback: number;     // Puissance du recul sur l'arme et la caméra
  spreadAngle: number;        // Dispersion angulaire (rad)
  sound: WeaponSoundType;
  visual: WeaponVisualConfig;
}

/**
 * Catalogue complet des armes disponibles
 */
export const WEAPONS_CATALOG: WeaponDefinition[] = [
  // 1. ARME RAPIDE / FAIBLE DÉGÂT : MITRAILLETTE PLASMA (SMG)
  {
    id: 'volt_smg',
    name: 'VOLT-9 SUB-PLASMA',
    type: 'smg',
    categoryLabel: 'MITRAILLETTE RAPIDE',
    description: 'Cadence de tir foudroyante à courte portée. Projette des salves de plasma violet ionisé.',
    damage: 18,
    headshotMultiplier: 1.6,
    fireRateSeconds: 0.08, // ~750 RPM
    magazineSize: 32,
    reserveAmmo: 160,
    reloadTimeSeconds: 0.85,
    range: 48,
    recoilKickback: 0.015,
    spreadAngle: 0.018,
    sound: 'pulse_smg',
    visual: {
      beamColor: '#ff007f', // Rose néon / Magenta
      beamRadius: 0.018,
      beamDuration: 0.06,
      muzzleFlashColor: '#ff007f',
      muzzleFlashScale: 0.8,
      impactColor: '#ff007f',
      projectileShape: 'plasma_bolt',
      modelTheme: {
        primaryColor: '#0f172a',
        accentColor: '#ff007f',
        bodyWidth: 0.06,
        bodyHeight: 0.08,
        bodyLength: 0.22,
        barrelLength: 0.08,
        barrelRadius: 0.014,
        hasFrontGrip: true,
        hasEnergyCoils: false,
      },
    },
  },

  // 2. ARME ÉQUILIBRÉE / MOYENNE : FUSIL D'ASSAUT À IMPULSIONS (RIFLE)
  {
    id: 'photon_rifle',
    name: 'PHOTON RIFLE MK-II',
    type: 'rifle',
    categoryLabel: 'FUSIL À IMPULSIONS',
    description: 'Arme de combat polyvalente. Équilibre parfait entre portée, dégâts stables et précision.',
    damage: 34,
    headshotMultiplier: 2.0,
    fireRateSeconds: 0.16, // ~375 RPM
    magazineSize: 20,
    reserveAmmo: 100,
    reloadTimeSeconds: 1.2,
    range: 90,
    recoilKickback: 0.028,
    spreadAngle: 0.006,
    sound: 'laser_rifle',
    visual: {
      beamColor: '#00f0ff', // Cyan cybernétique
      beamRadius: 0.026,
      beamDuration: 0.08,
      muzzleFlashColor: '#00f0ff',
      muzzleFlashScale: 1.0,
      impactColor: '#00f0ff',
      projectileShape: 'laser_beam',
      modelTheme: {
        primaryColor: '#0b1120',
        accentColor: '#00f0ff',
        bodyWidth: 0.07,
        bodyHeight: 0.09,
        bodyLength: 0.28,
        barrelLength: 0.16,
        barrelRadius: 0.018,
        hasFrontGrip: true,
        hasEnergyCoils: true,
        coilCount: 2,
      },
    },
  },

  // 3. ARME PRÉCISE / LENTE : FUSIL DE PRÉCISION ÉLECTROMAGNÉTIQUE (SNIPER RAILGUN)
  {
    id: 'nova_sniper',
    name: 'NOVA-X RAILGUN',
    type: 'sniper',
    categoryLabel: 'FUSIL DE PRÉCISION',
    description: 'Accélérateur magnétique à forte puissance. Tir dévastateur ultra-précis mais rechargement lourd.',
    damage: 90,
    headshotMultiplier: 3.0, // 270 dégâts en critique (One-shot garanti)
    fireRateSeconds: 0.85, // Cadence lente coup par coup
    magazineSize: 5,
    reserveAmmo: 25,
    reloadTimeSeconds: 2.0,
    range: 180,
    recoilKickback: 0.075,
    spreadAngle: 0.0008, // Précision quasi chirurgicale
    sound: 'rail_sniper',
    visual: {
      beamColor: '#fbbf24', // Ambre / Or électrique
      beamRadius: 0.05,
      beamDuration: 0.26, // Faisceau rémanent spectaculaire
      muzzleFlashColor: '#f59e0b',
      muzzleFlashScale: 1.6,
      impactColor: '#fbbf24',
      projectileShape: 'rail_pierce',
      modelTheme: {
        primaryColor: '#090d16',
        accentColor: '#fbbf24',
        bodyWidth: 0.08,
        bodyHeight: 0.1,
        bodyLength: 0.36,
        barrelLength: 0.32,
        barrelRadius: 0.022,
        hasLongScope: true,
        hasEnergyCoils: true,
        coilCount: 4,
      },
    },
  },
];

/**
 * Récupère une arme par son ID ou retourne la première arme par défaut
 */
export function getWeaponById(id: string): WeaponDefinition {
  const found = WEAPONS_CATALOG.find((w) => w.id === id);
  return found || WEAPONS_CATALOG[0];
}

/**
 * Récupère l'index d'une arme dans le catalogue
 */
export function getWeaponIndex(id: string): number {
  const index = WEAPONS_CATALOG.findIndex((w) => w.id === id);
  return index >= 0 ? index : 0;
}
