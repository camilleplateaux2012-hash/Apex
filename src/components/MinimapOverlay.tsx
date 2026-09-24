/**
 * MinimapOverlay.tsx - Radar Minimap Circulaire Cyberpunk Haute Précision
 * 
 * - Rendu Canvas 60 FPS ultra-fluide avec adaptation Retina (DPI)
 * - Orientation et position du joueur en temps réel (Mode Radar centré ou Mode Carte fixe)
 * - Cône de vision FOV orienté vers l'avant
 * - Rendu vectoriel néon des obstacles de la map, limites, zone de capture et sanctuaires
 * - Radar sweep rotatif avec traînée de phosphore
 * - Affichage des ennemis, alliés, bots IA et cibles d'entraînement
 * - Anneau boussole rotatif avec indicateurs cardinaux (N, E, S, W) et azimut
 * - Contrôles interactifs : Zoom (0.8x / 1.2x / 2.0x), Bascule Rotation/Nord-Fixe, Minimisation
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { FPSPlayerStats } from '../types/fps.ts';
import type { MapDefinition } from '../types/maps.ts';
import { photonClient } from '../net/photonClient.ts';
import { Compass, ZoomIn, ZoomOut, Maximize2, Minimize2, Eye } from 'lucide-react';

interface MinimapOverlayProps {
  playerStats: FPSPlayerStats;
  activeMap: MapDefinition;
  className?: string;
}

export default function MinimapOverlay({
  playerStats,
  activeMap,
  className = '',
}: MinimapOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const headingSpanRef = useRef<HTMLSpanElement | null>(null);
  const coordsSpanRef = useRef<HTMLDivElement | null>(null);
  
  // États de configuration du radar
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 0.8x, 1.2x, 1.8x
  const [isRotateWithPlayer, setIsRotateWithPlayer] = useState<boolean>(true); // Mode suivi d'orientation
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Angle du balayage radar (sweep)
  const sweepAngleRef = useRef<number>(0);
  const lastRenderedDeg = useRef<number>(-1);
  const lastRenderedCoords = useRef<{ x: number; z: number }>({ x: 999, z: 999 });

  // Cycle de rendu Canvas optimisé en requestAnimationFrame
  useEffect(() => {
    let animId: number;

    const render = () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Gestion de la résolution DPI
        const dpr = window.devicePixelRatio || 1;
        const displaySize = isMinimized ? 88 : 136; // Diamètre en px CSS
        const size = displaySize * dpr;

        if (canvas.width !== size || canvas.height !== size) {
          canvas.width = size;
          canvas.height = size;
        }

        // Réinitialisation de la matrice de transformation avec le DPR exact
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const center = displaySize / 2;
        const radius = center - 4;

        // 1. Récupération de la position et orientation du joueur en temps réel (60 FPS)
        const windowPos = (window as any).localPlayerPosition as [number, number, number] | undefined;
        const windowYaw = (window as any).localPlayerYaw as number | undefined;

        let playerX = 0;
        let playerZ = 0;
        let playerYaw = 0;

        if (windowPos && Array.isArray(windowPos) && windowPos.length >= 3) {
          playerX = windowPos[0];
          playerZ = windowPos[2];
        } else if (playerStats && playerStats.position) {
          if (Array.isArray(playerStats.position)) {
            playerX = playerStats.position[0];
            playerZ = playerStats.position[2];
          } else if (typeof playerStats.position.x === 'number') {
            playerX = playerStats.position.x;
            playerZ = playerStats.position.z;
          }
        }

        if (typeof windowYaw === 'number') {
          playerYaw = windowYaw;
        } else if (playerStats && typeof playerStats.yaw === 'number') {
          playerYaw = playerStats.yaw;
        }

        // Calcul du cap en degrés (0° = Nord / -Z, 90° = Est / +X, 180° = Sud / +Z, 270° = Ouest / -X)
        let deg = Math.round((-playerYaw * (180 / Math.PI)) % 360);
        if (deg < 0) deg += 360;

        // Mise à jour directe du DOM pour l'azimut et les coordonnées (0 re-renders React)
        if (headingSpanRef.current && deg !== lastRenderedDeg.current) {
          lastRenderedDeg.current = deg;
          headingSpanRef.current.textContent = `${deg.toString().padStart(3, '0')}°`;
        }

        if (coordsSpanRef.current) {
          const roundedX = Math.round(playerX * 10) / 10;
          const roundedZ = Math.round(playerZ * 10) / 10;
          if (roundedX !== lastRenderedCoords.current.x || roundedZ !== lastRenderedCoords.current.z) {
            lastRenderedCoords.current = { x: roundedX, z: roundedZ };
            const fmtX = roundedX > 0 ? `+${roundedX}` : `${roundedX}`;
            const fmtZ = roundedZ > 0 ? `+${roundedZ}` : `${roundedZ}`;
            coordsSpanRef.current.innerHTML = `X: <span class="text-[#00f0ff] font-bold">${fmtX}</span> | Z: <span class="text-[#00f0ff] font-bold">${fmtZ}</span>`;
          }
        }

        // Avancement du balayage radar (rotation continue)
        sweepAngleRef.current = (sweepAngleRef.current + 0.035) % (Math.PI * 2);

        // 2. Nettoyage du canvas
        ctx.clearRect(0, 0, displaySize, displaySize);

        // 3. Masque circulaire strict pour le radar
        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.clip();

        // Fond sombre cyberpunk semi-transparent
        ctx.fillStyle = 'rgba(5, 10, 22, 0.88)';
        ctx.fillRect(0, 0, displaySize, displaySize);

      // Grille radar en cercles concentriques (distances)
      const ringDistances = [12, 24, 38]; // En mètres in-game
      const scale = (radius / 36) * zoomLevel; // pixels par mètre in-game

      ctx.lineWidth = 1;
      ringDistances.forEach((dist) => {
        const ringPx = dist * scale;
        if (ringPx < radius) {
          ctx.beginPath();
          ctx.arc(center, center, ringPx, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
          ctx.stroke();
        }
      });

      // Lignes en croix de visée du radar
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.18)';
      ctx.beginPath();
      ctx.moveTo(center, 4);
      ctx.lineTo(center, displaySize - 4);
      ctx.moveTo(4, center);
      ctx.lineTo(displaySize - 4, center);
      ctx.stroke();

      // 4. TRANSFORMATION MATRICIELLE DU MONDE
      ctx.save();
      ctx.translate(center, center);

      if (isRotateWithPlayer) {
        // En mode suivi joueur : la carte pivote selon l'orientation (vue subjective avant = vers le haut)
        ctx.rotate(playerYaw);
        ctx.translate(-playerX * scale, -playerZ * scale);
      } else {
        // En mode Nord-Fixe : la carte est orientée Nord en haut, centré sur le joueur
        ctx.translate(-playerX * scale, -playerZ * scale);
      }

      // --- 4.1 Rendu des limites de la carte ---
      if (activeMap.bounds) {
        const b = activeMap.bounds;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(b.minX * scale, b.minZ * scale, (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale);
        ctx.setLineDash([]);
      }

      // --- 4.2 Rendu des obstacles et bâtiments (top-down blueprint) ---
      if (activeMap.obstacles) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
        ctx.lineWidth = 1;

        for (const obs of activeMap.obstacles) {
          const ox = (obs.position[0] - obs.size[0] / 2) * scale;
          const oz = (obs.position[2] - obs.size[2] / 2) * scale;
          const ow = obs.size[0] * scale;
          const oh = obs.size[2] * scale;

          ctx.fillRect(ox, oz, ow, oh);
          ctx.strokeRect(ox, oz, ow, oh);
        }
      }

      // --- 4.3 Rendu des Zones Sanctuaires d'équipe (Bases protégées) ---
      if (activeMap.sanctuaryZones) {
        const { red, blue } = activeMap.sanctuaryZones;
        // Sanctuaire Rouge
        if (red) {
          ctx.beginPath();
          ctx.arc(red.position[0] * scale, red.position[2] * scale, red.radius * scale, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 0, 85, 0.15)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 0, 85, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Petite croix médicale rouge
          const rx = red.position[0] * scale;
          const rz = red.position[2] * scale;
          ctx.fillStyle = '#ff0055';
          ctx.fillRect(rx - 3, rz - 1, 6, 2);
          ctx.fillRect(rx - 1, rz - 3, 2, 6);
        }
        // Sanctuaire Bleu
        if (blue) {
          ctx.beginPath();
          ctx.arc(blue.position[0] * scale, blue.position[2] * scale, blue.radius * scale, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Petite croix médicale bleue
          const bx = blue.position[0] * scale;
          const bz = blue.position[2] * scale;
          ctx.fillStyle = '#00f0ff';
          ctx.fillRect(bx - 3, bz - 1, 6, 2);
          ctx.fillRect(bx - 1, bz - 3, 2, 6);
        }
      }

      // --- 4.4 Rendu de la Zone de Capture Centrale ---
      if (activeMap.captureZone) {
        const cz = activeMap.captureZone;
        const czX = cz.position[0] * scale;
        const czZ = cz.position[2] * scale;
        const czR = cz.radius * scale;

        ctx.beginPath();
        ctx.arc(czX, czZ, czR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.fill();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Symbole d'objectif au centre
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cz.code || 'A', czX, czZ);
      }

      // --- 4.5 Cibles d'entraînement (Training Targets) ---
      if (activeMap.initialTargets) {
        for (const t of activeMap.initialTargets) {
          const targetX = (t.position as any).x !== undefined ? (t.position as any).x : (t.position as any)[0];
          const targetZ = (t.position as any).z !== undefined ? (t.position as any).z : (t.position as any)[2];
          const tx = targetX * scale;
          const tz = targetZ * scale;

          ctx.save();
          ctx.translate(tx, tz);
          ctx.rotate(Math.PI / 4); // Losange
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-2, -2, 4, 4);
          ctx.restore();
        }
      }

      // --- 4.6 Joueurs Distants & Bots IA ---
      const remotes = photonClient.getRemotePlayers();
      const localTeam = photonClient.getLocalTeam();

      for (const r of remotes) {
        if (!r.isAlive) continue;
        const rx = r.position[0] * scale;
        const rz = r.position[2] * scale;

        const isTeammate = localTeam !== 'SOLO' && r.team === localTeam;
        const blipColor = isTeammate ? '#38bdf8' : (r.team === 'RED' ? '#ff0055' : '#ff007f');

        // Anneau bouclier si immunisé
        if (r.isImmune) {
          ctx.beginPath();
          ctx.arc(rx, rz, 5, 0, Math.PI * 2);
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Point joueur
        ctx.beginPath();
        ctx.arc(rx, rz, 3, 0, Math.PI * 2);
        ctx.fillStyle = blipColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Indicateur d'orientation de l'adversaire / allié
        if (r.rotation && r.rotation.length > 1) {
          const ryaw = r.rotation[1];
          const dirX = Math.sin(-ryaw) * 6;
          const dirZ = -Math.cos(-ryaw) * 6;
          ctx.beginPath();
          ctx.moveTo(rx, rz);
          ctx.lineTo(rx + dirX, rz + dirZ);
          ctx.strokeStyle = blipColor;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      // --- 4.7 Joueur Local (si mode Nord-Fixe, dessiner sa position et flèche orientée) ---
      if (!isRotateWithPlayer) {
        const lx = playerX * scale;
        const lz = playerZ * scale;

        // Cône de vision
        ctx.save();
        ctx.translate(lx, lz);
        ctx.rotate(-playerYaw + Math.PI);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 22 * zoomLevel, -Math.PI / 4, Math.PI / 4);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.fill();

        // Triangle du joueur
        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.lineTo(-4, -4);
        ctx.lineTo(0, -2);
        ctx.lineTo(4, -4);
        ctx.closePath();
        ctx.fillStyle = '#00f0ff';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore(); // Fin de la transformation du monde

      // --- 5. Rendu du Joueur Local au Centre (en mode Rotation) ---
      if (isRotateWithPlayer) {
        // Cône de vision vers le haut (-Y sur le canvas)
        ctx.save();
        ctx.translate(center, center);

        const fovGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 26 * zoomLevel);
        fovGrad.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
        fovGrad.addColorStop(0.7, 'rgba(0, 240, 255, 0.15)');
        fovGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');

        ctx.beginPath();
        ctx.moveTo(0, 0);
        // Angle orienté vers le haut (-Math.PI/2)
        ctx.arc(0, 0, 26 * zoomLevel, -Math.PI / 2 - Math.PI / 5, -Math.PI / 2 + Math.PI / 5);
        ctx.closePath();
        ctx.fillStyle = fovGrad;
        ctx.fill();

        // Triangle / Flèche tactique du joueur au centre
        ctx.beginPath();
        ctx.moveTo(0, -7); // Pointe vers le haut
        ctx.lineTo(4, 5);
        ctx.lineTo(0, 3);
        ctx.lineTo(-4, 5);
        ctx.closePath();
        ctx.fillStyle = '#00f0ff';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();
      }

      // --- 6. Balayage Radar (Sweep Beam avec traînée de phosphore) ---
      ctx.save();
      ctx.translate(center, center);
      const sweep = sweepAngleRef.current;

      const sweepGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      sweepGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
      sweepGrad.addColorStop(1, 'rgba(0, 240, 255, 0.18)');

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, sweep - 0.35, sweep);
      ctx.closePath();
      ctx.fillStyle = sweepGrad;
      ctx.fill();

      // Ligne vive de front du balayage
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(sweep) * radius, Math.sin(sweep) * radius);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      ctx.restore(); // Fin du clip circulaire

      // --- 7. Cadre Extérieur & Anneau Boussole (Points cardinaux) ---
      // Bordure néon principale
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Marques des 4 points cardinaux (N, E, S, W)
      const cardinals = [
        { label: 'N', angle: -Math.PI / 2, color: '#ff0055' },
        { label: 'E', angle: 0, color: '#00f0ff' },
        { label: 'S', angle: Math.PI / 2, color: '#00f0ff' },
        { label: 'O', angle: Math.PI, color: '#00f0ff' },
      ];

      // En mode rotation, les points cardinaux tournent autour du cercle selon yaw
      const cardinalOffset = isRotateWithPlayer ? playerYaw : 0;

      ctx.font = 'bold 8px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      cardinals.forEach((c) => {
        const finalAngle = c.angle + cardinalOffset;
        const tickDist = radius - 1;
        const textDist = radius - 8;

        // Petit cran sur la bordure
        ctx.beginPath();
        ctx.moveTo(center + Math.cos(finalAngle) * (radius - 3), center + Math.sin(finalAngle) * (radius - 3));
        ctx.lineTo(center + Math.cos(finalAngle) * radius, center + Math.sin(finalAngle) * radius);
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Texte cardinal
        if (!isMinimized) {
          ctx.fillStyle = c.color;
          ctx.fillText(c.label, center + Math.cos(finalAngle) * textDist, center + Math.sin(finalAngle) * textDist);
        }
      });
      } catch (err) {
        console.warn('[MinimapOverlay] Erreur de rendu minimap :', err);
      } finally {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isRotateWithPlayer, zoomLevel, isMinimized, activeMap]);

  // Bascule du niveau de zoom
  const handleToggleZoom = useCallback(() => {
    setZoomLevel((prev) => {
      if (prev === 0.8) return 1.2;
      if (prev === 1.2) return 1.8;
      return 0.8;
    });
  }, []);

  return (
    <div
      className={`relative flex flex-col items-center select-none pointer-events-auto ${className}`}
      title="Radar Tactique Holographique"
    >
      {/* En-tête / Badge du Radar */}
      {!isMinimized && (
        <div className="flex items-center justify-between w-full px-2 py-0.5 bg-[#050b16]/90 border-t border-x border-[#00f0ff]/40 text-[9px] font-mono-tech text-cyan-300 backdrop-blur-md rounded-t shadow-[0_0_12px_rgba(0,240,255,0.25)]">
          <div className="flex items-center gap-1 font-bold text-[#00f0ff] truncate max-w-[85px]">
            <Compass className="w-3 h-3 text-[#00f0ff] animate-pulse shrink-0" />
            <span ref={headingSpanRef} className="truncate">000°</span>
          </div>
          <div className="text-[8px] text-slate-400 font-mono">
            {zoomLevel}x
          </div>
        </div>
      )}

      {/* Conteneur Circulaire du Radar */}
      <div className="relative group">
        <canvas
          ref={canvasRef}
          style={{ width: isMinimized ? '88px' : '136px', height: isMinimized ? '88px' : '136px' }}
          className="rounded-full shadow-[0_0_20px_rgba(0,240,255,0.4)] border border-[#00f0ff]/50 bg-[#050b16]/80 cursor-pointer transition-all duration-200"
          onClick={() => setIsRotateWithPlayer((prev) => !prev)}
        />

        {/* Boutons de contrôle overlay ultra-compacts au hover */}
        <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleZoom();
            }}
            className="p-1 bg-[#090f1d]/90 hover:bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/60 rounded-full cursor-pointer shadow"
            title="Modifier l'échelle de zoom du radar (0.8x / 1.2x / 1.8x)"
          >
            <ZoomIn className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsRotateWithPlayer((prev) => !prev);
            }}
            className={`p-1 bg-[#090f1d]/90 hover:bg-[#00f0ff]/20 border rounded-full cursor-pointer shadow ${
              isRotateWithPlayer ? 'text-[#00f0ff] border-[#00f0ff]/60' : 'text-amber-400 border-amber-400/60'
            }`}
            title={isRotateWithPlayer ? 'Mode Suivi Rotation (Actif) - Cliquer pour Fixer Nord' : 'Mode Nord Fixe (Actif) - Cliquer pour Suivre Rotation'}
          >
            <Eye className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized((prev) => !prev);
            }}
            className="p-1 bg-[#090f1d]/90 hover:bg-[#00f0ff]/20 text-slate-300 border border-slate-700 rounded-full cursor-pointer shadow"
            title={isMinimized ? 'Agrandir le radar' : 'Réduire le radar'}
          >
            {isMinimized ? <Maximize2 className="w-2.5 h-2.5" /> : <Minimize2 className="w-2.5 h-2.5" />}
          </button>
        </div>

        {/* Repère de mode au bas du cercle */}
        {!isMinimized && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 bg-[#050b16]/95 border border-[#00f0ff]/60 rounded text-[7px] font-mono-tech text-cyan-300 uppercase tracking-widest whitespace-nowrap shadow-sm">
            {isRotateWithPlayer ? 'HEAD-UP' : 'NORTH-UP'}
          </div>
        )}
      </div>

      {/* Coordonnées GPS sous le radar */}
      {!isMinimized && (
        <div ref={coordsSpanRef} className="w-full text-center px-1.5 py-0.5 mt-1 bg-[#050b16]/80 border-b border-x border-[#00f0ff]/30 text-[8px] font-mono-tech text-slate-400 rounded-b">
          X: <span className="text-[#00f0ff] font-bold">0</span> | Z: <span className="text-[#00f0ff] font-bold">0</span>
        </div>
      )}
    </div>
  );
}
