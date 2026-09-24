/**
 * Rendu Centralisé des Maps Modulaires (Modular Map Renderer)
 * 
 * Ce composant sélectionne dynamiquement le composant de scène 3D de la map active
 * et injecte les éléments communs :
 * - Drones cibles interactifs avec animation de vol stationnaire
 * - Balises et socles holographiques des points de spawn (Equipe Rouge, Equipe Bleu, Neutres)
 * - Balise volumétrique de la zone de capture centrale
 * - Faisceaux lasers et étincelles d'impact
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MapDefinition, SanctuaryZone } from '../../types/maps.ts';
import type { TrainingTarget, LaserBeamEffect, ImpactEffect } from '../../types/fps.ts';
import RooftopDistrictMap from './RooftopDistrictMap.tsx';
import UndergroundGridMap from './UndergroundGridMap.tsx';

interface ModularMapRendererProps {
  activeMap: MapDefinition;
  targets: TrainingTarget[];
  laserBeams: LaserBeamEffect[];
  impacts: ImpactEffect[];
}

export default function ModularMapRenderer({
  activeMap,
  targets,
  laserBeams,
  impacts,
}: ModularMapRendererProps) {
  // Sélection dynamique du composant 3D selon le type d'environnement de la map
  const renderMapGeometry = () => {
    if (activeMap.environmentType === 'indoor') {
      return <UndergroundGridMap mapData={activeMap} />;
    } else {
      return <RooftopDistrictMap mapData={activeMap} />;
    }
  };

  return (
    <group>
      {/* 1. GÉOMÉTRIE 3D DE LA MAP ACTIVE */}
      {renderMapGeometry()}

      {/* 2. BALISE HOLOGRAPHIQUE DE LA ZONE DE CAPTURE CENTRALE */}
      <CaptureZoneHoloBeacon zone={activeMap.captureZone} />

      {/* 2.5 SANCTUAIRES DE SPAWN & SOIN D'ÉQUIPES (ROUGE & BLEU) */}
      {activeMap.sanctuaryZones && (
        <>
          <SanctuaryZoneForcefield zone={activeMap.sanctuaryZones.red} />
          <SanctuaryZoneForcefield zone={activeMap.sanctuaryZones.blue} />
        </>
      )}

      {/* 3. MARQUEURS HOLOGRAPHIQUES DES POINTS DE SPAWN */}
      {activeMap.spawnPoints.map((spawn) => (
        <SpawnPadMarker key={spawn.id} spawn={spawn} />
      ))}

      {/* 4. CIBLES D'ENTRAÎNEMENT RÉACTIVES DE LA MAP */}
      {targets.map((target) => (
        <InteractiveDroneTarget key={target.id} target={target} />
      ))}

      {/* 5. EFFETS VISUELS DE TIRS LASER */}
      {laserBeams.map((beam) => (
        <LaserBeamMesh key={beam.id} beam={beam} />
      ))}

      {/* 6. ÉTINCELLES D'IMPACTS */}
      {impacts.map((impact) => (
        <ImpactSparkMesh key={impact.id} impact={impact} />
      ))}
    </group>
  );
}

/**
 * Balise volumétrique holographique de la zone de capture centrale
 */
function CaptureZoneHoloBeacon({ zone }: { zone: MapDefinition['captureZone'] }) {
  const beaconRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (beaconRef.current) {
      beaconRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group position={zone.position}>
      {/* Cylindre translucide de zone de capture */}
      <mesh position={[0, zone.height / 2, 0]}>
        <cylinderGeometry args={[zone.radius, zone.radius, zone.height, 24, 1, true]} />
        <meshBasicMaterial
          color={zone.accentColor}
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Anneau inférieur au sol */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[zone.radius - 0.1, zone.radius, 32]} />
        <meshBasicMaterial
          color={zone.accentColor}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Balise centrale tournante avec losange holographique */}
      <group ref={beaconRef} position={[0, 1.8, 0]}>
        <mesh rotation={[0.5, 0.5, 0]}>
          <octahedronGeometry args={[0.5, 0]} />
          <meshBasicMaterial
            color={zone.accentColor}
            wireframe
          />
        </mesh>
        <mesh rotation={[0.5, 0.5, 0]}>
          <octahedronGeometry args={[0.3, 0]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Marqueur holographique pour les points de spawn (Equipe Rouge, Bleu, Neutre)
 */
function SpawnPadMarker({ spawn }: { spawn: MapDefinition['spawnPoints'][0] }) {
  const color =
    spawn.team === 'red'
      ? '#ff0033'
      : spawn.team === 'blue'
      ? '#0088ff'
      : '#00f0ff';

  return (
    <group position={spawn.position}>
      {/* Disque au sol */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[1.0, 1.25, 20]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Faisceau indicateur vertical discret */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.2, 6]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
        />
      </mesh>
    </group>
  );
}

/**
 * Drone d'entraînement holographique interactif ultra-visible
 */
function InteractiveDroneTarget({ target }: { target: TrainingTarget }) {
  const droneRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const hudRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!droneRef.current) return;
    if (target.isDead) {
      droneRef.current.position.y = -100;
      return;
    }
    const time = state.clock.elapsedTime;
    const hoverOffset = Math.sin(time * 3 + target.position.x) * 0.18;
    droneRef.current.position.set(
      target.position.x,
      target.baseY + hoverOffset,
      target.position.z
    );
    droneRef.current.rotation.y = time * 1.2;

    if (ring1Ref.current) ring1Ref.current.rotation.z = time * 2.0;
    if (ring2Ref.current) ring2Ref.current.rotation.x = time * -1.8;

    // Orientation du marqueur HUD vers la caméra
    if (hudRef.current) {
      hudRef.current.quaternion.copy(state.camera.quaternion);
    }
  });

  if (target.isDead) return null;

  const isFlashing = target.hitFlashTime > 0;
  const bodyColor = isFlashing ? '#ffffff' : '#1e1b4b';
  const glowColor = isFlashing ? '#ffffff' : '#ff0055';
  const accentNeon = '#00f0ff';
  const hpRatio = Math.max(0, target.hp / target.maxHp);

  return (
    <group ref={droneRef} position={[target.position.x, target.baseY, target.position.z]}>
      {/* 1. HALO LUMINEUX PUISSANT ÉMIS PAR LA CIBLE */}
      <pointLight color={glowColor} intensity={3.5} distance={15} />

      {/* 2. FAISCEAU BALISE LASER VERTICAL POUR REPAIRAGE INSTANTANÉ AU LOIN */}
      <mesh position={[0, 4, 0]}>
        <cylinderGeometry args={[0.04, 0.08, 8, 8, 1, true]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. BOUCLIER ÉNERGÉTIQUE HOLOGRAPHIQUE SPHÉRIQUE */}
      <mesh>
        <sphereGeometry args={[1.05, 16, 16]} />
        <meshBasicMaterial
          color={accentNeon}
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 4. NOYAU CENTRAL DU DRONE (AGRANDI & CONTRASTÉ) */}
      <mesh>
        <octahedronGeometry args={[0.65, 0]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={glowColor}
          emissiveIntensity={isFlashing ? 1.5 : 0.8}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      {/* 5. DOUBLE ANNEAU ÉNERGÉTIQUE DE SUSTENTATION */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.9, 0.06, 8, 28]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.95}
        />
      </mesh>
      <mesh ref={ring2Ref} rotation={[Math.PI / 4, Math.PI / 4, 0]}>
        <torusGeometry args={[1.0, 0.04, 8, 28]} />
        <meshBasicMaterial
          color={accentNeon}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* 6. MARQUEUR HUD BILLBOARD AU-DESSUS DU DRONE (FACE CAMÉRA) */}
      <group ref={hudRef} position={[0, 1.45, 0]}>
        {/* Réticule losange cible */}
        <mesh position={[0, 0.35, 0]}>
          <ringGeometry args={[0.18, 0.22, 4]} />
          <meshBasicMaterial
            color={glowColor}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Fond de la barre de points de vie */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[1.3, 0.16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        {/* Barre de vie dynamique avec jauge contrastée */}
        <mesh position={[(hpRatio - 1) * 0.62, 0, 0.01]}>
          <planeGeometry args={[hpRatio * 1.24, 0.12]} />
          <meshBasicMaterial color={hpRatio > 0.35 ? '#00f0ff' : '#ff0033'} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Faisceau Laser Haute Performance
 */
function LaserBeamMesh({ beam }: { beam: LaserBeamEffect }) {
  const points = [beam.start, beam.end];
  const lineGeo = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <group>
      <primitive
        object={
          new THREE.Line(
            lineGeo,
            new THREE.LineBasicMaterial({
              color: beam.color || '#00f0ff',
              linewidth: 2,
            })
          )
        }
      />
      <mesh position={beam.end}>
        <sphereGeometry args={[beam.radius ? beam.radius * 2.5 : 0.06, 8, 8]} />
        <meshBasicMaterial
          color={beam.color || '#00f0ff'}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/**
 * Étincelles d'impact laser
 */
function ImpactSparkMesh({ impact }: { impact: ImpactEffect }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.scale.multiplyScalar(1 + delta * 6);
    }
  });

  return (
    <group ref={groupRef} position={impact.position}>
      <mesh>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshBasicMaterial
          color={impact.color}
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}>
        <ringGeometry args={[0.08, 0.22, 10]} />
        <meshBasicMaterial
          color={impact.color}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/**
 * Dôme de Forcefield & Sanctuaire Médical de Spawn (Soin + Protection Totale)
 */
function SanctuaryZoneForcefield({ zone }: { zone: SanctuaryZone }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const crossRef = useRef<THREE.Group>(null);
  const cylinderMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const isRed = zone.team === 'red';
  const color = isRed ? '#ff0055' : '#00f0ff';
  const secondaryColor = isRed ? '#ff5500' : '#38bdf8';

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.35;
    }
    if (crossRef.current) {
      crossRef.current.rotation.y += delta * 0.75;
      crossRef.current.position.y = zone.height * 0.7 + Math.sin(time * 2) * 0.25;
    }
    if (cylinderMatRef.current) {
      // Effet de pulsation respirante de la barrière de protection
      cylinderMatRef.current.opacity = 0.13 + Math.sin(time * 3) * 0.04;
    }
  });

  // Calcul des 4 pylônes émetteurs de bouclier sur le périmètre
  const pylonAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

  return (
    <group position={zone.position}>
      {/* 1. Barrière Cylindrique Translucide Énergétique */}
      <mesh position={[0, zone.height / 2, 0]}>
        <cylinderGeometry args={[zone.radius, zone.radius, zone.height, 32, 1, true]} />
        <meshBasicMaterial
          ref={cylinderMatRef}
          color={color}
          transparent
          opacity={0.14}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 2. Dôme / Anneau supérieur de confinement */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, zone.height, 0]}>
        <ringGeometry args={[zone.radius - 0.25, zone.radius, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Anneaux au Sol & Décal de Sécurité */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[zone.radius - 0.35, zone.radius, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Anneau intérieur de pulsation */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[zone.radius * 0.5 - 0.15, zone.radius * 0.5, 24]} />
        <meshBasicMaterial
          color={secondaryColor}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Croix médicale lumineuse au sol */}
      <group position={[0, 0.05, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.4, 0.7]} />
          <meshBasicMaterial color={color} transparent opacity={0.65} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.7, 2.4]} />
          <meshBasicMaterial color={color} transparent opacity={0.65} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>

      {/* 4. Hologramme 3D Flottant (Croix Médicale de Régénération) */}
      <group ref={crossRef} position={[0, zone.height * 0.7, 0]}>
        {/* Croix 3D */}
        <mesh>
          <boxGeometry args={[1.2, 0.35, 0.35]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.35, 1.2, 0.35]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} blending={THREE.AdditiveBlending} />
        </mesh>
        {/* Halo sphérique au centre de la croix */}
        <mesh>
          <sphereGeometry args={[0.45, 12, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>

      {/* 5. Pylônes émetteurs de bouclier sur le périmètre */}
      {pylonAngles.map((ang, idx) => {
        const px = Math.cos(ang) * (zone.radius - 0.2);
        const pz = Math.sin(ang) * (zone.radius - 0.2);
        return (
          <group key={`pylon_${idx}`} position={[px, 0, pz]}>
            {/* Colonne pôle */}
            <mesh position={[0, 1.4, 0]}>
              <cylinderGeometry args={[0.1, 0.16, 2.8, 8]} />
              <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
            </mesh>
            {/* Orbe émetteur au sommet */}
            <mesh position={[0, 2.85, 0]}>
              <sphereGeometry args={[0.22, 12, 12]} />
              <meshBasicMaterial color={color} transparent opacity={0.95} blending={THREE.AdditiveBlending} />
            </mesh>
            {/* Faisceau lumineux vertical */}
            <mesh position={[0, zone.height / 2, 0]}>
              <cylinderGeometry args={[0.02, 0.02, zone.height, 6]} />
              <meshBasicMaterial color={color} transparent opacity={0.35} blending={THREE.AdditiveBlending} />
            </mesh>
          </group>
        );
      })}

      {/* 6. Faisceau laser d'axe central */}
      <mesh position={[0, zone.height / 2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, zone.height, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}
