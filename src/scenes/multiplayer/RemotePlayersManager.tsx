/**
 * Gestionnaire Réseau des Joueurs Distants dans la Scène 3D
 * 
 * Orchestre l'affichage, les tirs reçus et les dégâts infligés aux autres joueurs connectés
 */

import { useState, useEffect } from 'react';
import { photonClient } from '../../net/photonClient.ts';
import { proximityVoiceSystem } from '../../net/proximityVoiceSystem.ts';
import type { NetworkPlayerState, NetworkEventPacket } from '../../types/network.ts';
import type { RemoteVoiceState } from '../../types/voice.ts';
import type { LaserBeamEffect, ImpactEffect } from '../../types/fps.ts';
import RemotePlayerAvatar from './RemotePlayerAvatar.tsx';
import * as THREE from 'three';

interface RemotePlayersManagerProps {
  onLaserFired?: (beam: LaserBeamEffect) => void;
  onImpactCreated?: (impact: ImpactEffect) => void;
}

export default function RemotePlayersManager({
  onLaserFired,
  onImpactCreated,
}: RemotePlayersManagerProps) {
  const [remotePlayers, setRemotePlayers] = useState<NetworkPlayerState[]>([]);
  const [speakingActorNrs, setSpeakingActorNrs] = useState<Set<number>>(new Set());

  // Diagnostic : Journalisation du nombre de joueurs et bots rendus dans la scène 3D
  useEffect(() => {
    const bots = remotePlayers.filter((p) => p.isBot);
    const humans = remotePlayers.filter((p) => !p.isBot);
    console.log(
      `[RemotePlayersManager] 🎮 Scène 3D synchronisée : Total ${remotePlayers.length} entités [${humans.length} Joueur(s) réel(s), ${bots.length} Bot(s) IA]`
    );
    if (bots.length > 0) {
      console.log(
        `[RemotePlayersManager] 🤖 Liste des bots actifs en rendu :`,
        bots.map((b) => `${b.callsign} (#${b.actorNr}, Team: ${b.team}, HP: ${b.health})`).join(' | ')
      );
    }
  }, [remotePlayers.length]);

  useEffect(() => {
    // 1. S'abonner aux changements d'état des joueurs distants
    const unsubPlayers = photonClient.onRemotePlayersChange((players) => {
      setRemotePlayers(players);
    });

    // 2. S'abonner à l'activité vocale
    const unsubVoice = proximityVoiceSystem.onRemoteVoiceStatesChange((states: RemoteVoiceState[]) => {
      const speakingSet = new Set<number>();
      states.forEach((s) => {
        if (s.isSpeaking) speakingSet.add(s.actorNr);
      });
      setSpeakingActorNrs(speakingSet);
    });

    // 3. S'abonner aux paquets réseau (Tirs reçus, Dégâts reçus)
    const unsubEvents = photonClient.onNetworkPacket((packet: NetworkEventPacket) => {
      if (packet.type === 'PLAYER_SHOOT' && packet.payload) {
        const { m, d, c } = packet.payload;
        if (m && d && onLaserFired) {
          const start = new THREE.Vector3(m[0], m[1], m[2]);
          const dir = new THREE.Vector3(d[0], d[1], d[2]).normalize();
          const end = start.clone().add(dir.multiplyScalar(60));

          onLaserFired({
            id: `remote_beam_${Date.now()}_${Math.random()}`,
            start,
            end,
            color: c || '#ff0055',
            createdAt: Date.now(),
            duration: 0.08,
          });
        }
      } else if (packet.type === 'PLAYER_DAMAGE' && packet.payload) {
        const { hit } = packet.payload;

        // Effet d'étincelle d'impact sur le joueur touché
        if (hit && onImpactCreated) {
          onImpactCreated({
            id: `remote_impact_${Date.now()}_${Math.random()}`,
            position: new THREE.Vector3(hit[0], hit[1], hit[2]),
            normal: new THREE.Vector3(0, 1, 0),
            color: '#ff0055',
            createdAt: Date.now(),
          });
        }
      }
    });

    return () => {
      unsubPlayers();
      unsubVoice();
      unsubEvents();
    };
  }, [onLaserFired, onImpactCreated]);

  return (
    <group name="remote-players-root">
      {remotePlayers.map((player) => (
        <RemotePlayerAvatar
          key={player.actorNr}
          player={player}
          isSpeaking={speakingActorNrs.has(player.actorNr)}
        />
      ))}
    </group>
  );
}
