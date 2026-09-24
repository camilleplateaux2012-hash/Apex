/**
 * Définitions TypeScript du Système de Maps Modulaire (Cyberpunk Maps Architecture)
 */

import * as THREE from 'three';
import type { TrainingTarget } from './fps.ts';

export interface SpawnPoint {
  id: string;
  name: string;
  position: [number, number, number];
  yaw: number; // Orientation de la caméra au spawn en radians
  team: 'neutral' | 'red' | 'blue';
  description?: string;
}

export interface SanctuaryZone {
  id: string;
  name: string;
  team: 'red' | 'blue';
  position: [number, number, number];
  radius: number;
  height: number;
  accentColor: string;
  description: string;
}

export interface SanctuaryZonesConfig {
  red: SanctuaryZone;
  blue: SanctuaryZone;
}

export interface CaptureZone {
  id: string;
  name: string;
  code: string;
  position: [number, number, number];
  radius: number;
  height: number;
  accentColor: string;
  description?: string;
}

export interface MapBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  floorY: number;
  ceilingY?: number;
}

export interface MapObstacle {
  id: string;
  name: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  type?: 'pillar' | 'barricade' | 'platform' | 'reactor' | 'server' | 'crate' | 'wall';
}

export interface MapBoxCollider {
  id: string;
  name: string;
  min: THREE.Vector3;
  max: THREE.Vector3;
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
}

export interface MapLightingConfig {
  ambientIntensity: number;
  ambientColor: string;
  dirLightColor: string;
  dirLightIntensity: number;
  dirLightPos: [number, number, number];
  fogColor: string;
  fogNear: number;
  fogFar: number;
  background: string;
}

export interface MapDefinition {
  id: string;
  name: string;
  codename: string;
  description: string;
  environmentType: 'outdoor' | 'indoor';
  tags: string[];
  accentColor: string;
  secondaryColor: string;
  thumbnailGradient: string;
  bounds: MapBounds;
  spawnPoints: SpawnPoint[];
  defaultSpawn: [number, number, number];
  defaultYaw: number;
  captureZone: CaptureZone;
  sanctuaryZones: SanctuaryZonesConfig;
  obstacles: MapObstacle[];
  colliders: MapBoxCollider[];
  initialTargets: TrainingTarget[];
  lighting: MapLightingConfig;
}
