/**
 * Système de Chat Vocal de Proximité WebRTC 3D (Spatial Proximity Voice Chat)
 * 
 * - Connexions P2P WebRTC entre joueurs dans le même salon
 * - Atténuation et Panning Spatial 3D (Web Audio API - PannerNode & GainNode)
 * - Portée maximale réglable (30 mètres par défaut)
 * - Détection d'activité vocale (VAD) pour la visualisation visuelle des ondes vocales
 * - Gestion du micro (Activer/Muer/Volume)
 */

import { photonClient } from './photonClient.ts';
import type { VoiceChatStatus, RemoteVoiceState, VoiceSettings } from '../types/voice.ts';
import type { NetworkEventPacket } from '../types/network.ts';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' }
  ]
};

interface PeerConnectionData {
  actorNr: number;
  pc: RTCPeerConnection;
  gainNode: GainNode;
  pannerNode: PannerNode;
  analyserNode: AnalyserNode;
  audioElement: HTMLAudioElement;
  isSpeaking: boolean;
  distance: number;
  volumeLevel: number;
}

class ProximityVoiceSystem {
  private audioCtx: AudioContext | null = null;
  private localStream: MediaStream | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private status: VoiceChatStatus = 'DISABLED';
  private statusMessage: string = '';

  private settings: VoiceSettings = {
    enabled: true,
    isMuted: false,
    micVolume: 1.0,
    maxDistance: 30, // meters
    proximityRolloff: 'inverse',
    deafened: false,
    noiseSuppression: true,
    echoCancellation: true,
  };

  private peers = new Map<number, PeerConnectionData>();
  private localPosition: [number, number, number] = [0, 1.6, 0];
  private localOrientation: [number, number, number] = [0, 0, 0]; // pitch, yaw, roll

  private isLocalSpeaking: boolean = false;
  private localVolumeLevel: number = 0;
  private vadInterval: number | null = null;

  // Listeners
  private statusListeners = new Set<(status: VoiceChatStatus, msg?: string) => void>();
  private remoteVoiceListeners = new Set<(states: RemoteVoiceState[]) => void>();
  private localSpeakingListeners = new Set<(isSpeaking: boolean, level: number) => void>();

  constructor() {
    // S'abonner aux événements réseau de signalisation WebRTC
    photonClient.onNetworkPacket((packet) => this.handleNetworkPacket(packet));
    
    // S'abonner aux changements de liste de joueurs pour initier/fermer les connexions
    photonClient.onRemotePlayersChange((players) => {
      if (this.status === 'READY' || this.status === 'MUTED' || this.status === 'TRANSMITTING') {
        const currentActorNrs = new Set(players.map((p) => p.actorNr));
        
        // Fermer les pairs déconnectés
        for (const [actorNr, peerData] of this.peers.entries()) {
          if (!currentActorNrs.has(actorNr)) {
            this.closePeer(actorNr);
          }
        }

        // Initier les connexions avec les nouveaux pairs si nous avons un numéro d'acteur plus petit (ordre déterministe)
        const localActorNr = photonClient.getLocalActorNr();
        for (const player of players) {
          if (!this.peers.has(player.actorNr) && localActorNr < player.actorNr) {
            this.initiatePeerConnection(player.actorNr);
          }
        }
      }
    });
  }

  // ==========================================================================
  // INITIALISATION & GESTION DU MICROPHONE
  // ==========================================================================

  public async initialize(): Promise<boolean> {
    if (this.status === 'READY' || this.status === 'TRANSMITTING' || this.status === 'MUTED') {
      return true;
    }

    try {
      this.setStatus('REQUESTING_PERMISSION', 'Autorisation microphone demandée...');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("L'accès au microphone n'est pas autorisé par l'environnement (sécurité de l'iframe ou protocole non-sécurisé)");
      }

      // Initialiser AudioContext
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      // Demander l'accès au microphone avec annulation d'écho et suppression de bruit
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: this.settings.echoCancellation,
          noiseSuppression: this.settings.noiseSuppression,
          autoGainControl: true,
        },
        video: false,
      });

      // Configurer l'Analyseur d'activité vocale (VAD) pour le micro local
      const source = this.audioCtx.createMediaStreamSource(this.localStream);
      this.localAnalyser = this.audioCtx.createAnalyser();
      this.localAnalyser.fftSize = 256;
      source.connect(this.localAnalyser);

      // Démarrer la boucle VAD
      this.startVADLoop();

      this.setStatus('READY', 'Microphone actif (Voice Proximity)');

      // Diffuser à la pièce qu'on rejoint le vocal
      photonClient.sendVoiceSignal(0, 'join_voice', {});

      return true;
    } catch (err: any) {
      console.warn("[ProximityVoice] Impossible d'accéder au micro :", err);
      this.setStatus('ERROR', err.message || 'Microphone non autorisé');
      return false;
    }
  }

  public setMuted(muted: boolean): void {
    this.settings.isMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }

    if (muted) {
      this.setStatus('MUTED', 'Microphone muet');
    } else if (this.status === 'MUTED') {
      this.setStatus('READY', 'Microphone actif');
    }

    // Informer les pairs du changement d'état du micro
    photonClient.sendVoiceSignal(0, 'mute_state', { isMuted: muted });
  }

  public toggleMute(): boolean {
    const newMuted = !this.settings.isMuted;
    this.setMuted(newMuted);
    return newMuted;
  }

  public isMuted(): boolean {
    return this.settings.isMuted;
  }

  public getStatus(): VoiceChatStatus {
    return this.status;
  }

  public getStatusMessage(): string {
    return this.statusMessage;
  }

  public getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    if (newSettings.isMuted !== undefined) {
      this.setMuted(newSettings.isMuted);
    }
  }

  // ==========================================================================
  // WEBRTC SIGNALING & CONNEXIONS P2P
  // ==========================================================================

  private async initiatePeerConnection(targetActorNr: number): Promise<void> {
    if (!this.localStream || this.peers.has(targetActorNr)) return;

    try {
      const peerData = this.createPeerConnection(targetActorNr);
      const offer = await peerData.pc.createOffer();
      await peerData.pc.setLocalDescription(offer);

      photonClient.sendVoiceSignal(targetActorNr, 'offer', offer);
    } catch (err) {
      console.warn(`[ProximityVoice] Erreur création offer pour joueur ${targetActorNr}:`, err);
    }
  }

  private createPeerConnection(remoteActorNr: number): PeerConnectionData {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Ajouter les pistes audio locales
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Nœuds audio Web Audio API pour la spatialisation 3D
    const gainNode = this.audioCtx!.createGain();
    const pannerNode = this.audioCtx!.createPanner();
    const analyserNode = this.audioCtx!.createAnalyser();
    analyserNode.fftSize = 256;

    // Configuration Panner 3D spatial
    pannerNode.panningModel = 'HRTF';
    pannerNode.distanceModel = 'inverse';
    pannerNode.refDistance = 4;
    pannerNode.maxDistance = this.settings.maxDistance;
    pannerNode.rolloffFactor = 1.2;

    const audioElement = new Audio();
    audioElement.autoplay = true;

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        audioElement.srcObject = stream;

        // Connexion au réseau audio 3D
        try {
          const source = this.audioCtx!.createMediaStreamSource(stream);
          source.connect(pannerNode);
          pannerNode.connect(gainNode);
          gainNode.connect(analyserNode);
          analyserNode.connect(this.audioCtx!.destination);
        } catch (e) {
          console.warn('[ProximityVoice] Erreur raccordement AudioNode :', e);
        }
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        photonClient.sendVoiceSignal(remoteActorNr, 'candidate', event.candidate);
      }
    };

    const peerData: PeerConnectionData = {
      actorNr: remoteActorNr,
      pc,
      gainNode,
      pannerNode,
      analyserNode,
      audioElement,
      isSpeaking: false,
      distance: 999,
      volumeLevel: 0,
    };

    this.peers.set(remoteActorNr, peerData);
    return peerData;
  }

  private async handleNetworkPacket(packet: NetworkEventPacket): Promise<void> {
    if (packet.type !== 'VOICE_SIGNAL') return;

    const senderActorNr = packet.senderActorNr;
    const { type, data } = packet.payload;

    if (type === 'join_voice') {
      const localActorNr = photonClient.getLocalActorNr();
      if (localActorNr > senderActorNr && !this.peers.has(senderActorNr)) {
        this.initiatePeerConnection(senderActorNr);
      }
      return;
    }

    if (type === 'offer') {
      try {
        let peerData = this.peers.get(senderActorNr);
        if (!peerData) {
          peerData = this.createPeerConnection(senderActorNr);
        }

        await peerData.pc.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await peerData.pc.createAnswer();
        await peerData.pc.setLocalDescription(answer);

        photonClient.sendVoiceSignal(senderActorNr, 'answer', answer);
      } catch (err) {
        console.warn(`[ProximityVoice] Erreur traitement offer de ${senderActorNr}:`, err);
      }
      return;
    }

    if (type === 'answer') {
      const peerData = this.peers.get(senderActorNr);
      if (peerData) {
        try {
          await peerData.pc.setRemoteDescription(new RTCSessionDescription(data));
        } catch (err) {
          console.warn(`[ProximityVoice] Erreur traitement answer de ${senderActorNr}:`, err);
        }
      }
      return;
    }

    if (type === 'candidate') {
      const peerData = this.peers.get(senderActorNr);
      if (peerData && data) {
        try {
          await peerData.pc.addIceCandidate(new RTCIceCandidate(data));
        } catch (err) {
          console.warn(`[ProximityVoice] Erreur candidate ICE de ${senderActorNr}:`, err);
        }
      }
      return;
    }
  }

  private closePeer(actorNr: number): void {
    const peerData = this.peers.get(actorNr);
    if (peerData) {
      try {
        peerData.pc.close();
        peerData.gainNode.disconnect();
        peerData.pannerNode.disconnect();
        peerData.analyserNode.disconnect();
        peerData.audioElement.srcObject = null;
      } catch (e) {
        // Ignorer
      }
      this.peers.delete(actorNr);
      this.notifyRemoteVoiceStates();
    }
  }

  // ==========================================================================
  // MISE À JOUR SPATIALE 3D & DÉTECTION D'ACTIVITÉ VOCALE (VAD)
  // ==========================================================================

  /**
   * Appelé à chaque frame de rendu pour recalculer la position relative 3D et le volume
   */
  public updateSpatialPositions(
    localPos: [number, number, number],
    localYaw: number,
    remotePlayers: { actorNr: number; position: [number, number, number]; callsign: string }[]
  ): void {
    this.localPosition = localPos;

    // Mise à jour de la position de l'auditeur dans Web Audio API
    if (this.audioCtx && this.audioCtx.listener) {
      const listener = this.audioCtx.listener;
      if (listener.positionX) {
        listener.positionX.setTargetAtTime(localPos[0], this.audioCtx.currentTime, 0.05);
        listener.positionY.setTargetAtTime(localPos[1], this.audioCtx.currentTime, 0.05);
        listener.positionZ.setTargetAtTime(localPos[2], this.audioCtx.currentTime, 0.05);

        // Orientation de l'auditeur (Direction du regard basée sur yaw)
        const dx = -Math.sin(localYaw);
        const dz = -Math.cos(localYaw);
        listener.forwardX.setTargetAtTime(dx, this.audioCtx.currentTime, 0.05);
        listener.forwardY.setTargetAtTime(0, this.audioCtx.currentTime, 0.05);
        listener.forwardZ.setTargetAtTime(dz, this.audioCtx.currentTime, 0.05);
      }
    }

    // Pour chaque pair distant, calculer la distance 3D et régler PannerNode / GainNode
    for (const player of remotePlayers) {
      const peerData = this.peers.get(player.actorNr);
      if (!peerData) continue;

      const p = player.position;
      const dx = p[0] - localPos[0];
      const dy = p[1] - localPos[1];
      const dz = p[2] - localPos[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      peerData.distance = dist;

      // Positionnement du PannerNode
      if (peerData.pannerNode.positionX) {
        peerData.pannerNode.positionX.setTargetAtTime(p[0], this.audioCtx?.currentTime || 0, 0.05);
        peerData.pannerNode.positionY.setTargetAtTime(p[1], this.audioCtx?.currentTime || 0, 0.05);
        peerData.pannerNode.positionZ.setTargetAtTime(p[2], this.audioCtx?.currentTime || 0, 0.05);
      }

      // Calcul de l'atténuation du volume
      let targetGain = 0;
      if (!this.settings.deafened && dist <= this.settings.maxDistance) {
        if (dist <= 4) {
          targetGain = 1.0;
        } else {
          // Atténuation fluide au-delà de 4 mètres jusqu'à maxDistance (30m)
          const normDist = (dist - 4) / (this.settings.maxDistance - 4);
          targetGain = Math.max(0, Math.pow(1 - normDist, 1.5));
        }
      }

      peerData.gainNode.gain.setTargetAtTime(targetGain, this.audioCtx?.currentTime || 0, 0.05);
    }

    this.notifyRemoteVoiceStates();
  }

  /**
   * Boucle de détection du niveau sonore (parlant / muet)
   */
  private startVADLoop(): void {
    if (this.vadInterval) clearInterval(this.vadInterval);

    const dataArray = new Uint8Array(128);

    this.vadInterval = window.setInterval(() => {
      // 1. Local VAD
      if (this.localAnalyser && !this.settings.isMuted) {
        this.localAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        this.localVolumeLevel = avg / 255;
        const speakingNow = this.localVolumeLevel > 0.08;

        if (speakingNow !== this.isLocalSpeaking) {
          this.isLocalSpeaking = speakingNow;
          if (speakingNow && this.status === 'READY') {
            this.setStatus('TRANSMITTING', 'En train de parler...');
          } else if (!speakingNow && this.status === 'TRANSMITTING') {
            this.setStatus('READY', 'Microphone actif');
          }
        }

        this.localSpeakingListeners.forEach((fn) => fn(this.isLocalSpeaking, this.localVolumeLevel));
      }

      // 2. Remote Peers VAD
      for (const peerData of this.peers.values()) {
        if (peerData.analyserNode) {
          peerData.analyserNode.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          peerData.volumeLevel = avg / 255;
          peerData.isSpeaking = peerData.volumeLevel > 0.08;
        }
      }

      this.notifyRemoteVoiceStates();
    }, 100);
  }

  // ==========================================================================
  // ÉCOUTEURS ET ÉTATS
  // ==========================================================================

  private setStatus(s: VoiceChatStatus, msg: string = ''): void {
    this.status = s;
    this.statusMessage = msg;
    this.statusListeners.forEach((fn) => fn(s, msg));
  }

  private notifyRemoteVoiceStates(): void {
    const states: RemoteVoiceState[] = [];
    const remotePlayers = photonClient.getRemotePlayers();

    for (const [actorNr, peerData] of this.peers.entries()) {
      const rp = remotePlayers.find((p) => p.actorNr === actorNr);
      states.push({
        actorNr,
        callsign: rp ? rp.callsign : `Joueur #${actorNr}`,
        isSpeaking: peerData.isSpeaking,
        volumeLevel: peerData.volumeLevel,
        distance: peerData.distance,
        isInRange: peerData.distance <= this.settings.maxDistance,
        isMuted: false,
      });
    }

    this.remoteVoiceListeners.forEach((fn) => fn(states));
  }

  public onStatusChange(callback: (status: VoiceChatStatus, msg?: string) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.status, this.statusMessage);
    return () => this.statusListeners.delete(callback);
  }

  public onRemoteVoiceStatesChange(callback: (states: RemoteVoiceState[]) => void): () => void {
    this.remoteVoiceListeners.add(callback);
    return () => this.remoteVoiceListeners.delete(callback);
  }

  public onLocalSpeaking(callback: (isSpeaking: boolean, level: number) => void): () => void {
    this.localSpeakingListeners.add(callback);
    return () => this.localSpeakingListeners.delete(callback);
  }

  public cleanup(): void {
    if (this.vadInterval) clearInterval(this.vadInterval);
    for (const actorNr of Array.from(this.peers.keys())) {
      this.closePeer(actorNr);
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }
    if (this.audioCtx) {
      this.audioCtx.close();
    }
    this.status = 'DISABLED';
  }
}

export const proximityVoiceSystem = new ProximityVoiceSystem();
