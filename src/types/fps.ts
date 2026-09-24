/**
 * Types TypeScript dédiés au système d'armes modulaire, contrôleur FPS et gameplay
 */

import * as THREE from 'three';
import type { WeaponDefinition } from '../config/weaponsConfig.ts';

export interface WeaponSlotSummary {
  id: string;
  name: string;
  type: string;
  categoryLabel: string;
  accentColor: string;
  currentAmmo: number;
  maxAmmo: number;
}

export interface FPSWeaponState {
  id: string;
  name: string;
  type: string;
  categoryLabel: string;
  ammo: number;
  maxAmmo: number;
  reserveAmmo: number;
  isReloading: boolean;
  reloadProgress: number; // 0 à 1
  canFire: boolean;
  damage: number;
  headshotMultiplier: number;
  fireRateSeconds: number;
  reloadTimeSeconds: number;
  accentColor: string;
  beamColor: string;
  activeWeaponIndex: number;
  totalWeapons: number;
  allWeapons: WeaponSlotSummary[];
}

export interface FPSPlayerStats {
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  isSprinting: boolean;
  onGround: boolean;
  velocity: THREE.Vector3;
  position: THREE.Vector3;
  immunityTimer?: number;
  isImmune?: boolean;
  isInSanctuary?: boolean;
  sanctuaryTeam?: 'red' | 'blue' | null;
  yaw?: number;
  pitch?: number;
}

export interface LaserBeamEffect {
  id: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: string;
  radius?: number;
  createdAt: number;
  duration: number;
}

export interface ImpactEffect {
  id: string;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  color: string;
  createdAt: number;
}

export interface HitmarkerInfo {
  id: string;
  damage: number;
  isCrit: boolean;
  timestamp: number;
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
