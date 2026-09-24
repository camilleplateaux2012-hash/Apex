/**
 * Écran de Chargement Cyberpunk (Boot Sequence)
 * 
 * Séquence de démarrage futuriste avec barres de chargement animées,
 * vérification des modules (Three.js, Firebase, Photon Realtime),
 * et bouton d'entrée dans la matrice.
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { GAME_CONFIG } from '../config/gameConfig.ts';
import { isFirebaseConfigured } from '../net/firebaseConfig.ts';
import { isPhotonConfigured } from '../net/photonConfig.ts';
import { audioSystem } from '../systems/audioSystem.ts';
import { Terminal, ShieldCheck, Wifi, Cpu, Play } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const steps = [
      { text: "INITIALISATION DU NOYAU SYSTEM [VITE + REACT 19]", pct: 20, delay: 300 },
      { text: "CALIBRATION DU MOTEUR 3D WEBGL (THREE.JS / R3F)", pct: 45, delay: 700 },
      { 
        text: isFirebaseConfigured() 
          ? "PROTOCOLE FIREBASE : ACTIF (FIRESTORE + AUTH)" 
          : "PROTOCOLE FIREBASE : MODE LOCAL DÉMO", 
        pct: 70, 
        delay: 1100 
      },
      { 
        text: isPhotonConfigured() 
          ? "RÉSEAU MULTIJOUEUR : CLIENT PHOTON CONNECTÉ" 
          : "RÉSEAU MULTIJOUEUR : SIMULATEUR STANDBY", 
        pct: 90, 
        delay: 1500 
      },
      { text: "MATRICE COMBAT STABLE // TOUS LES SYSTÈMES NOMINAUX", pct: 100, delay: 1900 },
    ];

    steps.forEach(({ text, pct, delay }) => {
      setTimeout(() => {
        setProgress(pct);
        setLogs((prev) => [...prev, text]);
        audioSystem.playHover();
      }, delay);
    });

    setTimeout(() => {
      setIsReady(true);
      audioSystem.playBootSuccess();
    }, 2100);
  }, []);

  const handleStart = () => {
    audioSystem.playClick();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050811] cyber-grid-bg scanlines px-4">
      {/* Halo d'ambiance néon */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00f0ff]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#ff007f]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-xl p-8 border border-[#00f0ff]/40 bg-[#0a0f1d]/90 backdrop-blur-xl cyber-clip-corner cyber-glow-cyan">
        {/* Accent de coin néon */}
        <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none overflow-hidden">
          <div className="absolute transform rotate-45 bg-[#ff007f] text-[9px] font-bold text-black py-0.5 right-[-35px] top-[18px] w-[120px] text-center font-mono-tech tracking-widest">
            INITIALIZE
          </div>
        </div>

        {/* En-tête */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-mono-tech text-[#00f0ff] uppercase tracking-widest mb-1">
            <Cpu className="w-4 h-4 animate-spin" />
            <span>SÉQUENCE DE BOOT DU PROTOCOLE</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-[#00f0ff] to-[#ff007f] font-orbitron tracking-wider">
            {GAME_CONFIG.TITLE}
          </h1>
          <p className="text-xs font-mono-tech text-slate-400 mt-1">
            {GAME_CONFIG.SUBTITLE} // BUILD {GAME_CONFIG.VERSION}
          </p>
        </div>

        {/* Barre de progression */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-xs font-mono-tech mb-2">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#00f0ff]" /> CHARGEMENT DE LA MATRICE
            </span>
            <span className="text-[#00f0ff] font-bold">{progress}%</span>
          </div>
          <div className="w-full h-3 bg-black/60 border border-slate-700 overflow-hidden relative">
            <motion.div
              className="h-full bg-gradient-to-r from-[#00f0ff] via-[#ffaa00] to-[#ff007f]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut", duration: 0.3 }}
            />
            {/* Lignes de scan intérieures */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:4px_100%] pointer-events-none" />
          </div>
        </div>

        {/* Console de logs du boot */}
        <div className="bg-black/60 border border-slate-800 p-3 mb-6 h-32 overflow-y-auto font-mono-tech text-[11px] text-slate-300 space-y-1">
          {logs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-[#00f0ff] select-none">&gt;&gt;</span>
              <span className={idx === logs.length - 1 ? 'text-[#00f0ff] font-bold' : ''}>
                {log}
              </span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-slate-500 animate-pulse">Initialisation des bus système...</div>
          )}
        </div>

        {/* Badges d'état des sous-systèmes */}
        <div className="grid grid-cols-2 gap-3 mb-6 text-xs font-mono-tech">
          <div className="flex items-center gap-2 p-2 border border-slate-800 bg-slate-900/40">
            <ShieldCheck className={`w-4 h-4 ${isFirebaseConfigured() ? 'text-[#00f0ff]' : 'text-[#ffaa00]'}`} />
            <div>
              <div className="text-slate-400 text-[10px]">BASE JOUEUR (FIREBASE)</div>
              <div className="font-bold text-slate-200">
                {isFirebaseConfigured() ? 'FIRESTORE ACTIF' : 'STOCKAGE LOCAL'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 border border-slate-800 bg-slate-900/40">
            <Wifi className={`w-4 h-4 ${isPhotonConfigured() ? 'text-[#00f0ff]' : 'text-[#ffaa00]'}`} />
            <div>
              <div className="text-slate-400 text-[10px]">RÉSEAU MULTI (PHOTON)</div>
              <div className="font-bold text-slate-200">
                {isPhotonConfigured() ? 'APP ID VALIDE' : 'MODE SIMULATION'}
              </div>
            </div>
          </div>
        </div>

        {/* Bouton d'entrée */}
        {isReady ? (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleStart}
            onMouseEnter={() => audioSystem.playHover()}
            className="w-full py-3.5 px-6 font-orbitron font-bold text-sm tracking-widest uppercase bg-gradient-to-r from-[#00f0ff] to-[#ff007f] text-black hover:opacity-95 hover:shadow-[0_0_25px_rgba(0,240,255,0.7)] transition-all cursor-pointer flex items-center justify-center gap-2 cyber-clip-corner"
          >
            <Play className="w-4 h-4 fill-black" />
            ENTRER DANS LA MATRICE // MENU PRINCIPAL
          </motion.button>
        ) : (
          <div className="w-full py-3.5 text-center text-xs font-mono-tech text-slate-500 uppercase tracking-widest border border-slate-800 bg-slate-950/40">
            SYNCHRONISATION EN COURS...
          </div>
        )}
      </div>
    </div>
  );
}
