/**
 * Contrôles Tactiles Mobiles Cyberpunk pour FPS (Mobile Touch Controls)
 * 
 * Offre une expérience fluide et complète sur smartphones et tablettes :
 * - Joystick virtuel dynamique à gauche (Déplacements WASD / ZQSD)
 * - Zone tactile de visée à droite (Rotation fluide de la caméra Yaw/Pitch)
 * - Bouton de tir néon interactif (Tap & Tir continu / Rafale)
 * - Boutons d'action tactiles : Saut, Sprint (Turbo), Rechargement rapide
 * - Sélecteur d'armes tactile direct (Emplacements [1], [2], [3])
 * - Bouton de pause / options intégré
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { inputSystem } from '../systems/inputSystem.ts';
import type { FPSWeaponState } from '../types/fps.ts';
import { 
  Crosshair, 
  RotateCw, 
  ArrowUp, 
  Zap, 
  Pause,
  ChevronLeft,
  ChevronRight,
  Target,
  ShieldAlert
} from 'lucide-react';

interface MobileControlsProps {
  weaponState: FPSWeaponState;
  isSprinting: boolean;
  onPauseToggle: () => void;
  onWeaponSelect: (index: number) => void;
  touchSensitivity?: number;
}

export default function MobileControls({
  weaponState,
  isSprinting,
  onPauseToggle,
  onWeaponSelect,
  touchSensitivity = 1.0,
}: MobileControlsProps) {
  // Joystick State
  const [joystickActive, setJoystickActive] = useState(false);
  const [stickOrigin, setStickOrigin] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [stickPos, setStickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const joystickTouchId = useRef<number | null>(null);

  // Look Touch State & Smoothing Filter
  const lookTouchId = useRef<number | null>(null);
  const lastLookPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const smoothVelocity = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pendingTouchLook = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const lookRafId = useRef<number | null>(null);

  // Sprint & Aim Lock Toggles
  const [sprintLocked, setSprintLocked] = useState(false);
  const [isTargetLocked, setIsTargetLocked] = useState(false);

  // Firing state for visual feedback
  const [isFiringPressed, setIsFiringPressed] = useState(false);

  const toggleTargetLock = () => {
    const next = !isTargetLocked;
    setIsTargetLocked(next);
    inputSystem.setTargetLock(next);
  };

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      inputSystem.setVirtualInput('forward', false);
      inputSystem.setVirtualInput('backward', false);
      inputSystem.setVirtualInput('left', false);
      inputSystem.setVirtualInput('right', false);
      inputSystem.setVirtualInput('fire', false);
      inputSystem.setVirtualInput('jump', false);
      inputSystem.setVirtualInput('sprint', false);
    };
  }, []);

  // --- GESTION DU JOYSTICK VIRTUEL (GAUCHE) ---
  const handleJoystickTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (joystickTouchId.current !== null) return;

    const touch = e.changedTouches[0];
    joystickTouchId.current = touch.identifier;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    setStickOrigin({ x, y });
    setStickPos({ x, y });
    setJoystickActive(true);
  };

  const handleJoystickTouchMove = useCallback((e: TouchEvent) => {
    if (joystickTouchId.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId.current) {
        const container = document.getElementById('virtual-joystick-zone');
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const currentX = touch.clientX - rect.left;
        const currentY = touch.clientY - rect.top;

        const dx = currentX - stickOrigin.x;
        const dy = currentY - stickOrigin.y;
        const maxDist = 48; // Rayon max du joystick
        const dist = Math.hypot(dx, dy);

        let clampedX = currentX;
        let clampedY = currentY;

        if (dist > maxDist) {
          clampedX = stickOrigin.x + (dx / dist) * maxDist;
          clampedY = stickOrigin.y + (dy / dist) * maxDist;
        }

        setStickPos({ x: clampedX, y: clampedY });

        // Normalisation entre -1 et 1
        const normX = dist > 0 ? (clampedX - stickOrigin.x) / maxDist : 0;
        const normY = dist > 0 ? (clampedY - stickOrigin.y) / maxDist : 0;

        // Seuil d'activation
        const deadzone = 0.2;
        const forward = normY < -deadzone;
        const backward = normY > deadzone;
        const left = normX < -deadzone;
        const right = normX > deadzone;

        inputSystem.setVirtualInput('forward', forward);
        inputSystem.setVirtualInput('backward', backward);
        inputSystem.setVirtualInput('left', left);
        inputSystem.setVirtualInput('right', right);
        break;
      }
    }
  }, [stickOrigin]);

  const handleJoystickTouchEnd = useCallback((e: TouchEvent) => {
    if (joystickTouchId.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId.current) {
        joystickTouchId.current = null;
        setJoystickActive(false);
        inputSystem.setVirtualInput('forward', false);
        inputSystem.setVirtualInput('backward', false);
        inputSystem.setVirtualInput('left', false);
        inputSystem.setVirtualInput('right', false);
        break;
      }
    }
  }, []);

  // --- GESTION DE LA ZONE DE VISÉE TACTILE ULTRA-FLUIDE (DROITE) ---
  const handleLookTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (lookTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    lookTouchId.current = touch.identifier;
    lastLookPos.current = { x: touch.clientX, y: touch.clientY };
    smoothVelocity.current = { x: 0, y: 0 };
  };

  const processTouchLookFrame = useCallback(() => {
    if (pendingTouchLook.current.dx !== 0 || pendingTouchLook.current.dy !== 0) {
      inputSystem.addTouchLookDelta(pendingTouchLook.current.dx, pendingTouchLook.current.dy);
      pendingTouchLook.current.dx = 0;
      pendingTouchLook.current.dy = 0;
    }
    lookRafId.current = null;
  }, []);

  const handleLookTouchMove = useCallback((e: TouchEvent) => {
    if (lookTouchId.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchId.current) {
        const rawDx = touch.clientX - lastLookPos.current.x;
        const rawDy = touch.clientY - lastLookPos.current.y;
        lastLookPos.current = { x: touch.clientX, y: touch.clientY };

        // Filtre exponentiel adaptatif (EMA) pour supprimer le bruit de tremblement tactile
        const smoothingFactor = 0.72;
        smoothVelocity.current.x = smoothingFactor * rawDx + (1 - smoothingFactor) * smoothVelocity.current.x;
        smoothVelocity.current.y = smoothingFactor * rawDy + (1 - smoothingFactor) * smoothVelocity.current.y;

        // Facteur de sensibilité et courbe d'accélération naturelle
        const sensFactor = 1.25 * touchSensitivity;
        const speed = Math.hypot(smoothVelocity.current.x, smoothVelocity.current.y);
        const accelMultiplier = speed > 12 ? 1.3 : speed > 4 ? 1.1 : 1.0;

        const finalDx = smoothVelocity.current.x * sensFactor * accelMultiplier;
        const finalDy = smoothVelocity.current.y * sensFactor * accelMultiplier;

        pendingTouchLook.current.dx += finalDx;
        pendingTouchLook.current.dy += finalDy;

        if (lookRafId.current === null) {
          lookRafId.current = requestAnimationFrame(processTouchLookFrame);
        }
        break;
      }
    }
  }, [touchSensitivity, processTouchLookFrame]);

  const handleLookTouchEnd = useCallback((e: TouchEvent) => {
    if (lookTouchId.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId.current) {
        lookTouchId.current = null;
        smoothVelocity.current = { x: 0, y: 0 };
        pendingTouchLook.current = { dx: 0, dy: 0 };
        if (lookRafId.current !== null) {
          cancelAnimationFrame(lookRafId.current);
          lookRafId.current = null;
        }
        break;
      }
    }
  }, []);

  // Écouteurs globaux de touchmove/touchend
  useEffect(() => {
    window.addEventListener('touchmove', handleJoystickTouchMove, { passive: false });
    window.addEventListener('touchend', handleJoystickTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleJoystickTouchEnd, { passive: true });

    window.addEventListener('touchmove', handleLookTouchMove, { passive: false });
    window.addEventListener('touchend', handleLookTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleLookTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchmove', handleJoystickTouchMove);
      window.removeEventListener('touchend', handleJoystickTouchEnd);
      window.removeEventListener('touchcancel', handleJoystickTouchEnd);

      window.removeEventListener('touchmove', handleLookTouchMove);
      window.removeEventListener('touchend', handleLookTouchEnd);
      window.removeEventListener('touchcancel', handleLookTouchEnd);
    };
  }, [handleJoystickTouchMove, handleJoystickTouchEnd, handleLookTouchMove, handleLookTouchEnd]);

  // Actions
  const toggleSprint = () => {
    const next = !sprintLocked;
    setSprintLocked(next);
    inputSystem.setVirtualInput('sprint', next);
  };

  const handleFireStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFiringPressed(true);
    inputSystem.setVirtualInput('fire', true);
  };

  const handleFireEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFiringPressed(false);
    inputSystem.setVirtualInput('fire', false);
  };

  const handleJumpStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    inputSystem.setVirtualInput('jump', true);
  };

  const handleJumpEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    inputSystem.setVirtualInput('jump', false);
  };

  const handleReload = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    inputSystem.setVirtualInput('reload', true);
    setTimeout(() => {
      inputSystem.setVirtualInput('reload', false);
    }, 120);
  };

  const accent = weaponState.accentColor || '#00f0ff';

  return (
    <div className="absolute inset-0 pointer-events-none z-20 select-none overflow-hidden touch-none">
      {/* 1. ZONE DE VISÉE TACTILE (MOITIÉ DROITE) */}
      <div
        id="touch-look-zone"
        onTouchStart={handleLookTouchStart}
        className="absolute top-16 right-0 w-3/5 h-[75%] pointer-events-auto z-20"
      />

      {/* 2. ZONE DE JOYSTICK VIRTUEL (MOITIÉ GAUCHE INFÉRIEURE) */}
      <div
        id="virtual-joystick-zone"
        onTouchStart={handleJoystickTouchStart}
        className="absolute bottom-6 left-6 w-48 h-48 pointer-events-auto rounded-full z-30 flex items-center justify-center"
      >
        {/* Anneau de base du joystick */}
        <div className="relative w-36 h-36 rounded-full border-2 border-slate-700/70 bg-[#080d1a]/50 backdrop-blur-xs flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          {/* Réticule interne */}
          <div className="absolute w-full h-[1px] bg-slate-700/40" />
          <div className="absolute h-full w-[1px] bg-slate-700/40" />
          <div className="text-[9px] font-mono-tech text-slate-500 uppercase tracking-widest absolute -top-5">
            DÉPLACEMENT
          </div>

          {/* Stick mobile réactif */}
          {joystickActive ? (
            <div
              className="absolute w-14 h-14 rounded-full border-2 border-[#00f0ff] bg-[#00f0ff]/30 backdrop-blur-md shadow-[0_0_15px_#00f0ff] transition-transform duration-75 flex items-center justify-center"
              style={{
                left: `${stickPos.x - 28}px`,
                top: `${stickPos.y - 28}px`,
              }}
            >
              <div className="w-3 h-3 rounded-full bg-[#00f0ff]" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full border border-slate-600 bg-slate-800/80 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400 animate-pulse" />
            </div>
          )}
        </div>
      </div>

      {/* 3. BARRE DE BOUTONS D'ACTIONS TACTILES (DROITE) */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3 pointer-events-auto z-30">
        {/* RANGÉE SUPÉRIEURE D'ACTIONS (RECHARGE, AIM LOCK, SPRINT, SAUT) */}
        <div className="flex items-center gap-2">
          {/* BOUTON ASSISTANCE VISÉE & VERROUILLAGE CIBLE */}
          <button
            onTouchStart={toggleTargetLock}
            onClick={toggleTargetLock}
            className={`w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center backdrop-blur-md active:scale-95 transition-all shadow-md ${
              isTargetLocked
                ? 'bg-[#ff007f]/40 border-[#ff007f] text-[#ff007f] shadow-[0_0_15px_#ff007f]'
                : 'bg-[#0a1020]/90 border-slate-700 text-slate-300 active:border-[#00f0ff] active:text-[#00f0ff]'
            }`}
            title="Verrouillage automatique de cible (Aim Lock)"
          >
            <Target className={`w-5 h-5 ${isTargetLocked ? 'animate-pulse' : ''}`} />
            <span className="text-[7.5px] font-orbitron font-bold uppercase tracking-tight mt-0.5">
              {isTargetLocked ? 'LOCKED' : 'LOCK'}
            </span>
          </button>

          {/* BOUTON RECHARGE */}
          <button
            onTouchStart={handleReload}
            onClick={handleReload}
            className={`w-11 h-11 rounded-full border flex flex-col items-center justify-center backdrop-blur-md active:scale-95 transition-all shadow-md ${
              weaponState.isReloading
                ? 'bg-[#ff007f]/30 border-[#ff007f] text-[#ff007f] animate-spin'
                : 'bg-[#0a1020]/90 border-slate-700 text-slate-200 active:border-[#00f0ff] active:text-[#00f0ff]'
            }`}
          >
            <RotateCw className="w-4 h-4" />
            <span className="text-[8px] font-mono-tech uppercase font-bold mt-0.5">R</span>
          </button>

          {/* BOUTON SPRINT (TOGGLE TURBO) */}
          <button
            onTouchStart={toggleSprint}
            onClick={toggleSprint}
            className={`w-11 h-11 rounded-full border flex flex-col items-center justify-center backdrop-blur-md active:scale-95 transition-all shadow-md ${
              sprintLocked || isSprinting
                ? 'bg-amber-500/30 border-amber-400 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                : 'bg-[#0a1020]/90 border-slate-700 text-slate-300'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span className="text-[8px] font-mono-tech uppercase font-bold mt-0.5">RUN</span>
          </button>

          {/* BOUTON SAUT */}
          <button
            onTouchStart={handleJumpStart}
            onTouchEnd={handleJumpEnd}
            onMouseDown={handleJumpStart}
            onMouseUp={handleJumpEnd}
            className="w-12 h-12 rounded-full border-2 border-[#00f0ff]/80 bg-[#00f0ff]/15 text-[#00f0ff] flex flex-col items-center justify-center backdrop-blur-md active:bg-[#00f0ff]/40 active:scale-95 transition-all shadow-[0_0_12px_rgba(0,240,255,0.3)]"
          >
            <ArrowUp className="w-5 h-5" />
            <span className="text-[8px] font-mono-tech uppercase font-bold">SAUT</span>
          </button>
        </div>

        {/* GRAND BOUTON DE TIR PRINCIPAL (TIR PLASMA / LASER) */}
        <button
          onTouchStart={handleFireStart}
          onTouchEnd={handleFireEnd}
          onMouseDown={handleFireStart}
          onMouseUp={handleFireEnd}
          className={`w-20 h-20 rounded-full border-3 flex flex-col items-center justify-center backdrop-blur-md active:scale-95 transition-all shadow-2xl ${
            isFiringPressed
              ? 'scale-105'
              : ''
          }`}
          style={{
            borderColor: accent,
            backgroundColor: isFiringPressed ? `${accent}55` : `${accent}22`,
            boxShadow: `0 0 20px ${accent}66`,
          }}
        >
          <Crosshair className="w-7 h-7" style={{ color: accent }} />
          <span className="text-[10px] font-orbitron font-black tracking-wider uppercase mt-1" style={{ color: accent }}>
            TIRER
          </span>
        </button>
      </div>

      {/* 4. SÉLECTEUR RAPIDE D'ARMES TACTILE (BAS CENTRE) */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-auto z-30 bg-black/70 border border-slate-800 p-1 backdrop-blur-md rounded-md">
        {weaponState.allWeapons &&
          weaponState.allWeapons.map((slot, idx) => {
            const isActive = idx === weaponState.activeWeaponIndex;
            return (
              <button
                key={slot.id}
                onTouchStart={() => onWeaponSelect(idx)}
                onClick={() => onWeaponSelect(idx)}
                className={`px-3 py-1.5 rounded text-left transition-all active:scale-95 border ${
                  isActive
                    ? 'bg-slate-900 border-2 font-bold shadow-md'
                    : 'bg-black/40 border-slate-800 text-slate-400'
                }`}
                style={{
                  borderColor: isActive ? (slot.accentColor || '#00f0ff') : undefined,
                  boxShadow: isActive ? `0 0 10px ${slot.accentColor}55` : undefined,
                }}
              >
                <div className="flex items-center gap-1.5 text-[9px] font-mono-tech">
                  <span
                    className="font-bold px-1 rounded-xs"
                    style={{
                      color: isActive ? slot.accentColor : '#94a3b8',
                      backgroundColor: isActive ? `${slot.accentColor}22` : '#ffffff10',
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className="font-orbitron text-[9px] truncate max-w-[65px]"
                    style={{ color: isActive ? '#ffffff' : '#94a3b8' }}
                  >
                    {slot.name.split(' ')[0]}
                  </span>
                </div>
              </button>
            );
          })}
      </div>

      {/* 5. BOUTON PAUSE EN HAUT À DROITE */}
      <div className="absolute top-4 right-4 pointer-events-auto z-30">
        <button
          onTouchStart={onPauseToggle}
          onClick={onPauseToggle}
          className="p-2.5 bg-[#0a1020]/90 border border-slate-700 hover:border-[#00f0ff] text-slate-300 hover:text-[#00f0ff] backdrop-blur-md rounded transition shadow-md active:scale-95"
          title="Menu Pause / Paramètres"
        >
          <Pause className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
