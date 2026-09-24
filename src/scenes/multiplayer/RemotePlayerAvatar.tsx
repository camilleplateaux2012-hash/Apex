/**
 * Avatar 3D Cyberpunk pour les Joueurs Distants (Remote Player Model)
 * 
 * Affiche le modèle 3D animé et lissé d'un adversaire / coéquipier :
 * - Châssis de combat cybernétique avec plastron et visière néon
 * - Interpolation spatiale fluide (Lerp / Slerp) pour éliminer les saccades
 * - Marqueur d'identification (Nom, Barre de vie / bouclier) orienté face caméra
 * - Faisceau et étincelles lors des tirs de l'adversaire
 */

import React, { useRef, useEffect, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { NetworkPlayerState } from '../../types/network.ts';

interface RemotePlayerAvatarProps {
  player: NetworkPlayerState;
  isSpeaking?: boolean;
}

function RemotePlayerAvatar({ player, isSpeaking = false }: RemotePlayerAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const nameplateRef = useRef<THREE.Group>(null);

  // Normalisation de l'altitude au sol : si la coordonnée reçue est l'altitude de tête/caméra (~1.6m),
  // on soustrait 1.6 pour poser les pieds au sol (y=0). Si elle est déjà au sol, on la garde.
  const footY = player.position[1] > 0.8 ? player.position[1] - 1.6 : player.position[1];

  const currentPos = useRef(new THREE.Vector3(player.position[0], footY, player.position[2]));
  const targetPos = useRef(new THREE.Vector3(player.position[0], footY, player.position[2]));
  const currentYaw = useRef(player.rotation[1] || 0);
  const deathTimer = useRef<number>(0);

  // Journalisation diagnostique pour le suivi de l'instanciation des bots et joueurs
  useEffect(() => {
    console.log(
      `[RemotePlayerAvatar] ✅ Avatar 3D instancié : "${player.callsign}" (ActorNr: ${player.actorNr}) | isBot: ${!!player.isBot} | Pos: [${player.position.map(n => n.toFixed(1)).join(', ')}]`
    );
  }, []);

  // Mise à jour de la cible réseau
  targetPos.current.set(player.position[0], footY, player.position[2]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (!player.isAlive) {
      deathTimer.current += delta;
      
      if (deathTimer.current > 3.0) {
        // Cacher complètement l'avatar après 3 secondes (durée de mort standard)
        groupRef.current.position.y = -100;
        groupRef.current.scale.setScalar(0);
        return;
      }

      // ANIMATION DE MORT (Trépas Cyberpunk)
      // 1. Chute progressive vers l'arrière (rotation d'inclinaison X)
      const tiltFactor = Math.min(1.0, deathTimer.current / 0.6); // Chute sur 0.6s
      groupRef.current.rotation.x = -tiltFactor * Math.PI / 2.15; // Dos au sol

      // 2. Descente au ras du sol
      const initialY = footY;
      const targetY = initialY - 0.7 * tiltFactor;
      groupRef.current.position.y = targetY;

      // 3. Dissolution et rétrécissement progressif (après 1.0s de mort)
      if (deathTimer.current > 1.0) {
        const dissolveFactor = Math.min(1.0, (deathTimer.current - 1.0) / 1.5); // Dissolution sur 1.5s
        const scale = 1.0 - dissolveFactor;
        groupRef.current.scale.setScalar(scale);
        groupRef.current.position.y = targetY - dissolveFactor * 0.8;
      }
      return;
    }

    // Réinitialisation des états physiques si le joueur est réapparu
    deathTimer.current = 0;
    groupRef.current.scale.setScalar(1);
    groupRef.current.rotation.x = 0;
    groupRef.current.rotation.z = 0;

    // 1. Interpolation fluide de la position (Lerp dynamique basé sur le delta)
    currentPos.current.lerp(targetPos.current, Math.min(1.0, delta * 16));
    groupRef.current.position.copy(currentPos.current);

    // 2. Interpolation fluide de la rotation Yaw
    const targetYaw = player.rotation[1] || 0;
    let diffYaw = targetYaw - currentYaw.current;
    while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
    while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
    currentYaw.current += diffYaw * Math.min(1.0, delta * 16);
    groupRef.current.rotation.y = currentYaw.current;

    // 3. Orientation du Nameplate face à la caméra du joueur local
    if (nameplateRef.current) {
      nameplateRef.current.quaternion.copy(state.camera.quaternion);
    }
  });

  const hpRatio = Math.max(0, player.health / player.maxHealth);
  const shieldRatio = Math.max(0, player.shield / player.maxShield);
  
  // Couleur néon d'équipe : cyan pour BLUE, magenta pour RED/SOLO
  let accentColor = player.team === 'BLUE' ? '#00f0ff' : '#ff0055';
  if (!player.isAlive) {
    const flash = Math.floor(Date.now() / 60) % 2 === 0;
    accentColor = flash ? '#ff0033' : '#040711';
  }

  return (
    <group ref={groupRef} position={[player.position[0], footY, player.position[2]]}>
      {/* 1. Modèle 3D Ultra-Stylisé Cyberpunk (Pieds directement alignés au sol y=0) */}
      <group position={[0, 0, 0]}>
        
        {/* Anneau Holographique au Sol (Base de Combat) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.45, 0.5, 32]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.1, 0.15, 4]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>

        {/* Jambes de combat cybernétiques */}
        {/* Jambe Gauche */}
        <group position={[-0.2, 0.45, 0]}>
          {/* Cuisse */}
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.07, 0.06, 0.4, 8]} />
            <meshStandardMaterial color="#0b0f19" roughness={0.3} metalness={0.9} />
          </mesh>
          {/* Genouillère Néon */}
          <mesh position={[0, 0, 0.06]}>
            <boxGeometry args={[0.08, 0.08, 0.04]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>
          {/* Mollet */}
          <mesh position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.06, 0.05, 0.4, 8]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.8} />
          </mesh>
        </group>

        {/* Jambe Droite */}
        <group position={[0.2, 0.45, 0]}>
          {/* Cuisse */}
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.07, 0.06, 0.4, 8]} />
            <meshStandardMaterial color="#0b0f19" roughness={0.3} metalness={0.9} />
          </mesh>
          {/* Genouillère Néon */}
          <mesh position={[0, 0, 0.06]}>
            <boxGeometry args={[0.08, 0.08, 0.04]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>
          {/* Mollet */}
          <mesh position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.06, 0.05, 0.4, 8]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.8} />
          </mesh>
        </group>

        {/* Torse & Exo-Armure Multi-plaques */}
        <group position={[0, 1.25, 0]}>
          {/* Chassis Principal */}
          <mesh>
            <boxGeometry args={[0.55, 0.72, 0.32]} />
            <meshStandardMaterial 
              color="#0f172a" 
              roughness={0.2} 
              metalness={0.9} 
            />
          </mesh>
          {/* Plastron Blindé */}
          <mesh position={[0, 0.05, 0.05]}>
            <boxGeometry args={[0.48, 0.55, 0.28]} />
            <meshStandardMaterial 
              color="#1e1b4b" 
              emissive={accentColor}
              emissiveIntensity={0.2}
              roughness={0.3} 
              metalness={0.8} 
            />
          </mesh>

          {/* Pauldrons d'épaule robustes (Épaulières Néon) */}
          {/* Épaule Gauche */}
          <mesh position={[-0.34, 0.28, 0]} rotation={[0, 0, Math.PI / 12]}>
            <boxGeometry args={[0.16, 0.18, 0.28]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[-0.36, 0.28, 0.08]} rotation={[0, 0, Math.PI / 12]}>
            <boxGeometry args={[0.04, 0.1, 0.1]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>

          {/* Épaule Droite */}
          <mesh position={[0.34, 0.28, 0]} rotation={[0, 0, -Math.PI / 12]}>
            <boxGeometry args={[0.16, 0.18, 0.28]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0.36, 0.28, 0.08]} rotation={[0, 0, -Math.PI / 12]}>
            <boxGeometry args={[0.04, 0.1, 0.1]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>

          {/* Cœur Énergétique Pulsant (Reacteur de combat) */}
          <mesh position={[0, 0.12, 0.20]} rotation={[0, 0, Math.PI / 4]}>
            <octahedronGeometry args={[0.1, 0]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>

          {/* Bulle de Bouclier Énergétique Active */}
          {shieldRatio > 0 && (
            <mesh>
              <sphereGeometry args={[0.75, 16, 16]} />
              <meshBasicMaterial 
                color="#00d8ff" 
                transparent 
                opacity={0.06 * shieldRatio} 
              />
            </mesh>
          )}
        </group>

        {/* Tête & Casque Cyber de Combat */}
        <group position={[0, 1.85, 0]}>
          <mesh>
            <boxGeometry args={[0.3, 0.32, 0.3]} />
            <meshStandardMaterial color="#020617" roughness={0.15} metalness={0.95} />
          </mesh>
          {/* Antenne Tactique d'écoute */}
          <mesh position={[-0.16, 0.1, -0.05]} rotation={[0, 0, Math.PI / 6]}>
            <cylinderGeometry args={[0.015, 0.01, 0.25, 4]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>
          <mesh position={[-0.22, 0.22, -0.05]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>

          {/* Visière Cyber en "V" lumineuse */}
          <mesh position={[0, 0.04, 0.16]}>
            <boxGeometry args={[0.24, 0.07, 0.02]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>
          <mesh position={[0, -0.01, 0.16]}>
            <boxGeometry args={[0.12, 0.05, 0.02]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>
        </group>

        {/* Bras Droit & Arme laser tenue en main */}
        <group position={[0.42, 1.25, 0.18]}>
          <mesh rotation={[Math.PI / 4, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.05, 0.55, 8]} />
            <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.8} />
          </mesh>
          {/* Fusil d'assaut Laser */}
          <group position={[0.08, 0.2, -0.15]} rotation={[-Math.PI / 12, 0, 0]}>
            <mesh>
              <boxGeometry args={[0.1, 0.14, 0.65]} />
              <meshStandardMaterial color="#090d16" roughness={0.3} metalness={0.9} />
            </mesh>
            {/* Viseur Holographique */}
            <mesh position={[0, 0.1, 0.05]}>
              <boxGeometry args={[0.04, 0.06, 0.1]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            <mesh position={[0, 0.12, -0.02]}>
              <planeGeometry args={[0.04, 0.04]} />
              <meshBasicMaterial color={accentColor} side={THREE.DoubleSide} />
            </mesh>
            {/* Canon d'arme néon */}
            <mesh position={[0, 0, -0.36]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.1, 8]} />
              <meshBasicMaterial color={accentColor} />
            </mesh>
          </group>
        </group>

        {/* Bulle / Sphère holographique de bouclier d'immunité de réapparition (Lisse sans wireframe) */}
        {player.isImmune && (
          <group position={[0, 1.1, 0]}>
            <mesh>
              <sphereGeometry args={[1.15, 20, 20]} />
              <meshBasicMaterial
                color={accentColor}
                transparent
                opacity={0.35}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        )}

        {/* Drone de Soutien Tactique Volant au-dessus de l'épaule gauche */}
        <group position={[-0.45, 2.15, -0.2]}>
          {/* Coque du Drone */}
          <mesh>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Anneau de Réacteur Lumineux */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
            <ringGeometry args={[0.07, 0.09, 8]} />
            <meshBasicMaterial color={player.isBot ? '#a855f7' : accentColor} side={THREE.DoubleSide} />
          </mesh>
          <pointLight color={player.isBot ? '#a855f7' : accentColor} intensity={0.8} distance={1.5} position={[0, -0.05, 0]} />
        </group>

        {/* Éclairage dynamique diffusé autour du modèle */}
        <pointLight color={accentColor} intensity={1.5} distance={6} position={[0, 1.2, 0]} />
      </group>

      {/* 2. Marqueur Billboard au-dessus du joueur (Nom + HP) */}
      {player.isAlive && (
        <group ref={nameplateRef} position={[0, 2.2, 0]}>
          {/* Fond du badge */}
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[1.4, 0.32]} />
            <meshBasicMaterial color="#030712" transparent opacity={0.85} />
          </mesh>
          {/* Bordure néon */}
          <mesh position={[0, 0, 0.005]}>
            <planeGeometry args={[1.44, 0.36]} />
            <meshBasicMaterial color={accentColor} transparent opacity={0.3} />
          </mesh>
  
          {/* Jauge de Bouclier */}
          <mesh position={[(shieldRatio - 1) * 0.6, 0.06, 0.01]}>
            <planeGeometry args={[shieldRatio * 1.2, 0.05]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
  
          {/* Jauge de Vie (HP) */}
          <mesh position={[(hpRatio - 1) * 0.6, -0.04, 0.01]}>
            <planeGeometry args={[hpRatio * 1.2, 0.07]} />
            <meshBasicMaterial color={hpRatio > 0.3 ? accentColor : '#ef4444'} />
          </mesh>
  
          {/* Indicateur de Chat Vocal Actif (Ondes Sonores Holographiques) */}
          {isSpeaking && (
            <group position={[0, 0.28, 0]}>
              <mesh position={[-0.2, 0, 0]}>
                <boxGeometry args={[0.06, 0.22, 0.02]} />
                <meshBasicMaterial color="#00f0ff" />
              </mesh>
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.06, 0.35, 0.02]} />
                <meshBasicMaterial color="#00f0ff" />
              </mesh>
              <mesh position={[0.2, 0, 0]}>
                <boxGeometry args={[0.06, 0.22, 0.02]} />
                <meshBasicMaterial color="#00f0ff" />
              </mesh>
            </group>
          )}
        </group>
      )}
    </group>
  );
}

export default memo(RemotePlayerAvatar);
