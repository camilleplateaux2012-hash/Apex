/**
 * Scène 3D d'arrière-plan du Menu Principal (Three.js + React Three Fiber)
 * 
 * Éléments 3D :
 * - Cœur cybernétique holographique rotatif (Icosahedron wireframe)
 * - Anneaux quantiques en lévitation (Torus)
 * - Grille néon cyberpunk infinie au sol
 * - Particules de poussière de données lumineuses
 * - Éclairages volumétriques dynamiques Cyan & Magenta
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Particules flottantes ambiantes
function CyberDustParticles({ count = 250 }) {
  const points = useRef<THREE.Points>(null!);
  
  // Génération de positions de particules
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 25;
    positions[i * 3 + 1] = Math.random() * 12 - 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 25;
  }

  useFrame((_, delta) => {
    if (points.current) {
      points.current.rotation.y += delta * 0.05;
      points.current.rotation.x += delta * 0.02;
    }
  });

  return (
    <Points ref={points} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#00f0ff"
        size={0.08}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

// Cœur holographique central
function HolographicCore() {
  const coreRef = useRef<THREE.Mesh>(null!);
  const ring1Ref = useRef<THREE.Mesh>(null!);
  const ring2Ref = useRef<THREE.Mesh>(null!);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    if (coreRef.current) {
      coreRef.current.rotation.x = t * 0.3;
      coreRef.current.rotation.y = t * 0.5;
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = t * 0.4;
      ring1Ref.current.rotation.z = t * 0.2;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -t * 0.35;
      ring2Ref.current.rotation.z = t * 0.45;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.8} position={[2, 0.5, -2]}>
      {/* Noyau Icosaedre */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.3, 1]} />
        <meshStandardMaterial
          color="#00f0ff"
          wireframe
          emissive="#00f0ff"
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      {/* Sphère intérieure solide réactive */}
      <mesh>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshStandardMaterial
          color="#ff007f"
          emissive="#ff007f"
          emissiveIntensity={1.2}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>

      {/* Anneau quantique Cyan */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[2.0, 0.02, 16, 64]} />
        <meshBasicMaterial color="#00f0ff" wireframe />
      </mesh>

      {/* Anneau quantique Magenta */}
      <mesh ref={ring2Ref}>
        <torusGeometry args={[2.4, 0.02, 16, 64]} />
        <meshBasicMaterial color="#ff007f" wireframe />
      </mesh>
    </Float>
  );
}

// Grille de sol Cyberpunk
function CyberFloorGrid() {
  return (
    <group position={[0, -2.5, 0]}>
      <gridHelper
        args={[60, 40, '#00f0ff', '#1e293b']}
        position={[0, 0, 0]}
      />
      {/* Plan subtilement réfléchissant */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial
          color="#050811"
          roughness={0.4}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
}

export default function MainMenuScene() {
  return (
    <>
      <color attach="background" args={['#050811']} />
      <fog attach="fog" args={['#050811', 8, 28]} />

      {/* Éclairages cyberpunk */}
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 6, 4]} color="#00f0ff" intensity={4} distance={20} />
      <pointLight position={[-6, 3, -3]} color="#ff007f" intensity={3.5} distance={18} />
      <pointLight position={[0, -1, 3]} color="#ffaa00" intensity={1.5} distance={12} />

      {/* Objets 3D */}
      <HolographicCore />
      <CyberFloorGrid />
      <CyberDustParticles count={200} />
    </>
  );
}
