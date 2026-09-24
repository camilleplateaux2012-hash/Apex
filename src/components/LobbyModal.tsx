/**
 * Modal Salon Multijoueur & Matchmaking Photon Realtime
 * 
 * Permet de :
 * - Lancer un matchmaking automatique rapide (Quick Match)
 * - Lister et rejoindre les salons publics disponibles
 * - Créer un salon public ou un salon privé avec Code à partager
 * - Rejoindre un salon privé directement avec un Code
 * - Afficher l'état de synchronisation et les diagnostics réseau en temps réel
 */

import { useState, useEffect } from 'react';
import { photonClient } from '../net/photonClient.ts';
import { isPhotonConfigured } from '../net/photonConfig.ts';
import { audioSystem } from '../systems/audioSystem.ts';
import type { PhotonRoomInfo, PhotonConnectionStatus } from '../types/network.ts';
import type { PlayerProfile } from '../types/game.ts';
import { 
  Globe, 
  Wifi, 
  Plus, 
  ArrowRight, 
  X, 
  Lock, 
  Key, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';

interface LobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnterArena: (roomName: string) => void;
  preferredMapId?: string;
  playerProfile?: PlayerProfile;
}

export default function LobbyModal({ 
  isOpen, 
  onClose, 
  onEnterArena,
  preferredMapId = 'rooftop_district',
  playerProfile
}: LobbyModalProps) {
  const [rooms, setRooms] = useState<PhotonRoomInfo[]>([]);
  const [status, setStatus] = useState<PhotonConnectionStatus>('DISCONNECTED');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorDetail, setErrorDetail] = useState<string>('');

  // Formulaire de création
  const [newRoomName, setNewRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'CYBER_FREE_FOR_ALL' | 'TEAM_DEATHMATCH'>('CYBER_FREE_FOR_ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'FACILE' | 'MOYEN' | 'DIFFICILE'>('MOYEN');
  const [roomCodeToJoin, setRoomCodeToJoin] = useState('');
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // S'abonner aux changements d'état Photon
    const unsubStatus = photonClient.onStatusChange((s, msg, err) => {
      setStatus(s);
      if (msg) setStatusMessage(msg);
      if (err) setErrorDetail(err);
    });

    const unsubRooms = photonClient.onRoomListUpdate((r) => {
      setRooms(r);
    });

    // Connexion automatique au Master Server avec un identifiant unique garanti pour éviter les collisions
    const finalUserId = playerProfile?.uid && playerProfile.uid !== 'anon_init' 
      ? playerProfile.uid 
      : `anon_${Math.random().toString(36).substring(2, 9)}`;

    const finalCallsign = playerProfile?.callsign || `OPERATEUR_${Math.floor(1000 + Math.random() * 9000)}`;

    photonClient.connect(finalUserId, finalCallsign).catch((err) => {
      console.warn('[LobbyModal] Erreur connexion Photon :', err);
    });

    return () => {
      unsubStatus();
      unsubRooms();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Matchmaking Automatique Rapide
  const handleQuickMatch = async () => {
    audioSystem.playClick();
    setIsActionInProgress(true);
    const success = await photonClient.quickMatch(preferredMapId);
    setIsActionInProgress(false);
    if (success) {
      const current = photonClient.getCurrentRoom();
      onEnterArena(current ? current.name : 'CYBER_ARENA');
    }
  };

  // 2. Création de salon (Public ou Privé avec Code)
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRoomName = newRoomName.trim() || `ARENA_${Math.floor(1000 + Math.random() * 9000)}`;

    audioSystem.playClick();
    setIsActionInProgress(true);
    const success = await photonClient.createRoom(
      finalRoomName, 
      isPrivate, 
      preferredMapId, 
      selectedMode,
      selectedDifficulty
    );
    setIsActionInProgress(false);

    if (success) {
      onEnterArena(finalRoomName);
    }
  };

  // 3. Rejoindre un salon public
  const handleJoinRoom = async (room: PhotonRoomInfo) => {
    audioSystem.playClick();
    setIsActionInProgress(true);
    const success = await photonClient.joinRoom(room.name);
    setIsActionInProgress(false);
    if (success) {
      onEnterArena(room.name);
    }
  };

  // 4. Rejoindre par Code Privé
  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeToJoin.trim()) return;

    audioSystem.playClick();
    setIsActionInProgress(true);
    const success = await photonClient.joinRoom(roomCodeToJoin.trim());
    setIsActionInProgress(false);
    if (success) {
      onEnterArena(roomCodeToJoin.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4">
      <div className="relative w-full max-w-4xl bg-[#090e1d] border border-[#00f0ff]/50 p-5 sm:p-7 cyber-clip-corner cyber-glow-cyan max-h-[92vh] flex flex-col shadow-[0_0_40px_rgba(0,240,255,0.15)]">
        
        {/* En-tête modal avec badge de statut réseau */}
        <div className="flex justify-between items-start pb-4 mb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-tech text-[#00f0ff] uppercase tracking-wider mb-1">
              <Globe className="w-4 h-4 text-[#00f0ff]" />
              <span>SERVEURS PHOTON REALTIME // MULTIJOUEUR BASSE LATENCE</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-orbitron text-white tracking-wide">
              SALONS MULTIJOUEURS & MATCHMAKING
            </h2>

            {/* Diagnostic réseau visible */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono-tech rounded border ${
                status === 'IN_ROOM' || status === 'IN_LOBBY' || status === 'CONNECTED_TO_MASTER'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                  : status === 'ERROR'
                  ? 'bg-rose-950/60 border-rose-500/50 text-rose-400 animate-pulse'
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-400'
              }`}>
                {status === 'IN_ROOM' || status === 'IN_LOBBY' || status === 'CONNECTED_TO_MASTER' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : status === 'ERROR' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                )}
                <span>
                  {status === 'IN_ROOM' || status === 'IN_LOBBY' || status === 'CONNECTED_TO_MASTER'
                    ? 'Connecté ✅ (Photon Cloud EU)'
                    : status === 'ERROR'
                    ? 'Erreur de connexion ❌'
                    : 'Connexion en cours 🔄'}
                </span>
                <span className="text-slate-400">| {statusMessage}</span>
              </div>

              {errorDetail && (
                <div className="text-[11px] font-mono-tech text-rose-400 bg-rose-950/80 px-2 py-0.5 border border-rose-800">
                  {errorDetail}
                </div>
              )}
            </div>
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

        {/* Bouton Rapide : Matchmaking Automatique */}
        <div className="mb-4 p-3.5 bg-gradient-to-r from-[#00f0ff]/15 via-[#00f0ff]/5 to-transparent border border-[#00f0ff]/40 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#00f0ff]/20 border border-[#00f0ff] flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-[#00f0ff]" />
            </div>
            <div>
              <div className="font-orbitron font-bold text-white text-sm">
                MATCHMAKING AUTOMATIQUE (QUICK PLAY)
              </div>
              <div className="text-xs font-mono-tech text-slate-300">
                Rejoint instantanément une arène publique active ou crée automatiquement un nouveau combat
              </div>
            </div>
          </div>

          <button
            onClick={handleQuickMatch}
            disabled={isActionInProgress}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-orbitron font-bold uppercase tracking-wider bg-[#00f0ff] text-black hover:bg-white transition cursor-pointer flex items-center justify-center gap-2 cyber-clip-corner shadow-[0_0_15px_rgba(0,240,255,0.4)] disabled:opacity-50 shrink-0"
          >
            <Zap className="w-4 h-4" />
            <span>{isActionInProgress ? 'RECHERCHE...' : 'LANCER EN 1 CLIC'}</span>
          </button>
        </div>

        {/* Corps : Liste des salons + Formulaire création & Code privé */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 overflow-y-auto pr-1">
          {/* Colonne 1 & 2 : Salons Publics En Ligne */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex justify-between items-center text-xs font-mono-tech text-slate-400 px-1">
              <span>SALONS PUBLICS EN LIGNE ({rooms.filter(r => !r.isLocked).length})</span>
              <span>PING MOYEN : ~{photonClient.getPing()}ms</span>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {rooms.map((room) => (
                <div
                  key={room.name}
                  className="p-3.5 bg-[#0d1428] border border-slate-800 hover:border-[#00f0ff]/60 transition flex flex-col sm:flex-row justify-between sm:items-center gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-orbitron font-bold text-white tracking-wide text-sm">
                        {room.name}
                      </span>
                      {room.isLocked && (
                        <span className="text-[10px] font-mono-tech px-2 py-0.5 bg-amber-950/60 text-amber-400 border border-amber-800 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> PRIVÉ
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono-tech text-slate-400 mt-1">
                      <span className="text-[#00f0ff]">{room.gameMode}</span>
                      <span>CARTE : {room.mapName}</span>
                      <span className="flex items-center gap-1">
                        <Wifi className="w-3 h-3 text-emerald-400" /> {room.ping}ms
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono-tech text-xs">
                      <span className="text-white font-bold">{room.playerCount}</span>
                      <span className="text-slate-500"> / {room.maxPlayers}</span>
                    </div>
                    <button
                      onClick={() => handleJoinRoom(room)}
                      disabled={isActionInProgress || room.playerCount >= room.maxPlayers}
                      className="px-3.5 py-1.5 text-xs font-orbitron font-bold uppercase tracking-wider bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/40 hover:bg-[#00f0ff] hover:text-black transition cursor-pointer flex items-center gap-1.5 cyber-clip-badge disabled:opacity-40"
                    >
                      <span>REJOINDRE</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {rooms.length === 0 && (
                <div className="p-6 text-center border border-dashed border-slate-800 text-slate-400 font-mono-tech text-xs space-y-1">
                  <div>Aucun autre salon public actif sur cette région.</div>
                  <div className="text-slate-500">Créez votre propre salon à droite ou utilisez le Matchmaking !</div>
                </div>
              )}
            </div>

            {/* Rejoindre par Code Privé */}
            <div className="pt-3 border-t border-slate-800">
              <form onSubmit={handleJoinByCode} className="flex gap-2">
                <input
                  type="text"
                  value={roomCodeToJoin}
                  onChange={(e) => setRoomCodeToJoin(e.target.value.toUpperCase())}
                  placeholder="ENTRER LE CODE D'UN SALON PRIVÉ (EX: CYBER-777)"
                  className="flex-1 px-3 py-2 text-xs font-mono-tech bg-black/60 border border-slate-700 text-white placeholder-slate-500 focus:border-[#00f0ff] focus:outline-none uppercase"
                />
                <button
                  type="submit"
                  disabled={!roomCodeToJoin.trim() || isActionInProgress}
                  className="px-4 py-2 bg-slate-800 hover:bg-[#00f0ff] hover:text-black text-white text-xs font-orbitron font-bold border border-slate-600 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>REJOINDRE CODE</span>
                </button>
              </form>
            </div>
          </div>

          {/* Colonne 3 : Création de Salon */}
          <div className="p-4 bg-[#0d1428] border border-slate-800 flex flex-col justify-between">
            <form onSubmit={handleCreateRoom} className="space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-mono-tech text-[#ff007f] uppercase tracking-wider font-bold">
                <Plus className="w-4 h-4" />
                <span>CRÉER UN SALON</span>
              </div>

              <div>
                <label className="block text-xs font-mono-tech text-slate-400 mb-1">
                  NOM DU SALON / CODE
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value.toUpperCase())}
                  placeholder="EX: MATRIX_DEATHMATCH"
                  className="w-full px-3 py-2 text-xs font-mono-tech bg-black/50 border border-slate-700 text-white focus:border-[#ff007f] focus:outline-none uppercase"
                  maxLength={24}
                />
              </div>

              {/* Option Salon Privé avec code */}
              <div className="p-2.5 bg-black/40 border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-mono-tech text-slate-300">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="accent-[#ff007f] cursor-pointer"
                  />
                  <span>Salon Privé (Accessible uniquement par Code)</span>
                </label>
                {isPrivate && (
                  <div className="text-[11px] font-mono-tech text-amber-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Partagez le nom du salon avec vos amis pour qu'ils rejoignent.</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono-tech text-slate-400 mb-1">
                  MODE DE JEU
                </label>
                <select
                  value={selectedMode}
                  onChange={(e) => {
                    audioSystem.playClick();
                    setSelectedMode(e.target.value as any);
                  }}
                  className="w-full px-3 py-2 text-xs font-mono-tech bg-black/50 border border-slate-700 text-white focus:border-[#ff007f] focus:outline-none uppercase cursor-pointer"
                >
                  <option value="CYBER_FREE_FOR_ALL">FREE-FOR-ALL (VIES ILLIMITÉES)</option>
                  <option value="TEAM_DEATHMATCH">TEAM DEATHMATCH (CYAN VS MAGENTA)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono-tech text-[#00f0ff] mb-1">
                  DIFFICULTÉ DES BOTS (IA)
                </label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => {
                    audioSystem.playClick();
                    setSelectedDifficulty(e.target.value as any);
                  }}
                  className="w-full px-3 py-2 text-xs font-mono-tech bg-black/50 border border-slate-700 text-white focus:border-[#00f0ff] focus:outline-none uppercase cursor-pointer"
                >
                  <option value="FACILE">FACILE // REACTION LENTE, MOINS PRECIS</option>
                  <option value="MOYEN">MOYEN // COMBAT STANDARD, EQUILIBRE</option>
                  <option value="DIFFICILE">DIFFICILE // AGRESSIF, TRES PRECIS, JUMP/STRAFE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono-tech text-slate-400 mb-1">
                  MAX JOUEURS
                </label>
                <div className="text-xs font-mono-tech text-[#00f0ff] p-2 bg-black/40 border border-slate-800">
                  8 JOUEURS (DEATHMATCH BASSE LATENCE)
                </div>
              </div>

              <button
                type="submit"
                disabled={isActionInProgress}
                className="w-full py-2.5 px-4 text-xs font-orbitron font-bold uppercase tracking-wider bg-gradient-to-r from-[#ff007f] to-[#ffaa00] text-black hover:opacity-90 transition disabled:opacity-50 cursor-pointer cyber-clip-corner shadow-[0_0_15px_rgba(255,0,127,0.3)]"
              >
                {isActionInProgress ? 'CRÉATION DU SALON...' : 'CRÉER & COMBATTRE'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
