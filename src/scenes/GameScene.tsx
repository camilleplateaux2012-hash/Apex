/**
 * Scène 3D FPS - Arène de Test Interactive (GameScene)
 * 
 * Orchestre :
 * - Le contrôleur FPS à la première personne (FPSController)
 * - La carte d'arène fermée avec obstacles solides et éclairages néon (TestArenaMap)
 * - La gestion des cibles réactives (drones d'entraînement avec HP et respawn)
 * - La synchronisation des effets de tir laser et d'impacts
 */

import { useState, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getMapById, DEFAULT_MAP_ID } from '../config/mapsConfig.ts';
import type { FPSWeaponState, FPSPlayerStats, LaserBeamEffect, ImpactEffect, HitmarkerInfo, TrainingTarget } from '../types/fps.ts';
import FPSController from './FPSController.tsx';
import ModularMapRenderer from './maps/ModularMapRenderer.tsx';
import RemotePlayersManager from './multiplayer/RemotePlayersManager.tsx';
import { audioSystem } from '../systems/audioSystem.ts';
import { photonClient } from '../net/photonClient.ts';
import { botSystem } from '../systems/botSystem.ts';

interface GameSceneProps {
  isPointerLocked: boolean;
  isTouchMode?: boolean;
  mouseSensitivity?: number;
  activeMapId?: string;
  onWeaponStateChange: (state: FPSWeaponState) => void;
  onPlayerStatsChange: (stats: FPSPlayerStats) => void;
  onHitmarker: (info: HitmarkerInfo) => void;
  onTargetFrag: () => void;
  onActiveTargetsCountChange: (count: number) => void;
}

export default function GameScene({
  isPointerLocked,
  isTouchMode = false,
  mouseSensitivity = 1.0,
  activeMapId = DEFAULT_MAP_ID,
  onWeaponStateChange,
  onPlayerStatsChange,
  onHitmarker,
  onTargetFrag,
  onActiveTargetsCountChange,
}: GameSceneProps) {
  const activeMap = getMapById(activeMapId);

  // Cibles interactives initialisées selon la map active
  const [targets, setTargets] = useState<TrainingTarget[]>(() =>
    activeMap.initialTargets.map((t) => ({ ...t, position: t.position.clone() }))
  );

  // Démarrage et arrêt automatique de la simulation de bots lors de l'entrée dans l'arène
  useEffect(() => {
    botSystem.start();
    return () => {
      botSystem.stop();
    };
  }, []);

  // Réinitialisation des cibles et effets lors d'un changement de map
  useEffect(() => {
    setTargets(activeMap.initialTargets.map((t) => ({ ...t, position: t.position.clone() })));
    setLaserBeams([]);
    setImpacts([]);
    onActiveTargetsCountChange(activeMap.initialTargets.length);
  }, [activeMapId]);

  // Effets visuels temporaires (Faisceaux laser & étincelles d'impact)
  const [laserBeams, setLaserBeams] = useState<LaserBeamEffect[]>([]);
  const [impacts, setImpacts] = useState<ImpactEffect[]>([]);

  // Nettoyage régulier des effets visuels et gestion des respawns de cibles
  useFrame((_, delta) => {
    const now = Date.now();

    // 1. Filtrer les faisceaux lasers expirés (durée ~80ms)
    if (laserBeams.length > 0) {
      const active = laserBeams.filter((b) => now - b.createdAt < b.duration * 1000);
      if (active.length !== laserBeams.length) {
        setLaserBeams(active);
      }
    }

    // 2. Filtrer les impacts expirés (durée ~250ms)
    if (impacts.length > 0) {
      const active = impacts.filter((imp) => now - imp.createdAt < 250);
      if (active.length !== impacts.length) {
        setImpacts(active);
      }
    }

    // 3. Gestion du compte à rebours de respawn et flash des cibles
    setTargets((prevTargets) => {
      let changed = false;
      let activeCount = 0;

      const updated = prevTargets.map((target) => {
        let t = { ...target };

        // Décrémenter le flash de dégâts
        if (t.hitFlashTime > 0) {
          t.hitFlashTime = Math.max(0, t.hitFlashTime - delta);
          changed = true;
        }

        // Compte à rebours de résurrection si détruit
        if (t.isDead) {
          t.respawnTime -= delta;
          if (t.respawnTime <= 0) {
            t.isDead = false;
            t.hp = t.maxHp;
            t.hitFlashTime = 0;
            changed = true;
          }
        } else {
          activeCount++;
        }

        return t;
      });

      if (changed) {
        onActiveTargetsCountChange(activeCount);
        return updated;
      }
      return prevTargets;
    });
  });

  /**
   * Gestion d'un tir touchant un drone cible
   */
  const handleTargetHit = (targetId: string, damage: number, isCrit: boolean) => {
    setTargets((prev) =>
      prev.map((t) => {
        if (t.id !== targetId || t.isDead) return t;

        const newHp = Math.max(0, t.hp - damage);
        const isNowDead = newHp <= 0;

        if (isNowDead) {
          audioSystem.playTargetDestroyed();
          onTargetFrag();
        }

        return {
          ...t,
          hp: newHp,
          isDead: isNowDead,
          respawnTime: isNowDead ? 4.0 : 0, // Respawn après 4 secondes
          hitFlashTime: 0.15,
        };
      })
    );
  };

  /**
   * Ajout d'un faisceau laser visible
   */
  const handleLaserFired = (beam: LaserBeamEffect) => {
    setLaserBeams((prev) => [...prev.slice(-12), beam]);
  };

  /**
   * Ajout d'une étincelle d'impact
   */
  const handleImpactCreated = (impact: ImpactEffect) => {
    setImpacts((prev) => [...prev.slice(-15), impact]);
  };

  return (
    <>
      <color attach="background" args={[activeMap.lighting.background]} />
      <fog
        attach="fog"
        args={[
          activeMap.lighting.fogColor,
          activeMap.lighting.fogNear,
          activeMap.lighting.fogFar,
        ]}
      />

      {/* Rendu modulaire de la map active (Géométrie 3D, Cibles, Spawns, Balise Capture) */}
      <ModularMapRenderer
        activeMap={activeMap}
        targets={targets}
        laserBeams={laserBeams}
        impacts={impacts}
      />

      {/* Joueurs distants multijoueur Photon Realtime */}
      <RemotePlayersManager
        onLaserFired={handleLaserFired}
        onImpactCreated={handleImpactCreated}
      />

      {/* Contrôleur Joueur Première Personne avec arme 3D */}
      <FPSController
        isPointerLocked={isPointerLocked}
        isTouchMode={isTouchMode}
        mouseSensitivity={mouseSensitivity}
        activeMap={activeMap}
        targets={targets}
        onTargetHit={handleTargetHit}
        onTargetFrag={onTargetFrag}
        onWeaponStateChange={onWeaponStateChange}
        onPlayerStatsChange={onPlayerStatsChange}
        onHitmarker={onHitmarker}
        onLaserFired={handleLaserFired}
        onImpactCreated={handleImpactCreated}
      />
    </>
  );
}
