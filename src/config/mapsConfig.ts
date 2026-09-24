/**
 * Catalogue et Architecture des Maps Modulaires (Modular Maps System)
 * 
 * Permet d'ajouter n'importe quelle nouvelle map en ajoutant simplement
 * une entrée dans MAPS_CATALOG et son composant 3D associé.
 * 
 * DESIGN DE NIVEAU TACTIQUE (Inspiration Valorant) :
 * - Échelle agrandie (périmètres de 90x90 mètres)
 * - Structure en 3 lanes principales reliant les zones de spawn
 * - Points d'étranglement (chokepoints) resserrés
 * - Forte verticalité avec rampes et plateformes surélevées
 * - Multiples zones de couverture
 * - Spawns d'équipes protégés et séparés (sans ligne de vue directe)
 */

import * as THREE from 'three';
import type { MapDefinition, MapBoxCollider, MapObstacle, MapBounds, SpawnPoint, CaptureZone, SanctuaryZone, SanctuaryZonesConfig } from '../types/maps.ts';
import type { TrainingTarget } from '../types/fps.ts';

export type { MapDefinition, MapBoxCollider, MapObstacle, MapBounds, SpawnPoint, CaptureZone, SanctuaryZone, SanctuaryZonesConfig };

/**
 * Vérifie si une position donnée est à l'intérieur d'une zone sanctuaire
 */
export function isPositionInsideSanctuary(
  pos: THREE.Vector3 | [number, number, number],
  sanctuary: SanctuaryZone
): boolean {
  if (!sanctuary) return false;
  const px = Array.isArray(pos) ? pos[0] : pos.x;
  const pz = Array.isArray(pos) ? pos[2] : pos.z;
  const sx = sanctuary.position[0];
  const sz = sanctuary.position[2];
  const distSq = (px - sx) ** 2 + (pz - sz) ** 2;
  return distSq <= sanctuary.radius * sanctuary.radius;
}

/**
 * Retourne le statut sanctuaire du joueur selon sa position, sa team et la map active
 */
export function getPlayerSanctuaryStatus(
  pos: THREE.Vector3 | [number, number, number],
  map: MapDefinition,
  playerTeam: 'RED' | 'BLUE' | 'SOLO'
): {
  isInSanctuary: boolean;
  isOwnSanctuary: boolean;
  sanctuary: SanctuaryZone | null;
} {
  if (!map || !map.sanctuaryZones) {
    return { isInSanctuary: false, isOwnSanctuary: false, sanctuary: null };
  }
  const inRed = isPositionInsideSanctuary(pos, map.sanctuaryZones.red);
  const inBlue = isPositionInsideSanctuary(pos, map.sanctuaryZones.blue);

  if (inRed) {
    const isOwn = playerTeam === 'RED' || playerTeam === 'SOLO';
    return { isInSanctuary: true, isOwnSanctuary: isOwn, sanctuary: map.sanctuaryZones.red };
  }
  if (inBlue) {
    const isOwn = playerTeam === 'BLUE' || playerTeam === 'SOLO';
    return { isInSanctuary: true, isOwnSanctuary: isOwn, sanctuary: map.sanctuaryZones.blue };
  }
  return { isInSanctuary: false, isOwnSanctuary: false, sanctuary: null };
}

/**
 * Générateur automatique de BoxColliders à partir d'une liste d'obstacles
 */
export function buildCollidersFromObstacles(obstacles: MapObstacle[]): MapBoxCollider[] {
  return obstacles.map((obs) => {
    const halfX = obs.size[0] / 2;
    const halfY = obs.size[1] / 2;
    const halfZ = obs.size[2] / 2;
    return {
      id: obs.id,
      name: obs.name,
      position: obs.position,
      size: obs.size,
      color: obs.color,
      min: new THREE.Vector3(
        obs.position[0] - halfX,
        obs.position[1] - halfY,
        obs.position[2] - halfZ
      ),
      max: new THREE.Vector3(
        obs.position[0] + halfX,
        obs.position[1] + halfY,
        obs.position[2] + halfZ
      ),
    };
  });
}

/**
 * Résolution des collisions dynamique pour n'importe quelle map
 */
export function resolveMapPlayerCollisions(
  map: MapDefinition,
  currentPos: THREE.Vector3,
  desiredPos: THREE.Vector3,
  playerRadius: number = 0.45,
  playerHeight: number = 1.8
): { finalPos: THREE.Vector3; onGround: boolean; groundY: number } {
  const result = desiredPos.clone();
  let groundY = map.bounds.floorY;

  // 1. Limites du périmètre de la map
  const minX = map.bounds.minX + playerRadius;
  const maxX = map.bounds.maxX - playerRadius;
  const minZ = map.bounds.minZ + playerRadius;
  const maxZ = map.bounds.maxZ - playerRadius;

  result.x = Math.max(minX, Math.min(maxX, result.x));
  result.z = Math.max(minZ, Math.min(maxZ, result.z));

  // 2. Collision avec plafond si intérieur
  if (map.bounds.ceilingY !== undefined) {
    const maxHeadY = map.bounds.ceilingY - 0.1;
    if (result.y + playerHeight > maxHeadY) {
      result.y = maxHeadY - playerHeight;
    }
  }

  // 3. Collisions avec les boîtes d'obstacles solides de la map
  for (const col of map.colliders) {
    const isOverTop =
      result.x + playerRadius > col.min.x &&
      result.x - playerRadius < col.max.x &&
      result.z + playerRadius > col.min.z &&
      result.z - playerRadius < col.max.z;

    if (isOverTop && currentPos.y >= col.max.y - 0.25) {
      if (col.max.y > groundY) {
        groundY = col.max.y;
      }
      continue;
    }

    const playerFeet = result.y;
    const playerHead = result.y + playerHeight;
    const overlapsY = playerFeet < col.max.y && playerHead > col.min.y;

    if (!overlapsY) continue;

    // Test glissement axe X
    if (
      result.x + playerRadius > col.min.x &&
      result.x - playerRadius < col.max.x &&
      currentPos.z + playerRadius > col.min.z &&
      currentPos.z - playerRadius < col.max.z
    ) {
      if (currentPos.x <= col.min.x) {
        result.x = col.min.x - playerRadius;
      } else if (currentPos.x >= col.max.x) {
        result.x = col.max.x + playerRadius;
      }
    }

    // Test glissement axe Z
    if (
      result.x + playerRadius > col.min.x &&
      result.x - playerRadius < col.max.x &&
      result.z + playerRadius > col.min.z &&
      result.z - playerRadius < col.max.z
    ) {
      if (currentPos.z <= col.min.z) {
        result.z = col.min.z - playerRadius;
      } else if (currentPos.z >= col.max.z) {
        result.z = col.max.z + playerRadius;
      }
    }
  }

  const onGround = result.y <= groundY + 0.05;
  if (result.y < groundY) {
    result.y = groundY;
  }

  return { finalPos: result, onGround, groundY };
}

// ==========================================
// 🌆 MAP 1 : "NEO-ROOFTOP DISTRICT" (EXTÉRIEUR - LARGE SCALE)
// ==========================================
const ROOFTOP_OBSTACLES: MapObstacle[] = [
  // --- BLUE SPAWN (SUD) PROTECTION ---
  { id: 'rt_spawn_blue_wall', name: 'Écran Tactique Sud', position: [0, 3.5, 32], size: [22, 7, 3], color: '#00f0ff', type: 'wall' },
  { id: 'rt_spawn_blue_cover_l', name: 'Bloc de Garde SO', position: [-15, 2, 36], size: [4, 4, 4], color: '#1e293b', type: 'crate' },
  { id: 'rt_spawn_blue_cover_r', name: 'Bloc de Garde SE', position: [15, 2, 36], size: [4, 4, 4], color: '#1e293b', type: 'crate' },

  // --- RED SPAWN (NORD) PROTECTION ---
  { id: 'rt_spawn_red_wall', name: 'Écran Tactique Nord', position: [0, 3.5, -32], size: [22, 7, 3], color: '#ff007f', type: 'wall' },
  { id: 'rt_spawn_red_cover_l', name: 'Bloc de Garde NO', position: [-15, 2, -36], size: [4, 4, 4], color: '#1e293b', type: 'crate' },
  { id: 'rt_spawn_red_cover_r', name: 'Bloc de Garde NE', position: [15, 2, -36], size: [4, 4, 4], color: '#1e293b', type: 'crate' },

  // --- MAIN LANE DIVIDERS (Lanes Left, Center, Right) ---
  { id: 'rt_divider_left_n', name: 'Mur Séparateur NO', position: [-18, 5, -16], size: [3, 10, 24], color: '#0d1527', type: 'wall' },
  { id: 'rt_divider_left_s', name: 'Mur Séparateur SO', position: [-18, 5, 16], size: [3, 10, 24], color: '#0d1527', type: 'wall' },
  { id: 'rt_divider_right_n', name: 'Mur Séparateur NE', position: [18, 5, -16], size: [3, 10, 24], color: '#0d1527', type: 'wall' },
  { id: 'rt_divider_right_s', name: 'Mur Séparateur SE', position: [18, 5, 16], size: [3, 10, 24], color: '#0d1527', type: 'wall' },

  // --- CHOKEPOINTS / GATES ---
  { id: 'rt_choke_left', name: 'Porte Gauche Corridor', position: [-18, 4, 0], size: [3, 8, 8], color: '#8b5cf6', type: 'barricade' },
  { id: 'rt_choke_right', name: 'Porte Droite Corridor', position: [18, 4, 0], size: [3, 8, 8], color: '#8b5cf6', type: 'barricade' },

  // --- LEFT LANE (A) & VERTICALITY ---
  { id: 'rt_left_platform', name: 'Passerelle Sniper A', position: [-34, 3, -10], size: [8, 0.4, 12], color: '#00f0ff', type: 'platform' },
  { id: 'rt_left_ramp', name: 'Rampe d\'Accès A', position: [-34, 1.5, 2], size: [6, 3, 10], color: '#1e293b', type: 'platform' },
  { id: 'rt_left_cover_1', name: 'Caisse Tactique A1', position: [-34, 1, 15], size: [3, 2, 3], color: '#ff007f', type: 'crate' },
  { id: 'rt_left_cover_2', name: 'Caisse Tactique A2', position: [-38, 1, -22], size: [4, 2, 2], color: '#1e293b', type: 'crate' },

  // --- RIGHT LANE (C) & COVER ---
  { id: 'rt_right_comm_tower_base', name: 'Générateur Télécom C', position: [34, 2.5, -15], size: [8, 5, 8], color: '#0d1527', type: 'pillar' },
  { id: 'rt_right_comm_tower', name: 'Tour Comm', position: [34, 7.5, -15], size: [3, 5, 3], color: '#00f0ff', type: 'pillar' },
  { id: 'rt_right_platform', name: 'Passerelle Supérieure C', position: [34, 3, 12], size: [10, 0.4, 10], color: '#ff007f', type: 'platform' },
  { id: 'rt_right_box_stack', name: 'Conteneurs Stackés C', position: [34, 1.5, 2], size: [6, 3, 6], color: '#1e293b', type: 'crate' },
  { id: 'rt_right_barricade', name: 'Barrière Laser C', position: [40, 1, 22], size: [4, 2, 1.5], color: '#ff007f', type: 'barricade' },

  // --- CENTER LANE (B - HELIPAD) ---
  { id: 'rt_center_helipad_base', name: 'Socle Héliport Central', position: [0, 0.2, 0], size: [12, 0.4, 12], color: '#00f0ff', type: 'platform' },
  { id: 'rt_center_cover_n', name: 'Climatiseur Central Nord', position: [0, 1.5, -10], size: [5, 3, 3], color: '#1e293b', type: 'crate' },
  { id: 'rt_center_cover_s', name: 'Climatiseur Central Sud', position: [0, 1.5, 10], size: [5, 3, 3], color: '#1e293b', type: 'crate' },
  { id: 'rt_center_block_l', name: 'Bloc de Confinement Ouest', position: [-8, 2, 0], size: [4, 4, 4], color: '#8b5cf6', type: 'crate' },
  { id: 'rt_center_block_r', name: 'Bloc de Confinement Est', position: [8, 2, 0], size: [4, 4, 4], color: '#8b5cf6', type: 'crate' },
];

const ROOFTOP_TARGETS: TrainingTarget[] = [
  { id: 'rt_drone_1', position: new THREE.Vector3(-34, 4.2, -10), baseY: 4.2, radius: 0.6, height: 1.2, hp: 100, maxHp: 100, isDead: false, respawnTime: 0, hitFlashTime: 0 },
  { id: 'rt_drone_2', position: new THREE.Vector3(34, 3.8, 12), baseY: 3.8, radius: 0.6, height: 1.2, hp: 100, maxHp: 100, isDead: false, respawnTime: 0, hitFlashTime: 0 },
  { id: 'rt_drone_3', position: new THREE.Vector3(0, 3.2, 0), baseY: 3.2, radius: 0.7, height: 1.4, hp: 100, maxHp: 100, isDead: false, respawnTime: 0, hitFlashTime: 0 },
  { id: 'rt_drone_4', position: new THREE.Vector3(-15, 2.5, -20), baseY: 2.5, radius: 0.6, height: 1.2, hp: 100, maxHp: 100, isDead: false, respawnTime: 0, hitFlashTime: 0 },
  { id: 'rt_drone_5', position: new THREE.Vector3(15, 2.5, 20), baseY: 2.5, radius: 0.6, height: 1.2, hp: 100, maxHp: 100, isDead: false, respawnTime: 0, hitFlashTime: 0 },
];

export const MAP_ROOFTOP_DISTRICT: MapDefinition = {
  id: 'rooftop_district',
  name: 'NEO-ROOFTOP DISTRICT',
  codename: 'MAP-01 // SKYLINE',
  description: 'Toit géant de mégastructure suspendu. Layout tactique Valorant complet à 3 lanes avec héliport de convergence, passerelles surélevées pour snipers et chokepoints étroits.',
  environmentType: 'outdoor',
  tags: ['EXTÉRIEUR', 'DESIGN TACTIQUE', 'VERTICALITÉ', '3-LANES'],
  accentColor: '#00f0ff',
  secondaryColor: '#8b5cf6',
  thumbnailGradient: 'from-cyan-950 via-slate-900 to-violet-950',
  bounds: {
    minX: -45,
    maxX: 45,
    minZ: -45,
    maxZ: 45,
    floorY: 0,
  },
  spawnPoints: [
    {
      id: 'spawn_neutral_south',
      name: 'Plateforme Tactique Sud',
      position: [0, 0, 38],
      yaw: Math.PI,
      team: 'neutral',
      description: 'Point de départ Sud protégé de la vue centrale.',
    },
    {
      id: 'spawn_red_hangar',
      name: 'Hangar Nord-Ouest (Rouge)',
      position: [-5, 0, -40],
      yaw: 0,
      team: 'red',
      description: 'Spawn sécurisé équipe Rouge.',
    },
    {
      id: 'spawn_blue_skybridge',
      name: 'Passerelle Sud-Est (Bleu)',
      position: [5, 0, 40],
      yaw: Math.PI,
      team: 'blue',
      description: 'Spawn sécurisé équipe Bleu.',
    },
    {
      id: 'spawn_neutral_west',
      name: 'Nid de Sniper A (Gauche)',
      position: [-34, 3.2, -10],
      yaw: 0,
      team: 'neutral',
      description: 'Vantage point tactique surélevé.',
    },
    {
      id: 'spawn_neutral_east',
      name: 'Tunnel C (Droite)',
      position: [34, 0, 25],
      yaw: -Math.PI / 2,
      team: 'neutral',
      description: 'Flanc droit tactique pour contournements.',
    },
  ],
  defaultSpawn: [0, 0, 38],
  defaultYaw: Math.PI,
  captureZone: {
    id: 'cap_alpha_helipad',
    name: 'ZONE CAPTURE ALPHA // HÉLIPORT',
    code: 'ALPHA',
    position: [0, 0.25, 0],
    radius: 5.5,
    height: 4.0,
    accentColor: '#00f0ff',
    description: 'Héliport central. Point de capture de haute convergence tactique.',
  },
  sanctuaryZones: {
    red: {
      id: 'sanc_rt_red',
      name: 'SANCTUAIRE NORD // BASE ROUGE',
      team: 'red',
      position: [0, 0, -38],
      radius: 12,
      height: 6,
      accentColor: '#ff0055',
      description: 'Zone de soin et bouclier de protection inviolable équipe Rouge',
    },
    blue: {
      id: 'sanc_rt_blue',
      name: 'SANCTUAIRE SUD // BASE BLEUE',
      team: 'blue',
      position: [0, 0, 38],
      radius: 12,
      height: 6,
      accentColor: '#00f0ff',
      description: 'Zone de soin et bouclier de protection inviolable équipe Bleue',
    },
  },
  obstacles: ROOFTOP_OBSTACLES,
  colliders: buildCollidersFromObstacles(ROOFTOP_OBSTACLES),
  initialTargets: ROOFTOP_TARGETS,
  lighting: {
    ambientIntensity: 2.4,
    ambientColor: '#4a6d9b',
    dirLightColor: '#e0f2fe',
    dirLightIntensity: 4.2,
    dirLightPos: [15, 35, 15],
    fogColor: '#0c1e3d',
    fogNear: 60,
    fogFar: 220,
    background: '#0c1e3d',
  },
};

// ==========================================
// 🏢 MAP 2 : "UNDERGROUND GRID // SECTOR 0" (INTÉRIEUR - LARGE SCALE)
// ==========================================
const UNDERGROUND_OBSTACLES: MapObstacle[] = [
  // --- BLUE SPAWN (OUEST) PROTECTION ---
  { id: 'ug_spawn_blue_shield', name: 'Blindage Cryogénique Ouest', position: [-32, 4.5, 0], size: [3, 9, 20], color: '#00f0ff', type: 'wall' },
  { id: 'ug_spawn_blue_cover_1', name: 'Rack de Distribution A', position: [-36, 2, -14], size: [4, 4, 4], color: '#1e1526', type: 'server' },
  { id: 'ug_spawn_blue_cover_2', name: 'Rack de Distribution B', position: [-36, 2, 14], size: [4, 4, 4], color: '#1e1526', type: 'server' },

  // --- RED SPAWN (EST) PROTECTION ---
  { id: 'ug_spawn_red_shield', name: 'Blindage Cryogénique Est', position: [32, 4.5, 0], size: [3, 9, 20], color: '#ff007f', type: 'wall' },
  { id: 'ug_spawn_red_cover_1', name: 'Rack de Distribution C', position: [36, 2, -14], size: [4, 4, 4], color: '#1e1526', type: 'server' },
  { id: 'ug_spawn_red_cover_2', name: 'Rack de Distribution D', position: [36, 2, 14], size: [4, 4, 4], color: '#1e1526', type: 'server' },

  // --- MAIN LANE DIVIDERS (Lanes North, Center, South) ---
  { id: 'ug_divider_north_w', name: 'Cloison Blindée NO', position: [-16, 4.5, -18], size: [24, 9, 3], color: '#0a0d16', type: 'wall' },
  { id: 'ug_divider_north_e', name: 'Cloison Blindée NE', position: [16, 4.5, -18], size: [24, 9, 3], color: '#0a0d16', type: 'wall' },
  { id: 'ug_divider_south_w', name: 'Cloison Blindée SO', position: [-16, 4.5, 18], size: [24, 9, 3], color: '#0a0d16', type: 'wall' },
  { id: 'ug_divider_south_e', name: 'Cloison Blindée SE', position: [16, 4.5, 18], size: [24, 9, 3], color: '#0a0d16', type: 'wall' },

  // --- CHOKEPOINTS / BLAST DOORS ---
  { id: 'ug_choke_north', name: 'Sas Nord', position: [0, 4, -18], size: [8, 8, 3], color: '#10b981', type: 'barricade' },
  { id: 'ug_choke_south', name: 'Sas Sud', position: [0, 4, 18], size: [8, 8, 3], color: '#10b981', type: 'barricade' },

  // --- CENTER CHAMBER (REACTOR BRAVO) ---
  { id: 'ug_center_reactor_core', name: 'Réacteur Central Quantique', position: [0, 3, 0], size: [6.0, 6, 6.0], color: '#ff007f', type: 'reactor' },
  { id: 'ug_center_shield_w', name: 'Barrière Core Ouest', position: [-10, 2.5, 0], size: [2, 5, 8], color: '#1e1526', type: 'server' },
  { id: 'ug_center_shield_e', name: 'Barrière Core Est', position: [10, 2.5, 0], size: [2, 5, 8], color: '#1e1526', type: 'server' },

  // --- NORTH LANE (SERVER CORRIDOR) & VERTICALITY ---
  { id: 'ug_north_server_1', name: 'Baie Serveur Alpha 1', position: [-26, 2.5, -30], size: [4, 5, 6], color: '#10b981', type: 'server' },
  { id: 'ug_north_server_2', name: 'Baie Serveur Alpha 2', position: [26, 2.5, -30], size: [4, 5, 6], color: '#10b981', type: 'server' },
  { id: 'ug_north_platform', name: 'Passerelle Observation N', position: [0, 3.5, -32], size: [16, 0.4, 6], color: '#00f0ff', type: 'platform' },
  { id: 'ug_north_platform_ramp_l', name: 'Rampe Observation G', position: [-11, 1.75, -32], size: [6, 3.5, 6], color: '#1e1526', type: 'platform' },
  { id: 'ug_north_platform_ramp_r', name: 'Rampe Observation D', position: [11, 1.75, -32], size: [6, 3.5, 6], color: '#1e1526', type: 'platform' },

  // --- SOUTH LANE (GENERATOR TUNNEL) & COVER ---
  { id: 'ug_south_gen_1', name: 'Pilier Générateur S1', position: [-22, 3.5, 30], size: [6, 7, 6], color: '#ff007f', type: 'pillar' },
  { id: 'ug_south_gen_2', name: 'Pilier Générateur S2', position: [22, 3.5, 30], size: [6, 7, 6], color: '#ff007f', type: 'pillar' },
  { id: 'ug_south_cover_1', name: 'Échangeur Thermique', position: [0, 1.5, 30], size: [8, 3, 4], color: '#1e1526', type: 'pillar' },
  { id: 'ug_south_cover_2', name: 'Caisse Blindée', position: [-10, 1, 30], size: [3, 2, 3], color: '#10b981', type: 'server' },
];

const UNDERGROUND_TARGETS: TrainingTarget[] = [
  { id: 'ug_drone_1', position: new THREE.Vector3(-35, 2.2, 0), baseY: 2.2, radius: 0.6, height: 1.2, hp: 100, maxHp: 100, isDead: false, respawnTime: 0, hitFlashTime: 0 },
  { id: 'ug_drone_2', position: new THREE.Vector3(35, 2.2, 0), baseY: 2.2, radius: 0.6, height: 1.2, hp: 100, maxHp: 100, isDead: false, respawnTime: 0, hitFlashTime: 0 },
  { id: 'ug_drone_3', position: new THREE.Vector3(0, 4.2, -32), baseY: 4.2, radius: 0.6, height: 1.2, hp: 100, maxHp: 100, isDead: false, respawnTime: 0, hitFlashTime: 0 },
  { id: 'ug_drone_4', position: new THREE.Vector3(-22, 3.5, 24), baseY: 3.5, radius: 0.6, height: 1.2, hp: 100, maxHp: 100, isDead: false, respawnTime: 0, hitFlashTime: 0 },
  { id: 'ug_drone_5', position: new THREE.Vector3(22, 3.5, 24), baseY: 3.5, radius: 0.6, height: 1.2, hp: 100, maxHp: 100, isDead: false, respawnTime: 0, hitFlashTime: 0 },
];

export const MAP_UNDERGROUND_GRID: MapDefinition = {
  id: 'underground_grid',
  name: 'UNDERGROUND GRID // SECTOR 0',
  codename: 'MAP-02 // CORE',
  description: 'Bunker souterrain secret géant de 90m de diamètre. 3 lanes d\'assaut composées de rangées de serveurs, de passerelles d\'observation en hauteur et de sas anti-explosion.',
  environmentType: 'indoor',
  tags: ['INTÉRIEUR', 'LIGNES SERRÉES', 'RÉACTEUR', 'COULOIRS'],
  accentColor: '#ff007f',
  secondaryColor: '#10b981',
  thumbnailGradient: 'from-fuchsia-950 via-slate-900 to-emerald-950',
  bounds: {
    minX: -45,
    maxX: 45,
    minZ: -45,
    maxZ: 45,
    floorY: 0,
    ceilingY: 9.0,
  },
  spawnPoints: [
    {
      id: 'spawn_ug_neutral_south',
      name: 'Sas Ouest (Bleu)',
      position: [-38, 0, 0],
      yaw: Math.PI / 2,
      team: 'blue',
      description: 'Point d\'entrée Bleu sécurisé par blindage.',
    },
    {
      id: 'spawn_ug_red_cryo',
      name: 'Sas Est (Rouge)',
      position: [38, 0, 0],
      yaw: -Math.PI / 2,
      team: 'red',
      description: 'Point d\'entrée Rouge sécurisé par blindage.',
    },
    {
      id: 'spawn_ug_neutral_north',
      name: 'Poste de Contrôle Nord',
      position: [0, 0, -38],
      yaw: 0,
      team: 'neutral',
      description: 'Spawn neutre donnant accès aux baies de serveurs.',
    },
  ],
  defaultSpawn: [-38, 0, 0],
  defaultYaw: Math.PI / 2,
  captureZone: {
    id: 'cap_bravo_reactor',
    name: 'ZONE CAPTURE BRAVO // RÉACTEUR QUANTIQUE',
    code: 'BRAVO',
    position: [0, 0.2, 0],
    radius: 5.0,
    height: 4.5,
    accentColor: '#ff007f',
    description: 'Chambre du réacteur central. Point chaud de convergence tactique.',
  },
  sanctuaryZones: {
    red: {
      id: 'sanc_ug_red',
      name: 'SAS MÉDICAL CRYO // BASE ROUGE',
      team: 'red',
      position: [38, 0, 0],
      radius: 12,
      height: 7,
      accentColor: '#ff0055',
      description: 'Sas haute sécurité de soins et protection équipe Rouge',
    },
    blue: {
      id: 'sanc_ug_blue',
      name: 'SAS MÉDICAL OUEST // BASE BLEUE',
      team: 'blue',
      position: [-38, 0, 0],
      radius: 12,
      height: 7,
      accentColor: '#00f0ff',
      description: 'Sas haute sécurité de soins et protection équipe Bleue',
    },
  },
  obstacles: UNDERGROUND_OBSTACLES,
  colliders: buildCollidersFromObstacles(UNDERGROUND_OBSTACLES),
  initialTargets: UNDERGROUND_TARGETS,
  lighting: {
    ambientIntensity: 2.2,
    ambientColor: '#5c2a58',
    dirLightColor: '#ff77be',
    dirLightIntensity: 4.0,
    dirLightPos: [0, 20, 0],
    fogColor: '#1f0b1a',
    fogNear: 50,
    fogFar: 180,
    background: '#1f0b1a',
  },
};

// ==========================================
// 🌊 MAP 3 : "CYBER-CANAL DISTRICT" (EXTÉRIEUR - LANES VALORANT)
// ==========================================
const CANAL_OBSTACLES: MapObstacle[] = [
  // Protection de spawn
  { id: 'canal_spawn_blue_shield', name: 'Grille Canal Sud', position: [0, 3, 34], size: [16, 6, 3], color: '#00ffaa', type: 'wall' },
  { id: 'canal_spawn_red_shield', name: 'Grille Canal Nord', position: [0, 3, -34], size: [16, 6, 3], color: '#00ffaa', type: 'wall' },

  // Diviseurs de Lanes
  { id: 'canal_divider_left_n', name: 'Quai Gauche Nord', position: [-20, 4, -18], size: [4, 8, 20], color: '#0d1527', type: 'wall' },
  { id: 'canal_divider_left_s', name: 'Quai Gauche Sud', position: [-20, 4, 18], size: [4, 8, 20], color: '#0d1527', type: 'wall' },
  { id: 'canal_divider_right_n', name: 'Quai Droite Nord', position: [20, 4, -18], size: [4, 8, 20], color: '#0d1527', type: 'wall' },
  { id: 'canal_divider_right_s', name: 'Quai Droite Sud', position: [20, 4, 18], size: [4, 8, 20], color: '#0d1527', type: 'wall' },

  // Chokepoints
  { id: 'canal_choke_l', name: 'Porte Canal Gauche', position: [-20, 3.5, 0], size: [4, 7, 8], color: '#00ffaa', type: 'barricade' },
  { id: 'canal_choke_r', name: 'Porte Canal Droite', position: [20, 3.5, 0], size: [4, 7, 8], color: '#00ffaa', type: 'barricade' },

  // Plateforme centrale surélevée (Le Pont d'Acier)
  { id: 'canal_center_bridge', name: 'Pont d\'Acier Néon', position: [0, 1.8, 0], size: [14, 3.6, 10], color: '#00ffaa', type: 'platform' },
  { id: 'canal_bridge_ramp_s', name: 'Rampe Pont Sud', position: [0, 0.9, 10], size: [8, 1.8, 10], color: '#1e293b', type: 'platform' },
  { id: 'canal_bridge_ramp_n', name: 'Rampe Pont Nord', position: [0, 0.9, -10], size: [8, 1.8, 10], color: '#1e293b', type: 'platform' },

  // Couvertures
  { id: 'canal_cover_l1', name: 'Conteneur Filtrage A', position: [-34, 1.5, 12], size: [5, 3, 5], color: '#0d1527', type: 'crate' },
  { id: 'canal_cover_r1', name: 'Générateur de Fluide B', position: [34, 1.5, -12], size: [5, 3, 5], color: '#0d1527', type: 'crate' },
];

const CANAL_TARGETS: TrainingTarget[] = [
  { id: 'cn_drone_1', position: new THREE.Vector3(-34, 3, 0), baseY: 3, radius: 0.6, height: 1.2, hp: 100, maxHp: 100, isDead: false, respawnTime: 0, hitFlashTime: 0 },
  { id: 'cn_drone_2', position: new THREE.Vector3(34, 3, 0), baseY: 3, radius: 0.6, height: 1.2, hp: 100, maxHp: 100, isDead: false, respawnTime: 0, hitFlashTime: 0 },
  { id: 'cn_drone_3', position: new THREE.Vector3(0, 4.5, 0), baseY: 4.5, radius: 0.7, height: 1.4, hp: 100, maxHp: 100, isDead: false, respawnTime: 0, hitFlashTime: 0 },
];

export const MAP_CYBER_CANAL: MapDefinition = {
  id: 'cyber_canal_sector',
  name: 'CYBER-CANAL DISTRICT // SECTOR 7',
  codename: 'MAP-03 // CANAL',
  description: 'Réseau d\'égouts urbain converti en secteur industriel secret de 90m. Un canal d\'accès central avec pont suspendu, et deux larges quais dotés de barricades laser.',
  environmentType: 'outdoor',
  tags: ['EXTÉRIEUR', 'PONT SOULEVE', 'FLUX NÉON', 'LIGNES PARALLÈLES'],
  accentColor: '#00ffaa',
  secondaryColor: '#3b82f6',
  thumbnailGradient: 'from-emerald-950 via-slate-900 to-blue-950',
  bounds: {
    minX: -45,
    maxX: 45,
    minZ: -45,
    maxZ: 45,
    floorY: 0,
  },
  spawnPoints: [
    {
      id: 'spawn_canal_neutral',
      name: 'Docks Sud (Bleu)',
      position: [0, 0, 38],
      yaw: Math.PI,
      team: 'blue',
      description: 'Spawn Bleu face au canal.',
    },
    {
      id: 'spawn_canal_red',
      name: 'Station d\'Épuration Nord (Rouge)',
      position: [0, 0, -38],
      yaw: 0,
      team: 'red',
      description: 'Spawn Rouge face au canal.',
    },
  ],
  defaultSpawn: [0, 0, 38],
  defaultYaw: Math.PI,
  captureZone: {
    id: 'cap_canal_bridge',
    name: 'ZONE CAPTURE GAMMA // LE PONT',
    code: 'GAMMA',
    position: [0, 1.9, 0],
    radius: 4.8,
    height: 3.5,
    accentColor: '#00ffaa',
    description: 'Centre du pont néon. Position de tir supérieure de haute valeur.',
  },
  sanctuaryZones: {
    red: {
      id: 'sanc_canal_red',
      name: 'STATION DE RECHARGE NORD // BASE ROUGE',
      team: 'red',
      position: [0, 0, -38],
      radius: 12,
      height: 6,
      accentColor: '#ff0055',
      description: 'Hangar de régénération et défense impénétrable équipe Rouge',
    },
    blue: {
      id: 'sanc_canal_blue',
      name: 'DOCKS MÉDICAUX SUD // BASE BLEUE',
      team: 'blue',
      position: [0, 0, 38],
      radius: 12,
      height: 6,
      accentColor: '#00f0ff',
      description: 'Docks de régénération et défense impénétrable équipe Bleue',
    },
  },
  obstacles: CANAL_OBSTACLES,
  colliders: buildCollidersFromObstacles(CANAL_OBSTACLES),
  initialTargets: CANAL_TARGETS,
  lighting: {
    ambientIntensity: 2.3,
    ambientColor: '#1d4ed8',
    dirLightColor: '#93c5fd',
    dirLightIntensity: 3.8,
    dirLightPos: [10, 30, -10],
    fogColor: '#030712',
    fogNear: 50,
    fogFar: 190,
    background: '#030712',
  },
};

// ==========================================
// 🚦 MAP 4 : "SHIBUYA OVERPASS" (EXTÉRIEUR - CITY NEXUS)
// ==========================================
const SHIBUYA_OBSTACLES: MapObstacle[] = [
  // Protection de spawn
  { id: 'shib_spawn_blue_block', name: 'Écran Shibuya Ouest', position: [-34, 3.5, 0], size: [3, 7, 18], color: '#f59e0b', type: 'wall' },
  { id: 'shib_spawn_red_block', name: 'Écran Shibuya Est', position: [34, 3.5, 0], size: [3, 7, 18], color: '#f59e0b', type: 'wall' },

  // Cloisons de Lanes
  { id: 'shib_divider_n_w', name: 'Mur Autoroutier NO', position: [-16, 4.5, -20], size: [20, 9, 3], color: '#0d1527', type: 'wall' },
  { id: 'shib_divider_n_e', name: 'Mur Autoroutier NE', position: [16, 4.5, -20], size: [20, 9, 3], color: '#0d1527', type: 'wall' },
  { id: 'shib_divider_s_w', name: 'Mur Autoroutier SO', position: [-16, 4.5, 20], size: [20, 9, 3], color: '#0d1527', type: 'wall' },
  { id: 'shib_divider_s_e', name: 'Mur Autoroutier SE', position: [16, 4.5, 20], size: [20, 9, 3], color: '#0d1527', type: 'wall' },

  // Chokepoints
  { id: 'shib_choke_n', name: 'Goulot Boulevard Nord', position: [0, 4, -20], size: [12, 8, 3], color: '#f59e0b', type: 'barricade' },
  { id: 'shib_choke_s', name: 'Goulot Boulevard Sud', position: [0, 4, 20], size: [12, 8, 3], color: '#f59e0b', type: 'barricade' },

  // Passerelle de passage piéton en hauteur (Verticalité)
  { id: 'shib_overpass_center', name: 'Passerelle Piétonne Shibuya', position: [0, 2.5, 0], size: [14, 5.0, 6], color: '#f59e0b', type: 'platform' },
  { id: 'shib_overpass_ramp_l', name: 'Rampe Shibuya Ouest', position: [-12, 1.25, 0], size: [10, 2.5, 6], color: '#1e293b', type: 'platform' },
  { id: 'shib_overpass_ramp_r', name: 'Rampe Shibuya Est', position: [12, 1.25, 0], size: [10, 2.5, 6], color: '#1e293b', type: 'platform' },

  // Panneau d'affichage géant (Pilier/Couverture)
  { id: 'shib_billboard_left', name: 'Structure Publicitaire O', position: [-24, 6, -14], size: [6, 12, 4], color: '#0d1527', type: 'pillar' },
  { id: 'shib_billboard_right', name: 'Structure Publicitaire E', position: [24, 6, 14], size: [6, 12, 4], color: '#0d1527', type: 'pillar' },
];

const SHIBUYA_TARGETS: TrainingTarget[] = [
  { id: 'sh_drone_1', position: new THREE.Vector3(-24, 4, -14), baseY: 4, radius: 0.6, height: 1.2, hp: 100, maxHp: 100, isDead: false, respawnTime: 0, hitFlashTime: 0 },
  { id: 'sh_drone_2', position: new THREE.Vector3(24, 4, 14), baseY: 4, radius: 0.6, height: 1.2, hp: 100, maxHp: 100, isDead: false, respawnTime: 0, hitFlashTime: 0 },
  { id: 'sh_drone_3', position: new THREE.Vector3(0, 5.5, 0), baseY: 5.5, radius: 0.7, height: 1.4, hp: 100, maxHp: 100, isDead: false, respawnTime: 0, hitFlashTime: 0 },
];

export const MAP_SHIBUYA_CROSSING: MapDefinition = {
  id: 'shibuya_crossing',
  name: 'SHIBUYA OVERPASS // NEXUS',
  codename: 'MAP-04 // NEXUS',
  description: 'Un carrefour autoroutier urbain géant cyberpunk. Layout à 3 lanes comprenant une passerelle piétonne surélevée, des panneaux publicitaires massifs bloquant les tirs directs et des couloirs routiers.',
  environmentType: 'outdoor',
  tags: ['EXTÉRIEUR', 'CARREFOUR', 'OVERPASS', 'VERTICALITÉ'],
  accentColor: '#f59e0b',
  secondaryColor: '#f43f5e',
  thumbnailGradient: 'from-amber-950 via-slate-900 to-rose-950',
  bounds: {
    minX: -45,
    maxX: 45,
    minZ: -45,
    maxZ: 45,
    floorY: 0,
  },
  spawnPoints: [
    {
      id: 'spawn_shib_blue',
      name: 'Station Métro Ouest (Bleu)',
      position: [-38, 0, 0],
      yaw: Math.PI / 2,
      team: 'blue',
      description: 'Spawn Bleu à l\'entrée du métro.',
    },
    {
      id: 'spawn_shib_red',
      name: 'Gare Routière Est (Rouge)',
      position: [38, 0, 0],
      yaw: -Math.PI / 2,
      team: 'red',
      description: 'Spawn Rouge près de la gare.',
    },
  ],
  defaultSpawn: [-38, 0, 0],
  defaultYaw: Math.PI / 2,
  captureZone: {
    id: 'cap_shib_crosswalk',
    name: 'ZONE CAPTURE DELTA // SHIBUYA',
    code: 'DELTA',
    position: [0, 2.6, 0],
    radius: 4.5,
    height: 4.0,
    accentColor: '#f59e0b',
    description: 'Sommet de la passerelle piétonne. Capturez et verrouillez l\'overpass.',
  },
  sanctuaryZones: {
    red: {
      id: 'sanc_shib_red',
      name: 'TERMINAL DE DÉFENSE EST // BASE ROUGE',
      team: 'red',
      position: [38, 0, 0],
      radius: 12,
      height: 6,
      accentColor: '#ff0055',
      description: 'Abri de régénération tactique et invulnérabilité équipe Rouge',
    },
    blue: {
      id: 'sanc_shib_blue',
      name: 'STATION MÉDICALE OUEST // BASE BLEUE',
      team: 'blue',
      position: [-38, 0, 0],
      radius: 12,
      height: 6,
      accentColor: '#00f0ff',
      description: 'Abri de régénération tactique et invulnérabilité équipe Bleue',
    },
  },
  obstacles: SHIBUYA_OBSTACLES,
  colliders: buildCollidersFromObstacles(SHIBUYA_OBSTACLES),
  initialTargets: SHIBUYA_TARGETS,
  lighting: {
    ambientIntensity: 2.4,
    ambientColor: '#2563eb',
    dirLightColor: '#fef08a',
    dirLightIntensity: 4.0,
    dirLightPos: [15, 25, 15],
    fogColor: '#090514',
    fogNear: 50,
    fogFar: 180,
    background: '#090514',
  },
};

// ==========================================
// 🚀 MAP 5 : "ORBITAL TERMINAL" (INTÉRIEUR - LAB VANGUARD)
// ==========================================
const ORBITAL_OBSTACLES: MapObstacle[] = [
  // Protection de spawn
  { id: 'orbit_spawn_blue_gate', name: 'Écran Sas Hangar S', position: [0, 3, 34], size: [18, 6, 3], color: '#3b82f6', type: 'wall' },
  { id: 'orbit_spawn_red_gate', name: 'Écran Sas Hangar N', position: [0, 3, -34], size: [18, 6, 3], color: '#3b82f6', type: 'wall' },

  // Cloisons de Lanes
  { id: 'orbit_divider_l_n', name: 'Cloison Laboratoire NO', position: [-18, 4.5, -16], size: [3, 9, 20], color: '#0d1527', type: 'wall' },
  { id: 'orbit_divider_l_s', name: 'Cloison Laboratoire SO', position: [-18, 4.5, 16], size: [3, 9, 20], color: '#0d1527', type: 'wall' },
  { id: 'orbit_divider_r_n', name: 'Cloison Générateur NE', position: [18, 4.5, -16], size: [3, 9, 20], color: '#0d1527', type: 'wall' },
  { id: 'orbit_divider_r_s', name: 'Cloison Générateur SE', position: [18, 4.5, 16], size: [3, 9, 20], color: '#0d1527', type: 'wall' },

  // Chokepoints (Pressurized Hatches)
  { id: 'orbit_choke_l', name: 'Sas Lab Gauche', position: [-18, 4, 0], size: [3, 8, 8], color: '#3b82f6', type: 'barricade' },
  { id: 'orbit_choke_r', name: 'Sas Générateur Droite', position: [18, 4, 0], size: [3, 8, 8], color: '#3b82f6', type: 'barricade' },

  // Réacteur de gravitation central (Reactor Core)
  { id: 'orbit_reactor_core', name: 'Réacteur de Gravité Zéro', position: [0, 3, 0], size: [5.5, 6, 5.5], color: '#3b82f6', type: 'reactor' },

  // Plateformes de recherche surélevées (Laboratoires A & C)
  { id: 'orbit_platform_l', name: 'Console Scientifique Ouest', position: [-34, 3, 0], size: [8, 0.4, 16], color: '#3b82f6', type: 'platform' },
  { id: 'orbit_platform_r', name: 'Salle d\'Énergie Est', position: [34, 3, 0], size: [8, 0.4, 16], color: '#3b82f6', type: 'platform' },
  { id: 'orbit_ramp_l', name: 'Ascenseur Gravité Ouest', position: [-34, 1.5, 12], size: [6, 3, 8], color: '#1e293b', type: 'platform' },
  { id: 'orbit_ramp_r', name: 'Ascenseur Gravité Est', position: [34, 1.5, -12], size: [6, 3, 8], color: '#1e293b', type: 'platform' },
];

const ORBITAL_TARGETS: TrainingTarget[] = [
  { id: 'ob_drone_1', position: new THREE.Vector3(-34, 4.2, 0), baseY: 4.2, radius: 0.6, height: 1.2, hp: 100, maxHp: 100, isDead: false, respawnTime: 0, hitFlashTime: 0 },
  { id: 'ob_drone_2', position: new THREE.Vector3(34, 4.2, 0), baseY: 4.2, radius: 0.6, height: 1.2, hp: 100, maxHp: 100, isDead: false, respawnTime: 0, hitFlashTime: 0 },
  { id: 'ob_drone_3', position: new THREE.Vector3(0, 3.5, 0), baseY: 3.5, radius: 0.7, height: 1.4, hp: 100, maxHp: 100, isDead: false, respawnTime: 0, hitFlashTime: 0 },
];

export const MAP_ORBITAL_STATION: MapDefinition = {
  id: 'orbital_station',
  name: 'ORBITAL TERMINAL // VANGUARD',
  codename: 'MAP-05 // ORBITAL',
  description: 'Station orbitale pressurisée de 90m de diamètre flottant au-dessus de la Terre. Layout à 3 lanes reliant un laboratoire de recherche cryogénique et un réacteur de gravité centrale.',
  environmentType: 'indoor',
  tags: ['INTÉRIEUR', 'GRAVITÉ ZÉRO', 'RÉACTEUR', 'SPATIAL'],
  accentColor: '#3b82f6',
  secondaryColor: '#f43f5e',
  thumbnailGradient: 'from-blue-950 via-slate-900 to-indigo-950',
  bounds: {
    minX: -45,
    maxX: 45,
    minZ: -45,
    maxZ: 45,
    floorY: 0,
    ceilingY: 9.0,
  },
  spawnPoints: [
    {
      id: 'spawn_orbit_blue',
      name: 'Sas Hangar Sud (Bleu)',
      position: [0, 0, 38],
      yaw: Math.PI,
      team: 'blue',
      description: 'Spawn Bleu face au sas central.',
    },
    {
      id: 'spawn_orbit_red',
      name: 'Sas Hangar Nord (Rouge)',
      position: [0, 0, -38],
      yaw: 0,
      team: 'red',
      description: 'Spawn Rouge face au sas central.',
    },
  ],
  defaultSpawn: [0, 0, 38],
  defaultYaw: Math.PI,
  captureZone: {
    id: 'cap_orbit_reactor',
    name: 'ZONE CAPTURE EPSILON // TERMINAL',
    code: 'EPSILON',
    position: [0, 0.2, 0],
    radius: 5.2,
    height: 4.5,
    accentColor: '#3b82f6',
    description: 'Chambre de gravité zéro. Dominez le noyau pour gagner.',
  },
  sanctuaryZones: {
    red: {
      id: 'sanc_orbit_red',
      name: 'CHAMBRE DE SURVIE NORD // BASE ROUGE',
      team: 'red',
      position: [0, 0, -38],
      radius: 12,
      height: 6,
      accentColor: '#ff0055',
      description: 'Baie pressurisée de soins et protection totale équipe Rouge',
    },
    blue: {
      id: 'sanc_orbit_blue',
      name: 'CHAMBRE DE SURVIE SUD // BASE BLEUE',
      team: 'blue',
      position: [0, 0, 38],
      radius: 12,
      height: 6,
      accentColor: '#00f0ff',
      description: 'Baie pressurisée de soins et protection totale équipe Bleue',
    },
  },
  obstacles: ORBITAL_OBSTACLES,
  colliders: buildCollidersFromObstacles(ORBITAL_OBSTACLES),
  initialTargets: ORBITAL_TARGETS,
  lighting: {
    ambientIntensity: 2.2,
    ambientColor: '#1e3a8a',
    dirLightColor: '#bae6fd',
    dirLightIntensity: 3.5,
    dirLightPos: [0, 25, 0],
    fogColor: '#020617',
    fogNear: 50,
    fogFar: 180,
    background: '#020617',
  },
};

/**
 * Catalogue Extensible de toutes les maps du jeu
 */
export const MAPS_CATALOG: MapDefinition[] = [
  MAP_ROOFTOP_DISTRICT,
  MAP_UNDERGROUND_GRID,
  MAP_CYBER_CANAL,
  MAP_SHIBUYA_CROSSING,
  MAP_ORBITAL_STATION,
];

export const DEFAULT_MAP_ID = MAP_ROOFTOP_DISTRICT.id;

/**
 * Récupère une map par son ID
 */
export function getMapById(id: string): MapDefinition {
  const found = MAPS_CATALOG.find((m) => m.id === id);
  return found || MAPS_CATALOG[0];
}
