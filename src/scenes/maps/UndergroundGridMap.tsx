/**
 * Scène 3D : MAP 2 - "UNDERGROUND GRID // SECTOR 0" (Intérieur Cyberpunk)
 * 
 * Complexe souterrain bunker abritant un réacteur quantique et des fermes de serveurs.
 * Ambiance confinée, couloirs sombres, réacteur plasma central avec anneaux rotatifs,
 * racks de serveurs massifs avec LEDs d'activité et conduits énergétiques au plafond.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MapDefinition, MapObstacle } from '../../types/maps.ts';

interface UndergroundMapProps {
  mapData: MapDefinition;
}

export default function UndergroundGridMap({ mapData }: UndergroundMapProps) {
  return (
    <group>
      {/* 1. ÉCLAIRAGE PUISSANT, LUMINEUX & ENVOÛTANT DU BUNKER */}
      <ambientLight color={mapData.lighting.ambientColor} intensity={mapData.lighting.ambientIntensity} />
      <hemisphereLight args={['#f5d0fe', '#a5f3fc', 1.8]} />
      <directionalLight
        position={mapData.lighting.dirLightPos}
        intensity={mapData.lighting.dirLightIntensity}
        color={mapData.lighting.dirLightColor}
      />
      <directionalLight
        position={[0, 15, -15]}
        intensity={2.5}
        color="#ffffff"
      />
      {/* Lumière centrale puissante émise par le réacteur plasma */}
      <pointLight position={[0, 4.0, 0]} color="#ff007f" intensity={6.0} distance={45} />
      <pointLight position={[0, 7.0, 0]} color="#ffffff" intensity={4.5} distance={45} />
      
      {/* Projecteurs latéraux de serveurs et couloirs */}
      <pointLight position={[-12, 5.0, -12]} color="#10b981" intensity={5.0} distance={40} />
      <pointLight position={[12, 5.0, -12]} color="#10b981" intensity={5.0} distance={40} />
      <pointLight position={[-12, 5.0, 12]} color="#38bdf8" intensity={5.0} distance={40} />
      <pointLight position={[12, 5.0, 12]} color="#38bdf8" intensity={5.0} distance={40} />

      {/* 2. SOL MÉTALLIQUE RENFORCÉ AVEC BANDES ÉLECTROLEUMINESCENTES */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[mapData.bounds.maxX * 2 + 10, mapData.bounds.maxZ * 2 + 10]} />
        <meshStandardMaterial
          color="#151122"
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>

      {/* Plaques métalliques gravées décoratives */}
      {[-25, -10, 10, 25].map((x) =>
        [-25, -10, 10, 25].map((z) => (
          <mesh key={`p_plate_${x}_${z}`} position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[8, 8]} />
            <meshStandardMaterial
              color="#ff007f"
              roughness={0.3}
              metalness={0.9}
              transparent
              opacity={0.12}
              wireframe
            />
          </mesh>
        ))
      )}

      {/* Grille au sol style matrice de données adaptée aux limites */}
      <gridHelper
        args={[mapData.bounds.maxX * 2, mapData.bounds.maxX / 2, '#ff007f', '#065f46']}
        position={[0, 0.02, 0]}
      />

      {/* 3. PLAFOND INDUSTRIEL DU BUNKER AVEC POUTRES & RAILS DE CÂBLES */}
      <group position={[0, mapData.bounds.ceilingY || 8.0, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[mapData.bounds.maxX * 2 + 10, mapData.bounds.maxZ * 2 + 10]} />
          <meshStandardMaterial color="#050711" roughness={0.85} />
        </mesh>
        {/* Poutres métalliques robustes */}
        {[-36, -24, -12, 0, 12, 24, 36].map((x) => (
          <mesh key={`beam_x_${x}`} position={[x, -0.4, 0]}>
            <boxGeometry args={[0.6, 0.8, mapData.bounds.maxZ * 2]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
        {/* Conduits de plasma néon au plafond */}
        <mesh position={[0, -0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, mapData.bounds.maxX * 2, 8]} />
          <meshBasicMaterial color="#ff007f" transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, -0.8, -20]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, mapData.bounds.maxX * 2, 8]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, -0.8, 20]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, mapData.bounds.maxX * 2, 8]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.9} />
        </mesh>

        {/* Éclairages ponctuels néon intégrés au plafond (augmentant la luminosité intérieure) */}
        {[-30, -15, 0, 15, 30].map((cx) =>
          [-30, -15, 0, 15, 30].map((cz) => (
            <group key={`ceiling_neon_${cx}_${cz}`} position={[cx, -0.2, cz]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[4.0, 0.6]} />
                <meshBasicMaterial color={cx % 2 === 0 ? '#ff007f' : '#00f0ff'} />
              </mesh>
              <pointLight color={cx % 2 === 0 ? '#ff007f' : '#00f0ff'} intensity={4.5} distance={30} position={[0, -0.6, 0]} />
            </group>
          ))
        )}
      </group>

      {/* 4. MURS D'ENCEINTE DU BUNKER (PANNEAUX DE BLINDAGE INTÉGRÉS) */}
      {/* Mur Nord */}
      <group position={[0, (mapData.bounds.ceilingY || 8.0) / 2, mapData.bounds.minZ]}>
        <mesh>
          <boxGeometry args={[mapData.bounds.maxX * 2, mapData.bounds.ceilingY || 8.0, 1.0]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.52]}>
          <planeGeometry args={[mapData.bounds.maxX * 2, 0.2]} />
          <meshBasicMaterial color="#ff007f" />
        </mesh>
      </group>
      {/* Mur Sud */}
      <group position={[0, (mapData.bounds.ceilingY || 8.0) / 2, mapData.bounds.maxZ]}>
        <mesh>
          <boxGeometry args={[mapData.bounds.maxX * 2, mapData.bounds.ceilingY || 8.0, 1.0]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, -0.52]}>
          <planeGeometry args={[mapData.bounds.maxX * 2, 0.2]} />
          <meshBasicMaterial color="#ff007f" />
        </mesh>
      </group>
      {/* Mur Ouest */}
      <group position={[mapData.bounds.minX, (mapData.bounds.ceilingY || 8.0) / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[mapData.bounds.maxZ * 2, mapData.bounds.ceilingY || 8.0, 1.0]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.52]}>
          <planeGeometry args={[mapData.bounds.maxZ * 2, 0.2]} />
          <meshBasicMaterial color="#00f0ff" />
        </mesh>
      </group>
      {/* Mur Est */}
      <group position={[mapData.bounds.maxX, (mapData.bounds.ceilingY || 8.0) / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[mapData.bounds.maxZ * 2, mapData.bounds.ceilingY || 8.0, 1.0]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, -0.52]}>
          <planeGeometry args={[mapData.bounds.maxZ * 2, 0.2]} />
          <meshBasicMaterial color="#00f0ff" />
        </mesh>
      </group>

      {/* 5. RENDU DE TOUS LES OBSTACLES SOLIDES DU BUNKER AVEC DÉTAILS AVANCÉS */}
      {mapData.obstacles.map((obs) => (
        <SciFiObstacle key={obs.id} obstacle={obs} />
      ))}
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

  const neonAccent = color || '#ff007f';

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
              <meshBasicMaterial color="#00f0ff" />
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
                  <meshBasicMaterial color="#00f0ff" />
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

          {/* Réflecteur d'éclairage néon sous la dalles */}
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
