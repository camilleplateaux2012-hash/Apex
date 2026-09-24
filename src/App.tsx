/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import type { ScreenState, PlayerProfile, GameSettings } from './types/game.ts';
import { WEAPONS_CATALOG } from './config/weaponsConfig.ts';
import { MAPS_CATALOG, DEFAULT_MAP_ID } from './config/mapsConfig.ts';
import type { FPSWeaponState, FPSPlayerStats, HitmarkerInfo } from './types/fps.ts';
import { GAME_CONFIG } from './config/gameConfig.ts';
import { firebaseService } from './net/firebaseService.ts';
import { inputSystem } from './systems/inputSystem.ts';
import SceneManager from './scenes/SceneManager.tsx';
import LoadingScreen from './components/LoadingScreen.tsx';
import MainMenu from './components/MainMenu.tsx';
import GameHUD from './components/GameHUD.tsx';
import * as THREE from 'three';

export default function App() {
  const [screenState, setScreenState] = useState<ScreenState>('BOOT_LOADING');
  const [activeMapId, setActiveMapId] = useState<string>(DEFAULT_MAP_ID);
  const [autoMapRotation, setAutoMapRotation] = useState<boolean>(false);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile>({
    uid: 'anon_init',
    callsign: GAME_CONFIG.DEFAULT_PLAYER.callsign,
    isAnonymous: true,
    credits: GAME_CONFIG.DEFAULT_PLAYER.credits,
    neonCores: GAME_CONFIG.DEFAULT_PLAYER.neonCores,
    rank: GAME_CONFIG.DEFAULT_PLAYER.rank,
    rankScore: GAME_CONFIG.DEFAULT_PLAYER.rankScore,
    selectedSkinId: 'skin_default_railgun',
    unlockedSkinIds: ['skin_default_railgun', 'skin_default_plasma'],
    stats: { ...GAME_CONFIG.DEFAULT_PLAYER.stats },
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  });
  const [settings, setSettings] = useState<GameSettings>(GAME_CONFIG.SETTINGS);

  // États spécifiques au gameplay FPS
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [hitmarkers, setHitmarkers] = useState<HitmarkerInfo[]>([]);
  const [eliminatedCount, setEliminatedCount] = useState(0);
  const [activeTargetsCount, setActiveTargetsCount] = useState(5);
  const [isTouchMode, setIsTouchMode] = useState(() => inputSystem.isTouchDevice());

  // Détection automatique du tactile dès le premier contact touch
  useEffect(() => {
    const handleTouch = () => {
      setIsTouchMode(true);
    };
    window.addEventListener('touchstart', handleTouch, { passive: true, once: true });
    return () => {
      window.removeEventListener('touchstart', handleTouch);
    };
  }, []);

  const [weaponState, setWeaponState] = useState<FPSWeaponState>(() => {
    const defaultWeapon = WEAPONS_CATALOG[0];
    return {
      id: defaultWeapon.id,
      name: defaultWeapon.name,
      type: defaultWeapon.type,
      categoryLabel: defaultWeapon.categoryLabel,
      ammo: defaultWeapon.magazineSize,
      maxAmmo: defaultWeapon.magazineSize,
      reserveAmmo: defaultWeapon.reserveAmmo,
      isReloading: false,
      reloadProgress: 1,
      canFire: true,
      damage: defaultWeapon.damage,
      headshotMultiplier: defaultWeapon.headshotMultiplier,
      fireRateSeconds: defaultWeapon.fireRateSeconds,
      reloadTimeSeconds: defaultWeapon.reloadTimeSeconds,
      accentColor: defaultWeapon.visual.modelTheme.accentColor,
      beamColor: defaultWeapon.visual.beamColor,
      activeWeaponIndex: 0,
      totalWeapons: WEAPONS_CATALOG.length,
      allWeapons: WEAPONS_CATALOG.map((w) => ({
        id: w.id,
        name: w.name,
        type: w.type,
        categoryLabel: w.categoryLabel,
        accentColor: w.visual.beamColor,
        currentAmmo: w.magazineSize,
        maxAmmo: w.magazineSize,
      })),
    };
  });

  const [playerStats, setPlayerStats] = useState<FPSPlayerStats>({
    hp: 100,
    maxHp: 100,
    shield: 50,
    maxShield: 50,
    isSprinting: false,
    onGround: true,
    velocity: new THREE.Vector3(),
    position: new THREE.Vector3(),
  });

  // Initialisation au démarrage : Auth anonyme Firebase + Écouteur Pointer Lock
  useEffect(() => {
    inputSystem.init();

    const unsubLock = inputSystem.onLockChange((locked) => {
      setIsPointerLocked(locked);
    });

    const initPlayerSession = async () => {
      try {
        const uid = await firebaseService.authenticateAnonymously();
        const profile = await firebaseService.loadOrCreatePlayerProfile(uid);
        setPlayerProfile(profile);
      } catch (err) {
        console.warn("Échec de l'initialisation du profil joueur :", err);
      }
    };

    initPlayerSession();

    return () => {
      unsubLock();
      inputSystem.destroy();
    };
  }, []);

  // Gestion de l'élimination d'une cible (avec rotation auto si activée)
  const handleTargetFrag = useCallback(() => {
    setEliminatedCount((prev) => {
      const nextCount = prev + 1;
      // Rotation automatique toutes les 4 cibles détruites si activée
      if (autoMapRotation && nextCount % 4 === 0) {
        const currentIdx = MAPS_CATALOG.findIndex((m) => m.id === activeMapId);
        const nextIdx = (currentIdx + 1) % MAPS_CATALOG.length;
        setActiveMapId(MAPS_CATALOG[nextIdx].id);
      }
      return nextCount;
    });

    setPlayerProfile((prev) => {
      const newCredits = prev.credits + 25;
      const newKills = prev.stats.kills + 1;
      const updatedProfile: PlayerProfile = {
        ...prev,
        credits: newCredits,
        stats: {
          ...prev.stats,
          kills: newKills,
          kdRatio: prev.stats.deaths > 0 ? parseFloat((newKills / prev.stats.deaths).toFixed(2)) : newKills,
        },
      };
      setTimeout(() => {
        firebaseService.savePlayerProfile(updatedProfile).catch(() => {});
      }, 0);
      return updatedProfile;
    });
  }, [autoMapRotation, activeMapId]);

  // Ajout d'un hitmarker visuel
  const handleHitmarker = useCallback((info: HitmarkerInfo) => {
    setHitmarkers((prev) => [...prev.slice(-5), info]);
  }, []);

  const handleLockPointer = useCallback(() => {
    inputSystem.requestPointerLock(document.body);
  }, []);

  const handleExitToMenu = useCallback(() => {
    inputSystem.exitPointerLock();
    setScreenState('MAIN_MENU');
  }, []);

  const handleResetPosition = useCallback(() => {
    // Réinitialisation de la vie et réengagement
    setPlayerStats((prev) => ({
      ...prev,
      hp: prev.maxHp,
      shield: prev.maxShield,
    }));
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050811] text-slate-100 font-sans select-none">
      {/* 1. MOTEUR DE SCÈNES 3D THREE.JS (CANVAS D'ARRIÈRE-PLAN) */}
      <SceneManager
        currentScreen={screenState}
        isPointerLocked={isPointerLocked}
        isTouchMode={isTouchMode}
        mouseSensitivity={settings.mouseSensitivity}
        activeMapId={activeMapId}
        onWeaponStateChange={setWeaponState}
        onPlayerStatsChange={setPlayerStats}
        onHitmarker={handleHitmarker}
        onTargetFrag={handleTargetFrag}
        onActiveTargetsCountChange={setActiveTargetsCount}
      />

      {/* 2. OVERLAY D'EFFETS CYBERPUNK (SCANLINES & VIGNETTING) */}
      <div className="absolute inset-0 pointer-events-none scanlines opacity-25 z-1" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,8,17,0.75)_100%)] z-1" />

      {/* 3. ÉCRAN ACTIF */}
      {screenState === 'BOOT_LOADING' ? (
        <LoadingScreen onComplete={() => setScreenState('MAIN_MENU')} />
      ) : screenState === 'IN_GAME' ? (
        <GameHUD
          weaponState={weaponState}
          playerStats={playerStats}
          hitmarkers={hitmarkers}
          isPointerLocked={isPointerLocked}
          isTouchMode={isTouchMode}
          activeMapId={activeMapId}
          onSelectMap={setActiveMapId}
          onToggleTouchMode={() => setIsTouchMode((prev) => !prev)}
          mouseSensitivity={settings.mouseSensitivity}
          onSensitivityChange={(sens) =>
            setSettings((s) => ({ ...s, mouseSensitivity: sens }))
          }
          onLockPointer={handleLockPointer}
          onExitToMenu={handleExitToMenu}
          onResetPosition={handleResetPosition}
          eliminatedCount={eliminatedCount}
          activeTargetsCount={activeTargetsCount}
        />
      ) : (
        <MainMenu
          playerProfile={playerProfile}
          settings={settings}
          currentScreen={screenState}
          activeMapId={activeMapId}
          autoMapRotation={autoMapRotation}
          onScreenChange={setScreenState}
          onProfileUpdate={setPlayerProfile}
          onSettingsUpdate={setSettings}
          onSelectMap={setActiveMapId}
          onToggleAutoRotation={setAutoMapRotation}
        />
      )}
    </div>
  );
}
