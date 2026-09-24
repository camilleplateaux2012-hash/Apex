/**
 * Modal Paramètres Système & Diagnostic Réseau
 * 
 * Permet d'ajuster l'audio, la sensibilité souris, le champ de vision (FOV)
 * et de vérifier l'état des configurations Firebase et Photon.
 */

import { useState } from 'react';
import { isFirebaseConfigured, firebaseConfig } from '../net/firebaseConfig.ts';
import { isPhotonConfigured, PHOTON_CONFIG } from '../net/photonConfig.ts';
import { audioSystem } from '../systems/audioSystem.ts';
import type { GameSettings } from '../types/game.ts';
import { Sliders, Volume2, MousePointer, ShieldCheck, Wifi, X, ExternalLink } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onSettingsChange: (newSettings: GameSettings) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'GAMEPLAY' | 'NETWORK'>('GAMEPLAY');

  if (!isOpen) return null;

  const handleSensitivityChange = (val: number) => {
    onSettingsChange({ ...settings, mouseSensitivity: val });
  };

  const handleVolumeChange = (val: number) => {
    audioSystem.setVolume(val);
    onSettingsChange({ ...settings, masterVolume: val });
  };

  const handleFovChange = (val: number) => {
    onSettingsChange({ ...settings, fov: val });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-3xl bg-[#090e1d] border border-slate-700 p-6 md:p-8 cyber-clip-corner shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 mb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-tech text-slate-400 uppercase tracking-wider mb-1">
              <Sliders className="w-4 h-4 text-[#00f0ff]" />
              <span>CONFIGURATION DU SYSTÈME & DU RÉSEAU</span>
            </div>
            <h2 className="text-2xl font-bold font-orbitron text-white tracking-wide">
              PARAMÈTRES
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

        {/* Onglets */}
        <div className="flex gap-4 border-b border-slate-800 mb-6 font-orbitron text-xs">
          <button
            onClick={() => {
              audioSystem.playHover();
              setActiveTab('GAMEPLAY');
            }}
            className={`pb-2.5 uppercase tracking-wider cursor-pointer border-b-2 transition ${
              activeTab === 'GAMEPLAY'
                ? 'border-[#00f0ff] text-[#00f0ff] font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            CONTRÔLES & AUDIO
          </button>
          <button
            onClick={() => {
              audioSystem.playHover();
              setActiveTab('NETWORK');
            }}
            className={`pb-2.5 uppercase tracking-wider cursor-pointer border-b-2 transition ${
              activeTab === 'NETWORK'
                ? 'border-[#ff007f] text-[#ff007f] font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            CLÉS RÉSEAU (FIREBASE / PHOTON)
          </button>
        </div>

        {/* Contenu Onglet 1 : Contrôles & Audio */}
        {activeTab === 'GAMEPLAY' && (
          <div className="space-y-6 font-mono-tech text-xs">
            {/* Sensibilité souris */}
            <div className="p-4 bg-[#0d1428] border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="flex items-center gap-2 text-white font-bold">
                  <MousePointer className="w-4 h-4 text-[#00f0ff]" /> SENSIBILITÉ SOURIS
                </span>
                <span className="text-[#00f0ff] font-bold">{settings.mouseSensitivity}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                value={settings.mouseSensitivity}
                onChange={(e) => handleSensitivityChange(parseFloat(e.target.value))}
                className="w-full accent-[#00f0ff] cursor-pointer"
              />
            </div>

            {/* Champ de vision FOV */}
            <div className="p-4 bg-[#0d1428] border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-bold">CHAMP DE VISION (FOV)</span>
                <span className="text-amber-400 font-bold">{settings.fov}°</span>
              </div>
              <input
                type="range"
                min="70"
                max="120"
                step="1"
                value={settings.fov}
                onChange={(e) => handleFovChange(parseInt(e.target.value))}
                className="w-full accent-[#ffaa00] cursor-pointer"
              />
            </div>

            {/* Volume Audio */}
            <div className="p-4 bg-[#0d1428] border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="flex items-center gap-2 text-white font-bold">
                  <Volume2 className="w-4 h-4 text-[#ff007f]" /> VOLUME MASTER & SFX
                </span>
                <span className="text-[#ff007f] font-bold">{settings.masterVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={settings.masterVolume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                className="w-full accent-[#ff007f] cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Contenu Onglet 2 : Diagnostic Clés Réseau */}
        {activeTab === 'NETWORK' && (
          <div className="space-y-4 font-mono-tech text-xs">
            {/* Carte Firebase */}
            <div className="p-4 bg-[#0d1428] border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  <ShieldCheck className="w-4 h-4 text-[#00f0ff]" />
                  <span>FIREBASE (FIRESTORE + AUTH)</span>
                </div>
                <span className={`px-2 py-0.5 text-[10px] ${isFirebaseConfigured() ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                  {isFirebaseConfigured() ? 'CONFIGURÉ' : 'CLÉS PLACEHOLDERS (MODE LOCAL)'}
                </span>
              </div>
              <p className="text-slate-400 mb-2 leading-relaxed">
                Fichier de configuration séparé : <code className="text-[#00f0ff]">src/net/firebaseConfig.ts</code>
              </p>
              <div className="p-2 bg-black/60 border border-slate-800 text-[11px] text-slate-300">
                <div>Projet : <span className="text-white">{firebaseConfig.projectId}</span></div>
                <div>Auth Domain : <span className="text-white">{firebaseConfig.authDomain}</span></div>
              </div>
            </div>

            {/* Carte Photon */}
            <div className="p-4 bg-[#0d1428] border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  <Wifi className="w-4 h-4 text-[#ff007f]" />
                  <span>PHOTON REALTIME (MULTIPLEUR TEMPS RÉEL)</span>
                </div>
                <span className={`px-2 py-0.5 text-[10px] ${isPhotonConfigured() ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                  {isPhotonConfigured() ? 'APP ID ACTIF' : 'MODE SIMULATION (SANS APP ID)'}
                </span>
              </div>
              <p className="text-slate-400 mb-2 leading-relaxed">
                Fichier de configuration séparé : <code className="text-[#ff007f]">src/net/photonConfig.ts</code>
              </p>
              <div className="p-2 bg-black/60 border border-slate-800 text-[11px] text-slate-300">
                <div>App ID : <span className="text-white">{isPhotonConfigured() ? PHOTON_CONFIG.appId : 'VOTRE_PHOTON_APP_ID_ICI'}</span></div>
                <div>Région : <span className="text-white">{PHOTON_CONFIG.region}</span></div>
                <div>Version : <span className="text-white">{PHOTON_CONFIG.appVersion}</span></div>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Voir le fichier <strong className="text-white">README.md</strong> pour le tutoriel pas-à-pas de déploiement Netlify et configuration des variables.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
