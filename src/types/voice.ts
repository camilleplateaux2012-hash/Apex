/**
 * Types pour le Chat Vocal de Proximité 3D WebRTC
 */

export type VoiceChatStatus = 
  | 'DISABLED' 
  | 'REQUESTING_PERMISSION' 
  | 'READY' 
  | 'MUTED' 
  | 'TRANSMITTING' 
  | 'ERROR';

export interface RemoteVoiceState {
  actorNr: number;
  callsign: string;
  isSpeaking: boolean;
  volumeLevel: number; // 0.0 - 1.0 (Voice activity)
  distance: number; // Distance in 3D units / meters
  isInRange: boolean; // distance <= maxDistance
  isMuted: boolean;
}

export interface VoiceSettings {
  enabled: boolean;
  isMuted: boolean;
  micVolume: number; // 0.0 - 1.0
  maxDistance: number; // e.g. 30 meters
  proximityRolloff: 'linear' | 'inverse' | 'exponential';
  deafened: boolean; // Mute incoming voice audio
  noiseSuppression: boolean;
  echoCancellation: boolean;
}

export interface VoiceSignalPayload {
  fromActorNr: number;
  toActorNr: number; // 0 for broadcast, or specific actorNr
  type: 'offer' | 'answer' | 'candidate' | 'mute_state' | 'join_voice' | 'leave_voice';
  data?: any;
  isMuted?: boolean;
}
