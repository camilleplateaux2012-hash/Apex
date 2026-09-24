/**
 * Menu Principal Cyberpunk Néon (Noir/Bleu Nuit, Accents Cyan/Magenta)
 * 
 * Interface principale prête à accueillir les futurs écrans :
 * - Navigation stylisée
 * - Carte de profil joueur (Callsign, Rang, Crédits)
 * - Indicateurs de connectivité en temps réel (Firebase, Photon)
 * - Contrôle de la vue 3D d'arrière-plan
 */

import { useState } from 'react';
import { GAME_CONFIG } from '../config/gameConfig.ts';
import { isFirebaseConfigured } from '../net/firebaseConfig.ts';
import { isPhotonConfigured } from '../net/photonConfig.ts';
import { audioSystem } from '../systems/audioSystem.ts';
import { inputSystem } from '../systems/inputSystem.ts';
import type { PlayerProfile, ScreenState, GameSettings } from '../types/game.ts';
import StatusPill from './StatusPill.tsx';
import LobbyModal from './LobbyModal.tsx';
import LoadoutModal from './LoadoutModal.tsx';
import StatsModal from './StatsModal.tsx';
import SettingsModal from './SettingsModal.tsx';
import MapSelectModal from './MapSelectModal.tsx';
import { getMapById, DEFAULT_MAP_ID } from '../config/mapsConfig.ts';
import { 
  Play, 
  Crosshair, 
  BarChart2, 
  Settings as SettingsIcon, 
  Volume2, 
  VolumeX, 
  Coins, 
  Zap, 
  Shield, 
  Eye, 
  Sparkles,
  Terminal,
  MapPin,
  Compass
} from 'lucide-react';

interface MainMenuProps {
  playerProfile: PlayerProfile;
  settings: GameSettings;
  currentScreen: ScreenState;
  activeMapId?: string;
  autoMapRotation?: boolean;
  onScreenChange: (screen: ScreenState) => void;
  onProfileUpdate: (profile: PlayerProfile) => void;
  onSettingsUpdate: (settings: GameSettings) => void;
  onSelectMap?: (mapId: string) => void;
  onToggleAutoRotation?: (enabled: boolean) => void;
}

export default function MainMenu({
  playerProfile,
  settings,
  currentScreen,
  activeMapId = DEFAULT_MAP_ID,
  autoMapRotation = false,
  onScreenChange,
  onProfileUpdate,
  onSettingsUpdate,
  onSelectMap = () => {},
  onToggleAutoRotation = () => {},
}: MainMenuProps) {
  const [activeModal, setActiveModal] = useState<
    'LOBBY' | 'LOADOUT' | 'STATS' | 'SETTINGS' | 'MAPS' | null
  >(null);
  const [isMuted, setIsMuted] = useState(false);

  const activeMap = getMapById(activeMapId);

  const toggleSound = () => {
    const muted = audioSystem.toggleMute();
    setIsMuted(muted);
    if (!muted) audioSystem.playClick();
  };

  const handleOpenModal = (modal: 'LOBBY' | 'LOADOUT' | 'STATS' | 'SETTINGS' | 'MAPS') => {
    audioSystem.playModalOpen();
    setActiveModal(modal);
    if (modal === 'LOBBY') {
      onScreenChange('LOBBY_BROWSER');
    }
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    onScreenChange('MAIN_MENU');
  };

  const handleEnterArena = (roomName: string) => {
    setActiveModal(null);
    onScreenChange('IN_GAME');
    audioSystem.playBootSuccess();
  };

  const handleLaunchTestArena = () => {
    audioSystem.playBootSuccess();
    if (!inputSystem.isTouchDevice()) {
      inputSystem.requestPointerLock(document.body);
    }
    onScreenChange('IN_GAME');
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between pointer-events-auto p-4 sm:p-6 md:p-8 select-none">
      {/* 1. BARRE SUPÉRIEURE (HEADER CYBERPUNK) */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 z-10">
        {/* Titre & Branding */}
        <div>
          <div className="flex items-center gap-2 text-[10px] md:text-xs font-mono-tech text-[#00f0ff] uppercase tracking-widest mb-1">
            <span className="w-2 h-2 bg-[#00f0ff] rounded-full animate-ping" />
            <span>FONDATION TECHNIQUE MULTIJOUEUR</span>
            <span className="text-slate-600">//</span>
            <span className="text-[#ff007f]">{GAME_CONFIG.VERSION}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-white via-[#00f0ff] to-[#ff007f] tracking-wider drop-shadow-[0_0_20px_rgba(0,240,255,0.4)]">
            {GAME_CONFIG.TITLE}
          </h1>
        </div>

        {/* Profil Joueur + Statuts Réseau */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Pills Réseau */}
          <StatusPill
            label="FIREBASE"
            value={isFirebaseConfigured() ? "ONLINE" : "DÉMO LOCAL"}
            status={isFirebaseConfigured() ? "active" : "warning"}
          />
          <StatusPill
            label="PHOTON"
            value={isPhotonConfigured() ? "CONNECTED" : "SIMULATION"}
            status={isPhotonConfigured() ? "active" : "warning"}
          />

          {/* Carte Joueur */}
          <div className="flex items-center gap-3 px-4 py-2 bg-[#0c1222]/90 border border-slate-700 backdrop-blur-md cyber-clip-badge">
            <div className="w-8 h-8 rounded border border-[#00f0ff] bg-black/60 flex items-center justify-center font-orbitron font-bold text-xs text-[#00f0ff]">
              OP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-orbitron font-bold text-xs text-white tracking-wider">
                  {playerProfile.callsign}
                </span>
                <span className="text-[9px] font-mono-tech px-1.5 py-0.2 bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30">
                  {playerProfile.rank}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono-tech text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 text-amber-400">
                  <Coins className="w-3 h-3" /> {playerProfile.credits} CR
                </span>
                <span className="flex items-center gap-1 text-[#ff007f]">
                  <Zap className="w-3 h-3" /> {playerProfile.neonCores} NC
                </span>
              </div>
            </div>
          </div>

          {/* Mute Button */}
          <button
            onClick={toggleSound}
            className="p-2.5 bg-[#0c1222]/90 border border-slate-700 hover:border-[#00f0ff] text-slate-300 hover:text-[#00f0ff] transition cursor-pointer"
            title={isMuted ? "Activer l'audio" : "Couper l'audio"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 2. ZONE CENTRALE (MENU DE NAVIGATION PRINCIPAL) */}
      <main className="my-auto py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 z-10">
        {/* Colonne Navigation Gauche */}
        <div className="w-full max-w-md space-y-3">
          <div className="text-[11px] font-mono-tech text-[#00f0ff] tracking-widest uppercase mb-1 flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" />
            <span>MODULES D'ENGAGEMENT TACTIQUE</span>
          </div>

          {/* Bouton 0 : Arène de test FPS (Accès direct immédiat) */}
          <button
            onClick={handleLaunchTestArena}
            onMouseEnter={() => audioSystem.playHover()}
            className="group relative w-full text-left p-4 bg-gradient-to-r from-[#00f0ff]/15 via-[#0a1020] to-[#ff007f]/15 border-2 border-[#00f0ff] hover:border-[#ff007f] transition-all duration-200 cursor-pointer cyber-clip-corner shadow-[0_0_20px_rgba(0,240,255,0.3)]"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono-tech text-[#00f0ff] uppercase tracking-wider font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-ping" />
                  00 // TEST GAMEPLAY FPS
                </div>
                <div className="text-xl font-black font-orbitron text-white group-hover:text-[#00f0ff] tracking-wider transition">
                  JOUER // ARÈNE DE TEST
                </div>
                <div className="text-xs text-slate-300 mt-0.5 font-sans">
                  Clavier/Souris & Tactile Mobile (Joystick, Visée, Tir, 3 Armes & Drones)
                </div>
              </div>
              <div className="w-11 h-11 border-2 border-[#00f0ff] flex items-center justify-center bg-[#00f0ff]/20 group-hover:bg-[#ff007f] group-hover:border-[#ff007f] group-hover:text-black text-[#00f0ff] transition shadow-[0_0_12px_rgba(0,240,255,0.5)]">
                <Play className="w-5 h-5 fill-current" />
              </div>
            </div>
            <div className="absolute left-0 bottom-0 h-1 w-full bg-gradient-to-r from-[#00f0ff] to-[#ff007f]" />
          </button>

          {/* Bouton 1 : Déployer / Salons multijoueurs */}
          <button
            onClick={() => handleOpenModal('LOBBY')}
            onMouseEnter={() => audioSystem.playHover()}
            className="group relative w-full text-left p-4 bg-[#0a1020]/90 border border-[#00f0ff]/40 hover:border-[#00f0ff] hover:bg-[#00f0ff]/10 transition-all duration-200 cursor-pointer cyber-clip-corner cyber-glow-cyan"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="text-[10px] font-mono-tech text-[#00f0ff] group-hover:text-white transition">
                  01 // PHOTON MULTIPLAYER
                </div>
                <div className="text-xl font-black font-orbitron text-white group-hover:text-[#00f0ff] tracking-wider transition">
                  DÉPLOYER // LOBBY
                </div>
                <div className="text-xs text-slate-400 mt-1 font-sans">
                  Rechercher ou créer un salon de combat multijoueur
                </div>
              </div>
              <div className="w-10 h-10 border border-[#00f0ff]/40 flex items-center justify-center bg-black/40 group-hover:border-[#00f0ff] group-hover:bg-[#00f0ff] group-hover:text-black text-[#00f0ff] transition">
                <Play className="w-4 h-4 fill-current" />
              </div>
            </div>
            {/* Ligne d'accent animated */}
            <div className="absolute left-0 bottom-0 h-0.5 w-0 group-hover:w-full bg-[#00f0ff] transition-all duration-300" />
          </button>

          {/* Bouton 2 : Arsenal / Skins */}
          <button
            onClick={() => handleOpenModal('LOADOUT')}
            onMouseEnter={() => audioSystem.playHover()}
            className="group relative w-full text-left p-4 bg-[#0a1020]/90 border border-[#ff007f]/40 hover:border-[#ff007f] hover:bg-[#ff007f]/10 transition-all duration-200 cursor-pointer cyber-clip-corner cyber-glow-magenta"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="text-[10px] font-mono-tech text-[#ff007f] group-hover:text-white transition">
                  02 // ARSENAL & FIRESTORE
                </div>
                <div className="text-xl font-black font-orbitron text-white group-hover:text-[#ff007f] tracking-wider transition">
                  ARMES & SKINS
                </div>
                <div className="text-xs text-slate-400 mt-1 font-sans">
                  Personnaliser son armement & débloquer de nouveaux revêtements
                </div>
              </div>
              <div className="w-10 h-10 border border-[#ff007f]/40 flex items-center justify-center bg-black/40 group-hover:border-[#ff007f] group-hover:bg-[#ff007f] group-hover:text-black text-[#ff007f] transition">
                <Crosshair className="w-5 h-5" />
              </div>
            </div>
            <div className="absolute left-0 bottom-0 h-0.5 w-0 group-hover:w-full bg-[#ff007f] transition-all duration-300" />
          </button>

          {/* Bouton 3 : Choix de Map & Théâtre */}
          <button
            onClick={() => handleOpenModal('MAPS')}
            onMouseEnter={() => audioSystem.playHover()}
            className="group relative w-full text-left p-4 bg-[#0a1020]/90 border border-[#00f0ff]/40 hover:border-[#00f0ff] hover:bg-[#00f0ff]/10 transition-all duration-200 cursor-pointer cyber-clip-corner"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="text-[10px] font-mono-tech text-[#00f0ff] group-hover:text-white transition flex items-center gap-1.5">
                  <span>03 // THÉÂTRE D'ENGAGEMENT</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-[#ff007f]">{activeMap.codename}</span>
                </div>
                <div className="text-xl font-black font-orbitron text-white group-hover:text-[#00f0ff] tracking-wider transition">
                  SECTEUR // {activeMap.name}
                </div>
                <div className="text-xs text-slate-400 mt-1 font-sans">
                  {activeMap.environmentType === 'outdoor' ? 'Extérieur Vertical (Rooftop)' : 'Intérieur Confiné (Underground)'} • Spawns & Zone {activeMap.captureZone.code}
                </div>
              </div>
              <div className="w-10 h-10 border border-[#00f0ff]/40 flex items-center justify-center bg-black/40 group-hover:border-[#00f0ff] group-hover:bg-[#00f0ff] group-hover:text-black text-[#00f0ff] transition">
                <Compass className="w-5 h-5" />
              </div>
            </div>
            <div className="absolute left-0 bottom-0 h-0.5 w-0 group-hover:w-full bg-[#00f0ff] transition-all duration-300" />
          </button>

          {/* Bouton 4 : Stats / Registre */}
          <button
            onClick={() => handleOpenModal('STATS')}
            onMouseEnter={() => audioSystem.playHover()}
            className="group relative w-full text-left p-4 bg-[#0a1020]/90 border border-slate-800 hover:border-[#ffaa00] hover:bg-[#ffaa00]/10 transition-all duration-200 cursor-pointer cyber-clip-corner"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="text-[10px] font-mono-tech text-[#ffaa00]">
                  04 // COMBAT DOSSIER
                </div>
                <div className="text-xl font-black font-orbitron text-white group-hover:text-[#ffaa00] tracking-wider transition">
                  STATISTIQUES & RANG
                </div>
                <div className="text-xs text-slate-400 mt-1 font-sans">
                  Kills, ratio K/D, taux de victoires & historique de progression
                </div>
              </div>
              <div className="w-10 h-10 border border-slate-700 flex items-center justify-center bg-black/40 group-hover:border-[#ffaa00] text-slate-300 group-hover:text-[#ffaa00] transition">
                <BarChart2 className="w-5 h-5" />
              </div>
            </div>
          </button>

          {/* Bouton 5 : Paramètres & Clés */}
          <button
            onClick={() => handleOpenModal('SETTINGS')}
            onMouseEnter={() => audioSystem.playHover()}
            className="group relative w-full text-left p-4 bg-[#0a1020]/90 border border-slate-800 hover:border-slate-500 hover:bg-slate-800/40 transition-all duration-200 cursor-pointer cyber-clip-corner"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="text-[10px] font-mono-tech text-slate-400">
                  05 // SYSTÈME & INTÉGRATIONS
                </div>
                <div className="text-xl font-black font-orbitron text-white group-hover:text-slate-200 tracking-wider transition">
                  PARAMÈTRES & CLÉS
                </div>
                <div className="text-xs text-slate-400 mt-1 font-sans">
                  Audio, sensibilité souris, vérification des configs Firebase & Photon
                </div>
              </div>
              <div className="w-10 h-10 border border-slate-700 flex items-center justify-center bg-black/40 text-slate-300 transition">
                <SettingsIcon className="w-5 h-5" />
              </div>
            </div>
          </button>
        </div>

        {/* Panneau Droite : Info Matrice & Contrôle Vue 3D */}
        <div className="w-full max-w-sm p-5 bg-[#080d1a]/80 border border-slate-800 backdrop-blur-md cyber-clip-corner hidden md:block">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <span className="text-xs font-orbitron font-bold text-white flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#00f0ff]" />
              RENDU 3D THREE.JS
            </span>
            <span className="text-[10px] font-mono-tech text-emerald-400">
              60 FPS // SYNCHRONISÉ
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono-tech text-slate-400 leading-relaxed mb-4">
            <p>
              Arrière-plan animé via <span className="text-[#00f0ff]">React Three Fiber</span> et Three.js : Cœur holographique rotatif, particules de données en lévitation et grille cyberpunk.
            </p>
            <p className="text-slate-500 text-[11px]">
              La structure est prête à accueillir les modèles d'armes 3D (GLTF/GLB), les shaders personnalisés et le contrôleur First-Person.
            </p>
          </div>

          {/* Test Bascule Scène 3D */}
          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
            <button
              onClick={handleLaunchTestArena}
              className="w-full py-2.5 px-3 text-[11px] font-orbitron font-bold uppercase tracking-wider bg-[#00f0ff] hover:bg-cyan-300 text-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              LANCER LE CONTRÔLEUR FPS
            </button>
            <button
              onClick={() => {
                audioSystem.playClick();
                onScreenChange(currentScreen === 'IN_GAME_PREPARE' ? 'MAIN_MENU' : 'IN_GAME_PREPARE');
              }}
              className="w-full py-1.5 px-3 text-[10px] font-mono-tech uppercase tracking-wider bg-slate-900 border border-slate-700 hover:border-slate-500 hover:text-white transition cursor-pointer text-slate-400"
            >
              {currentScreen === 'IN_GAME_PREPARE' ? 'VUE MENU 3D' : 'VUE ARÈNE 3D EN FOND'}
            </button>
          </div>
        </div>
      </main>

      {/* 3. BARRE INFÉRIEURE (FOOTER & COMMANDES) */}
      <footer className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-800/80 text-xs font-mono-tech text-slate-500 z-10">
        <div className="flex items-center gap-3">
          <span className="text-[#00f0ff] font-bold">CYBERSTRIKE ENGINE</span>
          <span>•</span>
          <span>VITE + REACT + THREE.JS + FIREBASE + PHOTON</span>
        </div>

        <div className="flex items-center gap-4">
          <span>[ÉCHAP: RETOUR]</span>
          <span>[ZQSD / WASD: DÉPLACEMENT]</span>
          <span>[NETLIFY BUILD: READY]</span>
        </div>
      </footer>

      {/* MODALES MODULAIRES */}
      <LobbyModal
        isOpen={activeModal === 'LOBBY'}
        onClose={handleCloseModal}
        onEnterArena={handleEnterArena}
        playerProfile={playerProfile}
      />

      <LoadoutModal
        isOpen={activeModal === 'LOADOUT'}
        onClose={handleCloseModal}
        playerProfile={playerProfile}
        onProfileUpdate={onProfileUpdate}
      />

      <StatsModal
        isOpen={activeModal === 'STATS'}
        onClose={handleCloseModal}
        playerProfile={playerProfile}
      />

      <SettingsModal
        isOpen={activeModal === 'SETTINGS'}
        onClose={handleCloseModal}
        settings={settings}
        onSettingsChange={onSettingsUpdate}
      />

      {activeModal === 'MAPS' && (
        <MapSelectModal
          activeMapId={activeMapId}
          autoMapRotation={autoMapRotation}
          onSelectMap={onSelectMap}
          onToggleAutoRotation={onToggleAutoRotation}
          onDeploy={(mapId) => {
            onSelectMap(mapId);
            handleLaunchTestArena();
          }}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
