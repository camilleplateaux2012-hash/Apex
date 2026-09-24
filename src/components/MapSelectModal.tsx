/**
 * Modale de Sélection de Maps Cyberpunk (Map Selection & Rotation)
 * 
 * Permet de visualiser, choisir et déployer sur les différentes maps modulaires :
 * - Cartes détaillées avec biome, points de spawn d'équipe et zone de capture
 * - Rotation automatique entre les rounds
 */

import { useState } from 'react';
import { MAPS_CATALOG, MapDefinition } from '../config/mapsConfig.ts';
import { audioSystem } from '../systems/audioSystem.ts';
import { 
  MapPin, 
  Flag, 
  ShieldAlert, 
  Layers, 
  Check, 
  X, 
  Play, 
  Radio, 
  RefreshCw, 
  Compass, 
  Cpu, 
  Building2 
} from 'lucide-react';

interface MapSelectModalProps {
  activeMapId: string;
  autoMapRotation: boolean;
  onSelectMap: (mapId: string) => void;
  onToggleAutoRotation: (enabled: boolean) => void;
  onDeploy: (mapId: string) => void;
  onClose: () => void;
}

export default function MapSelectModal({
  activeMapId,
  autoMapRotation,
  onSelectMap,
  onToggleAutoRotation,
  onDeploy,
  onClose,
}: MapSelectModalProps) {
  const [selectedId, setSelectedId] = useState<string>(activeMapId);
  const currentMap = MAPS_CATALOG.find((m) => m.id === selectedId) || MAPS_CATALOG[0];

  const handleCardClick = (mapId: string) => {
    audioSystem.playClick();
    setSelectedId(mapId);
    onSelectMap(mapId);
  };

  const handleConfirmDeploy = () => {
    audioSystem.playBootSuccess();
    onDeploy(selectedId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in pointer-events-auto select-none">
      <div className="relative w-full max-w-5xl bg-[#060b18]/95 border-2 border-[#00f0ff]/50 text-slate-100 shadow-[0_0_35px_rgba(0,240,255,0.25)] flex flex-col max-h-[92vh] overflow-hidden cyber-clip-corner">
        
        {/* HEADER DE LA MODALE */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#00f0ff]/30 bg-gradient-to-r from-[#00f0ff]/15 via-transparent to-[#ff007f]/15">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border border-[#00f0ff] flex items-center justify-center bg-[#00f0ff]/20 text-[#00f0ff]">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="text-[10px] font-mono-tech text-[#00f0ff] uppercase tracking-widest">
                SYSTÈME MODULAIRE DE THÉÂTRES DE COMBAT
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-orbitron text-white tracking-wide">
                SÉLECTION DU SECTEUR // MAPS
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              audioSystem.playClick();
              onClose();
            }}
            className="w-9 h-9 border border-slate-700 hover:border-[#ff007f] hover:text-[#ff007f] flex items-center justify-center bg-black/40 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENU PRINCIPAL (GRILLE DE MAPS + DÉTAILS TACTIQUES) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* OPTION DE ROTATION AUTOMATIQUE DES MAPS */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-black/60 border border-slate-800 rounded-sm">
            <div className="flex items-center gap-2.5">
              <RefreshCw className={`w-4 h-4 ${autoMapRotation ? 'text-[#00f0ff] animate-spin-slow' : 'text-slate-500'}`} />
              <div>
                <span className="text-xs font-mono-tech font-bold text-slate-200">
                  ROTATION AUTOMATIQUE DES MAPS ENTRE LES SESSIONS
                </span>
                <p className="text-[11px] text-slate-400">
                  Alterne automatiquement entre toutes les cartes du catalogue après chaque série d'éliminations.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                audioSystem.playClick();
                onToggleAutoRotation(!autoMapRotation);
              }}
              className={`px-3 py-1.5 text-xs font-mono-tech font-bold border transition cursor-pointer flex items-center gap-2 ${
                autoMapRotation
                  ? 'bg-[#00f0ff]/20 border-[#00f0ff] text-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoMapRotation ? 'bg-[#00f0ff] animate-ping' : 'bg-slate-600'}`} />
              {autoMapRotation ? 'ROTATION ACTIVE' : 'MANUELLE'}
            </button>
          </div>

          {/* SÉLECTEUR DE MAPS (CARTES EN GRILLE) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MAPS_CATALOG.map((map) => {
              const isSelected = map.id === selectedId;
              const isOutdoor = map.environmentType === 'outdoor';

              return (
                <div
                  key={map.id}
                  onClick={() => handleCardClick(map.id)}
                  className={`group relative p-5 border-2 transition-all duration-200 cursor-pointer cyber-clip-corner bg-gradient-to-br ${map.thumbnailGradient} ${
                    isSelected
                      ? 'border-[#00f0ff] shadow-[0_0_25px_rgba(0,240,255,0.4)] ring-1 ring-[#00f0ff]'
                      : 'border-slate-800 hover:border-slate-600 opacity-85 hover:opacity-100'
                  }`}
                >
                  {/* Badges en haut de carte */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono-tech px-2 py-0.5 bg-black/60 border border-slate-700 text-slate-300">
                        {map.codename}
                      </span>
                      <span
                        className="text-[10px] font-mono-tech px-2 py-0.5 font-bold uppercase"
                        style={{
                          backgroundColor: `${map.accentColor}20`,
                          borderColor: map.accentColor,
                          borderWidth: 1,
                          color: map.accentColor,
                        }}
                      >
                        {isOutdoor ? 'EXTÉRIEUR' : 'INTÉRIEUR'}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-1 text-xs font-mono-tech text-[#00f0ff] bg-[#00f0ff]/20 px-2 py-0.5 border border-[#00f0ff]">
                        <Check className="w-3.5 h-3.5" /> SÉLECTIONNÉE
                      </div>
                    )}
                  </div>

                  {/* Nom & Icone */}
                  <div className="flex items-center gap-2.5 mb-2">
                    {isOutdoor ? (
                      <Building2 className="w-6 h-6 text-[#00f0ff]" />
                    ) : (
                      <Cpu className="w-6 h-6 text-[#ff007f]" />
                    )}
                    <h3 className="text-lg sm:text-xl font-black font-orbitron text-white tracking-wider">
                      {map.name}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-300 line-clamp-2 mb-4 leading-relaxed">
                    {map.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {map.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] font-mono-tech px-1.5 py-0.5 bg-black/50 border border-slate-800 text-slate-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Barre d'accent de bas de carte */}
                  <div
                    className="absolute left-0 bottom-0 h-1 transition-all duration-300"
                    style={{
                      width: isSelected ? '100%' : '20%',
                      backgroundColor: map.accentColor,
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* DÉTAILS TACTIQUES DE LA MAP SÉLECTIONNÉE */}
          <div className="p-4 sm:p-5 bg-black/70 border border-[#00f0ff]/30 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <div className="text-[10px] font-mono-tech text-[#00f0ff] uppercase tracking-wider">
                  DONNÉES TACTIQUES & POINTS D'INTÉRÊT
                </div>
                <h4 className="text-base sm:text-lg font-bold font-orbitron text-white">
                  {currentMap.name} ({currentMap.codename})
                </h4>
              </div>

              {/* Point de capture */}
              <div className="flex items-center gap-2 px-3 py-1 bg-black/80 border border-[#00f0ff]/40">
                <Flag className="w-4 h-4 text-[#00f0ff]" />
                <span className="text-xs font-mono-tech text-white">
                  {currentMap.captureZone.name}
                </span>
              </div>
            </div>

            {/* Points de Spawn répertoriés */}
            <div>
              <div className="text-xs font-mono-tech text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#ff007f]" />
                <span>POINTS DE SPAWN TACTIQUES DÉTECTÉS ({currentMap.spawnPoints.length})</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {currentMap.spawnPoints.map((spawn) => (
                  <div
                    key={spawn.id}
                    className="p-2.5 bg-[#0a1020]/90 border border-slate-800 flex items-start gap-2"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0"
                      style={{
                        backgroundColor:
                          spawn.team === 'red'
                            ? '#ff0033'
                            : spawn.team === 'blue'
                            ? '#0088ff'
                            : '#00f0ff',
                      }}
                    />
                    <div>
                      <div className="text-xs font-bold text-white font-sans">
                        {spawn.name}
                      </div>
                      <div className="text-[10px] font-mono-tech text-slate-400">
                        {spawn.team === 'red'
                          ? 'ÉQUIPE ROUGE'
                          : spawn.team === 'blue'
                          ? 'ÉQUIPE BLEU'
                          : 'SPAWN NEUTRE'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* PIED DE MODALE (ACTIONS) */}
        <div className="p-4 border-t border-[#00f0ff]/30 bg-black/80 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-slate-400 font-mono-tech">
            MAP ACTIVE ACTUELLE : <span className="text-[#00f0ff] font-bold">{currentMap.name}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                audioSystem.playClick();
                onClose();
              }}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-mono-tech border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition cursor-pointer"
            >
              ANNULER
            </button>

            <button
              onClick={handleConfirmDeploy}
              className="flex-1 sm:flex-none px-6 py-2.5 text-xs font-mono-tech font-bold bg-[#00f0ff] hover:bg-[#ff007f] text-black hover:text-white transition shadow-[0_0_15px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              DÉPLOYER SUR CETTE MAP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
