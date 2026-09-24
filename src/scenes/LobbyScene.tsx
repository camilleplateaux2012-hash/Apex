/**
 * Scène 3D du Salon Multijoueur (Lobby Staging Area)
 * 
 * Espace 3D prêt à accueillir les podiums des coéquipiers,
 * le modèle de l'avatar et de l'arme sélectionnée.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Podium({ position, active = false }: { position: [number, number, number]; active?: boolean }) {
  const glowRing = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (glowRing.current) {
      const t = state.clock.getElapsedTime();
      glowRing.current.rotation.z = t * 0.5;
    }
  });

  return (
    <group position={position}>
      {/* Base du podium */}
      <mesh position={[0, -1.8, 0]}>
        <cylinderGeometry args={[1.2, 1.4, 0.4, 32]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Anneau lumineux néon */}
      <mesh ref={glowRing} position={[0, -1.58, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.0, 1.15, 32]} />
        <meshBasicMaterial color={active ? "#00f0ff" : "#ff007f"} />
      </mesh>

      {/* Hologramme placeholder du joueur / opérateur */}
      <mesh position={[0, -0.4, 0]}>
        <capsuleGeometry args={[0.35, 1.2, 8, 16]} />
        <meshStandardMaterial
          color={active ? "#00f0ff" : "#64748b"}
          wireframe
          emissive={active ? "#00f0ff" : "#334155"}
          emissiveIntensity={active ? 0.6 : 0.2}
        />
      </mesh>
    </group>
  );
}

export default function LobbyScene() {
  return (
    <>
      <color attach="background" args={['#070b19']} />
      <fog attach="fog" args={['#070b19', 10, 25]} />

      <ambientLight intensity={0.5} />
      <pointLight position={[0, 4, 2]} color="#00f0ff" intensity={4} distance={15} />
      <pointLight position={[-4, 2, -2]} color="#ff007f" intensity={3} distance={15} />

      {/* Sol quadrillé */}
      <gridHelper args={[40, 30, '#00f0ff', '#1e293b']} position={[0, -2, 0]} />

      {/* Podiums des opérateurs (3 emplacements prêts) */}
      <Podium position={[-2.8, 0, -1]} active={false} />
      <Podium position={[0, 0, 0]} active={true} />
      <Podium position={[2.8, 0, -1]} active={false} />
    </>
  );
}
