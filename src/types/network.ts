/**
 * Types pour la couche réseau multijoueur (Photon Realtime)
 */

export type PhotonConnectionStatus = 
  | 'DISCONNECTED'
  | 'CONNECTING_TO_NAME_SERVER'
  | 'CONNECTED_TO_NAME_SERVER'
  | 'CONNECTING_TO_MASTER_SERVER'
  | 'CONNECTED_TO_MASTER'
  | 'JOINING_LOBBY'
  | 'IN_LOBBY'
  | 'JOINING_ROOM'
  | 'IN_ROOM'
  | 'LEAVING_ROOM'
  | 'ERROR';

export interface PhotonRoomInfo {
  name: string;
  maxPlayers: number;
  playerCount: number;
  mapName: string;
  gameMode: 'TEAM_DEATHMATCH' | 'CYBER_FREE_FOR_ALL' | 'DATA_HEIST';
  isLocked: boolean;
  ping: number;
  customProperties?: Record<string, any>;
}

export interface NetworkPlayerState {
  actorNr: number;
  uid: string;
  callsign: string;
  team?: 'RED' | 'BLUE' | 'SOLO';
  position: [number, number, number];
  rotation: [number, number, number]; // [pitch, yaw, roll]
  velocity: [number, number, number];
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  isAlive: boolean;
  isSprinting: boolean;
  selectedWeapon: string;
  isFiring: boolean;
  kills: number;
  deaths: number;
  score: number;
  ping: number;
  lastUpdate: number;
  isBot?: boolean;
  difficulty?: 'FACILE' | 'MOYEN' | 'DIFFICILE';
  isImmune?: boolean;
  isInSanctuary?: boolean;
}

export const PHOTON_EVENT_CODES = {
  PLAYER_STATE: 1,
  PLAYER_SHOOT: 2,
  PLAYER_DAMAGE: 3,
  PLAYER_KILL: 4,
  PLAYER_RESPAWN: 5,
  CHAT_MESSAGE: 6,
  MAP_SYNC: 7,
  BOT_SYNC: 8,
  VOICE_SIGNAL: 10,
} as const;

export type NetworkEventType = 
  | 'PLAYER_SPAWN'
  | 'PLAYER_STATE'
  | 'PLAYER_MOVE'
  | 'PLAYER_SHOOT'
  | 'PLAYER_DAMAGE'
  | 'PLAYER_KILL'
  | 'PLAYER_RESPAWN'
  | 'CHAT_MESSAGE'
  | 'VOICE_SIGNAL';

export interface NetworkEventPacket {
  type: NetworkEventType;
  senderActorNr: number;
  timestamp: number;
  payload: any;
}

export interface KillFeedEntry {
  id: string;
  killerName: string;
  killerTeam?: 'RED' | 'BLUE' | 'SOLO';
  victimName: string;
  victimTeam?: 'RED' | 'BLUE' | 'SOLO';
  weaponName: string;
  isHeadshot?: boolean;
  timestamp: number;
}

