/**
 * Scène 3D : MAP 1 - "NEO-ROOFTOP DISTRICT" (Extérieur Cyberpunk)
 * 
 * Toit d'une mégastructure suspendu au-dessus de gratte-ciels néon.
 * Vue panoramique, héliport central surélevé, blocs de climatisation CVC,
 * antenne radar en rotation, barrières laser de sécurité et skyline cyberpunk.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MapDefinition, MapObstacle } from '../../types/maps.ts';

interface RooftopMapProps {
  mapData: MapDefinition;
}

export default function RooftopDistrictMap({ mapData }: RooftopMapProps) {
  const heliHoloRef = useRef<THREE.Group>(null);
  const trafficRef = useRef<THREE.Group>(null);

  // Rotation douce des éléments mécaniques et holographiques
  useFrame((_, delta) => {
    if (heliHoloRef.current) {
      heliHoloRef.current.rotation.y += delta * 0.25;
    }
    if (trafficRef.current) {
      trafficRef.current.rotation.y += delta * 0.05;
    }
  });

  // Génération de la Skyline Cyberpunk d'arrière-plan (buildings 3D)
  const skylineBuildings = useMemo(() => {
    const buildings: Array<{
      x: number;
      z: number;
      w: number;
      h: number;
      d: number;
      color: string;
      accent: string;
    }> = [];

    const accents = ['#00f0ff', '#ff007f', '#8b5cf6', '#00ffaa', '#d946ef', '#3b82f6'];
    const count = 35; // Plus dense pour plus de détails
    const radius = 70;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.1 - 0.05);
      const dist = radius + (Math.random() * 50 - 15);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const h = 45 + Math.random() * 95;
      const w = 14 + Math.random() * 22;
      const d = 14 + Math.random() * 22;
      const accent = accents[i % accents.length];
      buildings.push({ x, z, w, h, d, color: '#060a16', accent });
    }
    return buildings;
  }, []);

  return (
    <group>
      {/* 1. ÉCLAIRAGE PUISSANT & ULTRA-LUMINEUX DU ROOFTOP (Lumière ambiante renforcée) */}
      <ambientLight color="#93c5fd" intensity={4.5} />
      <hemisphereLight args={['#e0f2fe', '#0284c7', 4.0]} />
      <directionalLight
        position={mapData.lighting.dirLightPos}
        intensity={mapData.lighting.dirLightIntensity}
        color={mapData.lighting.dirLightColor}
      />
      <directionalLight
        position={[-25, 30, -25]}
        intensity={3.5}
        color="#bae6fd"
      />
      <directionalLight
        position={[25, 30, 25]}
        intensity={3.0}
        color="#38bdf8"
      />
      <directionalLight
        position={[0, 40, 0]}
        intensity={2.5}
        color="#ffffff"
      />
      
      {/* Projecteurs zénithaux de grande intensité */}
      <pointLight position={[0, 15, 0]} color="#ffffff" intensity={5.5} distance={55} />
      <pointLight position={[24, 10, 24]} color="#00f0ff" intensity={5.0} distance={50} />
      <pointLight position={[-24, 10, -24]} color="#38bdf8" intensity={5.0} distance={50} />
      <pointLight position={[-24, 10, 24]} color="#ff007f" intensity={5.0} distance={50} />
      <pointLight position={[24, 10, -24]} color="#00ffaa" intensity={5.0} distance={50} />
      
      {/* Lumière d'ambiance bleutée de la ville en contrebas */}
      <pointLight position={[0, -12, 0]} color="#00f0ff" intensity={6.0} distance={80} />

      {/* 2. SOL PRINCIPAL DU ROOFTOP (AVEC DETAILES INDUSTRIELS RECTANGULAIRES) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[mapData.bounds.maxX * 2 + 10, mapData.bounds.maxZ * 2 + 10]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.4}
          metalness={0.5}
        />
      </mesh>

      {/* Plaques métalliques décoratives du sol */}
      {[-20, 0, 20].map((x) =>
        [-20, 0, 20].map((z) => (
          <mesh key={`plate_${x}_${z}`} position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[12, 12]} />
            <meshStandardMaterial
              color="#1e293b"
              roughness={0.3}
              metalness={0.8}
              transparent
              opacity={0.85}
              wireframe
            />
          </mesh>
        ))
      )}

      {/* Grille au sol électroluminescente adaptée aux limites */}
      <gridHelper
        args={[mapData.bounds.maxX * 2, mapData.bounds.maxX / 2, '#00f0ff', '#334155']}
        position={[0, 0.02, 0]}
      />

      {/* 3. DÉCORATION THÉMATIQUE CENTRALE DE L'HÉLIPORT */}
      {mapData.captureZone && (
        <group position={[mapData.captureZone.position[0], 0.05, mapData.captureZone.position[2]]}>
          {/* Disque d'atterrissage surélevé avec logo néon */}
          <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[5.8, 6.0, 0.3, 32]} />
            <meshStandardMaterial color="#0b0f19" roughness={0.4} metalness={0.8} />
          </mesh>

          {/* Anneau lumineux néon de l'héliport */}
          <mesh position={[0, 0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[5.0, 5.4, 32]} />
            <meshBasicMaterial
              color="#00f0ff"
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Lettre "H" holographique géante et lumineuse */}
          <group position={[0, 0.33, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh position={[-1.4, 0, 0]}>
              <planeGeometry args={[0.5, 3.6]} />
              <meshBasicMaterial color="#00f0ff" />
            </mesh>
            <mesh position={[1.4, 0, 0]}>
              <planeGeometry args={[0.5, 3.6]} />
              <meshBasicMaterial color="#00f0ff" />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <planeGeometry args={[2.4, 0.5]} />
              <meshBasicMaterial color="#00f0ff" />
            </mesh>
          </group>

          {/* Balise holographique tournante */}
          <group ref={heliHoloRef} position={[0, 2.2, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[2.2, 2.4, 8]} />
              <meshBasicMaterial
                color="#00f0ff"
                transparent
                opacity={0.5}
                side={THREE.DoubleSide}
                wireframe
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
        </group>
      )}

      {/* 4. RENDU DE TOUS LES OBSTACLES SOLIDES ULTRA-DÉTAILLÉS */}
      {mapData.obstacles.map((obs) => (
        <SciFiObstacle key={obs.id} obstacle={obs} />
      ))}

      {/* 5. BARRIÈRES DE SÉCURITÉ LASER DU PÉRIMÈTRE */}
      {/* Nord */}
      <group position={[0, 0.8, mapData.bounds.minZ]}>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[mapData.bounds.maxX * 2, 0.1, 0.2]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[mapData.bounds.maxX * 2, 0.05, 0.1]} />
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.6} />
        </mesh>
      </group>
      {/* Sud */}
      <group position={[0, 0.8, mapData.bounds.maxZ]}>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[mapData.bounds.maxX * 2, 0.1, 0.2]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[mapData.bounds.maxX * 2, 0.05, 0.1]} />
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.6} />
        </mesh>
      </group>
      {/* Ouest */}
      <group position={[mapData.bounds.minX, 0.8, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[mapData.bounds.maxZ * 2, 0.1, 0.2]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.8} />
        </mesh>
      </group>
      {/* Est */}
      <group position={[mapData.bounds.maxX, 0.8, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[mapData.bounds.maxZ * 2, 0.1, 0.2]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.8} />
        </mesh>
      </group>

      {/* Poteaux de coin de garde-corps */}
      <mesh position={[mapData.bounds.minX, 1, mapData.bounds.minZ]} castShadow><boxGeometry args={[0.6, 2.2, 0.6]} /><meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.9} /></mesh>
      <mesh position={[mapData.bounds.maxX, 1, mapData.bounds.minZ]} castShadow><boxGeometry args={[0.6, 2.2, 0.6]} /><meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.9} /></mesh>
      <mesh position={[mapData.bounds.minX, 1, mapData.bounds.maxZ]} castShadow><boxGeometry args={[0.6, 2.2, 0.6]} /><meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.9} /></mesh>
      <mesh position={[mapData.bounds.maxX, 1, mapData.bounds.maxZ]} castShadow><boxGeometry args={[0.6, 2.2, 0.6]} /><meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.9} /></mesh>

      {/* 9. SKYLINE CYBERPUNK EN ARRIÈRE-PLAN (DÉTAILLÉE) */}
      <group>
        {skylineBuildings.map((b, idx) => (
          <group key={`skyline_${idx}`} position={[b.x, b.h / 2 - 30, b.z]}>
            {/* Corps du building */}
            <mesh>
              <boxGeometry args={[b.w, b.h, b.d]} />
              <meshStandardMaterial color={b.color} roughness={0.8} metalness={0.5} />
            </mesh>
            {/* Fenêtres LED lumineuses */}
            <mesh position={[0, 0, b.d / 2 + 0.1]}>
              <planeGeometry args={[b.w * 0.7, b.h * 0.7]} />
              <meshBasicMaterial color={b.accent} transparent opacity={0.15} wireframe />
            </mesh>
            {/* Liseré néon sur le sommet */}
            <mesh position={[0, b.h / 2 + 0.2, 0]}>
              <boxGeometry args={[b.w + 0.6, 0.8, b.d + 0.6]} />
              <meshBasicMaterial color={b.accent} transparent opacity={0.75} />
            </mesh>
            {/* Antenne avec balise lumineuse */}
            <mesh position={[0, b.h / 2 + 5, 0]}>
              <cylinderGeometry args={[0.1, 0.25, 10, 6]} />
              <meshBasicMaterial color={b.accent} />
            </mesh>
            <pointLight position={[0, b.h / 2 + 10, 0]} color={b.accent} intensity={1.5} distance={15} />
          </group>
        ))}
      </group>
    </group>
  );
}

/**
 * Composant d'Obstacle Modulaire Tactique Ultra-Détaillé (SciFiObstacle)
 */
function SciFiObstacle({ obstacle }: { obstacle: MapObstacle }) {
  const { size, position, color, type, id } = obstacle;
  const width = size[0];
  const height = size[1];
  const depth = size[2];

  const subRadarRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Group>(null);
  const ring2Ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (subRadarRef.current) {
      subRadarRef.current.rotation.y += 0.035;
    }
    if (coreRef.current) {
      const p = 1 + Math.sin(time * 5) * 0.08;
      coreRef.current.scale.set(p, p, p);
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.y = time * 0.7;
      ring1Ref.current.rotation.x = Math.sin(time * 1.5) * 0.25;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -time * 0.55;
      ring2Ref.current.rotation.z = Math.cos(time * 1.2) * 0.25;
    }
  });

  const neonAccent = color || '#00f0ff';

  switch (type) {
    case 'reactor':
      return (
        <group position={position}>
          {/* Socles de structure supérieure/inférieure */}
          <mesh castShadow receiveShadow position={[0, -height / 2 + 0.3, 0]}>
            <cylinderGeometry args={[width * 0.45, width * 0.5, 0.6, 6]} />
            <meshStandardMaterial color="#0b0f19" roughness={0.3} metalness={0.9} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, height / 2 - 0.3, 0]}>
            <cylinderGeometry args={[width * 0.45, width * 0.4, 0.6, 6]} />
            <meshStandardMaterial color="#0b0f19" roughness={0.3} metalness={0.9} />
          </mesh>

          {/* Tube de confinement en verre transparent */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[width * 0.28, width * 0.28, height - 1.2, 16]} />
            <meshStandardMaterial color="#030712" roughness={0.1} metalness={0.95} transparent opacity={0.35} />
          </mesh>

          {/* Noyau plasma central luminescent */}
          <mesh ref={coreRef} position={[0, 0, 0]}>
            <cylinderGeometry args={[width * 0.16, width * 0.16, height - 1.3, 16]} />
            <meshBasicMaterial color={neonAccent} transparent opacity={0.95} blending={THREE.AdditiveBlending} />
          </mesh>
          <pointLight color={neonAccent} intensity={4.5} distance={18} />

          {/* Anneaux stabilisateurs rotatifs */}
          <group ref={ring1Ref}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[width * 0.36, 0.08, 8, 32]} />
              <meshBasicMaterial color={neonAccent} />
            </mesh>
          </group>
          <group ref={ring2Ref}>
            <mesh rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[width * 0.42, 0.05, 8, 32]} />
              <meshBasicMaterial color="#ff007f" />
            </mesh>
          </group>

          {/* Colonnes de support industrielles d'armature */}
          {[-1, 1].map((x) =>
            [-1, 1].map((z) => (
              <mesh
                key={`pillar_${x}_${z}`}
                position={[x * width * 0.35, 0, z * depth * 0.35]}
                castShadow
              >
                <cylinderGeometry args={[0.08, 0.08, height - 1.2, 8]} />
                <meshStandardMaterial color="#334155" roughness={0.2} metalness={0.9} />
              </mesh>
            ))
          )}
        </group>
      );

    case 'server':
      return (
        <group position={position}>
          {/* Châssis de l'armoire */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color="#020617" roughness={0.25} metalness={0.95} />
          </mesh>

          {/* Bandes lumineuses néon latérales */}
          {[-1, 1].map((x) => (
            <mesh key={`trim_${x}`} position={[x * (width / 2 + 0.015), 0, depth / 2 + 0.015]}>
              <planeGeometry args={[0.05, height - 0.2]} />
              <meshBasicMaterial color={neonAccent} />
            </mesh>
          ))}

          {/* Tiroirs de serveurs individuels & LEDs d'activité clignotantes */}
          {Array.from({ length: 6 }).map((_, index) => {
            const yOffset = -height / 2 + 0.3 + (index * (height - 0.6)) / 5;
            const ledOn1 = Math.sin(Date.now() * 0.0035 + index) > -0.25;
            const ledOn2 = Math.cos(Date.now() * 0.0045 + index) > -0.15;
            const ledOn3 = Math.sin(Date.now() * 0.002 + index * 2) > 0;

            return (
              <group key={`shelf_${index}`} position={[0, yOffset, depth / 2 + 0.02]}>
                {/* Cache avant en métal brossé */}
                <mesh>
                  <planeGeometry args={[width - 0.25, 0.15]} />
                  <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
                </mesh>
                {/* 3 Blinking LEDs */}
                <mesh position={[-width / 3.2, 0, 0.005]}>
                  <boxGeometry args={[0.05, 0.05, 0.02]} />
                  <meshBasicMaterial color={ledOn1 ? '#10b981' : '#064e3b'} />
                </mesh>
                <mesh position={[-width / 3.2 + 0.12, 0, 0.005]}>
                  <boxGeometry args={[0.05, 0.05, 0.02]} />
                  <meshBasicMaterial color={ledOn2 ? '#f59e0b' : '#78350f'} />
                </mesh>
                <mesh position={[-width / 3.2 + 0.24, 0, 0.005]}>
                  <boxGeometry args={[0.05, 0.05, 0.02]} />
                  <meshBasicMaterial color={ledOn3 ? '#06b6d4' : '#164e63'} />
                </mesh>
                {/* Échancrure de port de bus */}
                <mesh position={[width / 3.5, 0, 0.005]}>
                  <boxGeometry args={[0.08, 0.02, 0.02]} />
                  <meshBasicMaterial color={neonAccent} />
                </mesh>
              </group>
            );
          })}

          {/* Ventilateurs géants sur le dessus de la baie */}
          <group position={[0, height / 2 + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh>
              <planeGeometry args={[width * 0.85, depth * 0.85]} />
              <meshStandardMaterial color="#0f172a" roughness={0.5} />
            </mesh>
            {[-1, 1].map((xOffset) => (
              <group key={`fan_${xOffset}`} position={[xOffset * width * 0.22, 0, 0.005]}>
                <mesh>
                  <ringGeometry args={[width * 0.12, width * 0.15, 16]} />
                  <meshBasicMaterial color={neonAccent} />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      );

    case 'pillar':
      return (
        <group position={position}>
          {/* Piédestal massif blindé */}
          <mesh position={[0, -height / 2 + 0.3, 0]} castShadow>
            <cylinderGeometry args={[width * 0.54, width * 0.58, 0.6, 8]} />
            <meshStandardMaterial color="#0b0f19" roughness={0.3} metalness={0.9} />
          </mesh>

          {/* Corps de la colonne octogonale */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[width * 0.46, width * 0.46, height - 1.2, 8]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.8} />
          </mesh>

          {/* Tête de colonne massive */}
          <mesh position={[0, height / 2 - 0.3, 0]} castShadow>
            <cylinderGeometry args={[width * 0.52, width * 0.5, 0.6, 8]} />
            <meshStandardMaterial color="#0b0f19" roughness={0.3} metalness={0.9} />
          </mesh>

          {/* 4 Tubes Néon verticaux très lumineux */}
          {Array.from({ length: 4 }).map((_, i) => {
            const angle = (i * Math.PI) / 2;
            const r = width * 0.475;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            return (
              <mesh key={`neon_rib_${i}`} position={[x, 0, z]} rotation={[0, -angle, 0]}>
                <boxGeometry args={[0.07, height - 1.4, 0.07]} />
                <meshBasicMaterial color={neonAccent} />
              </mesh>
            );
          })}

          {/* Si c'est une antenne satellite de communication comm */}
          {id.includes('comm') && (
            <group position={[0, height / 2, 0]}>
              <mesh position={[0, 2.2, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.13, 4.4, 8]} />
                <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.1} />
              </mesh>
              {/* Double anneau gyroscopique satellite */}
              <group ref={subRadarRef} position={[0, 3.8, 0]}>
                <mesh rotation={[0.4, 0, 0]}>
                  <torusGeometry args={[0.6, 0.05, 8, 20]} />
                  <meshBasicMaterial color={neonAccent} />
                </mesh>
                <mesh rotation={[-0.4, 0, 0]}>
                  <torusGeometry args={[0.42, 0.04, 8, 16]} />
                  <meshBasicMaterial color="#ff007f" />
                </mesh>
              </group>
              <mesh position={[0, 4.5, 0]}>
                <sphereGeometry args={[0.18, 8, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <pointLight position={[0, 4.5, 0]} color="#ffffff" intensity={3.0} distance={12} />
            </group>
          )}
        </group>
      );

    case 'crate':
      return (
        <group position={position}>
          {/* Coffrage principal de la caisse */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color="#0f172a" roughness={0.35} metalness={0.8} />
          </mesh>

          {/* Panneaux latéraux de blindage et bandes d'énergie */}
          {[-1, 1].map((zSign) => (
            <group key={`side_z_${zSign}`} position={[0, 0, zSign * (depth / 2 + 0.015)]}>
              <mesh>
                <planeGeometry args={[width - 0.25, height - 0.25]} />
                <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.4} />
              </mesh>
              {/* Rainure laser centrale */}
              <mesh position={[0, 0, 0.006]}>
                <planeGeometry args={[width * 0.72, 0.04]} />
                <meshBasicMaterial color={neonAccent} />
              </mesh>
              <mesh position={[0, 0, 0.006]}>
                <planeGeometry args={[0.04, height * 0.72]} />
                <meshBasicMaterial color={neonAccent} />
              </mesh>
            </group>
          ))}
          {[-1, 1].map((xSign) => (
            <group key={`side_x_${xSign}`} position={[xSign * (width / 2 + 0.015), 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <mesh>
                <planeGeometry args={[depth - 0.25, height - 0.25]} />
                <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.4} />
              </mesh>
              <mesh position={[0, 0, 0.006]}>
                <planeGeometry args={[depth * 0.72, 0.04]} />
                <meshBasicMaterial color={neonAccent} />
              </mesh>
            </group>
          ))}

          {/* Butées d'angle de protection métallique (Heavy Corner Bumpers) */}
          {[-1, 1].map((x) =>
            [-1, 1].map((y) =>
              [-1, 1].map((z) => (
                <mesh
                  key={`corner_${x}_${y}_${z}`}
                  position={[
                    x * (width / 2 - 0.06),
                    y * (height / 2 - 0.06),
                    z * (depth / 2 - 0.06),
                  ]}
                >
                  <boxGeometry args={[0.24, 0.24, 0.24]} />
                  <meshStandardMaterial color="#475569" roughness={0.1} metalness={0.95} />
                </mesh>
              ))
            )
          )}
        </group>
      );

    case 'barricade':
      return (
        <group position={position}>
          {/* Pied en alliage lourd */}
          <mesh castShadow receiveShadow position={[0, -height / 2 + 0.3, 0]}>
            <boxGeometry args={[width, 0.6, depth]} />
            <meshStandardMaterial color="#0b0f19" roughness={0.35} metalness={0.95} />
          </mesh>

          {/* Décoration de lignes jaunes/noires d'avertissement tactique */}
          {[-1, 1].map((zSign) => (
            <mesh
              key={`hazard_${zSign}`}
              position={[0, -height / 2 + 0.3, zSign * (depth / 2 + 0.02)]}
            >
              <planeGeometry args={[width - 0.15, 0.35]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.5} emissive="#f59e0b" emissiveIntensity={0.2} />
            </mesh>
          ))}

          {/* Structure métallique centrale */}
          <mesh castShadow position={[0, 0.15, 0]}>
            <boxGeometry args={[width - 0.2, height - 0.7, depth * 0.65]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.4} />
          </mesh>

          {/* Écran holographique de protection d'énergie */}
          <mesh position={[0, height / 3.8, 0]}>
            <boxGeometry args={[width - 0.4, height / 2.2, 0.06]} />
            <meshBasicMaterial
              color={neonAccent}
              transparent
              opacity={0.38}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Texture grille filaire active de l'écran */}
          <mesh position={[0, height / 3.8, 0.015]}>
            <planeGeometry args={[width - 0.4, height / 2.2]} />
            <meshBasicMaterial
              color={neonAccent}
              transparent
              opacity={0.65}
              wireframe
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      );

    case 'platform':
      return (
        <group position={position}>
          {/* Dalle solide renforcée de la plateforme */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color="#090d16" roughness={0.4} metalness={0.9} />
          </mesh>

          {/* Bords de rive lumineux très voyants */}
          <mesh position={[0, height / 2 + 0.015, 0]}>
            <boxGeometry args={[width - 0.08, 0.05, depth - 0.08]} />
            <meshBasicMaterial color={neonAccent} transparent opacity={0.85} />
          </mesh>

          {/* Réflecteur d'éclairage néon sous la dalle */}
          <mesh position={[0, -height / 2 - 0.02, 0]}>
            <planeGeometry args={[width * 0.82, depth * 0.82]} />
            <meshBasicMaterial color={neonAccent} transparent opacity={0.65} />
          </mesh>

          {/* Garde-corps néon de sécurité sur le côté */}
          {[-1, 1].map((xSign) => (
            <group key={`rail_${xSign}`} position={[xSign * (width / 2 - 0.15), height / 2 + 0.55, 0]}>
              {/* Poteau en acier */}
              <mesh castShadow>
                <cylinderGeometry args={[0.045, 0.045, 1.1, 6]} />
                <meshStandardMaterial color="#334155" metalness={0.95} />
              </mesh>
              {/* Panneau d'avertissement holographique */}
              <mesh position={[-xSign * 0.06, 0.12, 0]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[depth - 0.5, 0.45]} />
                <meshBasicMaterial color={neonAccent} transparent opacity={0.16} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[-xSign * 0.06, 0.12, 0]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[depth - 0.5, 0.45]} />
                <meshBasicMaterial color={neonAccent} transparent opacity={0.32} wireframe side={THREE.DoubleSide} />
              </mesh>
            </group>
          ))}

          {/* Spéciale antenne radar si platform inclut radar */}
          {id.includes('radar') && (
            <group ref={subRadarRef} position={[0, height / 2 + 0.85, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[1.7, 0.25, 0.6, 16]} />
                <meshStandardMaterial color="#1e293b" metalness={0.95} roughness={0.15} />
              </mesh>
              <mesh position={[0, 0, 0.4]} rotation={[0.4, 0, 0]}>
                <cylinderGeometry args={[0.09, 0.09, 1.4, 8]} />
                <meshBasicMaterial color={neonAccent} />
              </mesh>
              {/* Émetteur à dôme de pulsation */}
              <mesh position={[0, 0.72, 0.35]}>
                <sphereGeometry args={[0.22, 8, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <pointLight position={[0, 0.72, 0.35]} color="#ffffff" intensity={3.5} distance={14} />
            </group>
          )}
        </group>
      );

    case 'wall':
    default:
      return (
        <group position={position}>
          {/* Bloc de mur blindé standard */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color="#0b0f19" roughness={0.5} metalness={0.5} />
          </mesh>

          {/* Rainures laser de surface pour diviser le panneau de béton */}
          <mesh position={[0, 0, depth / 2 + 0.016]}>
            <planeGeometry args={[width - 0.5, 0.04]} />
            <meshBasicMaterial color={neonAccent} transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, 0, depth / 2 + 0.016]}>
            <planeGeometry args={[0.04, height - 0.5]} />
            <meshBasicMaterial color={neonAccent} transparent opacity={0.8} />
          </mesh>

          <mesh position={[0, 0, -depth / 2 - 0.016]}>
            <planeGeometry args={[width - 0.5, 0.04]} />
            <meshBasicMaterial color={neonAccent} transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, 0, -depth / 2 - 0.016]}>
            <planeGeometry args={[0.04, height - 0.5]} />
            <meshBasicMaterial color={neonAccent} transparent opacity={0.8} />
          </mesh>

          {/* Bande néon d'éclairage supérieur du mur */}
          <mesh position={[0, height / 2 + 0.01, 0]}>
            <boxGeometry args={[width - 0.1, 0.05, depth - 0.1]} />
            <meshBasicMaterial color={neonAccent} />
          </mesh>
        </group>
      );
  }
}
