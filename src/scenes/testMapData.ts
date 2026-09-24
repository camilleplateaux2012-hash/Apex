/**
 * Configuration et Données de la Carte de Test FPS (Test Arena)
 * 
 * Boîte fermée cybernétique avec :
 * - Murs de périmètre électroluminescents
 * - Obstacles de couverture tactique (blocs et barricades)
 * - Plateforme surélevée avec rampe d'accès
 * - Cibles d'entraînement réactives (Drones holographiques)
 * - Moteur de collision simple et réactif (Boîtes AABB & Raycasts)
 */

import * as THREE from 'three';

export interface BoxCollider {
  id: string;
  min: THREE.Vector3;
  max: THREE.Vector3;
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
  name?: string;
}

export interface TrainingTarget {
  id: string;
  position: THREE.Vector3;
  baseY: number;
  radius: number;
  height: number;
  hp: number;
  maxHp: number;
  isDead: boolean;
  respawnTime: number;
  hitFlashTime: number;
}

// Dimensions de l'arène
export const ARENA_BOUNDS = {
  halfWidth: 22,   // X: -22 à +22 (largeur 44m)
  halfDepth: 22,   // Z: -22 à +22 (profondeur 44m)
  wallHeight: 8,   // Hauteur des murs
  floorY: 0,
};

// Définition des obstacles solides de l'arène
export const TEST_MAP_OBSTACLES: Array<{
  id: string;
  name: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}> = [
  // Pilier central tactique
  {
    id: 'pillar_center',
    name: 'Pilier Quantique Central',
    position: [0, 2.5, 0],
    size: [3, 5, 3],
    color: '#00f0ff',
  },
  // Barricades basses nord / sud
  {
    id: 'cover_north_1',
    name: 'Barricade Nord-Ouest',
    position: [-8, 1, -8],
    size: [4, 2, 1.2],
    color: '#ff007f',
  },
  {
    id: 'cover_north_2',
    name: 'Barricade Nord-Est',
    position: [8, 1, -8],
    size: [4, 2, 1.2],
    color: '#ff007f',
  },
  {
    id: 'cover_south_1',
    name: 'Abri Tactique Sud-Ouest',
    position: [-9, 1.25, 7],
    size: [3, 2.5, 3],
    color: '#00f0ff',
  },
  {
    id: 'cover_south_2',
    name: 'Abri Tactique Sud-Est',
    position: [9, 1.25, 7],
    size: [3, 2.5, 3],
    color: '#00f0ff',
  },
  // Plateforme surélevée (Est)
  {
    id: 'platform_east',
    name: 'Plateforme Surélevée',
    position: [14, 1.2, 0],
    size: [6, 2.4, 8],
    color: '#ffaa00',
  },
  // Rampe ou marche d'accès à la plateforme
  {
    id: 'platform_step_1',
    name: 'Marche d\'accès',
    position: [14, 0.4, -5],
    size: [4, 0.8, 2],
    color: '#ffaa00',
  },
  // Piliers de coin
  {
    id: 'pillar_nw',
    name: 'Borne d\'énergie NO',
    position: [-16, 2, -16],
    size: [2, 4, 2],
    color: '#00f0ff',
  },
  {
    id: 'pillar_sw',
    name: 'Borne d\'énergie SO',
    position: [-16, 2, 16],
    size: [2, 4, 2],
    color: '#ff007f',
  },
  {
    id: 'pillar_ne',
    name: 'Borne d\'énergie NE',
    position: [16, 2, -16],
    size: [2, 4, 2],
    color: '#00f0ff',
  },
  {
    id: 'pillar_se',
    name: 'Borne d\'énergie SE',
    position: [16, 2, 16],
    size: [2, 4, 2],
    color: '#ff007f',
  },
];

// Création des boîtes englobantes AABB pour les tests de collision
export const COLLIDERS: BoxCollider[] = TEST_MAP_OBSTACLES.map((obs) => {
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

/**
 * Résolution des collisions joueur (AABB vs Cylindre/Rayon joueur)
 * Permet un glissement fluide le long des murs et obstacles.
 */
export function resolvePlayerCollisions(
  currentPos: THREE.Vector3,
  desiredPos: THREE.Vector3,
  playerRadius: number = 0.45,
  playerHeight: number = 1.8
): { finalPos: THREE.Vector3; onGround: boolean; groundY: number } {
  const result = desiredPos.clone();
  let groundY = ARENA_BOUNDS.floorY;

  // 1. Limites du périmètre de l'arène (murs d'enceinte)
  const minX = -ARENA_BOUNDS.halfWidth + playerRadius;
  const maxX = ARENA_BOUNDS.halfWidth - playerRadius;
  const minZ = -ARENA_BOUNDS.halfDepth + playerRadius;
  const maxZ = ARENA_BOUNDS.halfDepth - playerRadius;

  result.x = Math.max(minX, Math.min(maxX, result.x));
  result.z = Math.max(minZ, Math.min(maxZ, result.z));

  // 2. Collisions avec les obstacles (résolution par axe X puis Z)
  for (const col of COLLIDERS) {
    // Si le joueur est au-dessus du bloc (sur la plateforme)
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

    // Hauteur de collision latérale
    const playerFeet = result.y;
    const playerHead = result.y + playerHeight;
    const overlapsY = playerFeet < col.max.y && playerHead > col.min.y;

    if (!overlapsY) continue;

    // Test X
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

    // Test Z
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

// Cibles d'entraînement réactives
export const INITIAL_TARGETS: TrainingTarget[] = [
  {
    id: 'drone_1',
    position: new THREE.Vector3(-10, 2.2, -12),
    baseY: 2.2,
    radius: 0.6,
    height: 1.2,
    hp: 100,
    maxHp: 100,
    isDead: false,
    respawnTime: 0,
    hitFlashTime: 0,
  },
  {
    id: 'drone_2',
    position: new THREE.Vector3(10, 2.2, -12),
    baseY: 2.2,
    radius: 0.6,
    height: 1.2,
    hp: 100,
    maxHp: 100,
    isDead: false,
    respawnTime: 0,
    hitFlashTime: 0,
  },
  {
    id: 'drone_3',
    position: new THREE.Vector3(0, 3.5, -16),
    baseY: 3.5,
    radius: 0.7,
    height: 1.4,
    hp: 100,
    maxHp: 100,
    isDead: false,
    respawnTime: 0,
    hitFlashTime: 0,
  },
  {
    id: 'drone_4',
    position: new THREE.Vector3(14, 3.6, 0),
    baseY: 3.6,
    radius: 0.6,
    height: 1.2,
    hp: 100,
    maxHp: 100,
    isDead: false,
    respawnTime: 0,
    hitFlashTime: 0,
  },
];
