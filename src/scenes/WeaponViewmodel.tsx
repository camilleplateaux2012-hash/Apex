/**
 * Vue Première Personne de l'Arme 3D Modulaire (Modular FPS Weapon Viewmodel)
 * 
 * Génère et anime dynamiquement le modèle 3D de l'arme en fonction de la configuration
 * (Mitraillette rapide, Fusil d'assaut, Fusil Sniper Railgun, etc.) :
 * - Dimensions, accessoires (lunette longue, poignée avant, bobines d'énergie) adaptés
 * - Couleurs des liserés néon et des flashs calquées sur la configuration de l'arme
 * - Animation de recul mécanique (kickback) proportionnelle à la puissance de l'arme
 * - Inertie de visée (mouse sway), balancement de marche (bobbing)
 * - Animation d'abaissement et d'insertion de batterie lors du rechargement
 * - Animation d'équipement fluide lors du changement d'arme
 */

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { WeaponDefinition } from '../config/weaponsConfig.ts';

interface WeaponViewmodelProps {
  weapon: WeaponDefinition;
  isFiring: boolean;
  isReloading: boolean;
  isSprinting: boolean;
  isMoving: boolean;
  mouseDelta: { dx: number; dy: number };
  muzzleRef?: React.RefObject<THREE.Vector3 | null>;
}

export default function WeaponViewmodel({
  weapon,
  isFiring,
  isReloading,
  isSprinting,
  isMoving,
  mouseDelta,
  muzzleRef,
}: WeaponViewmodelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const flashLightRef = useRef<THREE.PointLight>(null);
  const magRef = useRef<THREE.Mesh>(null);
  const tipRef = useRef<THREE.Group>(null);

  // Animation physique
  const recoilOffset = useRef(0);
  const recoilRot = useRef(0);
  const swayOffset = useRef({ x: 0, y: 0 });
  const walkCycle = useRef(0);
  const equipOffset = useRef(0.3); // Démarre en bas lors de l'équipement

  // Détection du changement d'arme pour déclencher l'animation d'équipement
  const lastWeaponId = useRef(weapon.id);
  useEffect(() => {
    if (lastWeaponId.current !== weapon.id) {
      lastWeaponId.current = weapon.id;
      equipOffset.current = 0.25; // Abaisse l'arme temporairement
    }
  }, [weapon.id]);

  const { modelTheme, beamColor, muzzleFlashColor, muzzleFlashScale } = weapon.visual;

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // 1. ANIMATION D'ÉQUIPEMENT (RELEVAGE DE L'ARME)
    equipOffset.current = THREE.MathUtils.damp(equipOffset.current, 0, 14, delta);

    // 2. RECUL MÉCANIQUE DU TIR (KICKBACK DYNAMIQUE SELON L'ARME)
    if (isFiring) {
      const kickPower = weapon.recoilKickback;
      recoilOffset.current = kickPower * 2.8;
      recoilRot.current = kickPower * 5.0;
    }
    // Rétablissement amorti du recul (plus rapide pour le SMG, plus lourd pour le sniper)
    const recoverySpeed = weapon.type === 'smg' ? 24 : weapon.type === 'sniper' ? 11 : 16;
    recoilOffset.current = THREE.MathUtils.damp(recoilOffset.current, 0, recoverySpeed, delta);
    recoilRot.current = THREE.MathUtils.damp(recoilRot.current, 0, recoverySpeed, delta);

    // 3. INERTIE DE SOURIS (WEAPON SWAY)
    const targetSwayX = -mouseDelta.dx * 0.00028;
    const targetSwayY = mouseDelta.dy * 0.00028;
    swayOffset.current.x = THREE.MathUtils.damp(swayOffset.current.x, targetSwayX, 10, delta);
    swayOffset.current.y = THREE.MathUtils.damp(swayOffset.current.y, targetSwayY, 10, delta);

    // 4. BALANCEMENT DE MARCHE / SPRINT (BOBBING)
    if (isMoving) {
      const bobFreq = isSprinting ? 14 : 9;
      walkCycle.current += delta * bobFreq;
    } else {
      walkCycle.current = THREE.MathUtils.damp(walkCycle.current, 0, 4, delta);
    }

    const bobMultiplier = weapon.type === 'sniper' ? 0.7 : 1.0;
    const bobX = Math.sin(walkCycle.current) * (isSprinting ? 0.016 : 0.006) * bobMultiplier;
    const bobY = Math.abs(Math.cos(walkCycle.current)) * (isSprinting ? 0.014 : 0.005) * bobMultiplier;

    // 5. ANIMATION DE RECHARGEMENT
    const reloadDropY = isReloading ? -0.16 : 0;
    const reloadTiltZ = isReloading ? 0.28 : 0;
    const reloadTiltX = isReloading ? -0.32 : 0;

    // Déplacement de la batterie lors du rechargement
    if (magRef.current) {
      const magDrop = isReloading ? -0.06 : 0;
      magRef.current.position.y = -0.08 + magDrop;
    }

    // Position de base de l'arme relative à la caméra (main droite)
    const basePos = new THREE.Vector3(0.24, -0.22, -0.42);
    if (isSprinting) {
      basePos.x = 0.19;
      basePos.y = -0.26;
      basePos.z = -0.38;
    }

    // Application lissée de la position & rotation
    groupRef.current.position.x = basePos.x + swayOffset.current.x + bobX;
    groupRef.current.position.y = basePos.y + swayOffset.current.y - bobY + reloadDropY - equipOffset.current;
    groupRef.current.position.z = basePos.z + recoilOffset.current;

    groupRef.current.rotation.x = -recoilRot.current + (isSprinting ? -0.22 : 0) + reloadTiltX - equipOffset.current * 0.8;
    groupRef.current.rotation.y = swayOffset.current.x * 2;
    groupRef.current.rotation.z = -bobX * 1.5 + reloadTiltZ;

    // 6. GESTION DU FLASH DU CANON (MUZZLE FLASH)
    const flashVisible = recoilOffset.current > 0.018;
    if (flashRef.current) {
      flashRef.current.visible = flashVisible;
      if (flashVisible) {
        flashRef.current.rotation.z = Math.random() * Math.PI * 2;
        const scale = (0.7 + Math.random() * 0.4) * muzzleFlashScale;
        flashRef.current.scale.set(scale, scale, scale);
      }
    }
    if (flashLightRef.current) {
      flashLightRef.current.intensity = flashVisible ? 7 * muzzleFlashScale : 0;
    }

    // 7. TRANSMISSION DE LA POSITION MONDIALE DE SORTIE DU CANON
    if (tipRef.current && muzzleRef) {
      const worldPos = new THREE.Vector3();
      tipRef.current.getWorldPosition(worldPos);
      muzzleRef.current = worldPos;
    }
  });

  // Calculs géométriques paramétriques
  const bodyZ = 0;
  const barrelZ = -(modelTheme.bodyLength / 2 + modelTheme.barrelLength / 2);
  const muzzleZ = -(modelTheme.bodyLength / 2 + modelTheme.barrelLength + 0.02);

  return (
    <group ref={groupRef}>
      {/* 1. CHÂSSIS / CORPS PRINCIPAL DE L'ARME */}
      <mesh position={[0, 0, bodyZ]}>
        <boxGeometry args={[modelTheme.bodyWidth, modelTheme.bodyHeight, modelTheme.bodyLength]} />
        <meshStandardMaterial
          color={modelTheme.primaryColor}
          roughness={0.25}
          metalness={0.88}
        />
      </mesh>

      {/* 2. GLISSIÈRE SUPÉRIEURE TACTIQUE */}
      <mesh position={[0, modelTheme.bodyHeight * 0.52, bodyZ - 0.02]}>
        <boxGeometry
          args={[
            modelTheme.bodyWidth * 0.85,
            modelTheme.bodyHeight * 0.28,
            modelTheme.bodyLength * 0.9,
          ]}
        />
        <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.92} />
      </mesh>

      {/* 3. RAILS NÉON CYBERPUNK (SUR LES FLANCS) */}
      <mesh position={[modelTheme.bodyWidth * 0.52, 0.015, bodyZ]}>
        <boxGeometry args={[0.005, 0.012, modelTheme.bodyLength * 0.85]} />
        <meshBasicMaterial color={modelTheme.accentColor} />
      </mesh>
      <mesh position={[-modelTheme.bodyWidth * 0.52, 0.015, bodyZ]}>
        <boxGeometry args={[0.005, 0.012, modelTheme.bodyLength * 0.85]} />
        <meshBasicMaterial color={modelTheme.accentColor} />
      </mesh>

      {/* 4. CANON DE L'ARME (CYLINDRE AJUSTÉ PAR CONFIGURATION) */}
      <mesh position={[0, 0.015, barrelZ]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry
          args={[modelTheme.barrelRadius, modelTheme.barrelRadius * 1.15, modelTheme.barrelLength, 16]}
        />
        <meshStandardMaterial color="#030712" roughness={0.15} metalness={0.96} />
      </mesh>

      {/* ANNEAU NÉON D'ÉNERGIE À LA BOUCHE */}
      <mesh position={[0, 0.015, muzzleZ]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[modelTheme.barrelRadius * 1.15, 0.004, 8, 20]} />
        <meshBasicMaterial color={modelTheme.accentColor} />
      </mesh>

      {/* 5. BOBINES D'ÉNERGIE (ACCÉLÉRATEURS MAGNÉTIQUES LE LONG DU CANON) */}
      {modelTheme.hasEnergyCoils &&
        Array.from({ length: modelTheme.coilCount || 3 }).map((_, i) => {
          const spacing = modelTheme.barrelLength / ((modelTheme.coilCount || 3) + 1);
          const coilZ = -(modelTheme.bodyLength / 2 + spacing * (i + 1));
          return (
            <group key={i} position={[0, 0.015, coilZ]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[modelTheme.barrelRadius * 1.4, 0.005, 8, 18]} />
              <meshBasicMaterial color={modelTheme.accentColor} />
            </group>
          );
        })}

      {/* 6. POIGNÉE TACTIQUE / GRIP */}
      <mesh position={[0, -modelTheme.bodyHeight * 0.85, 0.06]} rotation={[-0.28, 0, 0]}>
        <boxGeometry args={[modelTheme.bodyWidth * 0.8, 0.14, 0.065]} />
        <meshStandardMaterial color="#030712" roughness={0.7} metalness={0.2} />
      </mesh>

      {/* POIGNÉE AVANT SUPPLÉMENTAIRE (SMG / FUSIL) */}
      {modelTheme.hasFrontGrip && (
        <mesh position={[0, -modelTheme.bodyHeight * 0.75, -modelTheme.bodyLength * 0.35]}>
          <boxGeometry args={[0.03, 0.08, 0.035]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.5} />
        </mesh>
      )}

      {/* 7. CELLULE D'ÉNERGIE NÉON (CHARGEUR AMOVIBLE) */}
      <mesh ref={magRef} position={[0, -0.08, 0.05]} rotation={[-0.28, 0, 0]}>
        <boxGeometry args={[modelTheme.bodyWidth * 0.7, 0.08, 0.045]} />
        <meshStandardMaterial
          color={beamColor}
          emissive={beamColor}
          emissiveIntensity={1.8}
          roughness={0.1}
        />
      </mesh>

      {/* 8. SYSTÈME DE VISÉE MODULAIRE */}
      {modelTheme.hasLongScope ? (
        // LUNETTE LONGUE DE PRÉCISION (SNIPER)
        <group position={[0, modelTheme.bodyHeight * 0.75, -0.04]}>
          {/* Corps de la lunette */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.024, 0.028, 0.22, 16]} />
            <meshStandardMaterial color="#030712" metalness={0.95} roughness={0.2} />
          </mesh>
          {/* Montures de fixation */}
          <mesh position={[0, -0.02, 0.05]}>
            <boxGeometry args={[0.022, 0.025, 0.02]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.02, -0.05]}>
            <boxGeometry args={[0.022, 0.025, 0.02]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.3} />
          </mesh>
          {/* Lentille optique holographique arrière */}
          <mesh position={[0, 0, 0.11]} rotation={[0, 0, 0]}>
            <circleGeometry args={[0.022, 16]} />
            <meshBasicMaterial color={modelTheme.accentColor} opacity={0.65} transparent />
          </mesh>
          {/* Réticule laser intérieur */}
          <mesh position={[0, 0, 0.115]}>
            <ringGeometry args={[0.003, 0.006, 16]} />
            <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ) : (
        // VISEUR HOLOGRAPHIQUE STANDARD / POINT ROUGE
        <group position={[0, modelTheme.bodyHeight * 0.7, -0.04]}>
          {/* Support viseur */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.04, 0.025, 0.06]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Verre holographique */}
          <mesh position={[0, 0.025, 0]}>
            <boxGeometry args={[0.036, 0.03, 0.003]} />
            <meshPhysicalMaterial
              color={modelTheme.accentColor}
              transmission={0.85}
              opacity={0.7}
              transparent
              roughness={0.1}
              ior={1.5}
            />
          </mesh>
          {/* Point réticule vert/cyan/magenta */}
          <mesh position={[0, 0.025, 0]}>
            <ringGeometry args={[0.002, 0.005, 12]} />
            <meshBasicMaterial color={modelTheme.accentColor} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* 9. POINT D'ÉMISSION AU BOUT DU CANON (MUZZLE FLASH VISUEL ULTRA-FLUIDE) */}
      <group ref={tipRef} position={[0, 0.015, muzzleZ]}>
        <mesh ref={flashRef} visible={false}>
          <planeGeometry args={[0.28 * muzzleFlashScale, 0.28 * muzzleFlashScale]} />
          <meshBasicMaterial
            color={muzzleFlashColor}
            transparent
            opacity={0.95}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
    </group>
  );
}
