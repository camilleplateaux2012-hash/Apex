/**
 * Gestionnaire de scènes 3D (React Three Fiber Canvas)
 * 
 * Bascule dynamiquement la scène 3D Three.js en fonction de l'écran actif
 */

import React, { memo } from 'react';
import { Canvas } from '@react-three/fiber';
import type { ScreenState } from '../types/game.ts';
import type { FPSWeaponState, FPSPlayerStats, HitmarkerInfo } from '../types/fps.ts';
import MainMenuScene from './MainMenuScene.tsx';
import LobbyScene from './LobbyScene.tsx';
import GameScene from './GameScene.tsx';

interface SceneManagerProps {
  currentScreen: ScreenState;
  isPointerLocked?: boolean;
  isTouchMode?: boolean;
  mouseSensitivity?: number;
  activeMapId?: string;
  onWeaponStateChange?: (state: FPSWeaponState) => void;
  onPlayerStatsChange?: (stats: FPSPlayerStats) => void;
  onHitmarker?: (info: HitmarkerInfo) => void;
  onTargetFrag?: () => void;
  onActiveTargetsCountChange?: (count: number) => void;
}

function SceneManager({
  currentScreen,
  isPointerLocked = false,
  isTouchMode = false,
  mouseSensitivity = 1.0,
  activeMapId,
  onWeaponStateChange = () => {},
  onPlayerStatsChange = () => {},
  onHitmarker = () => {},
  onTargetFrag = () => {},
  onActiveTargetsCountChange = () => {},
}: SceneManagerProps) {
  // Déterminer la position de caméra initiale selon l'écran
  const getCameraProps = () => {
    switch (currentScreen) {
      case 'LOBBY_BROWSER':
        return { position: [0, 1.2, 5.5] as [number, number, number], fov: 60 };
      case 'IN_GAME':
      case 'IN_GAME_PREPARE':
        return { position: [0, 1.6, 8] as [number, number, number], fov: 75 };
      default:
        return { position: [0, 0, 7] as [number, number, number], fov: 50 };
    }
  };

  const cameraProps = getCameraProps();
  const isGameplayMode = currentScreen === 'IN_GAME' || currentScreen === 'IN_GAME_PREPARE';

  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={cameraProps}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.35]}
      >
        {currentScreen === 'LOBBY_BROWSER' ? (
          <LobbyScene />
        ) : isGameplayMode ? (
          <GameScene
            isPointerLocked={isPointerLocked}
            isTouchMode={isTouchMode}
            mouseSensitivity={mouseSensitivity}
            activeMapId={activeMapId}
            onWeaponStateChange={onWeaponStateChange}
            onPlayerStatsChange={onPlayerStatsChange}
            onHitmarker={onHitmarker}
            onTargetFrag={onTargetFrag}
            onActiveTargetsCountChange={onActiveTargetsCountChange}
          />
        ) : (
          <MainMenuScene />
        )}
      </Canvas>
    </div>
  );
}

export default memo(SceneManager);
