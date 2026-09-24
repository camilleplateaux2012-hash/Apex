/**
 * Environnement 3D de la Carte de Test & Cibles Réactives (Test Arena Map)
 * 
 * - Murs d'enceinte haute sécurité avec circuits néon
 * - Sol à maillage cyberpunk et motifs de balisage
 * - Piliers, abris tactiques et plateforme surélevée
 * - Drones d'entraînement interactifs avec barres de vie et réactions aux tirs
 * - Rendu des faisceaux laser et des étincelles d'impact
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ARENA_BOUNDS, TEST_MAP_OBSTACLES, TrainingTarget } from './testMapData.ts';
import type { LaserBeamEffect, ImpactEffect } from '../types/fps.ts';

interface TestArenaMapProps {
  targets: TrainingTarget[];
  laserBeams: LaserBeamEffect[];
  impacts: ImpactEffect[];
  registerObstacleMesh?: (mesh: THREE.Mesh | THREE.Object3D) => void;
}

export default function TestArenaMap({
  targets,
  laserBeams,
  impacts,
}: TestArenaMapProps) {
  const holoPillarRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (holoPillarRef.current) {
      holoPillarRef.current.rotation.y = state.clock.elapsedTime * 0.4;
    }
  });

  return (
    <group>
      {/* 1. ÉCLAIRAGE D'ARÈNE TACTIQUE */}
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[15, 20, 10]}
        intensity={1.2}
        color="#c7d2fe"
        castShadow={false}
      />
      {/* Projecteurs d'ambiance néon */}
      <pointLight position={[0, 7, 0]} color="#00f0ff" intensity={4} distance={30} />
      <pointLight position={[-12, 4, -12]} color="#ff007f" intensity={3} distance={20} />
      <pointLight position={[12, 4, 12]} color="#00f0ff" intensity={3} distance={20} />
      <pointLight position={[14, 5, 0]} color="#ffaa00" intensity={3} distance={18} />

      {/* 2. SOL CYBERPUNK */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ARENA_BOUNDS.halfWidth * 2, ARENA_BOUNDS.halfDepth * 2]} />
        <meshStandardMaterial
          color="#060913"
          roughness={0.7}
          metalness={0.4}
        />
      </mesh>
      {/* Grille néon principale */}
      <gridHelper
        args={[ARENA_BOUNDS.halfWidth * 2, 44, '#00f0ff', '#1e293b']}
        position={[0, 0.02, 0]}
      />

      {/* Anneau lumineux central au sol */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.5, 4.65, 48]} />
        <meshBasicMaterial color="#00f0ff" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[7.5, 7.6, 48]} />
        <meshBasicMaterial color="#ff007f" side={THREE.DoubleSide} opacity={0.6} transparent />
      </mesh>

      {/* 3. MURS DU PÉRIMÈTRE DE L'ARÈNE (BOÎTE FERMÉE) */}
      {/* Mur Nord (Z = -halfDepth) */}
      <mesh position={[0, ARENA_BOUNDS.wallHeight / 2, -ARENA_BOUNDS.halfDepth]}>
        <boxGeometry args={[ARENA_BOUNDS.halfWidth * 2, ARENA_BOUNDS.wallHeight, 0.5]} />
        <meshStandardMaterial color="#090e1a" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Mur Sud (Z = +halfDepth) */}
      <mesh position={[0, ARENA_BOUNDS.wallHeight / 2, ARENA_BOUNDS.halfDepth]}>
        <boxGeometry args={[ARENA_BOUNDS.halfWidth * 2, ARENA_BOUNDS.wallHeight, 0.5]} />
        <meshStandardMaterial color="#090e1a" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Mur Ouest (X = -halfWidth) */}
      <mesh position={[-ARENA_BOUNDS.halfWidth, ARENA_BOUNDS.wallHeight / 2, 0]}>
        <boxGeometry args={[0.5, ARENA_BOUNDS.wallHeight, ARENA_BOUNDS.halfDepth * 2]} />
        <meshStandardMaterial color="#090e1a" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Mur Est (X = +halfWidth) */}
      <mesh position={[ARENA_BOUNDS.halfWidth, ARENA_BOUNDS.wallHeight / 2, 0]}>
        <boxGeometry args={[0.5, ARENA_BOUNDS.wallHeight, ARENA_BOUNDS.halfDepth * 2]} />
        <meshStandardMaterial color="#090e1a" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Bandes lumineuses néon le long des murs */}
      <mesh position={[0, 4, -ARENA_BOUNDS.halfDepth + 0.3]}>
        <planeGeometry args={[ARENA_BOUNDS.halfWidth * 2 - 2, 0.12]} />
        <meshBasicMaterial color="#00f0ff" />
      </mesh>
      <mesh position={[0, 4, ARENA_BOUNDS.halfDepth - 0.3]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ARENA_BOUNDS.halfWidth * 2 - 2, 0.12]} />
        <meshBasicMaterial color="#00f0ff" />
      </mesh>
      <mesh position={[-ARENA_BOUNDS.halfWidth + 0.3, 4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ARENA_BOUNDS.halfDepth * 2 - 2, 0.12]} />
        <meshBasicMaterial color="#ff007f" />
      </mesh>
      <mesh position={[ARENA_BOUNDS.halfWidth - 0.3, 4, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ARENA_BOUNDS.halfDepth * 2 - 2, 0.12]} />
        <meshBasicMaterial color="#ff007f" />
      </mesh>

      {/* 4. OBSTACLES ET ABRIS TACTIQUES */}
      {TEST_MAP_OBSTACLES.map((obs) => {
        return (
          <group key={obs.id} position={obs.position}>
            {/* Boîte solide */}
            <mesh>
              <boxGeometry args={obs.size} />
              <meshStandardMaterial
                color="#0c1222"
                roughness={0.25}
                metalness={0.8}
              />
            </mesh>
            {/* Lignes d'arêtes filaires néon */}
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(...obs.size)]} />
              <lineBasicMaterial color={obs.color} />
            </lineSegments>
            {/* Liseré lumineux au sommet */}
            <mesh position={[0, obs.size[1] / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[obs.size[0] * 0.8, obs.size[2] * 0.8]} />
              <meshBasicMaterial
                color={obs.color}
                opacity={0.15}
                transparent
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}

      {/* Cœur holographique rotatif au-dessus du pilier central */}
      <group position={[0, 5.5, 0]}>
        <mesh ref={holoPillarRef}>
          <octahedronGeometry args={[0.9, 0]} />
          <meshBasicMaterial color="#00f0ff" wireframe />
        </mesh>
        <pointLight color="#00f0ff" intensity={2} distance={8} />
      </group>

      {/* 5. CIBLES D'ENTRAÎNEMENT INTERACTIVES (DRONES) */}
      {targets.map((target) => (
        <InteractiveDrone key={target.id} target={target} />
      ))}

      {/* 6. RAYONS LASER VISIBLES EN PLEIN VOL */}
      {laserBeams.map((beam) => (
        <LaserBeamMesh key={beam.id} beam={beam} />
      ))}

      {/* 7. ÉTINCELLES D'IMPACT À L'ARRIVÉE DES TIRS */}
      {impacts.map((impact) => (
        <ImpactSparkMesh key={impact.id} impact={impact} />
      ))}
    </group>
  );
}

/**
 * Composant Drone Cible Holographique
 */
function InteractiveDrone({ target }: { target: TrainingTarget }) {
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (target.isDead) return;

    // Animation de lévitation douce
    const time = state.clock.elapsedTime * 2;
    const floatOffset = Math.sin(time + target.position.x) * 0.15;
    target.position.y = target.baseY + floatOffset;

    // Rotation des anneaux gyroscopiques
    if (ringRef1.current) {
      ringRef1.current.rotation.x = time * 1.5;
      ringRef1.current.rotation.y = time * 0.8;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z = -time * 1.2;
      ringRef2.current.rotation.y = time * 1.1;
    }
    if (coreRef.current) {
      const pulse = 1 + Math.sin(time * 4) * 0.1;
      coreRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  if (target.isDead) {
    // Si détruit : affichage d'un résidu d'énergie ou anneau de respawn
    return (
      <group position={[target.position.x, 0.05, target.position.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.6, 24]} />
          <meshBasicMaterial color="#ff007f" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  }

  const isFlashing = target.hitFlashTime > 0;
  const hpPercent = Math.max(0, target.hp / target.maxHp);

  return (
    <group position={[target.position.x, target.position.y, target.position.z]}>
      {/* Noyau central du drone */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[target.radius * 0.55, 16, 16]} />
        <meshStandardMaterial
          color={isFlashing ? '#ffffff' : '#ff007f'}
          emissive={isFlashing ? '#ffffff' : '#ff007f'}
          emissiveIntensity={isFlashing ? 3 : 1.2}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Anneaux gyroscopiques holographiques */}
      <mesh ref={ringRef1}>
        <torusGeometry args={[target.radius, 0.025, 8, 32]} />
        <meshBasicMaterial color={isFlashing ? '#ffffff' : '#00f0ff'} />
      </mesh>
      <mesh ref={ringRef2}>
        <torusGeometry args={[target.radius * 0.82, 0.02, 8, 32]} />
        <meshBasicMaterial color={isFlashing ? '#ffffff' : '#ff007f'} />
      </mesh>

      {/* Point lumineux du drone */}
      <pointLight
        color={isFlashing ? '#ffffff' : '#ff007f'}
        intensity={isFlashing ? 5 : 1.5}
        distance={4}
      />

      {/* Jauge de vie au-dessus du drone */}
      <group position={[0, target.radius + 0.45, 0]}>
        {/* Fond jauge */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[1, 0.12]} />
          <meshBasicMaterial color="#090d16" side={THREE.DoubleSide} />
        </mesh>
        {/* Barre de santé */}
        <mesh position={[(hpPercent - 1) * 0.48, 0, 0.01]}>
          <planeGeometry args={[Math.max(0.01, hpPercent * 0.96), 0.08]} />
          <meshBasicMaterial
            color={hpPercent > 0.4 ? '#00f0ff' : '#ff007f'}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Faisceau Laser Rendu en 3D (Haute Performance)
 */
function LaserBeamMesh({ beam }: { beam: LaserBeamEffect }) {
  // Calcul de la ligne de tir du canon au point d'impact
  const points = [beam.start, beam.end];
  const lineGeo = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <group>
      {/* Trait laser net */}
      <primitive object={new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: beam.color || '#00f0ff', linewidth: 2 }))} />
      
      {/* Bille d'énergie brillante au point d'impact */}
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
 * Étincelles d'impact laser sur un obstacle ou le sol (Sans pointLight dynamique)
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
      {/* Sphère d'impact avec lueur additive ultra-rapide */}
      <mesh>
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshBasicMaterial
          color={impact.color}
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Anneau de décharge */}
      <mesh rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}>
        <ringGeometry args={[0.1, 0.22, 12]} />
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
