/**
 * Modal Registre de Combat & Statistiques (Firebase Firestore)
 */

import { PlayerProfile } from '../types/game.ts';
import { StatsSystem } from '../systems/statsSystem.ts';
import { isFirebaseConfigured } from '../net/firebaseConfig.ts';
import { audioSystem } from '../systems/audioSystem.ts';
import { Trophy, Award, Target, Flame, X, Database } from 'lucide-react';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerProfile: PlayerProfile;
}

export default function StatsModal({ isOpen, onClose, playerProfile }: StatsModalProps) {
  if (!isOpen) return null;

  const kdRatio = StatsSystem.calculateKDRatio(
    playerProfile.stats.kills,
    playerProfile.stats.deaths
  );
  const winRate = StatsSystem.calculateWinRate(
    playerProfile.stats.wins,
    playerProfile.stats.matches
  );
  const currentRank = StatsSystem.getRankForScore(playerProfile.rankScore);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-3xl bg-[#090e1d] border border-[#ffaa00]/50 p-6 md:p-8 cyber-clip-corner shadow-[0_0_20px_rgba(255,170,0,0.25)] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 mb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-tech text-[#ffaa00] uppercase tracking-wider mb-1">
              <Trophy className="w-4 h-4 text-[#ffaa00]" />
              <span>REGISTRE DE COMBAT TACTIQUE // DOSSIER OPÉRATEUR</span>
            </div>
            <h2 className="text-2xl font-bold font-orbitron text-white tracking-wide">
              STATISTIQUES & RANGS
            </h2>
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

        {/* Fiche de Rang */}
        <div className="p-5 bg-[#0e162b] border border-slate-800 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-[#00f0ff] flex items-center justify-center bg-black/50 shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              <Award className="w-8 h-8 text-[#00f0ff]" />
            </div>
            <div>
              <div className="text-xs font-mono-tech text-slate-400">RANG ACTUEL</div>
              <div className="text-xl font-orbitron font-black text-white tracking-wider">
                {currentRank.name}
              </div>
              <div className="text-xs font-mono-tech text-[#00f0ff] mt-0.5">
                SCORE MMR : {playerProfile.rankScore} PTS
              </div>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6 font-mono-tech text-xs">
            <div className="text-slate-400">IDENTIFIANT JOUEUR</div>
            <div className="font-bold text-white text-sm mt-0.5 font-orbitron">
              {playerProfile.callsign}
            </div>
            <div className="text-slate-500 text-[10px] mt-1">
              UID : {playerProfile.uid.slice(0, 16)}...
            </div>
          </div>
        </div>

        {/* Grille des Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-[#0d1428] border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-mono-tech mb-1">
              <Target className="w-3.5 h-3.5 text-[#00f0ff]" /> KILLS
            </div>
            <div className="text-2xl font-orbitron font-bold text-white">
              {playerProfile.stats.kills}
            </div>
          </div>

          <div className="p-4 bg-[#0d1428] border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-mono-tech mb-1">
              <Flame className="w-3.5 h-3.5 text-[#ff007f]" /> MORTS
            </div>
            <div className="text-2xl font-orbitron font-bold text-white">
              {playerProfile.stats.deaths}
            </div>
          </div>

          <div className="p-4 bg-[#0d1428] border border-slate-800">
            <div className="text-slate-400 text-xs font-mono-tech mb-1">
              RATIO K / D
            </div>
            <div className="text-2xl font-orbitron font-bold text-[#00f0ff]">
              {kdRatio}
            </div>
          </div>

          <div className="p-4 bg-[#0d1428] border border-slate-800">
            <div className="text-slate-400 text-xs font-mono-tech mb-1">
              TAUX DE VICTOIRE
            </div>
            <div className="text-2xl font-orbitron font-bold text-[#ffaa00]">
              {winRate}%
            </div>
          </div>
        </div>

        {/* Statut Persistance Firestore */}
        <div className="p-3 bg-black/40 border border-slate-800 flex items-center justify-between text-xs font-mono-tech">
          <div className="flex items-center gap-2 text-slate-400">
            <Database className={`w-4 h-4 ${isFirebaseConfigured() ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>
              SOURCE DE DONNÉES : {isFirebaseConfigured() ? 'Cloud Firestore (Temps Réel)' : 'Stockage Local Démo'}
            </span>
          </div>
          <span className="text-slate-500">
            SYNCHRONISÉ // READY
          </span>
        </div>
      </div>
    </div>
  );
}
