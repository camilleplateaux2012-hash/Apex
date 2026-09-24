/**
 * Affichage Tête Haute (Cyberpunk FPS HUD) avec Support Mobile & Tactile Complet
 * 
 * - Réticule de visée dynamique (Crosshair) avec dispersion et Hitmarkers
 * - Indicateurs de dégâts flottants (Damage numbers)
 * - Jauges de Santé (HP) et Bouclier énergétique avec esthétique cybernétique
 * - Compteur de munitions numérique et barre de rechargement
 * - Contrôles tactiles mobiles intégrés (Joystick virtuel, Touch Look, Tir, Saut, Sprint, Switch)
 * - Écran de pause / déverrouillage de la souris avec réglage de sensibilité (Souris & Tactile)
 */

import { useState, useEffect } from 'react';
import type { FPSWeaponState, FPSPlayerStats, HitmarkerInfo } from '../types/fps.ts';
import type { PhotonConnectionStatus, NetworkPlayerState, KillFeedEntry } from '../types/network.ts';
import type { VoiceChatStatus, RemoteVoiceState } from '../types/voice.ts';
import { photonClient } from '../net/photonClient.ts';
import { proximityVoiceSystem } from '../net/proximityVoiceSystem.ts';
import { audioSystem } from '../systems/audioSystem.ts';
import { inputSystem } from '../systems/inputSystem.ts';
import { MAPS_CATALOG, getMapById, DEFAULT_MAP_ID } from '../config/mapsConfig.ts';
import MobileControls from './MobileControls.tsx';
import MinimapOverlay from './MinimapOverlay.tsx';
import { 
  Shield, 
  Heart, 
  RotateCw, 
  Crosshair as CrosshairIcon, 
  ArrowLeft, 
  Settings2,
  Maximize2,
  Smartphone,
  MousePointer,
  Play,
  Compass,
  Building2,
  Cpu,
  Flag,
  Users,
  Wifi,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trophy,
  Skull,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio
} from 'lucide-react';

interface GameHUDProps {
  weaponState: FPSWeaponState;
  playerStats: FPSPlayerStats;
  hitmarkers: HitmarkerInfo[];
  isPointerLocked: boolean;
  isTouchMode: boolean;
  activeMapId?: string;
  onSelectMap?: (mapId: string) => void;
  onToggleTouchMode: () => void;
  mouseSensitivity: number;
  onSensitivityChange: (sens: number) => void;
  onLockPointer: () => void;
  onExitToMenu: () => void;
  onResetPosition: () => void;
  eliminatedCount: number;
  activeTargetsCount: number;
}

export default function GameHUD({
  weaponState,
  playerStats,
  hitmarkers,
  isPointerLocked,
  isTouchMode,
  activeMapId = DEFAULT_MAP_ID,
  onSelectMap = () => {},
  onToggleTouchMode,
  mouseSensitivity,
  onSensitivityChange,
  onLockPointer,
  onExitToMenu,
  onResetPosition,
  eliminatedCount,
  activeTargetsCount,
}: GameHUDProps) {
  // État de pause explicite
  const [isPausedMobile, setIsPausedMobile] = useState(false);
  const [isManualPause, setIsManualPause] = useState(false);
  const [isInitialDismissed, setIsInitialDismissed] = useState(false);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);

  // États Réseau Photon
  const [photonStatus, setPhotonStatus] = useState<PhotonConnectionStatus>(photonClient.getStatus());
  const [photonMessage, setPhotonMessage] = useState<string>('');
  const [photonError, setPhotonError] = useState<string>('');
  const [remotePlayers, setRemotePlayers] = useState<NetworkPlayerState[]>(photonClient.getRemotePlayers());
  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>([]);

  // États Chat Vocal de Proximité WebRTC
  const [voiceStatus, setVoiceStatus] = useState<VoiceChatStatus>(proximityVoiceSystem.getStatus());
  const [isMicMuted, setIsMicMuted] = useState<boolean>(proximityVoiceSystem.isMuted());
  const [isLocalSpeaking, setIsLocalSpeaking] = useState<boolean>(false);
  const [remoteVoiceStates, setRemoteVoiceStates] = useState<RemoteVoiceState[]>([]);
  const [isVoiceErrorDismissed, setIsVoiceErrorDismissed] = useState<boolean>(false);

  // Suivi de fin de manche / match pour le mode TEAM_DEATHMATCH
  const [hasMatchEnded, setHasMatchEnded] = useState<boolean>(false);
  const [matchResult, setMatchResult] = useState<'VICTORY' | 'DEFEAT' | 'DRAW' | null>(null);
  const [matchTimeLeft, setMatchTimeLeft] = useState<number>(180);

  const currentRoom = photonClient.getCurrentRoom();
  const isTDM = currentRoom?.gameMode === 'TEAM_DEATHMATCH';
  const localTeam = photonClient.getLocalTeam();
  const TARGET_SCORE = 20;

  // Calcul dynamique des scores d'équipe
  let calculatedRedScore = 0;
  let calculatedBlueScore = 0;

  if (isTDM) {
    if (localTeam === 'RED') {
      calculatedRedScore += eliminatedCount;
    } else if (localTeam === 'BLUE') {
      calculatedBlueScore += eliminatedCount;
    }

    remotePlayers.forEach((p) => {
      if (p.team === 'RED') {
        calculatedRedScore += p.kills || 0;
      } else if (p.team === 'BLUE') {
        calculatedBlueScore += p.kills || 0;
      }
    });
  }

  const activeMap = getMapById(activeMapId);

  // Synchronisation des états Photon, Voice Chat et Killfeed
  useEffect(() => {
    const unsubStatus = photonClient.onStatusChange((s, msg, err) => {
      setPhotonStatus(s);
      if (msg) setPhotonMessage(msg);
      if (err) setPhotonError(err);
    });

    const unsubPlayers = photonClient.onRemotePlayersChange((players) => {
      setRemotePlayers(players);
    });

    const unsubKillFeed = photonClient.onKillFeed((entry) => {
      setKillFeed((prev) => [entry, ...prev.slice(0, 4)]);
      setTimeout(() => {
        setKillFeed((prev) => prev.filter((k) => k.id !== entry.id));
      }, 5000);
    });

    // Abonnements Chat Vocal de Proximité
    const unsubVoiceStatus = proximityVoiceSystem.onStatusChange((vs) => {
      setVoiceStatus(vs);
      if (vs === 'ERROR') {
        setIsVoiceErrorDismissed(false);
      }
    });

    const unsubVoiceRemote = proximityVoiceSystem.onRemoteVoiceStatesChange((states) => {
      setRemoteVoiceStates(states);
    });

    const unsubVoiceSpeaking = proximityVoiceSystem.onLocalSpeaking((isSpeaking) => {
      setIsLocalSpeaking(isSpeaking);
    });

    // Raccourcis Clavier (TAB: Scoreboard, V: Muer/Démuer Micro)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        setIsScoreboardOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'v') {
        // Toggle Micro
        if (proximityVoiceSystem.getStatus() === 'DISABLED' || proximityVoiceSystem.getStatus() === 'ERROR') {
          proximityVoiceSystem.initialize();
        } else {
          const muted = proximityVoiceSystem.toggleMute();
          setIsMicMuted(muted);
          audioSystem.playClick();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubStatus();
      unsubPlayers();
      unsubKillFeed();
      unsubVoiceStatus();
      unsubVoiceRemote();
      unsubVoiceSpeaking();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Chrono et compte à rebours TDM
  useEffect(() => {
    const activeRoom = photonClient.getCurrentRoom();
    const isRoomTDM = activeRoom?.gameMode === 'TEAM_DEATHMATCH';
    if (!isRoomTDM || hasMatchEnded) return;

    const interval = setInterval(() => {
      setMatchTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setHasMatchEnded(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [hasMatchEnded]);

  // Détection de victoire par score cible atteint (20 frags)
  useEffect(() => {
    const activeRoom = photonClient.getCurrentRoom();
    const isRoomTDM = activeRoom?.gameMode === 'TEAM_DEATHMATCH';
    if (!isRoomTDM || hasMatchEnded) return;

    if (calculatedRedScore >= TARGET_SCORE || calculatedBlueScore >= TARGET_SCORE) {
      setHasMatchEnded(true);
    }
  }, [calculatedRedScore, calculatedBlueScore, hasMatchEnded]);

  // Résolution du résultat de fin de match
  useEffect(() => {
    if (hasMatchEnded) {
      const activeRoom = photonClient.getCurrentRoom();
      const isRoomTDM = activeRoom?.gameMode === 'TEAM_DEATHMATCH';
      if (!isRoomTDM) return;

      const team = photonClient.getLocalTeam();
      const ourScore = team === 'RED' ? calculatedRedScore : calculatedBlueScore;
      const enemyScore = team === 'RED' ? calculatedBlueScore : calculatedRedScore;

      if (ourScore > enemyScore) {
        setMatchResult('VICTORY');
      } else if (ourScore < enemyScore) {
        setMatchResult('DEFEAT');
      } else {
        setMatchResult('DRAW');
      }
      inputSystem.exitPointerLock();
    }
  }, [hasMatchEnded, calculatedRedScore, calculatedBlueScore]);

  // Synchronisation lors d'un verrouillage réussi
  useEffect(() => {
    if (isPointerLocked) {
      setIsInitialDismissed(true);
      setIsManualPause(false);
    }
  }, [isPointerLocked]);

  // Déterminer si le menu de pause doit être affiché
  const isPauseMenuVisible = isTouchMode ? isPausedMobile : (!isInitialDismissed || isManualPause);

  // Détecter le dernier hitmarker récent
  const recentHit = hitmarkers.length > 0 ? hitmarkers[hitmarkers.length - 1] : null;
  const isHitActive = recentHit && Date.now() - recentHit.timestamp < 180;

  // Détection des états dynamiques du joueur pour le réticule (Tir, Saut, Course, Mouvement)
  const isFiring = (window as any).localPlayerIsFiring || false;
  const isAirborne = playerStats.onGround === false || (window as any).localPlayerOnGround === false;
  const isMoving = playerStats.velocity.length() > 0.5;
  const isSprinting = playerStats.isSprinting || (window as any).localPlayerIsSprinting || false;

  // Calcul du spread dynamique du crosshair selon le tir, saut, course et arme
  let spreadPx = 4;
  if (isFiring) spreadPx += 14;
  if (isAirborne) spreadPx += 16;
  if (isSprinting) spreadPx += 10;
  else if (isMoving) spreadPx += 6;

  if (weaponState.type === 'sniper' && !isFiring && !isAirborne && !isMoving) {
    spreadPx = 2;
  }

  const hpPercent = Math.max(0, Math.min(100, (playerStats.hp / playerStats.maxHp) * 100));
  const shieldPercent = Math.max(0, Math.min(100, (playerStats.shield / playerStats.maxShield) * 100));

  const handleResumeGame = () => {
    audioSystem.playClick();
    setIsPausedMobile(false);
    setIsInitialDismissed(true);
    setIsManualPause(false);
    if (!isTouchMode) {
      onLockPointer();
    }
  };

  const handleOpenPauseMenu = () => {
    audioSystem.playClick();
    if (isTouchMode) {
      setIsPausedMobile(true);
    } else {
      setIsManualPause(true);
      inputSystem.exitPointerLock();
    }
  };

  const handleWeaponSlotSelect = (index: number) => {
    inputSystem.selectWeapon(index);
  };

  return (
    <div 
      className="absolute inset-0 select-none z-10 flex flex-col justify-between p-3 sm:p-4 md:p-6 pointer-events-none"
      onClick={(e) => {
        // Clic sur l'écran pour reverrouiller la souris si le menu n'est pas ouvert
        if (!isPauseMenuVisible && !isTouchMode && !isPointerLocked) {
          onLockPointer();
        }
      }}
    >
      {/* 1. BARRE SUPÉRIEURE (STATUS MISSION, DIAGNOSTIC RÉSEAU ET CIBLES) */}
      <header className="flex justify-between items-start z-30">
        {/* Panel Central TDM - Affiché uniquement en Mode Team Deathmatch */}
        {isTDM && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-[#080d1a]/95 border border-[#00f0ff]/30 px-5 py-2 backdrop-blur-md cyber-clip-corner flex flex-col items-center gap-1 shadow-[0_0_20px_rgba(0,240,255,0.1)] pointer-events-auto">
            <div className="flex items-center gap-6">
              {/* Équipe Rouge */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-tech text-[#ff0055] font-bold tracking-wider">ROUGE</span>
                <span className="text-xl font-orbitron font-black text-[#ff0055]">{calculatedRedScore}</span>
              </div>

              {/* Séparateur & Chrono */}
              <div className="flex flex-col items-center border-x border-slate-800 px-4">
                <span className="text-[9px] font-mono-tech text-slate-400 uppercase tracking-widest">TEMPS RESTANT</span>
                <span className="text-sm font-orbitron font-bold text-[#00f0ff] tracking-wider">
                  {Math.floor(matchTimeLeft / 60)}:{(matchTimeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>

              {/* Équipe Bleue */}
              <div className="flex items-center gap-2">
                <span className="text-xl font-orbitron font-black text-[#00f0ff]">{calculatedBlueScore}</span>
                <span className="text-[10px] font-mono-tech text-[#00f0ff] font-bold tracking-wider">BLEU</span>
              </div>
            </div>
            
            <div className="text-[8px] font-mono-tech text-slate-500 uppercase tracking-widest">
              OBJECTIF : <span className="text-[#00f0ff] font-semibold">{TARGET_SCORE} FRAGS</span>
            </div>
          </div>
        )}

        {/* Info Arène & Diagnostic Réseau Photon */}
        <div className="flex flex-col gap-1.5">
          <div className="bg-[#080d1a]/85 border border-[#00f0ff]/40 px-3 py-1.5 md:px-3.5 md:py-2 backdrop-blur-md cyber-clip-corner flex items-center gap-2.5 md:gap-3 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
            <div
              className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0"
              style={{ backgroundColor: activeMap.accentColor }}
            />
            <div>
              <div className="text-[9px] md:text-[10px] font-mono-tech text-[#00f0ff] tracking-widest uppercase flex items-center gap-1.5">
                <span>{activeMap.codename}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">{activeMap.environmentType === 'outdoor' ? 'EXTÉRIEUR' : 'INTÉRIEUR'}</span>
              </div>
              <div className="text-[11px] md:text-xs font-orbitron font-bold text-white tracking-wider flex items-center gap-1.5">
                <span>{activeMap.name}</span>
              </div>
            </div>
          </div>

          {/* Indicateur d'état de connexion Photon visible en petit à l'écran */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 text-[9px] md:text-[10px] font-mono-tech border backdrop-blur-md cyber-clip-corner shadow-md ${
              photonStatus === 'IN_ROOM' || photonStatus === 'IN_LOBBY' || photonStatus === 'CONNECTED_TO_MASTER'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                : photonStatus === 'ERROR'
                ? 'bg-rose-950/90 border-rose-500/70 text-rose-300'
                : 'bg-amber-950/80 border-amber-500/50 text-amber-300'
            }`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                photonStatus === 'IN_ROOM' ? 'bg-emerald-400 animate-pulse' : photonStatus === 'ERROR' ? 'bg-rose-500 animate-ping' : 'bg-amber-400 animate-spin'
              }`} />
              <span>
                {photonStatus === 'IN_ROOM'
                  ? `Connecté ✅ (~${photonClient.getPing()}ms) // Salon: ${photonClient.getCurrentRoom()?.name || 'MULTI'}`
                  : photonStatus === 'CONNECTED_TO_MASTER' || photonStatus === 'IN_LOBBY'
                  ? `Lobby Connecté ✅ // En attente`
                  : photonStatus === 'ERROR'
                  ? `Erreur de connexion ❌ ${photonError ? `[${photonError}]` : ''}`
                  : `Connexion... 🔄 (${photonMessage || 'Initialisation'})`}
              </span>
              {photonStatus === 'ERROR' && (
                <button
                  onClick={() => photonClient.connect()}
                  className="ml-1 px-1.5 py-0.5 bg-rose-900 hover:bg-rose-700 text-white text-[8px] font-bold border border-rose-600 cursor-pointer"
                >
                  RECONNECTER
                </button>
              )}
            </div>
          </div>

          {/* RADAR MINIMAP CIRCULAIRE HOLOGRAPHIQUE */}
          <div className="mt-1.5 pointer-events-auto">
            <MinimapOverlay
              playerStats={playerStats}
              activeMap={activeMap}
            />
          </div>

          {/* Indicateur d'erreur micro si le statut est ERROR et n'est pas ignoré */}
          {voiceStatus === 'ERROR' && !isVoiceErrorDismissed && (
            <div className="flex items-center gap-2 pointer-events-auto mt-1.5 max-w-sm sm:max-w-md">
              <div className="flex flex-col gap-1 px-3 py-2 text-[9px] md:text-[10px] font-mono-tech border bg-rose-950/95 border-rose-500/70 text-rose-300 backdrop-blur-md cyber-clip-corner shadow-[0_0_15px_rgba(244,63,94,0.25)]">
                <div className="flex items-center gap-1.5 font-bold text-rose-400">
                  <MicOff className="w-3.5 h-3.5 animate-pulse shrink-0" />
                  <span>[ACCÈS MICRO BLOQUÉ]</span>
                </div>
                <p className="text-[8px] md:text-[9px] leading-relaxed text-rose-200">
                  Le navigateur ou l'iframe de test a bloqué l'accès à votre microphone ({proximityVoiceSystem.getStatusMessage()}).
                  Veuillez cliquer sur le cadenas dans la barre d'adresse ou vérifier les autorisations d'iframe de votre plateforme pour utiliser le chat vocal 3D.
                </p>
                <div className="flex gap-2 mt-1.5">
                  <button
                    onClick={() => {
                      audioSystem.playClick();
                      proximityVoiceSystem.initialize();
                    }}
                    className="px-2 py-0.5 bg-rose-900 hover:bg-rose-700 text-white text-[8px] font-bold border border-rose-500 cursor-pointer"
                  >
                    RÉESSAYER
                  </button>
                  <button
                    onClick={() => {
                      audioSystem.playClick();
                      setIsVoiceErrorDismissed(true);
                    }}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[8px] font-bold border border-slate-600 cursor-pointer"
                  >
                    IGNORER
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Score, Killfeed & Cibles détruites + Boutons Voice, Scoreboard & Pause */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 md:gap-3 pointer-events-auto">
            {/* Bouton Chat Vocal Micro (Raccourci 'V') */}
            <button
              onClick={() => {
                if (voiceStatus === 'DISABLED' || voiceStatus === 'ERROR') {
                  proximityVoiceSystem.initialize();
                } else {
                  const muted = proximityVoiceSystem.toggleMute();
                  setIsMicMuted(muted);
                  audioSystem.playClick();
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border transition backdrop-blur-md cursor-pointer cyber-clip-corner text-[10px] font-mono-tech ${
                voiceStatus === 'TRANSMITTING'
                  ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                  : isMicMuted || voiceStatus === 'MUTED'
                  ? 'bg-rose-950/80 border-rose-500/60 text-rose-300'
                  : voiceStatus === 'READY'
                  ? 'bg-[#00f0ff]/15 border-[#00f0ff]/60 text-[#00f0ff]'
                  : 'bg-slate-900/80 border-slate-700 text-slate-400'
              }`}
              title="Activer/Couper le microphone de proximité (Touche V)"
            >
              {isMicMuted || voiceStatus === 'MUTED' ? (
                <MicOff className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="hidden sm:inline">
                {voiceStatus === 'TRANSMITTING'
                  ? 'PARLE...'
                  : isMicMuted || voiceStatus === 'MUTED'
                  ? 'MICRO MUET [V]'
                  : voiceStatus === 'READY'
                  ? 'MICRO ACTIF [V]'
                  : 'ACTIVER VOCAL'}
              </span>
            </button>

            {/* Bouton Scoreboard / Liste Joueurs */}
            <button
              onClick={() => {
                audioSystem.playClick();
                setIsScoreboardOpen((prev) => !prev);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#080d1a]/90 border border-slate-700 hover:border-[#00f0ff] hover:text-[#00f0ff] text-[10px] font-mono-tech text-slate-300 transition backdrop-blur-md cursor-pointer cyber-clip-corner"
              title="Afficher la liste des joueurs connectés (Touche TAB)"
            >
              <Users className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span className="hidden sm:inline">JOUEURS</span>
              <span className="text-[#00f0ff] font-bold">({remotePlayers.length + 1})</span>
            </button>

            {/* Indicateur de la Zone de Capture */}
            <div className="hidden md:flex items-center gap-2 bg-[#080d1a]/85 border border-slate-800 px-3 py-1.5 backdrop-blur-md cyber-clip-corner">
              <Flag className="w-3.5 h-3.5 text-[#00f0ff]" />
              <div className="text-[10px] font-mono-tech text-slate-300">
                OBJECTIF : <span className="text-[#00f0ff] font-bold">NODE {activeMap.captureZone.code}</span>
              </div>
            </div>

            {/* Toggle Mobile Mode Rapide */}
            <button
              onClick={() => {
                audioSystem.playClick();
                onToggleTouchMode();
              }}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#080d1a]/90 border border-slate-700 hover:border-[#00f0ff] text-[10px] font-mono-tech text-slate-300 hover:text-white transition backdrop-blur-md cursor-pointer"
              title="Bascule entre commandes Souris et commandes Tactiles"
            >
              {isTouchMode ? (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-[#00f0ff]" />
                  <span>MODE TACTILE</span>
                </>
              ) : (
                <>
                  <MousePointer className="w-3.5 h-3.5 text-amber-400" />
                  <span>MODE CLAVIER/SOURIS</span>
                </>
              )}
            </button>

            <div className="bg-[#080d1a]/85 border border-[#ff007f]/40 px-2.5 py-1.5 md:px-3.5 md:py-2 backdrop-blur-md cyber-clip-corner text-right">
              <div className="text-[9px] md:text-[10px] font-mono-tech text-slate-400 uppercase">
                FRAGS
              </div>
              <div className="text-sm md:text-base font-orbitron font-bold text-[#ff007f]">
                {eliminatedCount}
              </div>
            </div>
            <div className="bg-[#080d1a]/85 border border-slate-800 px-2.5 py-1.5 md:px-3 md:py-2 backdrop-blur-md cyber-clip-corner text-right">
              <div className="text-[9px] md:text-[10px] font-mono-tech text-slate-400 uppercase">
                CIBLES
              </div>
              <div className="text-xs md:text-sm font-orbitron font-bold text-[#00f0ff]">
                {activeTargetsCount}
              </div>
            </div>

            {/* Bouton Pause rapide */}
            <button
              onClick={handleOpenPauseMenu}
              className="p-2 md:p-2.5 bg-[#080d1a]/85 border border-slate-700 hover:border-[#00f0ff] hover:text-[#00f0ff] text-slate-300 transition backdrop-blur-md cyber-clip-corner cursor-pointer"
              title="Menu Pause / Options"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>

          {/* Killfeed en temps réel */}
          {killFeed.length > 0 && (
            <div className="space-y-1 max-w-xs pointer-events-none mt-1">
              {killFeed.map((kf) => (
                <div
                  key={kf.id}
                  className="flex items-center gap-2 px-2.5 py-1 bg-[#090d18]/90 border border-slate-800 text-[10px] font-mono-tech text-white backdrop-blur-md cyber-clip-badge shadow-md animate-fade-in"
                >
                  <span className="text-[#00f0ff] font-bold truncate max-w-[90px]">{kf.killerName}</span>
                  <Skull className="w-3 h-3 text-[#ff007f] shrink-0" />
                  <span className="text-[#ff007f] font-bold truncate max-w-[90px]">{kf.victimName}</span>
                  {kf.isHeadshot && (
                    <span className="px-1 py-0.2 bg-amber-500/20 text-amber-400 text-[8px] font-bold border border-amber-500/40">
                      HS
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Joueurs qui parlent à proximité (Chat Vocal de Proximité WebRTC) */}
          {(isLocalSpeaking || remoteVoiceStates.some((r) => r.isSpeaking)) && (
            <div className="space-y-1 max-w-xs pointer-events-none mt-1">
              {isLocalSpeaking && (
                <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-950/90 border border-emerald-500/60 text-[10px] font-mono-tech text-emerald-300 backdrop-blur-md cyber-clip-badge shadow-md animate-pulse">
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  <span className="font-bold">VOUS (MICRO)</span>
                  <span className="text-[9px] text-emerald-400/80">• ÉMISSION EN ENCOURS</span>
                </div>
              )}
              {remoteVoiceStates.filter((r) => r.isSpeaking).map((rv) => (
                <div
                  key={rv.actorNr}
                  className="flex items-center justify-between gap-2 px-2.5 py-1 bg-[#080d1a]/90 border border-[#00f0ff]/60 text-[10px] font-mono-tech text-[#00f0ff] backdrop-blur-md cyber-clip-badge shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-[#00f0ff] animate-pulse" />
                    <span className="font-bold">{rv.callsign}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {Math.round(rv.distance)}m
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* BANNIÈRE BOUCLIER D'IMMUNITÉ DE RÉAPPARITION */}
      {(playerStats.isImmune || (playerStats.immunityTimer || 0) > 0) && (
        <div className="absolute top-18 md:top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
          <div className="flex items-center gap-2 px-3.5 py-1.5 md:px-5 md:py-2 bg-[#00f0ff]/15 border-2 border-[#00f0ff] backdrop-blur-md cyber-clip-corner shadow-[0_0_25px_rgba(0,240,255,0.7)] animate-pulse">
            <Shield className="w-5 h-5 text-[#00f0ff] animate-spin" />
            <div className="text-center">
              <div className="text-[11px] md:text-xs font-orbitron font-extrabold text-[#00f0ff] tracking-widest uppercase">
                BOUCLIER D'IMMUNITÉ ACTIF
              </div>
              <div className="text-[9px] md:text-[10px] font-mono-tech text-cyan-200">
                INVULNÉRABLE // {Math.max(0, playerStats.immunityTimer || 0).toFixed(1)}s
              </div>
            </div>
          </div>
          {/* Jauge animée du compte à rebours d'immunité */}
          <div className="w-40 md:w-52 h-1 bg-slate-900 border border-[#00f0ff]/60 mt-1 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#00f0ff] to-[#38bdf8] transition-all duration-75 shadow-[0_0_8px_#00f0ff]"
              style={{ width: `${Math.min(100, Math.max(0, ((playerStats.immunityTimer || 0) / 3.0) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* BANNIÈRE SANCTUAIRE DE BASE (SOIN CONTINU + TIRS ENNEMIS BLOQUÉS) */}
      {playerStats.isInSanctuary && (
        <div className="absolute top-28 md:top-32 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
          <div className="flex items-center gap-2 px-3.5 py-1.5 md:px-4 md:py-2 bg-emerald-950/85 border-2 border-emerald-400 backdrop-blur-md cyber-clip-corner shadow-[0_0_25px_rgba(52,211,153,0.6)] animate-pulse">
            <Heart className="w-5 h-5 text-emerald-400 fill-emerald-400/30 animate-bounce" />
            <div>
              <div className="text-[11px] md:text-xs font-orbitron font-extrabold text-emerald-300 tracking-wider">
                BASE SANCTUAIRE // ZONE DE SOIN ACTIF
              </div>
              <div className="text-[9px] md:text-[10px] font-mono-tech text-emerald-400">
                RÉGÉNÉRATION CONTINUE (+25 PV/s • +20 BCL/s) & PROTECTION TOTALE
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. RÉTICULE CENTRAL CYBERPUNK (CROSSHAIR & HITMARKERS) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center z-10">
        {/* Point central Réticule */}
        <div
          className={`w-1.5 h-1.5 rounded-full transition-all duration-75 ${
            isHitActive ? 'scale-150' : ''
          }`}
          style={{
            backgroundColor: isHitActive ? '#ff007f' : (weaponState.beamColor || '#00f0ff'),
            boxShadow: `0 0 8px ${isHitActive ? '#ff007f' : (weaponState.beamColor || '#00f0ff')}`,
          }}
        />

        {/* 4 Brackets réticule adaptatifs selon l'arme */}
        {/* Haut */}
        <div
          className="absolute w-0.5 transition-all duration-75"
          style={{
            height: weaponState.type === 'sniper' ? '12px' : '8px',
            top: `-${(weaponState.type === 'sniper' ? 8 : 10) + spreadPx}px`,
            backgroundColor: weaponState.beamColor || '#00f0ff',
            boxShadow: `0 0 6px ${weaponState.beamColor || '#00f0ff'}`,
          }}
        />
        {/* Bas */}
        <div
          className="absolute w-0.5 transition-all duration-75"
          style={{
            height: weaponState.type === 'sniper' ? '12px' : '8px',
            bottom: `-${(weaponState.type === 'sniper' ? 8 : 10) + spreadPx}px`,
            backgroundColor: weaponState.beamColor || '#00f0ff',
            boxShadow: `0 0 6px ${weaponState.beamColor || '#00f0ff'}`,
          }}
        />
        {/* Gauche */}
        <div
          className="absolute h-0.5 transition-all duration-75"
          style={{
            width: weaponState.type === 'sniper' ? '12px' : '8px',
            left: `-${(weaponState.type === 'sniper' ? 8 : 10) + spreadPx}px`,
            backgroundColor: weaponState.beamColor || '#00f0ff',
            boxShadow: `0 0 6px ${weaponState.beamColor || '#00f0ff'}`,
          }}
        />
        {/* Droite */}
        <div
          className="absolute h-0.5 transition-all duration-75"
          style={{
            width: weaponState.type === 'sniper' ? '12px' : '8px',
            right: `-${(weaponState.type === 'sniper' ? 8 : 10) + spreadPx}px`,
            backgroundColor: weaponState.beamColor || '#00f0ff',
            boxShadow: `0 0 6px ${weaponState.beamColor || '#00f0ff'}`,
          }}
        />

        {/* HITMARKER EN CROIX DE CONFIRMATION D'IMPACT */}
        {isHitActive && (
          <div className="absolute w-7 h-7 animate-ping pointer-events-none">
            <div className="absolute inset-0 border-2 border-[#ff007f] rotate-45" />
          </div>
        )}

        {/* AFFICHAGE DU STATUT AIM LOCK / ASSISTANCE VISÉE */}
        {inputSystem.isTargetLockActive() && (
          <div className="absolute -bottom-9 flex items-center gap-1.5 px-2 py-0.5 bg-[#ff007f]/20 border border-[#ff007f] rounded text-[8px] font-orbitron font-bold text-[#ff007f] tracking-widest uppercase shadow-[0_0_10px_#ff007f] animate-pulse whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff007f] animate-ping" />
            LOCK-ON ENGAGÉ
          </div>
        )}

        {/* AFFICHAGE DES DÉGÂTS FLOTTANTS (DAMAGE POPUPS) */}
        {recentHit && Date.now() - recentHit.timestamp < 650 && (
          <div
            key={recentHit.id}
            className={`absolute -top-10 font-orbitron font-black text-sm tracking-wider animate-bounce ${
              recentHit.isCrit
                ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                : 'text-[#ff007f] drop-shadow-[0_0_8px_rgba(255,0,127,0.8)]'
            }`}
          >
            {recentHit.isCrit ? 'CRIT ' : ''}-{recentHit.damage}
          </div>
        )}
      </div>

      {/* 3. CONTRÔLES TACTILES POUR MOBILE & TABLETTE */}
      {isTouchMode && !isPauseMenuVisible && (
        <MobileControls
          weaponState={weaponState}
          isSprinting={playerStats.isSprinting}
          onPauseToggle={() => {
            audioSystem.playClick();
            setIsPausedMobile(true);
          }}
          onWeaponSelect={handleWeaponSlotSelect}
          touchSensitivity={mouseSensitivity}
        />
      )}

      {/* 4. BARRE INFÉRIEURE : SANTÉ & BOUCLIER (GAUCHE) + MUNITIONS & ARSENAL (DROITE) */}
      <footer className="flex justify-between items-end gap-2 md:gap-4 z-10">
        {/* BLOC SANTÉ / BOUCLIER (GAUCHE) */}
        <div className={`bg-[#080d1a]/90 border border-slate-800 p-2.5 sm:p-3 md:p-4 backdrop-blur-md cyber-clip-corner ${isTouchMode ? 'w-48 sm:w-56 md:w-72 mb-16 sm:mb-0' : 'w-56 md:w-72'}`}>
          {/* Ligne Bouclier */}
          <div className="mb-1.5 md:mb-2">
            <div className="flex justify-between items-center text-[9px] md:text-[10px] font-mono-tech text-cyan-400 mb-0.5 md:mb-1">
              <span className="flex items-center gap-1 font-bold">
                <Shield className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#00f0ff]" /> BOUCLIER
              </span>
              <span>{Math.round(playerStats.shield)} / {playerStats.maxShield}</span>
            </div>
            <div className="w-full h-1 md:h-1.5 bg-slate-900 border border-slate-700/60 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00f0ff] to-cyan-300 transition-all duration-150"
                style={{ width: `${shieldPercent}%` }}
              />
            </div>
          </div>

          {/* Ligne Santé */}
          <div>
            <div className="flex justify-between items-center text-[9px] md:text-[10px] font-mono-tech text-emerald-400 mb-0.5 md:mb-1">
              <span className="flex items-center gap-1 font-bold">
                <Heart className="w-2.5 h-2.5 md:w-3 md:h-3 text-emerald-400" /> SANTÉ
              </span>
              <span>{Math.round(playerStats.hp)} / {playerStats.maxHp}</span>
            </div>
            <div className="w-full h-2 md:h-2.5 bg-slate-900 border border-slate-700/60 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-all duration-150"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-1.5 pt-1 border-t border-slate-800/80 hidden sm:flex justify-between text-[8px] md:text-[9px] font-mono-tech text-slate-500">
            <span>EXOSQUELETTE MK-IV</span>
            <span className="text-[#00f0ff]">SYSTÈMES : NOMINAUX</span>
          </div>
        </div>

        {/* CONSEILS DE COMMANDES DISCRETS AU CENTRE (SUR DESKTOP) */}
        {!isTouchMode && (
          <div className="hidden xl:flex flex-col items-center pb-1 text-[10px] font-mono-tech text-slate-400 bg-black/50 px-4 py-2 border border-slate-800/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span><strong className="text-[#00f0ff]">[ZQSD / WASD]</strong> DÉPLACEMENT</span>
              <span>•</span>
              <span><strong className="text-[#00f0ff]">[SHIFT]</strong> SPRINT</span>
              <span>•</span>
              <span><strong className="text-[#00f0ff]">[ESPACE]</strong> SAUT</span>
              <span>•</span>
              <span><strong className="text-[#ff007f]">[CLIC]</strong> TIRER</span>
              <span>•</span>
              <span><strong className="text-[#00f0ff]">[R]</strong> RECHARGER</span>
              <span>•</span>
              <span><strong className="text-amber-400">[1 / 2 / 3 OU MOLETTE]</strong> CHANGER D&apos;ARME</span>
            </div>
          </div>
        )}

        {/* BLOC ARME & MUNITIONS (DROITE - CACHÉ EN PARTIE SI COMMANDES MOBILES SUPERPOSÉES) */}
        {!isTouchMode ? (
          <div className="flex flex-col items-end gap-1.5 w-64 md:w-80">
            {/* BARRE MODULAIRE DE SÉLECTION D'ARME (Touches 1, 2, 3... ou molette) */}
            {weaponState.allWeapons && weaponState.allWeapons.length > 0 && (
              <div className="flex gap-1 justify-end w-full">
                {weaponState.allWeapons.map((slot, idx) => {
                  const isActive = idx === weaponState.activeWeaponIndex;
                  return (
                    <div
                      key={slot.id}
                      className={`px-2 py-1 flex-1 text-left border transition-all duration-150 backdrop-blur-md ${
                        isActive
                          ? 'bg-slate-900/90 shadow-lg'
                          : 'bg-black/60 border-slate-800/80 opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        borderColor: isActive ? (slot.accentColor || '#00f0ff') : undefined,
                        boxShadow: isActive ? `0 0 10px ${slot.accentColor}40` : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono-tech">
                        <span
                          className="font-bold px-1 rounded-xs"
                          style={{
                            backgroundColor: isActive ? `${slot.accentColor}33` : '#ffffff1a',
                            color: isActive ? slot.accentColor : '#94a3b8',
                          }}
                        >
                          [{idx + 1}]
                        </span>
                        <span className="font-orbitron font-semibold text-[8px] truncate text-slate-300 max-w-[55px]">
                          {slot.name.split(' ')[0]}
                        </span>
                      </div>
                      <div className="text-[8px] font-mono-tech text-right mt-0.5" style={{ color: isActive ? slot.accentColor : '#64748b' }}>
                        {slot.currentAmmo}/{slot.maxAmmo}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* FICHE PRINCIPALE DE L'ARME ACTIVE */}
            <div className="bg-[#080d1a]/90 border border-slate-800 p-3 md:p-4 backdrop-blur-md cyber-clip-corner w-full text-right shadow-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono-tech text-slate-400">
                  EMPLACEMENT [{weaponState.activeWeaponIndex + 1}]
                </span>
                <span
                  className="text-[9px] font-mono-tech px-1.5 py-0.5 border"
                  style={{
                    color: weaponState.accentColor || '#00f0ff',
                    borderColor: `${weaponState.accentColor || '#00f0ff'}55`,
                    backgroundColor: `${weaponState.accentColor || '#00f0ff'}15`,
                  }}
                >
                  {weaponState.categoryLabel || weaponState.type.toUpperCase()}
                </span>
              </div>

              <div className="font-orbitron font-black text-sm text-white tracking-wider mb-2">
                {weaponState.name}
              </div>

              {/* Affichage Chiffré des Munitions */}
              <div className="flex items-baseline justify-end gap-2">
                <span
                  className={`font-orbitron font-black text-3xl md:text-4xl tracking-tight transition-colors ${
                    weaponState.ammo === 0
                      ? 'text-rose-500 animate-pulse'
                      : weaponState.ammo <= Math.ceil(weaponState.maxAmmo * 0.25)
                      ? 'text-amber-400'
                      : 'text-white'
                  }`}
                  style={{
                    textShadow: weaponState.ammo > 0 ? `0 0 12px ${weaponState.accentColor || '#00f0ff'}80` : undefined,
                  }}
                >
                  {weaponState.ammo}
                </span>
                <span className="font-mono-tech text-xs text-slate-400">
                  / {weaponState.maxAmmo}
                </span>
                <span className="text-[10px] font-mono-tech text-slate-500 ml-1">
                  (RES: {weaponState.reserveAmmo})
                </span>
              </div>

              {/* Barre de Rechargement / Cellules de plasma */}
              {weaponState.isReloading ? (
                <div className="mt-2">
                  <div className="flex justify-between text-[9px] font-mono-tech mb-0.5" style={{ color: weaponState.accentColor || '#ff007f' }}>
                    <span className="flex items-center gap-1 font-bold">
                      <RotateCw className="w-2.5 h-2.5 animate-spin" /> RECHARGE PLASMA...
                    </span>
                    <span>{Math.round(weaponState.reloadProgress * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 border border-slate-700/60 overflow-hidden">
                    <div
                      className="h-full transition-all duration-75"
                      style={{
                        width: `${Math.min(100, Math.max(0, weaponState.reloadProgress * 100))}%`,
                        backgroundColor: weaponState.accentColor || '#ff007f',
                        boxShadow: `0 0 8px ${weaponState.accentColor || '#ff007f'}`,
                      }}
                    />
                  </div>
                </div>
              ) : weaponState.ammo === 0 ? (
                <div className="mt-2 py-0.5 bg-rose-500/10 border border-rose-500/40 text-rose-400 text-center text-[9px] font-mono-tech animate-pulse">
                  [CHARGEUR VIDE - APPUYEZ SUR R]
                </div>
              ) : (
                <div className="flex gap-1 justify-end mt-2">
                  {Array.from({ length: weaponState.maxAmmo }).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-2 flex-1 rounded-xs transition-all duration-100"
                      style={{
                        backgroundColor: idx < weaponState.ammo ? (weaponState.beamColor || '#00f0ff') : '#1e293b',
                        boxShadow: idx < weaponState.ammo ? `0 0 4px ${weaponState.beamColor || '#00f0ff'}` : undefined,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Mini badge munitions en haut / coin mobile */
          <div className="bg-[#080d1a]/90 border border-slate-800 p-2 backdrop-blur-md cyber-clip-corner text-right mb-16 sm:mb-0">
            <div className="text-[9px] font-orbitron font-bold text-slate-300 truncate max-w-[120px]">
              {weaponState.name}
            </div>
            <div className="text-xl font-orbitron font-black text-white flex items-baseline justify-end gap-1">
              <span className={weaponState.ammo === 0 ? 'text-rose-500 animate-pulse' : 'text-cyan-400'}>
                {weaponState.ammo}
              </span>
              <span className="text-[10px] font-mono-tech text-slate-400">/{weaponState.maxAmmo}</span>
            </div>
          </div>
        )}
      </footer>

      {/* 5. OVERLAY SCOREBOARD MULTIJOUEUR (TOUCHE TAB / BOUTON JOUEURS) */}
      {isScoreboardOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="relative w-full max-w-2xl bg-[#090d1a] border border-[#00f0ff]/60 p-5 sm:p-6 cyber-clip-corner shadow-[0_0_30px_rgba(0,240,255,0.2)]">
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-orbitron font-bold text-white tracking-wider">
                  CLASSEMENT MULTIJOUEUR // {photonClient.getCurrentRoom()?.name || activeMap.name}
                </h3>
              </div>
              <button
                onClick={() => setIsScoreboardOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white border border-slate-700 bg-slate-800/80 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Liste des Joueurs */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-12 gap-2 text-[10px] font-mono-tech text-slate-400 px-3 py-1.5 uppercase bg-slate-900/60 border border-slate-800">
                <div className="col-span-5">JOUEUR // CALLSIGN</div>
                <div className="col-span-2 text-center">STATUT</div>
                <div className="col-span-2 text-center">LATENCE</div>
                <div className="col-span-3 text-right">FRAGS / KILLS</div>
              </div>

              {/* Joueur Local */}
              <div className={`grid grid-cols-12 gap-2 items-center px-3 py-2.5 border text-xs font-mono-tech text-white ${
                isTDM 
                  ? (localTeam === 'BLUE' ? 'bg-[#00f0ff]/10 border-[#00f0ff]/40' : 'bg-[#ff0055]/10 border-[#ff0055]/40')
                  : 'bg-[#00f0ff]/10 border-[#00f0ff]/40'
              }`}>
                <div className="col-span-5 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    isTDM 
                      ? (localTeam === 'BLUE' ? 'bg-[#00f0ff]' : 'bg-[#ff0055]')
                      : 'bg-[#00f0ff]'
                  }`} />
                  <span className={`font-orbitron font-bold ${
                    isTDM 
                      ? (localTeam === 'BLUE' ? 'text-[#00f0ff]' : 'text-[#ff0055]')
                      : 'text-[#00f0ff]'
                  }`}>
                    {photonClient.getLocalCallsign()} (VOUS) {isTDM && (localTeam === 'BLUE' ? ' [BLEU]' : ' [ROUGE]')}
                  </span>
                </div>
                <div className="col-span-2 text-center">
                  <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px]">
                    VIVANT
                  </span>
                </div>
                <div className="col-span-2 text-center text-slate-300">
                  ~{photonClient.getPing()}ms
                </div>
                <div className="col-span-3 text-right font-orbitron font-bold text-base text-[#00f0ff]">
                  {eliminatedCount}
                </div>
              </div>

              {/* Joueurs Distants */}
              {remotePlayers.map((player) => {
                const isBlueTeam = player.team === 'BLUE';
                const playerColor = isTDM ? (isBlueTeam ? '#00f0ff' : '#ff0055') : '#ff007f';
                return (
                  <div
                    key={player.actorNr}
                    className={`grid grid-cols-12 gap-2 items-center px-3 py-2.5 border text-xs font-mono-tech text-white bg-[#0d1428] ${
                      isTDM 
                        ? (isBlueTeam ? 'border-[#00f0ff]/20 hover:border-[#00f0ff]/40' : 'border-[#ff0055]/20 hover:border-[#ff0055]/40')
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="col-span-5 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: playerColor }} />
                      <span className="font-orbitron font-bold" style={{ color: isTDM ? playerColor : '#e2e8f0' }}>
                        {player.callsign} {isTDM && (isBlueTeam ? ' [BLEU]' : ' [ROUGE]')}
                      </span>
                      {player.isBot && (
                        <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/40 text-[8px] font-mono-tech tracking-wider uppercase rounded-sm shrink-0 font-bold shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                          BOT
                        </span>
                      )}
                    </div>
                    <div className="col-span-2 text-center">
                      <span className={`px-1.5 py-0.5 text-[9px] border ${
                        player.isAlive 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`}>
                        {player.isAlive ? 'VIVANT' : 'ÉLIMINÉ'}
                      </span>
                    </div>
                    <div className="col-span-2 text-center text-slate-400">
                      ~{player.ping || photonClient.getPing()}ms
                    </div>
                    <div className="col-span-3 text-right font-orbitron font-bold text-base" style={{ color: isTDM ? playerColor : '#ff007f' }}>
                      {player.kills || 0}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-[10px] font-mono-tech text-slate-400">
              <span>APPUYEZ SUR [TAB] OU CLIQUEZ SUR JOUEURS POUR FERMER</span>
              <span>SERVEURS PHOTON REALTIME (20 HZ)</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODALE DE PAUSE CYBERPUNK (OPTIONS, RESPAWN, SENSIBILITÉ) */}
      {isPauseMenuVisible && (
        <div className="absolute inset-0 bg-[#030611]/85 backdrop-blur-md pointer-events-auto flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="max-w-md w-full bg-[#0a1020] border border-[#00f0ff]/60 p-5 sm:p-7 cyber-clip-corner shadow-[0_0_30px_rgba(0,240,255,0.2)]">
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-2 text-[10px] font-mono-tech text-[#00f0ff] uppercase tracking-widest mb-1 px-2.5 py-0.5 bg-[#00f0ff]/10 border border-[#00f0ff]/30">
                <CrosshairIcon className="w-3 h-3" /> CONTRÔLE FPS SUSPENDU
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-orbitron text-white tracking-wider mt-1">
                ARÈNE EN PAUSE
              </h2>
              <p className="text-xs font-mono-tech text-slate-400 mt-1">
                {isTouchMode
                  ? 'Commandes tactiles prêtes. Appuyez sur Reprendre.'
                  : 'Cliquez pour reverrouiller le curseur et reprendre le combat.'}
              </p>
            </div>

            {/* Bouton Principal de Reprise */}
            <button
              onClick={handleResumeGame}
              className="w-full py-3.5 px-4 mb-3 bg-[#00f0ff] hover:bg-cyan-300 text-black font-orbitron font-black text-sm uppercase tracking-wider transition-all duration-150 cyber-clip-corner shadow-[0_0_15px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              {isTouchMode ? 'REPRENDRE LE COMBAT' : 'VERROUILLER & JOUER'}
            </button>

            {/* Boutons Secondaires */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => {
                  audioSystem.playClick();
                  onResetPosition();
                  handleResumeGame();
                }}
                className="py-2.5 px-3 bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-orbitron font-bold text-xs uppercase tracking-wider transition cursor-pointer active:scale-95"
              >
                RESPAWN POSITION
              </button>
              <button
                onClick={() => {
                  audioSystem.playClick();
                  onExitToMenu();
                }}
                className="py-2.5 px-3 bg-slate-900 border border-rose-900/60 hover:border-rose-500 text-rose-300 hover:text-white font-orbitron font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> MENU PRINCIPAL
              </button>
            </div>

            {/* Sélection Rapide de Map dans le menu Pause */}
            <div className="mb-4">
              <div className="text-[10px] font-mono-tech text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Compass className="w-3 h-3 text-[#00f0ff]" />
                <span>CHANGER DE THÉÂTRE / MAP EN COURS</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MAPS_CATALOG.map((m) => {
                  const isCurrent = m.id === activeMapId;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        audioSystem.playBootSuccess();
                        onSelectMap(m.id);
                        handleResumeGame();
                      }}
                      className={`p-2 border text-left transition cursor-pointer flex flex-col justify-between ${
                        isCurrent
                          ? 'border-[#00f0ff] bg-[#00f0ff]/15 text-white shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                          : 'border-slate-800 bg-slate-900/90 text-slate-400 hover:border-slate-600 hover:text-white'
                      }`}
                    >
                      <div className="text-[9px] font-mono-tech uppercase" style={{ color: m.accentColor }}>
                        {m.codename}
                      </div>
                      <div className="text-xs font-bold font-orbitron truncate">
                        {m.name.split('//')[0]}
                      </div>
                      <div className="text-[8px] font-mono-tech text-slate-500 mt-0.5">
                        {m.environmentType === 'outdoor' ? 'Extérieur' : 'Intérieur CQC'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bascule Rapide Mode Tactile / Souris */}
            <div className="mb-4">
              <button
                onClick={() => {
                  audioSystem.playClick();
                  onToggleTouchMode();
                }}
                className="w-full py-2 px-3 bg-slate-900/80 border border-slate-700 hover:border-[#00f0ff] flex items-center justify-between text-xs font-mono-tech text-slate-300 transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  {isTouchMode ? <Smartphone className="w-4 h-4 text-[#00f0ff]" /> : <MousePointer className="w-4 h-4 text-amber-400" />}
                  TYPE DE CONTRÔLE ACTIF
                </span>
                <span className="text-[#00f0ff] font-bold">
                  {isTouchMode ? 'TACTILE // MOBILE' : 'CLAVIER // SOURIS'}
                </span>
              </button>
            </div>

            {/* Réglage Sensibilité */}
            <div className="pt-3 border-t border-slate-800">
              <div className="flex justify-between items-center text-xs font-mono-tech text-slate-400 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5 text-[#00f0ff]" />
                  {isTouchMode ? 'SENSIBILITÉ TACTILE' : 'SENSIBILITÉ SOURIS'}
                </span>
                <span className="text-[#00f0ff] font-bold">
                  {mouseSensitivity.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={mouseSensitivity}
                onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
                className="w-full accent-[#00f0ff] cursor-pointer"
              />
            </div>

            {/* Réglages Chat Vocal de Proximité WebRTC */}
            <div className="mt-3 pt-3 border-t border-slate-800">
              <div className="text-[10px] font-mono-tech text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#00f0ff]">
                  <Mic className="w-3.5 h-3.5" />
                  <span>CHAT VOCAL DE PROXIMITÉ (3D WEBRTC)</span>
                </span>
                <span className="text-emerald-400 font-bold">
                  {voiceStatus === 'READY' || voiceStatus === 'TRANSMITTING' ? 'ACTIF ✅' : 'INACTIF'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono-tech">
                <button
                  onClick={() => {
                    if (voiceStatus === 'DISABLED' || voiceStatus === 'ERROR') {
                      proximityVoiceSystem.initialize();
                    } else {
                      const muted = proximityVoiceSystem.toggleMute();
                      setIsMicMuted(muted);
                    }
                    audioSystem.playClick();
                  }}
                  className={`p-2 border flex items-center justify-between transition cursor-pointer ${
                    isMicMuted
                      ? 'border-rose-900 bg-rose-950/40 text-rose-300'
                      : 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {isMicMuted ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                    MICRO [V]
                  </span>
                  <span className="font-bold">{isMicMuted ? 'MUET' : 'ACTIF'}</span>
                </button>

                <button
                  onClick={() => {
                    const settings = proximityVoiceSystem.getSettings();
                    proximityVoiceSystem.updateSettings({ deafened: !settings.deafened });
                    audioSystem.playClick();
                  }}
                  className="p-2 border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-600 flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-[#00f0ff]" />
                    SON ENTRANTS
                  </span>
                  <span className="font-bold text-[#00f0ff]">
                    {proximityVoiceSystem.getSettings().deafened ? 'COUPE' : '3D SPATIAL'}
                  </span>
                </button>
              </div>

              <div className="mt-2 p-2 bg-black/40 border border-slate-800 text-[10px] font-mono-tech text-slate-400 flex justify-between items-center">
                <span>PORTÉE VOCALE DU SON SPATIAL :</span>
                <span className="text-[#00f0ff] font-bold">30 MÈTRES (ATTÉNUATION REEL)</span>
              </div>
            </div>

            {/* Rappel des touches / gestes */}
            <div className="mt-3 p-2.5 sm:p-3 bg-black/50 border border-slate-800/80 text-[10px] sm:text-[11px] font-mono-tech text-slate-400 space-y-1">
              <div className="text-white font-bold text-[9px] sm:text-[10px] uppercase text-[#00f0ff]">
                {isTouchMode ? '// CONTRÔLES TACTILES ACTIFS' : '// COMMANDES CLAVIER & SOURIS'}
              </div>
              {isTouchMode ? (
                <>
                  <div className="flex justify-between">
                    <span>Joystick Gauche :</span>
                    <span className="text-white font-bold">Déplacements (WASD)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Glisser à Droite :</span>
                    <span className="text-white font-bold">Rotation / Visée</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bouton Grand Cercle :</span>
                    <span className="text-white font-bold">Tir continu / Rafale</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Boutons Haut/Bas :</span>
                    <span className="text-white font-bold">Saut / Turbo / Recharge</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>Déplacement :</span>
                    <span className="text-white font-bold">ZQSD ou WASD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sprint / Saut :</span>
                    <span className="text-white font-bold">Shift / Espace</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tir laser / Recharge :</span>
                    <span className="text-white font-bold">Clic gauche / Touche R</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Changer d'arme :</span>
                    <span className="text-white font-bold">Touches [1], [2], [3]</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. ÉCRAN DE FIN DE MATCH (DEATHMATCH SURVIE / TEAM_DEATHMATCH) */}
      {hasMatchEnded && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 select-none pointer-events-auto">
          <div className="relative w-full max-w-md bg-[#050811]/95 border border-[#ff0055]/50 p-6 sm:p-8 cyber-clip-corner cyber-glow-red flex flex-col items-center text-center shadow-[0_0_50px_rgba(255,0,85,0.25)] space-y-5">
            
            {/* Titre */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono-tech text-[#ff0055] tracking-widest uppercase">
                // FIN DE TRANSMISSION // PROTOCOLE CYBERSTRIKE COMPLET
              </div>
              <h2 className="text-3xl font-black font-orbitron text-white tracking-widest uppercase">
                {isTDM ? (
                  matchResult === 'VICTORY' ? 'VICTOIRE !' : matchResult === 'DEFEAT' ? 'DÉFAITE...' : 'ÉGALITÉ'
                ) : (
                  matchResult === 'VICTORY' ? 'VICTOIRE' : 'ÉLIMINÉ'
                )}
              </h2>
              {isTDM && (
                <div className="text-lg font-orbitron font-bold tracking-wider flex items-center justify-center gap-3">
                  <span className="text-[#ff0055]">{calculatedRedScore} ROUGE</span>
                  <span className="text-slate-500 font-mono-tech">-</span>
                  <span className="text-[#00f0ff]">{calculatedBlueScore} BLEU</span>
                </div>
              )}
            </div>

            {/* Badge de résultat */}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 ${
              matchResult === 'VICTORY' 
                ? 'border-emerald-500 bg-emerald-950/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                : matchResult === 'DRAW'
                ? 'border-amber-500 bg-amber-950/40 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                : 'border-[#ff0055] bg-rose-950/40 text-[#ff0055] shadow-[0_0_20px_rgba(255,0,85,0.3)]'
            }`}>
              {matchResult === 'VICTORY' ? (
                <span className="text-xs font-orbitron font-bold uppercase tracking-wider">VICTOIRE</span>
              ) : matchResult === 'DRAW' ? (
                <span className="text-xs font-orbitron font-bold uppercase tracking-wider">ÉGALITÉ</span>
              ) : (
                <span className="text-xs font-orbitron font-bold uppercase tracking-wider">DÉFAITE</span>
              )}
            </div>

            {/* Message de description */}
            <p className="text-xs font-mono-tech text-slate-300 leading-relaxed max-w-sm">
              {isTDM ? (
                matchResult === 'VICTORY'
                  ? 'Félicitations, votre équipe a dominé le secteur cybernétique en atteignant l\'objectif de combat !'
                  : matchResult === 'DRAW'
                  ? 'Égalité parfaite entre les deux équipes. Aucune faction n\'a cédé de terrain lors du protocole.'
                  : 'L\'équipe adverse a sécurisé le contrôle tactique du secteur. Préparez-vous pour la prochaine simulation.'
              ) : (
                matchResult === 'VICTORY' 
                  ? 'Tous les adversaires ont été neutralisés avec succès. Vous contrôlez désormais le secteur de combat cybernétique !' 
                  : 'Votre signal de combat a été interrompu suite à un impact fatal. Vos fonctions de survie ont été désactivées.'
              )}
            </p>

            {/* Tableau récapitulatif des scores individuels */}
            <div className="w-full bg-[#0d1428]/80 border border-slate-800 p-3 space-y-2 rounded text-left">
              <div className="text-[10px] font-mono-tech text-slate-400 uppercase tracking-wider flex justify-between border-b border-slate-800 pb-1">
                <span>RÉCAPITULATIF DES SCORING</span>
                <span>KILLS</span>
              </div>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {[
                  { callsign: photonClient.getLocalCallsign(), kills: eliminatedCount, team: localTeam, isLocal: true },
                  ...remotePlayers.map(p => ({ callsign: p.callsign, kills: p.kills || 0, team: p.team, isLocal: false }))
                ]
                  .sort((a, b) => b.kills - a.kills)
                  .map((p, idx) => {
                    const isBlue = p.team === 'BLUE';
                    const colorClass = isTDM ? (isBlue ? 'text-[#00f0ff]' : 'text-[#ff0055]') : (p.isLocal ? 'text-[#00f0ff]' : 'text-[#ff007f]');
                    return (
                      <div key={idx} className="flex justify-between items-center text-xs font-mono-tech">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-slate-500">#{idx + 1}</span>
                          <span className={`${colorClass} font-bold`}>
                            {p.callsign} {p.isLocal ? '(VOUS)' : ''}
                          </span>
                          {isTDM && (
                            <span className="text-[9px] text-slate-400">
                              [{isBlue ? 'BLEU' : 'ROUGE'}]
                            </span>
                          )}
                        </div>
                        <span className="font-orbitron font-bold text-white text-xs">{p.kills}</span>
                      </div>
                    );
                  })
                }
              </div>
            </div>

            {/* Actions de fin de match */}
            <div className="flex flex-col gap-2.5 w-full pt-1">
              <button
                onClick={() => {
                  audioSystem.playClick();
                  // Quitter proprement le salon et retourner au menu principal
                  photonClient.leaveRoom();
                  onExitToMenu();
                }}
                className="w-full py-3 px-4 text-xs font-orbitron font-bold uppercase tracking-wider bg-gradient-to-r from-[#ff0055] to-[#ffaa00] text-black hover:opacity-90 transition cursor-pointer cyber-clip-corner shadow-[0_0_15px_rgba(255,0,85,0.25)]"
              >
                RETOURNER AU MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
