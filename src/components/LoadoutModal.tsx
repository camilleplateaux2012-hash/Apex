/**
 * Modal Arsenal / Loadout (Persistance Firebase Firestore)
 * 
 * Permet d'inspecter les armes, les statistiques et de débloquer des skins
 * persistés dans Firestore (collection `players/{uid}`).
 */

import { useState } from 'react';
import { WEAPON_REGISTRY, type WeaponDef } from '../assets/placeholderData.ts';
import { INITIAL_WEAPON_SKINS } from '../systems/inventorySystem.ts';
import { firebaseService } from '../net/firebaseService.ts';
import { audioSystem } from '../systems/audioSystem.ts';
import type { PlayerProfile, WeaponSkin } from '../types/game.ts';
import { Crosshair, Shield, Zap, X, Check, Lock, Coins } from 'lucide-react';

interface LoadoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerProfile: PlayerProfile;
  onProfileUpdate: (updated: PlayerProfile) => void;
}

export default function LoadoutModal({
  isOpen,
  onClose,
  playerProfile,
  onProfileUpdate,
}: LoadoutModalProps) {
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>('RAILGUN');
  const [statusMsg, setStatusMsg] = useState<string>('');

  if (!isOpen) return null;

  const currentWeapon: WeaponDef = WEAPON_REGISTRY[selectedWeaponId];
  const skinsForWeapon = INITIAL_WEAPON_SKINS.filter(
    (s) => s.weaponType === selectedWeaponId
  );

  const handleUnlockSkin = async (skin: WeaponSkin) => {
    if (playerProfile.credits < skin.costCredits) {
      audioSystem.playClick();
      setStatusMsg("Crédits insuffisants pour acquérir ce skin.");
      return;
    }

    audioSystem.playClick();
    const ok = await firebaseService.unlockSkin(playerProfile.uid, skin.id, skin.costCredits);
    if (ok) {
      const refreshed = await firebaseService.loadOrCreatePlayerProfile(playerProfile.uid);
      onProfileUpdate(refreshed);
      setStatusMsg(`Skin "${skin.name}" débloqué avec succès !`);
      audioSystem.playBootSuccess();
    }
  };

  const handleEquipSkin = async (skin: WeaponSkin) => {
    audioSystem.playClick();
    const updated = { ...playerProfile, selectedSkinId: skin.id };
    await firebaseService.updateStats(playerProfile.uid, {} as any);
    onProfileUpdate(updated);
    setStatusMsg(`Skin "${skin.name}" équipé.`);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-4xl bg-[#090e1d] border border-[#ff007f]/50 p-6 md:p-8 cyber-clip-corner cyber-glow-magenta max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 mb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-tech text-[#ff007f] uppercase tracking-wider mb-1">
              <Crosshair className="w-4 h-4 text-[#ff007f]" />
              <span>ARSENAL TACTIQUE & GESTIONNAIRE DE SKINS</span>
            </div>
            <h2 className="text-2xl font-bold font-orbitron text-white tracking-wide">
              ÉQUIPEMENT ET PERSONNALISATION
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/50 border border-amber-500/40 text-amber-400 font-mono-tech text-xs cyber-clip-badge">
              <Coins className="w-4 h-4" />
              <span>CRÉDITS : <strong>{playerProfile.credits} CR</strong></span>
            </div>
            <button
              onClick={() => {
                audioSystem.playClick();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-y-auto pr-1">
          {/* Sélection de l'arme */}
          <div className="space-y-3">
            <div className="text-xs font-mono-tech text-slate-400 uppercase tracking-wider">
              ARMES PRINCIPALES
            </div>
            {Object.values(WEAPON_REGISTRY).map((weapon) => {
              const isSelected = selectedWeaponId === weapon.id;
              return (
                <button
                  key={weapon.id}
                  onClick={() => {
                    audioSystem.playHover();
                    setSelectedWeaponId(weapon.id);
                  }}
                  className={`w-full text-left p-3.5 border transition cursor-pointer ${
                    isSelected
                      ? 'border-[#00f0ff] bg-[#00f0ff]/10 text-white'
                      : 'border-slate-800 bg-[#0d1428] text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-mono-tech text-[#00f0ff] font-bold">
                    {weapon.type}
                  </div>
                  <div className="text-sm font-orbitron font-bold mt-0.5">
                    {weapon.name}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Fiche technique de l'arme */}
          <div className="p-4 bg-[#0d1428] border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono-tech text-[#00f0ff] uppercase tracking-wider mb-2">
                SPÉCIFICATIONS TECHNIQUES
              </div>
              <h3 className="text-lg font-orbitron font-bold text-white mb-2">
                {currentWeapon.name}
              </h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed font-sans">
                {currentWeapon.description}
              </p>

              {/* Barres de stats */}
              <div className="space-y-3 font-mono-tech text-xs">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>DÉGÂTS D'IMPACT</span>
                    <span className="text-[#ff007f] font-bold">{currentWeapon.damage} / 100</span>
                  </div>
                  <div className="h-1.5 w-full bg-black">
                    <div
                      className="h-full bg-[#ff007f]"
                      style={{ width: `${currentWeapon.damage}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>CADENCE DE TIR</span>
                    <span className="text-[#00f0ff] font-bold">{currentWeapon.fireRate} RPM</span>
                  </div>
                  <div className="h-1.5 w-full bg-black">
                    <div
                      className="h-full bg-[#00f0ff]"
                      style={{ width: `${Math.min(100, currentWeapon.fireRate / 8)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>CHARGEUR</span>
                    <span className="text-amber-400 font-bold">{currentWeapon.magazineCapacity} RDS</span>
                  </div>
                  <div className="h-1.5 w-full bg-black">
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${Math.min(100, currentWeapon.magazineCapacity * 2.5)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono-tech text-slate-500">
              Synchronisé avec Firestore : persistance des armes débloquées par compte joueur.
            </div>
          </div>

          {/* Skins disponibles */}
          <div className="space-y-3">
            <div className="text-xs font-mono-tech text-slate-400 uppercase tracking-wider">
              SKINS DISPONIBLES ({skinsForWeapon.length})
            </div>

            <div className="space-y-2.5">
              {skinsForWeapon.map((skin) => {
                const isUnlocked = playerProfile.unlockedSkinIds.includes(skin.id);
                const isEquipped = playerProfile.selectedSkinId === skin.id;

                return (
                  <div
                    key={skin.id}
                    className="p-3 bg-[#0d1428] border border-slate-800 flex justify-between items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: skin.glowColor, boxShadow: `0 0 6px ${skin.glowColor}` }}
                        />
                        <span className="font-orbitron font-bold text-xs text-white">
                          {skin.name}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono-tech text-slate-400 mt-1">
                        RARETÉ : {skin.rarity}
                      </div>
                    </div>

                    <div>
                      {isEquipped ? (
                        <span className="text-xs font-mono-tech text-emerald-400 flex items-center gap-1 font-bold">
                          <Check className="w-3.5 h-3.5" /> ÉQUIPÉ
                        </span>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => handleEquipSkin(skin)}
                          className="px-2.5 py-1 text-xs font-orbitron bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 transition cursor-pointer"
                        >
                          ÉQUIPER
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnlockSkin(skin)}
                          className="px-2.5 py-1 text-xs font-orbitron bg-[#ffaa00]/10 hover:bg-[#ffaa00] text-[#ffaa00] hover:text-black border border-[#ffaa00]/40 transition cursor-pointer flex items-center gap-1"
                        >
                          <Lock className="w-3 h-3" />
                          <span>{skin.costCredits} CR</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Message de statut */}
        {statusMsg && (
          <div className="mt-4 p-2 bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-xs font-mono-tech text-[#00f0ff] text-center">
            {statusMsg}
          </div>
        )}
      </div>
    </div>
  );
}
