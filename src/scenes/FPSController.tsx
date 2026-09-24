/**
 * Contrôleur FPS à la Première Personne avec Système d'Armes Modulaire
 * 
 * - Contrôle de la vue à la souris (Yaw / Pitch) avec Pointer Lock
 * - Déplacements au clavier (WASD / ZQSD) avec glissement sur les obstacles
 * - Système d'armes modulaire :
 *   • Catalogue extensible d'armes (SMG, Fusil, Sniper, etc.)
 *   • Changement d'arme à la volée (touches 1, 2, 3... ou molette de la souris)
 *   • Gestion individuelle des chargeurs et réserves par arme
 *   • Tir raycast avec caractéristiques propres (dégâts, cadence, recul, dispersion, portée)
 *   • Faisceaux laser et étincelles personnalisés selon l'arme active
 *   • Rechargement temporisé avec animation et sons dédiés
 * - Synchronisation en temps réel avec le HUD cyberpunk
 */

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { inputSystem } from '../systems/inputSystem.ts';
import { audioSystem } from '../systems/audioSystem.ts';
import { resolveMapPlayerCollisions, isPositionInsideSanctuary, getPlayerSanctuaryStatus } from '../config/mapsConfig.ts';
import { WEAPONS_CATALOG, WeaponDefinition } from '../config/weaponsConfig.ts';
import type { FPSWeaponState, FPSPlayerStats, LaserBeamEffect, ImpactEffect, HitmarkerInfo, WeaponSlotSummary, TrainingTarget } from '../types/fps.ts';
import type { MapDefinition } from '../types/maps.ts';
import type { NetworkPlayerState } from '../types/network.ts';
import { photonClient } from '../net/photonClient.ts';
import { proximityVoiceSystem } from '../net/proximityVoiceSystem.ts';
import WeaponViewmodel from './WeaponViewmodel.tsx';

interface FPSControllerProps {
  isPointerLocked: boolean;
  isTouchMode?: boolean;
  mouseSensitivity?: number;
  activeMap: MapDefinition;
  targets: TrainingTarget[];
  onTargetHit: (targetId: string, damage: number, isCrit: boolean) => void;
  onTargetFrag?: () => void;
  onWeaponStateChange: (state: FPSWeaponState) => void;
  onPlayerStatsChange: (stats: FPSPlayerStats) => void;
  onHitmarker: (info: HitmarkerInfo) => void;
  onLaserFired: (beam: LaserBeamEffect) => void;
  onImpactCreated: (impact: ImpactEffect) => void;
}

export default function FPSController({
  isPointerLocked,
  isTouchMode = false,
  mouseSensitivity = 1.0,
  activeMap,
  targets,
  onTargetHit,
  onTargetFrag = () => {},
  onWeaponStateChange,
  onPlayerStatsChange,
  onHitmarker,
  onLaserFired,
  onImpactCreated,
}: FPSControllerProps) {
  const { camera } = useThree();

  // Position et physique du joueur
  const playerPos = useRef(new THREE.Vector3(activeMap.defaultSpawn[0], activeMap.defaultSpawn[1], activeMap.defaultSpawn[2]));
  const playerVelocity = useRef(new THREE.Vector3(0, 0, 0));
  const onGround = useRef(true);

  // Rotation de la caméra
  const yaw = useRef(activeMap.defaultYaw);
  const pitch = useRef(0);
  const recoilPitch = useRef(0);
  const recoilYaw = useRef(0);

  // Mise à jour de la position lors du changement de map
  const currentMapIdRef = useRef(activeMap.id);
  useEffect(() => {
    if (currentMapIdRef.current !== activeMap.id) {
      currentMapIdRef.current = activeMap.id;
      playerPos.current.set(activeMap.defaultSpawn[0], activeMap.defaultSpawn[1], activeMap.defaultSpawn[2]);
      playerVelocity.current.set(0, 0, 0);
      yaw.current = activeMap.defaultYaw;
      pitch.current = 0;
      camera.position.set(activeMap.defaultSpawn[0], activeMap.defaultSpawn[1] + 1.6, activeMap.defaultSpawn[2]);
    }
  }, [activeMap, camera]);

  // --- SYSTÈME D'ARMES MODULAIRE ---
  const activeWeaponIndex = useRef(0);

  // Inventaire persistant des munitions par arme (ID -> { ammo, reserveAmmo })
  const ammoInventory = useRef<Record<string, { ammo: number; reserveAmmo: number }>>(
    Object.fromEntries(
      WEAPONS_CATALOG.map((w) => [
        w.id,
        { ammo: w.magazineSize, reserveAmmo: w.reserveAmmo },
      ])
    )
  );

  const fireCooldown = useRef(0);
  const reloadTimer = useRef(0);
  const reloadDuration = useRef(1.0);
  const isReloading = useRef(false);
  const isFiringState = useRef(false);
  const lastMouseDeltas = useRef({ dx: 0, dy: 0 });
  const muzzleWorldPos = useRef<THREE.Vector3 | null>(new THREE.Vector3());

  // Statistiques joueur
  const playerStats = useRef<FPSPlayerStats>({
    hp: 100,
    maxHp: 100,
    shield: 50,
    maxShield: 50,
    isSprinting: false,
    onGround: true,
    velocity: new THREE.Vector3(),
    position: new THREE.Vector3(),
    immunityTimer: 3.0,
    isImmune: true,
    isInSanctuary: false,
    sanctuaryTeam: null,
  });

  // Bouclier d'immunité temporaire (3 secondes au spawn / réapparition)
  const immunityTimer = useRef(3.0);
  const fpShieldRef = useRef<THREE.Mesh>(null);
  // Zone sanctuaire de réapparition (Soin et invulnérabilité)
  const isInSanctuary = useRef(false);
  const sanctuaryTeam = useRef<'red' | 'blue' | null>(null);
  const lastStatsSyncTime = useRef(0);
  const lastReportedImmune = useRef(true);

  // Cycle de pas audio
  const footstepDistance = useRef(0);

  // Initialisation de la caméra
  useEffect(() => {
    camera.rotation.order = 'YXZ';
    broadcastWeaponState();
  }, [camera]);

  // Écouteur des événements de dégâts reçus du réseau pour le joueur local
  useEffect(() => {
    const unsub = photonClient.onNetworkPacket((packet) => {
      if (packet.type === 'PLAYER_DAMAGE' && packet.payload) {
        const { target, dmg, shooter } = packet.payload;
        const localActorNr = photonClient.getLocalActorNr();

        if (target === localActorNr && playerStats.current.hp > 0) {
          // 1. Protection par Bouclier d'immunité de réapparition (3 secondes)
          if (immunityTimer.current > 0) {
            console.log(`[FPSController] 🛡️ DÉGÂTS DÉVIÉS : Bouclier d'immunité actif (${immunityTimer.current.toFixed(1)}s restantes) !`);
            audioSystem.playImpact();
            return;
          }

          // 2. Protection par Zone Sanctuaire de l'équipe (Inviolabilité absolue)
          if (isInSanctuary.current) {
            console.log('[FPSController] 🛡️ DÉGÂTS ABSORBÉS : Protection inviolable de la zone Sanctuaire active !');
            audioSystem.playImpact();
            return;
          }

          let damageLeft = dmg || 20;
          
          if (playerStats.current.shield > 0) {
            const shieldDamage = Math.min(playerStats.current.shield, damageLeft);
            playerStats.current.shield -= shieldDamage;
            damageLeft -= shieldDamage;
          }
          
          if (damageLeft > 0) {
            playerStats.current.hp = Math.max(0, playerStats.current.hp - damageLeft);
          }

          // Émettre l'état mis à jour au parent (HUD)
          onPlayerStatsChange({ ...playerStats.current });

          // Son d'impact de dégâts
          audioSystem.playImpact();

          // Si mort locale
          if (playerStats.current.hp <= 0) {
            handleLocalPlayerDeath(shooter);
          }
        }
      }
    });

    return () => {
      unsub();
    };
  }, [onPlayerStatsChange]);

  const handleLocalPlayerDeath = (shooterActorNr: number) => {
    console.log('[FPSController] Éliminé par le joueur #', shooterActorNr);
    audioSystem.playTargetDestroyed();

    const isDeathmatch = photonClient.getCurrentRoom()?.gameMode === 'TEAM_DEATHMATCH';
    if (isDeathmatch) {
      console.log('[FPSController] Mode Deathmatch Survie actif. Pas de réapparition.');
      return;
    }

    // Lancer la réapparition après 3 secondes
    setTimeout(() => {
      respawnLocalPlayer();
    }, 3000);
  };

  const respawnLocalPlayer = () => {
    const localTeam = photonClient.getLocalTeam();
    // Trouver les points de spawn correspondants à l'équipe du joueur
    const teamSpawns = activeMap.spawnPoints.filter(
      (s) => s.team === localTeam.toLowerCase()
    );
    const chosenSpawn = (teamSpawns.length > 0
      ? teamSpawns[Math.floor(Math.random() * teamSpawns.length)]
      : null) || activeMap.spawnPoints[0] || {
        position: activeMap.defaultSpawn,
        yaw: activeMap.defaultYaw,
        id: 'spawn_default',
      };

    const spawnPos = chosenSpawn.position;
    playerPos.current.set(spawnPos[0], spawnPos[1], spawnPos[2]);
    playerVelocity.current.set(0, 0, 0);
    
    // Réinitialiser les statistiques de vie et bouclier
    playerStats.current.hp = 100;
    playerStats.current.shield = 50;
    onGround.current = true;

    // 🛡️ DÉCLENCHEMENT DU BOUCLIER D'IMMUNITÉ DE RÉAPPARITION (3 SECONDES)
    immunityTimer.current = 3.0;
    playerStats.current.immunityTimer = 3.0;
    playerStats.current.isImmune = true;
    
    // Réinitialiser la rotation de la caméra
    yaw.current = chosenSpawn.yaw !== undefined ? chosenSpawn.yaw : activeMap.defaultYaw;
    pitch.current = 0;
    camera.rotation.set(0, yaw.current, 0, 'YXZ');
    
    onPlayerStatsChange({ ...playerStats.current });
    
    // Diffuser la réapparition au réseau
    photonClient.sendRespawnEvent([spawnPos[0], spawnPos[1] + 1.6, spawnPos[2]]);
    console.log(`[FPSController] 🛡️ Réapparition : Joueur réapparu en Sanctuaire avec bouclier d'immunité 3.0s.`);
  };

  /**
   * Construit et diffuse l'état complet de l'arme actuelle et de l'arsenal
   */
  const broadcastWeaponState = () => {
    const currentWeapon = WEAPONS_CATALOG[activeWeaponIndex.current];
    const currentAmmoData = ammoInventory.current[currentWeapon.id] || {
      ammo: currentWeapon.magazineSize,
      reserveAmmo: currentWeapon.reserveAmmo,
    };

    const allSlots: WeaponSlotSummary[] = WEAPONS_CATALOG.map((w) => {
      const data = ammoInventory.current[w.id] || { ammo: w.magazineSize, reserveAmmo: w.reserveAmmo };
      return {
        id: w.id,
        name: w.name,
        type: w.type,
        categoryLabel: w.categoryLabel,
        accentColor: w.visual.beamColor,
        currentAmmo: data.ammo,
        maxAmmo: w.magazineSize,
      };
    });

    const progress = reloadDuration.current > 0
      ? 1 - Math.max(0, reloadTimer.current / reloadDuration.current)
      : 1;

    const statePayload: FPSWeaponState = {
      id: currentWeapon.id,
      name: currentWeapon.name,
      type: currentWeapon.type,
      categoryLabel: currentWeapon.categoryLabel,
      ammo: currentAmmoData.ammo,
      maxAmmo: currentWeapon.magazineSize,
      reserveAmmo: currentAmmoData.reserveAmmo,
      isReloading: isReloading.current,
      reloadProgress: isReloading.current ? progress : 1,
      canFire: fireCooldown.current <= 0 && !isReloading.current && currentAmmoData.ammo > 0,
      damage: currentWeapon.damage,
      headshotMultiplier: currentWeapon.headshotMultiplier,
      fireRateSeconds: currentWeapon.fireRateSeconds,
      reloadTimeSeconds: currentWeapon.reloadTimeSeconds,
      accentColor: currentWeapon.visual.modelTheme.accentColor,
      beamColor: currentWeapon.visual.beamColor,
      activeWeaponIndex: activeWeaponIndex.current,
      totalWeapons: WEAPONS_CATALOG.length,
      allWeapons: allSlots,
    };

    onWeaponStateChange(statePayload);
  };

  /**
   * Changement d'arme
   */
  const switchWeapon = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= WEAPONS_CATALOG.length || newIndex === activeWeaponIndex.current) {
      return;
    }

    // Annuler tout rechargement en cours lors du switch
    isReloading.current = false;
    reloadTimer.current = 0;
    fireCooldown.current = 0.2; // Léger délai de prise en main

    activeWeaponIndex.current = newIndex;
    audioSystem.playWeaponSwitch();
    broadcastWeaponState();
  };

  /**
   * Déclenche le rechargement de l'arme courante
   */
  const startReload = () => {
    const currentWeapon = WEAPONS_CATALOG[activeWeaponIndex.current];
    const currentAmmoData = ammoInventory.current[currentWeapon.id];

    if (!currentAmmoData || isReloading.current) return;
    if (currentAmmoData.ammo >= currentWeapon.magazineSize || currentAmmoData.reserveAmmo <= 0) return;

    isReloading.current = true;
    reloadDuration.current = currentWeapon.reloadTimeSeconds;
    reloadTimer.current = currentWeapon.reloadTimeSeconds;

    audioSystem.playReload();
    broadcastWeaponState();
  };

  useFrame((_, delta) => {
    const currentWeapon = WEAPONS_CATALOG[activeWeaponIndex.current];
    const ammoData = ammoInventory.current[currentWeapon.id];

    // 1. LECTURE DES ENTRÉES UTILISATEUR
    const isLocalDead = playerStats.current.hp <= 0;
    const input = isLocalDead ? {
      forward: false, backward: false, left: false, right: false,
      jump: false, sprint: false, fire: false, reload: false,
      aim: false, targetLock: false, autoAimAssist: false
    } : inputSystem.getState();

    const { dx, dy } = isLocalDead ? { dx: 0, dy: 0 } : inputSystem.consumeDeltas();
    lastMouseDeltas.current = { dx, dy };

    // 2. CHANGEMENT D'ARME (Touches 1, 2, 3... ou Molette)
    const { selectIndex, scrollDelta } = isLocalDead ? { selectIndex: null, scrollDelta: 0 } : inputSystem.consumeWeaponSwitch();
    if (selectIndex !== null && selectIndex >= 0 && selectIndex < WEAPONS_CATALOG.length) {
      switchWeapon(selectIndex);
    } else if (scrollDelta !== 0) {
      const nextIndex =
        (activeWeaponIndex.current + (scrollDelta > 0 ? 1 : -1) + WEAPONS_CATALOG.length) %
        WEAPONS_CATALOG.length;
      switchWeapon(nextIndex);
    }

    // 3. GESTION DE LA VUE SOURIS & TOUCH (POINTER LOOK & TOUCH DELTAS)
    if (!isLocalDead && (isPointerLocked || isTouchMode || dx !== 0 || dy !== 0)) {
      const sens = 0.0022 * mouseSensitivity;
      yaw.current -= dx * sens;
      pitch.current -= dy * sens;

      // Limiter l'angle vertical (-88° à +88°)
      pitch.current = Math.max(-1.52, Math.min(1.52, pitch.current));
    }

    // 3.1 ASSISTANCE À LA VISÉE CALIBRÉE SUR LE VISEUR (AIM ASSIST PRÉCIS AU RÉTICULE)
    // Ne s'enclenche STRICTEMENT que si l'ennemi se trouve directement sous le réticule / viseur
    const isAimAssistActive = input.targetLock || (isTouchMode && (input.fire || input.aim || input.autoAimAssist));
    const remotePlayers = photonClient.getRemotePlayers();
    if (isAimAssistActive && (targets.length > 0 || remotePlayers.length > 0)) {
      let closestTargetPos: THREE.Vector3 | null = null;
      let lowestAngle = Infinity;

      const currentCamDir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'));

      // Rayon angulaire strict du réticule central (~2.5° = 0.045 radian)
      const CROSSHAIR_ANGULAR_RADIUS = 0.052;

      // A. Cibles d'entraînement
      for (const t of targets) {
        if (t.isDead) continue;
        const targetPos = new THREE.Vector3(t.position.x, t.baseY + 0.3, t.position.z);
        const toTarget = new THREE.Vector3().subVectors(targetPos, camera.position);
        const distance = toTarget.length();
        if (distance > 50 || distance < 0.5) continue;

        toTarget.normalize();
        const angleRad = currentCamDir.angleTo(toTarget);

        const targetApparentRadius = Math.atan2(0.45, distance);
        const maxAllowedAngle = CROSSHAIR_ANGULAR_RADIUS + targetApparentRadius;

        if (angleRad <= maxAllowedAngle) {
          const sightRay = new THREE.Ray(camera.position, toTarget);
          let isBlockedByObstacle = false;

          if (activeMap && activeMap.colliders) {
            for (const col of activeMap.colliders) {
              const box = new THREE.Box3(col.min, col.max);
              const hit = new THREE.Vector3();
              if (sightRay.intersectBox(box, hit)) {
                const wallDist = camera.position.distanceTo(hit);
                if (wallDist < distance - 0.35) {
                  isBlockedByObstacle = true;
                  break;
                }
              }
            }
          }

          if (!isBlockedByObstacle && angleRad < lowestAngle) {
            lowestAngle = angleRad;
            closestTargetPos = targetPos;
          }
        }
      }

      // B. Joueurs distants multijoueur
      for (const rp of remotePlayers) {
        if (!rp.isAlive) continue;
        const targetPos = new THREE.Vector3(rp.position[0], rp.position[1] + 0.2, rp.position[2]);
        const toTarget = new THREE.Vector3().subVectors(targetPos, camera.position);
        const distance = toTarget.length();
        if (distance > 60 || distance < 0.5) continue;

        toTarget.normalize();
        const angleRad = currentCamDir.angleTo(toTarget);

        const targetApparentRadius = Math.atan2(0.5, distance);
        const maxAllowedAngle = CROSSHAIR_ANGULAR_RADIUS + targetApparentRadius;

        if (angleRad <= maxAllowedAngle) {
          const sightRay = new THREE.Ray(camera.position, toTarget);
          let isBlockedByObstacle = false;

          if (activeMap && activeMap.colliders) {
            for (const col of activeMap.colliders) {
              const box = new THREE.Box3(col.min, col.max);
              const hit = new THREE.Vector3();
              if (sightRay.intersectBox(box, hit)) {
                const wallDist = camera.position.distanceTo(hit);
                if (wallDist < distance - 0.35) {
                  isBlockedByObstacle = true;
                  break;
                }
              }
            }
          }

          if (!isBlockedByObstacle && angleRad < lowestAngle) {
            lowestAngle = angleRad;
            closestTargetPos = targetPos;
          }
        }
      }

      if (closestTargetPos) {
        const toTargetVec = new THREE.Vector3().subVectors(closestTargetPos, camera.position);
        const desiredYaw = Math.atan2(-toTargetVec.x, -toTargetVec.z);
        const horizontalDist = Math.hypot(toTargetVec.x, toTargetVec.z);
        const desiredPitch = Math.atan2(toTargetVec.y, horizontalDist);

        let diffYaw = desiredYaw - yaw.current;
        while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
        while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;

        const snapSpeed = input.targetLock ? 8.0 : (isTouchMode && input.fire ? 6.0 : 4.0);
        yaw.current += diffYaw * Math.min(1.0, delta * snapSpeed);
        pitch.current = THREE.MathUtils.damp(pitch.current, desiredPitch, snapSpeed, delta);
        pitch.current = Math.max(-1.52, Math.min(1.52, pitch.current));
      }
    }

    // Récupération amortie du recul de la caméra
    recoilPitch.current = THREE.MathUtils.damp(recoilPitch.current, 0, 14, delta);
    recoilYaw.current = THREE.MathUtils.damp(recoilYaw.current, 0, 14, delta);

    // Application à la caméra Three.js
    if (isLocalDead) {
      // Tomber lentement au sol lors du trépas (caméra au ras du sol)
      camera.position.y = THREE.MathUtils.damp(camera.position.y, playerPos.current.y + 0.25, 4, delta);
      // Incliner la caméra sur le côté (effet tête au sol)
      camera.rotation.order = 'YXZ';
      camera.rotation.y = yaw.current;
      camera.rotation.x = THREE.MathUtils.damp(pitch.current, -0.3, 3, delta);
      camera.rotation.z = THREE.MathUtils.damp(camera.rotation.z, 0.75, 3, delta);
    } else {
      camera.rotation.y = yaw.current + recoilYaw.current;
      camera.rotation.x = pitch.current + recoilPitch.current;
      camera.rotation.z = 0;
    }

    // 4. DÉPLACEMENTS PHYSIQUES (WASD / ZQSD)
    const forward = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
    const right = (input.right ? 1 : 0) - (input.left ? 1 : 0);

    const isMoving = forward !== 0 || right !== 0;
    const isSprinting = input.sprint && forward > 0 && onGround.current;

    const moveDir = new THREE.Vector3();
    if (isMoving) {
      const sinYaw = Math.sin(yaw.current);
      const cosYaw = Math.cos(yaw.current);

      moveDir.x += -sinYaw * forward;
      moveDir.z += -cosYaw * forward;
      moveDir.x += cosYaw * right;
      moveDir.z += -sinYaw * right;
      moveDir.normalize();
    }

    const targetSpeed = isSprinting ? 11.5 : 6.8;
    const accelRate = onGround.current ? 16 : 4;

    const targetVelX = moveDir.x * (isMoving ? targetSpeed : 0);
    const targetVelZ = moveDir.z * (isMoving ? targetSpeed : 0);

    playerVelocity.current.x = THREE.MathUtils.damp(
      playerVelocity.current.x,
      targetVelX,
      accelRate,
      delta
    );
    playerVelocity.current.z = THREE.MathUtils.damp(
      playerVelocity.current.z,
      targetVelZ,
      accelRate,
      delta
    );

    // 5. SAUT ET GRAVITÉ
    const GRAVITY = -24;
    if (onGround.current) {
      if (input.jump) {
        playerVelocity.current.y = 8.5;
        onGround.current = false;
        audioSystem.playJump();
      } else {
        playerVelocity.current.y = 0;
      }
    } else {
      playerVelocity.current.y += GRAVITY * delta;
    }

    // 6. COLLISIONS ET GLISSEMENT
    const currentFeetPos = playerPos.current.clone();
    const desiredPos = currentFeetPos.clone().addScaledVector(playerVelocity.current, delta);
    const collisionResult = resolveMapPlayerCollisions(activeMap, currentFeetPos, desiredPos, 0.45, 1.8);

    playerPos.current.copy(collisionResult.finalPos);
    onGround.current = collisionResult.onGround;

    camera.position.x = playerPos.current.x;
    if (!isLocalDead) {
      camera.position.y = playerPos.current.y + 1.6;
    }
    camera.position.z = playerPos.current.z;

    // 7. BRUITS DE PAS
    if (onGround.current && isMoving) {
      const horizontalSpeed = Math.hypot(playerVelocity.current.x, playerVelocity.current.z);
      footstepDistance.current += horizontalSpeed * delta;
      const stepThreshold = isSprinting ? 1.6 : 2.1;
      if (footstepDistance.current >= stepThreshold) {
        footstepDistance.current = 0;
        audioSystem.playFootstep();
      }
    }

    // 8. PROGRESSION DU RECHARGEMENT
    if (isReloading.current) {
      reloadTimer.current -= delta;
      broadcastWeaponState();

      if (reloadTimer.current <= 0) {
        isReloading.current = false;
        // Remplir le chargeur depuis la réserve
        const needed = currentWeapon.magazineSize - ammoData.ammo;
        const available = Math.min(needed, ammoData.reserveAmmo);
        ammoData.ammo += available;
        broadcastWeaponState();
      }
    } else if (input.reload && ammoData.ammo < currentWeapon.magazineSize) {
      startReload();
    }

    // 9. REFROIDISSEMENT DU TIR (FIRE COOLDOWN)
    if (fireCooldown.current > 0) {
      fireCooldown.current -= delta;
    }
    isFiringState.current = false;

    // 10. TIR AU CLIC GAUCHE OU BOUTON MOBILE (RAYCASTING MODULAIRE)
    if ((isPointerLocked || isTouchMode) && input.fire && !isReloading.current) {
      if (fireCooldown.current <= 0) {
        if (ammoData.ammo > 0) {
          executeFire(currentWeapon);
        } else {
          audioSystem.playEmptyClick();
          startReload();
          fireCooldown.current = 0.25;
        }
      }
    }

    // 10.5 GESTION DE L'IMMUNITÉ & DU SANCTUAIRE DE BASE
    if (immunityTimer.current > 0) {
      immunityTimer.current = Math.max(0, immunityTimer.current - delta);
    }

    if (fpShieldRef.current) {
      if (immunityTimer.current > 0) {
        fpShieldRef.current.visible = true;
        const mat = fpShieldRef.current.material as THREE.MeshBasicMaterial;
        if (mat) {
          mat.opacity = Math.min(0.2, (immunityTimer.current / 3.0) * 0.2);
        }
      } else {
        fpShieldRef.current.visible = false;
      }
    }

    const myTeam = photonClient.getLocalTeam();
    const sanctuaryStatus = getPlayerSanctuaryStatus(playerPos.current, activeMap, myTeam);
    const wasInSanctuary = isInSanctuary.current;
    isInSanctuary.current = sanctuaryStatus.isInSanctuary && sanctuaryStatus.isOwnSanctuary;
    sanctuaryTeam.current = sanctuaryStatus.sanctuary ? sanctuaryStatus.sanctuary.team : null;

    let healed = false;
    // Régénération médicale continue (+25 PV/s et +20 Bouclier/s) dans le sanctuaire de l'équipe
    if (isInSanctuary.current && playerStats.current.hp > 0) {
      if (playerStats.current.hp < playerStats.current.maxHp) {
        playerStats.current.hp = Math.min(playerStats.current.maxHp, playerStats.current.hp + 25 * delta);
        healed = true;
      }
      if (playerStats.current.shield < playerStats.current.maxShield) {
        playerStats.current.shield = Math.min(playerStats.current.maxShield, playerStats.current.shield + 20 * delta);
        healed = true;
      }
    }

    // 11. SYNCHRONISATION DES STATS JOUEUR
    const prevSprinting = playerStats.current.isSprinting;
    playerStats.current.isSprinting = isSprinting;
    playerStats.current.onGround = onGround.current;
    playerStats.current.velocity.copy(playerVelocity.current);
    playerStats.current.position.copy(playerPos.current);
    playerStats.current.immunityTimer = immunityTimer.current;
    playerStats.current.isImmune = immunityTimer.current > 0;
    playerStats.current.isInSanctuary = isInSanctuary.current;
    playerStats.current.sanctuaryTeam = sanctuaryTeam.current;

    playerStats.current.yaw = yaw.current;
    playerStats.current.pitch = pitch.current;

    // Liaisons globales pour le simulateur de bots IA, le Radar Minimap et le Réticule Dynamique
    (window as any).localPlayerPosition = [playerPos.current.x, playerPos.current.y, playerPos.current.z];
    (window as any).localPlayerYaw = yaw.current;
    (window as any).localPlayerPitch = pitch.current;
    (window as any).localPlayerHP = playerStats.current.hp;
    (window as any).localPlayerOnGround = onGround.current;
    (window as any).localPlayerIsFiring = isFiringState.current;
    (window as any).localPlayerIsSprinting = isSprinting;

    const nowTime = performance.now();
    const isImmuneNow = immunityTimer.current > 0;
    const immuneStateChanged = lastReportedImmune.current !== isImmuneNow;
    const shouldSync = 
      prevSprinting !== isSprinting || 
      healed || 
      wasInSanctuary !== isInSanctuary.current || 
      immuneStateChanged || 
      (nowTime - lastStatsSyncTime.current > 200); // 5Hz pour le HUD général

    if (shouldSync) {
      lastStatsSyncTime.current = nowTime;
      lastReportedImmune.current = isImmuneNow;
      onPlayerStatsChange({ ...playerStats.current, isImmune: isImmuneNow });
    }

    // 12. DIFFUSION RÉSEAU MULTIJOUEUR PHOTON (Position / Rotation / Arme / Santé à ~20 Hz)
    photonClient.sendLocalTransform(
      [playerPos.current.x, playerPos.current.y + 1.6, playerPos.current.z],
      [pitch.current, yaw.current, 0],
      [playerVelocity.current.x, playerVelocity.current.y, playerVelocity.current.z],
      currentWeapon.id,
      playerStats.current.hp,
      playerStats.current.shield,
      playerStats.current.hp > 0,
      isFiringState.current,
      isSprinting,
      immunityTimer.current > 0,
      isInSanctuary.current
    );

    // 13. CHAT VOCAL SPATIAL DE PROXIMITÉ (Web Audio 3D Panner & Distance)
    proximityVoiceSystem.updateSpatialPositions(
      [playerPos.current.x, playerPos.current.y + 1.6, playerPos.current.z],
      yaw.current,
      photonClient.getRemotePlayers()
    );
  });

  /**
   * Exécute un tir spécifique à l'arme courante
   */
  const executeFire = (weapon: WeaponDefinition) => {
    const ammoData = ammoInventory.current[weapon.id];
    if (!ammoData || ammoData.ammo <= 0) return;

    isFiringState.current = true;
    fireCooldown.current = weapon.fireRateSeconds;
    ammoData.ammo -= 1;
    broadcastWeaponState();

    // Son spécifique de l'arme
    audioSystem.playWeaponFire(weapon.sound);

    // Recul physique sur la caméra ajusté par arme
    const kickPower = weapon.recoilKickback;
    recoilPitch.current += kickPower;
    recoilYaw.current += (Math.random() - 0.5) * (kickPower * 0.4);

    // Raycast avec légère dispersion angulaire
    const raycaster = new THREE.Raycaster();
    const spreadX = (Math.random() - 0.5) * weapon.spreadAngle;
    const spreadY = (Math.random() - 0.5) * weapon.spreadAngle;
    raycaster.setFromCamera(new THREE.Vector2(spreadX, spreadY), camera);

    // Calcul de l'origine du laser à la bouche de l'arme
    const muzzlePos = muzzleWorldPos.current
      ? muzzleWorldPos.current.clone()
      : camera.position.clone().add(new THREE.Vector3(0.24, -0.22, -0.42).applyEuler(camera.rotation));

    // Diffusion du tir laser aux autres joueurs connectés
    photonClient.sendShootEvent(
      [muzzlePos.x, muzzlePos.y, muzzlePos.z],
      [raycaster.ray.direction.x, raycaster.ray.direction.y, raycaster.ray.direction.z],
      weapon.id,
      weapon.visual.beamColor
    );

    let closestDistance = weapon.range;
    let hitPoint = camera.position.clone().add(raycaster.ray.direction.clone().multiplyScalar(weapon.range));
    let hitNormal = new THREE.Vector3(0, 1, 0);
    let hitTarget: TrainingTarget | null = null;
    let hitRemotePlayer: NetworkPlayerState | null = null;
    let isCrit = false;

    // 1. Raycast contre les cibles vivantes (drones d'entraînement)
    for (const target of targets) {
      if (target.isDead) continue;
      const sphere = new THREE.Sphere(target.position, target.radius * 1.1);
      const intersection = new THREE.Vector3();
      if (raycaster.ray.intersectSphere(sphere, intersection)) {
        const dist = camera.position.distanceTo(intersection);
        if (dist < closestDistance) {
          closestDistance = dist;
          hitPoint.copy(intersection);
          hitNormal.subVectors(intersection, target.position).normalize();
          hitTarget = target;
          hitRemotePlayer = null;
          isCrit = intersection.y > target.position.y + target.radius * 0.2;
        }
      }
    }

    // 2. Raycast contre les joueurs adverses connectés (Multijoueur Photon)
    const remotePlayersList = photonClient.getRemotePlayers();
    for (const rp of remotePlayersList) {
      if (!rp.isAlive) continue;

      // Multi-sphere capsule approximation for highly accurate hitboxes matching visual model
      const headCenter = new THREE.Vector3(rp.position[0], rp.position[1] + 0.25, rp.position[2]);
      const torsoCenter = new THREE.Vector3(rp.position[0], rp.position[1] - 0.35, rp.position[2]);
      const legsCenter = new THREE.Vector3(rp.position[0], rp.position[1] - 1.00, rp.position[2]);

      const hitboxes = [
        { center: headCenter, radius: 0.22, isHead: true },
        { center: torsoCenter, radius: 0.35, isHead: false },
        { center: legsCenter, radius: 0.35, isHead: false }
      ];

      for (const hb of hitboxes) {
        const sphere = new THREE.Sphere(hb.center, hb.radius);
        const intersection = new THREE.Vector3();
        if (raycaster.ray.intersectSphere(sphere, intersection)) {
          const dist = camera.position.distanceTo(intersection);
          if (dist < closestDistance) {
            closestDistance = dist;
            hitPoint.copy(intersection);
            hitNormal.subVectors(intersection, hb.center).normalize();
            hitTarget = null;
            hitRemotePlayer = rp;
            isCrit = hb.isHead; // Headshot if we hit the head sphere!
          }
        }
      }
    }

    // 3. Raycast contre les obstacles solides de la map
    for (const col of activeMap.colliders) {
      const box = new THREE.Box3(col.min, col.max);
      const intersection = new THREE.Vector3();
      if (raycaster.ray.intersectBox(box, intersection)) {
        const dist = camera.position.distanceTo(intersection);
        if (dist < closestDistance) {
          closestDistance = dist;
          hitPoint.copy(intersection);
          hitTarget = null;
          hitRemotePlayer = null;
          hitNormal.set(0, 1, 0);
        }
      }
    }

    // 4. Raycast contre le sol
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const floorIntersection = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(floorPlane, floorIntersection)) {
      const dist = camera.position.distanceTo(floorIntersection);
      if (dist < closestDistance) {
        closestDistance = dist;
        hitPoint.copy(floorIntersection);
        hitTarget = null;
        hitRemotePlayer = null;
        hitNormal.set(0, 1, 0);
      }
    }

    // Faisceau laser dynamique aux propriétés de l'arme
    const laserBeam: LaserBeamEffect = {
      id: `beam_${Date.now()}_${Math.random()}`,
      start: muzzlePos,
      end: hitPoint.clone(),
      color: weapon.visual.beamColor,
      radius: weapon.visual.beamRadius,
      createdAt: Date.now(),
      duration: weapon.visual.beamDuration,
    };
    onLaserFired(laserBeam);

    // Étincelle d'impact adaptée
    const impact: ImpactEffect = {
      id: `impact_${Date.now()}_${Math.random()}`,
      position: hitPoint.clone(),
      normal: hitNormal.clone(),
      color: (hitTarget || hitRemotePlayer) ? '#ff007f' : weapon.visual.impactColor,
      createdAt: Date.now(),
    };
    onImpactCreated(impact);

    // Dégâts et confirmation
    if (hitRemotePlayer) {
      const activeRoom = photonClient.getCurrentRoom();
      const isTDM = activeRoom && activeRoom.gameMode === 'TEAM_DEATHMATCH';
      const isTeammate = isTDM && hitRemotePlayer.team === photonClient.getLocalTeam() && photonClient.getLocalTeam() !== 'SOLO';

      if (!isTeammate) {
        // Protection 1 : Bouclier d'immunité temporaire après réapparition (3s)
        if (hitRemotePlayer.isImmune) {
          audioSystem.playImpact();
          console.log(`[FPSController] 🛡️ Tir absorbé : L'adversaire #${hitRemotePlayer.actorNr} est sous bouclier d'immunité !`);
          return;
        }

        // Protection 2 : Zone Sanctuaire d'équipe impénétrable
        if (activeMap.sanctuaryZones) {
          const targetTeam = (hitRemotePlayer.team || '').toLowerCase();
          const targetSanctuary = targetTeam === 'red' ? activeMap.sanctuaryZones.red : targetTeam === 'blue' ? activeMap.sanctuaryZones.blue : null;
          if (targetSanctuary && isPositionInsideSanctuary(hitRemotePlayer.position, targetSanctuary)) {
            audioSystem.playImpact();
            console.log(`[FPSController] 🛡️ Tir bloqué : L'adversaire #${hitRemotePlayer.actorNr} est protégé dans son Sanctuaire de base !`);
            return;
          }
        }

        const baseDamage = weapon.damage;
        const finalDamage = isCrit ? Math.round(baseDamage * weapon.headshotMultiplier) : baseDamage;

        audioSystem.playHitmarker(isCrit);

        // Envoi de l'événement de dégâts au réseau
        photonClient.sendDamageEvent(
          hitRemotePlayer.actorNr,
          finalDamage,
          isCrit,
          weapon.id,
          [hitPoint.x, hitPoint.y, hitPoint.z]
        );

        // Vérification si ce tir élimine l'adversaire
        if (hitRemotePlayer.health - finalDamage <= 0) {
          photonClient.sendKillEvent(hitRemotePlayer.actorNr, weapon.id, isCrit);
          onTargetFrag();
        }

        onHitmarker({
          id: `hm_${Date.now()}`,
          damage: finalDamage,
          isCrit,
          timestamp: Date.now(),
        });
      }
    } else if (hitTarget) {
      const baseDamage = weapon.damage;
      const finalDamage = isCrit ? Math.round(baseDamage * weapon.headshotMultiplier) : baseDamage;

      audioSystem.playHitmarker(isCrit);
      onTargetHit(hitTarget.id, finalDamage, isCrit);

      onHitmarker({
        id: `hm_${Date.now()}`,
        damage: finalDamage,
        isCrit,
        timestamp: Date.now(),
      });
    } else {
      audioSystem.playImpact();
    }
  };

  const currentWeapon = WEAPONS_CATALOG[activeWeaponIndex.current];

  return (
    <>
      <primitive object={camera}>
        {/* Éclairage frontal tactique (Fill Light & Spot) pour assurer une visibilité parfaite partout où le joueur regarde */}
        <pointLight position={[0, 0, 0.2]} intensity={1.8} distance={22} color="#f0f9ff" />
        <spotLight
          position={[0, 0, -0.1]}
          target-position={[0, 0, -10]}
          intensity={2.5}
          distance={35}
          angle={Math.PI / 3}
          penumbra={0.6}
          color="#ffffff"
        />

        {/* Effet visuel 3D du bouclier d'immunité de réapparition en vue subjective (souple, sans wireframe) */}
        <mesh ref={fpShieldRef} position={[0, 0, -0.4]} visible={false}>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshBasicMaterial
            color="#00f0ff"
            transparent
            opacity={0.12}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        <WeaponViewmodel
          weapon={currentWeapon}
          isFiring={isFiringState.current}
          isReloading={isReloading.current}
          isSprinting={playerStats.current.isSprinting}
          isMoving={Math.hypot(playerVelocity.current.x, playerVelocity.current.z) > 0.5}
          mouseDelta={lastMouseDeltas.current}
          muzzleRef={muzzleWorldPos}
        />
      </primitive>
    </>
  );
}
