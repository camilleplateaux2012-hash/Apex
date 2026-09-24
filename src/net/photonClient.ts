/**
 * ============================================================================
 * CLIENT PHOTON REALTIME OFFICIEL (Couche Multijoueur Basse Latence)
 * ============================================================================
 * 
 * Ce module gère la communication réseau complète avec Photon Realtime :
 * - Connexion sécurisée WebSocket (WSS) au NameServer et MasterServer Photon
 * - Matchmaking automatique (Quick Match) et création de salons publics / privés avec code
 * - Synchronisation en temps réel (20-30 Hz) de la position/rotation des joueurs
 * - Synchronisation des tirs laser, calcul des dégâts et validation
 * - Gestion synchronisée des éliminations (Killfeed), morts et réapparitions (Respawn)
 * - Liste des joueurs connectés (Scoreboard) et gestion des déconnexions propres
 * - Diagnostic d'état de connexion en temps réel avec messages d'erreurs clairs
 */

import Photon from 'photon-realtime';
import { PHOTON_CONFIG, isPhotonConfigured } from './photonConfig.ts';
import { 
  PHOTON_EVENT_CODES, 
  type PhotonConnectionStatus, 
  type PhotonRoomInfo, 
  type NetworkPlayerState, 
  type NetworkEventPacket,
  type NetworkEventType,
  type KillFeedEntry
} from '../types/network.ts';

type StatusListener = (status: PhotonConnectionStatus, message?: string, errorDetail?: string) => void;
type RoomListListener = (rooms: PhotonRoomInfo[]) => void;
type RemotePlayersListener = (players: NetworkPlayerState[]) => void;
type NetworkEventListener = (packet: NetworkEventPacket) => void;
type KillFeedListener = (entry: KillFeedEntry) => void;

class PhotonNetworkService {
  private client: any = null;
  private status: PhotonConnectionStatus = 'DISCONNECTED';
  private statusMessage: string = 'Déconnecté';
  private errorDetail: string = '';
  private currentRoom: PhotonRoomInfo | null = null;
  private localActorNr: number = 0;
  private localUserId: string = 'anon_user';
  private localCallsign: string = 'CYBER_OPERATOR';
  private localTeam: 'RED' | 'BLUE' | 'SOLO' = 'SOLO';

  // Liste des joueurs distants connectés dans la room (ActorNr -> State)
  private remotePlayers: Map<number, NetworkPlayerState> = new Map();
  private availableRooms: PhotonRoomInfo[] = [];
  private killFeed: KillFeedEntry[] = [];

  // Listeners
  private statusListeners: Set<StatusListener> = new Set();
  private roomListListeners: Set<RoomListListener> = new Set();
  private remotePlayersListeners: Set<RemotePlayersListener> = new Set();
  private eventListeners: Map<number, Set<NetworkEventListener>> = new Map();
  private killFeedListeners: Set<KillFeedListener> = new Set();

  private ping: number = 25;
  private lastTransformBroadcastTime: number = 0;
  private isConnecting: boolean = false;

  constructor() {
    // Initialisation
  }

  /**
   * Initialise le client Photon LoadBalancing et se connecte au Master Server via Photon.setOnLoad
   */
  public async connect(userId: string = 'anon_user', callsign: string = 'CYBER_OPERATOR'): Promise<boolean> {
    this.localUserId = userId;
    this.localCallsign = callsign;

    if (!isPhotonConfigured()) {
      this.setStatus(
        'ERROR', 
        'App ID Photon manquant', 
        'Veuillez renseigner votre App ID Photon dans src/net/photonConfig.ts.'
      );
      return false;
    }

    if (!Photon || !Photon.LoadBalancing) {
      this.setStatus(
        'ERROR', 
        'SDK Photon introuvable', 
        'Le module photon-realtime d\'Exit Games n\'a pas pu être chargé.'
      );
      return false;
    }

    if (this.client && (this.status === 'CONNECTED_TO_MASTER' || this.status === 'IN_LOBBY' || this.status === 'IN_ROOM')) {
      return true;
    }

    // Nettoyage complet de l'ancien client pour éviter les fuites de listeners et doubles reconnexions
    if (this.client) {
      try {
        this.client.onStateChange = null;
        this.client.onError = null;
        this.client.onEvent = null;
        this.client.onActorJoin = null;
        this.client.onActorLeave = null;
        this.client.onRoomList = null;
        this.client.onRoomListUpdate = null;
        this.client.disconnect();
      } catch (err) {
        console.warn('[PhotonClient] Erreur lors du nettoyage de l\'ancien client :', err);
      }
      this.client = null;
    }

    this.isConnecting = true;
    this.setStatus('CONNECTING_TO_NAME_SERVER', 'Initialisation du SDK Photon Realtime (WSS)...');

    try {
      // Configuration de la classe WebSocket native du navigateur (évite l'utilisation du module Node 'ws')
      if (typeof window !== 'undefined' && window.WebSocket && Photon.PhotonPeer) {
        Photon.PhotonPeer.setWebSocketImpl(window.WebSocket);
      }

      // Création du client LoadBalancing officiel Photon
      const protocol = Photon.ConnectionProtocol.Wss;
      this.client = new Photon.LoadBalancing.LoadBalancingClient(
        protocol,
        PHOTON_CONFIG.appId,
        PHOTON_CONFIG.appVersion
      );

      this.client.setUserId(userId);

      // 1. Gestion des changements d'état du client
      this.client.onStateChange = (state: number) => {
        this.handleClientStateChange(state);
      };

      // 2. Gestion des erreurs de connexion Photon avec mécanismes d'auto-reconnexion auto-correctrice
      this.client.onError = (errorCode: number, errorMsg: string) => {
        console.error('[PhotonClient] Erreur Photon :', errorCode, errorMsg);
        
        // Détecter si l'erreur est un lien réseau coupé (1003 = MasterConnectClosed, 2003 = GameConnectClosed, 3003 = NameServerConnectClosed)
        const isRecoverable = errorCode === 2003 || errorCode === 1003 || errorCode === 3003;
        
        if (isRecoverable) {
          console.warn(`[PhotonClient] Déconnexion de transition ou récupérable détectée (#${errorCode}). Rétablissement de la connexion...`);
          const msg = errorCode === 2003 
            ? 'Retour au centre de commandement (Reconnexion)...'
            : 'Lien réseau perdu. Reconnexion automatique...';
          this.setStatus('CONNECTING_TO_NAME_SERVER', msg);
          this.remotePlayers.clear();
          this.notifyRemotePlayers();
          this.currentRoom = null;
          
          setTimeout(() => {
            this.connect(this.localUserId, this.localCallsign).catch((e) => {
              console.error('[PhotonClient] Échec de la reconnexion automatique :', e);
              this.setStatus(
                'ERROR', 
                `Lien perdu (#${errorCode})`, 
                'Connexion interrompue. Veuillez cliquer sur Reconnecter.'
              );
            });
          }, 2000);
          return;
        }

        this.setStatus(
          'ERROR', 
          `Erreur Photon (#${errorCode})`, 
          errorMsg || 'Connexion interrompue par le serveur Photon.'
        );
      };

      // 3. Gestion de la liste des salons du Lobby
      this.client.onRoomList = (roomInfos: any[]) => {
        this.updateRoomList(roomInfos);
      };
      this.client.onRoomListUpdate = (roomInfos: any[]) => {
        this.updateRoomList(roomInfos);
      };

      // 4. Gestion de l'entrée d'un joueur dans le salon
      this.client.onActorJoin = (actor: any) => {
        if (actor.actorNr === this.client.myActor().actorNr) return;
        
        const newPlayer: NetworkPlayerState = {
          actorNr: actor.actorNr,
          uid: actor.userId || `player_${actor.actorNr}`,
          callsign: actor.name || `OPERATEUR_${actor.actorNr}`,
          position: [0, 1.6, 0],
          rotation: [0, 0, 0],
          velocity: [0, 0, 0],
          health: 100,
          maxHealth: 100,
          shield: 50,
          maxShield: 50,
          isAlive: true,
          isSprinting: false,
          selectedWeapon: 'weapon_railgun',
          isFiring: false,
          kills: 0,
          deaths: 0,
          score: 0,
          ping: 30,
          lastUpdate: Date.now(),
        };

        this.remotePlayers.set(actor.actorNr, newPlayer);
        this.notifyRemotePlayers();
        console.info(`[PhotonClient] Joueur #${actor.actorNr} (${newPlayer.callsign}) a rejoint la partie.`);
      };

      // 5. Gestion du départ d'un joueur (déconnexion propre)
      this.client.onActorLeave = (actor: any) => {
        if (this.remotePlayers.has(actor.actorNr)) {
          const leavingName = this.remotePlayers.get(actor.actorNr)?.callsign || `Joueur #${actor.actorNr}`;
          this.remotePlayers.delete(actor.actorNr);
          this.notifyRemotePlayers();
          console.info(`[PhotonClient] 🚪 ${leavingName} (#${actor.actorNr}) s'est déconnecté.`);
        }
      };

      // 6. Gestion native du changement de Master Client Photon
      this.client.onMasterClientChanged = (newMasterActor: any) => {
        const isNowMaster = this.isMasterClient();
        console.log(
          `[PhotonClient] 👑 HANDSHAKE MASTER CLIENT : Changement d'autorité -> Nouveau Master #${newMasterActor?.actorNr} | Mon ActorNr: ${this.localActorNr} | Suis-je désormais Master ? ${isNowMaster}`
        );
        // Si nous devenons le nouveau Master Client, assurer la transition transparente des bots
        if (isNowMaster) {
          console.log('[PhotonClient] 🎯 Prise de relais immédiate de la simulation des bots en tant que nouveau Master Client.');
          import('../systems/botSystem.ts').then(({ botSystem }) => {
            botSystem.start();
          }).catch(() => {});
        }
      };

      // 7. Gestion des événements réseau personnalisés (Tirs, Dégâts, Morts, Positions, Bots)
      this.client.onEvent = (code: number, content: any, actorNr: number) => {
        this.handlePhotonEvent(code, content, actorNr);
      };

      // 8. Connexion garantie une fois le SDK prêt via Photon.setOnLoad
      Photon.setOnLoad(() => {
        if (this.client) {
          this.client.connectToRegionMaster(PHOTON_CONFIG.region);
        }
      });

      return true;
    } catch (err: any) {
      console.error('[PhotonClient] Exception lors de la connexion :', err);
      this.setStatus(
        'ERROR', 
        'Échec initialisation réseau', 
        err?.message || 'Impossible d\'initialiser le socket WebSocket Photon.'
      );
      this.isConnecting = false;
      return false;
    }
  }

  /**
   * Garantit que le client est connecté au serveur Master Server avant d'effectuer une action réseau.
   * Si ce n'est pas le cas, attend ou initie la connexion.
   */
  public async ensureConnected(): Promise<boolean> {
    if (this.client && (this.status === 'CONNECTED_TO_MASTER' || this.status === 'IN_LOBBY' || this.status === 'IN_ROOM')) {
      return true;
    }

    if (!this.client) {
      await this.connect(this.localUserId, this.localCallsign);
    }

    const startTime = Date.now();
    while (Date.now() - startTime < 10000) {
      if (this.client && (this.status === 'CONNECTED_TO_MASTER' || this.status === 'IN_LOBBY' || this.status === 'IN_ROOM')) {
        return true;
      }
      if (this.status === 'ERROR') {
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    console.warn('[PhotonClient] Timeout de connexion de 10s dépassé.');
    return false;
  }

  /**
   * Gestionnaire des transitions d'états LoadBalancing Photon
   */
  private handleClientStateChange(state: number) {
    if (!Photon || !Photon.LoadBalancing) return;

    const States = Photon.LoadBalancing.LoadBalancingClient.State;

    switch (state) {
      case States.ConnectingToNameServer:
        this.setStatus('CONNECTING_TO_NAME_SERVER', 'Résolution du Name Server Photon...');
        break;
      case States.ConnectedToNameServer:
        this.setStatus('CONNECTED_TO_NAME_SERVER', 'Connecté au Name Server, routage région...');
        break;
      case States.ConnectingToMasterserver:
        this.setStatus('CONNECTING_TO_MASTER_SERVER', `Connexion au Master Server [${PHOTON_CONFIG.region.toUpperCase()}]...`);
        break;
      case States.ConnectedToMaster:
        this.setStatus('CONNECTED_TO_MASTER', `Connecté au Master Server Photon [${PHOTON_CONFIG.region.toUpperCase()}]`);
        this.isConnecting = false;
        break;
      case States.JoinedLobby:
        this.setStatus('IN_LOBBY', 'Prêt dans le Lobby Multijoueur');
        break;
      case States.Joining:
        this.setStatus('JOINING_ROOM', 'Connexion au salon de combat...');
        break;
      case States.Joined: {
        const myActor = this.client.myActor();
        this.localActorNr = myActor ? myActor.actorNr : 1;
        if (myActor) {
          myActor.setName(this.localCallsign);
        }

        const room = this.client.myRoom();
        const customProps = room ? room.getCustomProperties() : {};
        const mode = customProps.mode || 'CYBER_FREE_FOR_ALL';

        this.currentRoom = {
          name: room ? room.name : 'ARENA_MATCH',
          maxPlayers: room ? room.maxPlayers : PHOTON_CONFIG.maxPlayersPerRoom,
          playerCount: room ? room.playerCount : 1,
          mapName: customProps.map || 'rooftop_district',
          gameMode: mode as any,
          isLocked: false,
          ping: this.ping,
          customProperties: customProps,
        };

        // ASSIGNATION DES ÉQUIPES AUTOMATIQUE ET ÉQUILIBRÉE
        let assignedTeam: 'RED' | 'BLUE' | 'SOLO' = 'SOLO';
        if (mode === 'TEAM_DEATHMATCH') {
          let redCount = 0;
          let blueCount = 0;
          if (room && room.actors) {
            for (const key in room.actors) {
              const act = room.actors[key];
              if (act.actorNr !== this.localActorNr) {
                const actTeam = act.customProperties?.team;
                if (actTeam === 'RED') redCount++;
                if (actTeam === 'BLUE') blueCount++;
              }
            }
          }
          assignedTeam = redCount <= blueCount ? 'RED' : 'BLUE';
        }

        this.localTeam = assignedTeam;
        if (myActor) {
          myActor.setCustomProperties({ team: assignedTeam });
        }

        // Enregistrer les autres acteurs déjà présents dans le salon
        this.remotePlayers.clear();
        if (room && room.actors) {
          for (const key in room.actors) {
            const act = room.actors[key];
            if (act.actorNr !== this.localActorNr) {
              const actTeam = act.customProperties?.team || 'SOLO';
              this.remotePlayers.set(act.actorNr, {
                actorNr: act.actorNr,
                uid: act.userId || `player_${act.actorNr}`,
                callsign: act.name || `OPERATEUR_${act.actorNr}`,
                team: actTeam,
                position: [0, 1.6, 0],
                rotation: [0, 0, 0],
                velocity: [0, 0, 0],
                health: 100,
                maxHealth: 100,
                shield: 50,
                maxShield: 50,
                isAlive: true,
                isSprinting: false,
                selectedWeapon: 'weapon_railgun',
                isFiring: false,
                kills: 0,
                deaths: 0,
                score: 0,
                ping: 28,
                lastUpdate: Date.now(),
              });
            }
          }
        }

        this.setStatus('IN_ROOM', `En combat dans le salon : ${this.currentRoom.name}`);
        this.notifyRemotePlayers();
        
        console.log(
          `[PhotonClient] 👑 SALON REJOINT : "${this.currentRoom.name}" | MasterClientId: ${room ? room.masterClientId : 1} | Mon ActorNr: ${this.localActorNr} | Suis-je Master Client ? ${this.isMasterClient()} | Joueurs connectés: ${room ? room.playerCount : 1}`
        );

        // Démarrer la simulation de bots autoritaire (Master Client uniquement)
        import('../systems/botSystem.ts').then(({ botSystem }) => {
          botSystem.start();
        }).catch(err => console.warn('Erreur chargement botSystem:', err));
        break;
      }
      case States.Leaving:
        this.setStatus('LEAVING_ROOM', 'Quitte le salon de jeu...');
        import('../systems/botSystem.ts').then(({ botSystem }) => {
          botSystem.stop();
        }).catch(() => {});
        break;
      case States.Disconnected:
        this.setStatus('DISCONNECTED', 'Déconnecté du réseau Photon');
        import('../systems/botSystem.ts').then(({ botSystem }) => {
          botSystem.stop();
        }).catch(() => {});
        this.remotePlayers.clear();
        this.notifyRemotePlayers();
        this.currentRoom = null;
        break;
      default:
        break;
    }
  }

  /**
   * Matchmaking automatique (Quick Match) : Rejoint un salon public ou en crée un si aucun disponible
   */
  public async quickMatch(preferredMapId: string = 'rooftop_district'): Promise<boolean> {
    const isConnected = await this.ensureConnected();
    if (!isConnected || !this.client) {
      console.error('[PhotonClient] Matchmaking impossible : Échec de connexion réseau.');
      return false;
    }

    this.setStatus('JOINING_ROOM', 'Recherche d\'une partie publique (Matchmaking)...');

    try {
      // Tentative de rejoindre une room aléatoire
      const joinSuccess = this.client.joinRandomRoom();
      if (!joinSuccess) {
        // Si joinRandomRoom ne peut pas être envoyé, créer une room publique
        const randomRoomName = `CYBER_ARENA_${Math.floor(1000 + Math.random() * 9000)}`;
        return this.createRoom(randomRoomName, false, preferredMapId);
      }
      return true;
    } catch (e: any) {
      console.warn('[PhotonClient] Erreur joinRandom, création d\'un nouveau salon :', e);
      const randomRoomName = `CYBER_ARENA_${Math.floor(1000 + Math.random() * 9000)}`;
      return this.createRoom(randomRoomName, false, preferredMapId);
    }
  }

  /**
   * Création d'un salon de combat (Public ou Privé avec code)
   */
  public async createRoom(
    roomName: string, 
    isPrivate: boolean = false, 
    mapId: string = 'rooftop_district',
    gameMode: PhotonRoomInfo['gameMode'] = 'CYBER_FREE_FOR_ALL',
    difficulty: 'FACILE' | 'MOYEN' | 'DIFFICILE' = 'MOYEN'
  ): Promise<boolean> {
    const isConnected = await this.ensureConnected();
    if (!isConnected || !this.client) {
      console.error('[PhotonClient] Création de salon impossible : Échec de connexion réseau.');
      this.setStatus('ERROR', 'Création de salon impossible', 'Échec de connexion au serveur Photon.');
      return false;
    }

    this.setStatus('JOINING_ROOM', `Création du salon ${roomName}...`);

    try {
      const options = {
        isVisible: !isPrivate,
        isOpen: true,
        maxPlayers: PHOTON_CONFIG.maxPlayersPerRoom,
        customGameProperties: {
          map: mapId,
          mode: gameMode,
          isPrivate: isPrivate ? 1 : 0,
          difficulty: difficulty,
        },
        propsListedInLobby: ['map', 'mode', 'isPrivate', 'difficulty'],
      };

      this.client.createRoom(roomName, options);
      return true;
    } catch (err: any) {
      console.error('[PhotonClient] Erreur lors de createRoom :', err);
      this.setStatus('ERROR', 'Échec de création du salon', err?.message);
      return false;
    }
  }

  /**
   * Rejoindre un salon existant par son nom ou code
   */
  public async joinRoom(roomName: string): Promise<boolean> {
    const isConnected = await this.ensureConnected();
    if (!isConnected || !this.client) {
      console.error('[PhotonClient] Connexion au salon impossible : Échec de connexion réseau.');
      this.setStatus('ERROR', 'Connexion au salon impossible', 'Échec de connexion au serveur Photon.');
      return false;
    }

    this.setStatus('JOINING_ROOM', `Connexion au salon ${roomName}...`);

    try {
      this.client.joinRoom(roomName);
      return true;
    } catch (err: any) {
      console.error('[PhotonClient] Erreur joinRoom :', err);
      this.setStatus('ERROR', 'Impossible de rejoindre le salon', err?.message);
      return false;
    }
  }

  /**
   * Quitter la room active
   */
  public leaveRoom(): void {
    if (this.client && this.client.isJoinedToRoom()) {
      this.setStatus('LEAVING_ROOM', 'Déconnexion du salon...');
      this.client.leaveRoom();
      this.remotePlayers.clear();
      this.notifyRemotePlayers();
      this.currentRoom = null;
    }
  }

  /**
   * Déconnexion complète
   */
  public disconnect(): void {
    if (this.client) {
      this.client.disconnect();
    }
    this.setStatus('DISCONNECTED', 'Déconnecté');
    this.remotePlayers.clear();
    this.notifyRemotePlayers();
    this.currentRoom = null;
  }

  // ==========================================================================
  // ÉMISSION ET SYNCHRONISATION MULTIJOUEUR BASSE LATENCE
  // ==========================================================================

  /**
   * Envoie la position, rotation et état du joueur local aux autres joueurs (20-30 Hz)
   */
  public sendLocalTransform(
    position: [number, number, number],
    rotation: [number, number, number],
    velocity: [number, number, number],
    weaponId: string,
    health: number,
    shield: number,
    isAlive: boolean,
    isFiring: boolean,
    isSprinting: boolean,
    isImmune: boolean = false,
    isInSanctuary: boolean = false
  ): void {
    if (!this.client || !this.client.isJoinedToRoom()) return;

    const now = performance.now();
    const minIntervalMs = 1000 / PHOTON_CONFIG.serializationRateHz; // ~50ms pour 20Hz
    if (now - this.lastTransformBroadcastTime < minIntervalMs) return;
    this.lastTransformBroadcastTime = now;

    const payload = {
      p: [
        parseFloat(position[0].toFixed(2)),
        parseFloat(position[1].toFixed(2)),
        parseFloat(position[2].toFixed(2))
      ],
      r: [
        parseFloat(rotation[0].toFixed(2)),
        parseFloat(rotation[1].toFixed(2)),
        parseFloat(rotation[2].toFixed(2))
      ],
      v: [
        parseFloat(velocity[0].toFixed(1)),
        parseFloat(velocity[1].toFixed(1)),
        parseFloat(velocity[2].toFixed(1))
      ],
      w: weaponId,
      hp: health,
      sh: shield,
      al: isAlive ? 1 : 0,
      fi: isFiring ? 1 : 0,
      sp: isSprinting ? 1 : 0,
      im: isImmune ? 1 : 0,
      sc: isInSanctuary ? 1 : 0,
      tm: this.localTeam,
      t: Date.now(),
    };

    const receivers = Photon?.LoadBalancing?.Constants?.ReceiverGroup?.Others ?? 0;

    this.client.raiseEvent(
      PHOTON_EVENT_CODES.PLAYER_STATE,
      payload,
      { receivers }
    );
  }

  private lastBotUpdateLogTime: number = 0;
  private lastLoggedBotCount: number = -1;

  /**
   * Met à jour la liste des bots locaux / synchronisés dans remotePlayers
   */
  public updateBotPlayers(bots: NetworkPlayerState[]): void {
    const now = Date.now();
    const shouldLog = now - this.lastBotUpdateLogTime > 4000 || bots.length !== this.lastLoggedBotCount;
    if (shouldLog) {
      this.lastBotUpdateLogTime = now;
      this.lastLoggedBotCount = bots.length;
      console.log(
        `[PhotonClient] 🤖 updateBotPlayers : Synchronisation locale de ${bots.length} bots dans le cache réseau (Total entités: ${this.remotePlayers.size})`
      );
    }

    const newBotActorNrs = new Set<number>(bots.map((b) => b.actorNr));

    for (const [actorNr, player] of this.remotePlayers.entries()) {
      if (player.isBot && !newBotActorNrs.has(actorNr)) {
        this.remotePlayers.delete(actorNr);
      }
    }

    for (const bot of bots) {
      this.remotePlayers.set(bot.actorNr, bot);
    }

    this.notifyRemotePlayers();
  }

  /**
   * Synchronisation des tirs (faisceau laser, bouche de canon, couleur)
   */
  public sendShootEvent(
    muzzlePos: [number, number, number],
    direction: [number, number, number],
    weaponId: string,
    beamColor: string
  ): void {
    const payload = {
      m: muzzlePos,
      d: direction,
      w: weaponId,
      c: beamColor,
      t: Date.now(),
    };

    if (this.client && this.client.isJoinedToRoom()) {
      const receivers = Photon?.LoadBalancing?.Constants?.ReceiverGroup?.Others ?? 0;
      this.client.raiseEvent(PHOTON_EVENT_CODES.PLAYER_SHOOT, payload, { receivers });
    } else {
      this.dispatchNetworkPacket('PLAYER_SHOOT', this.localActorNr, payload);
    }
  }

  /**
   * Envoi d'un événement d'impact et calcul des dégâts infligés à un joueur adverse
   */
  public sendDamageEvent(
    targetActorNr: number,
    damage: number,
    isCrit: boolean,
    weaponId: string,
    hitPos: [number, number, number]
  ): void {
    const payload = {
      shooter: this.localActorNr,
      target: targetActorNr,
      dmg: damage,
      crit: isCrit ? 1 : 0,
      w: weaponId,
      hit: hitPos,
      t: Date.now(),
    };

    if (this.client && this.client.isJoinedToRoom()) {
      const receivers = Photon?.LoadBalancing?.Constants?.ReceiverGroup?.All ?? 0;
      this.client.raiseEvent(PHOTON_EVENT_CODES.PLAYER_DAMAGE, payload, { receivers });
    } else {
      this.dispatchNetworkPacket('PLAYER_DAMAGE', this.localActorNr, payload);
    }
  }

  /**
   * Notification d'élimination (Killfeed & Score)
   */
  public sendKillEvent(victimActorNr: number, weaponId: string, isHeadshot: boolean = false): void {
    if (!this.client || !this.client.isJoinedToRoom()) return;

    const receivers = Photon?.LoadBalancing?.Constants?.ReceiverGroup?.All ?? 0;

    this.client.raiseEvent(
      PHOTON_EVENT_CODES.PLAYER_KILL,
      {
        killer: this.localActorNr,
        killerName: this.localCallsign,
        victim: victimActorNr,
        w: weaponId,
        hs: isHeadshot ? 1 : 0,
        t: Date.now(),
      },
      { receivers }
    );
  }

  /**
   * Notification d'élimination arbitraire (ex: par un Bot ou un autre joueur tiers)
   */
  public sendArbitraryKillEvent(
    killerActorNr: number,
    killerName: string,
    victimActorNr: number,
    weaponId: string,
    isHeadshot: boolean = false
  ): void {
    const payload = {
      killer: killerActorNr,
      killerName: killerName,
      victim: victimActorNr,
      w: weaponId,
      hs: isHeadshot ? 1 : 0,
      t: Date.now(),
    };

    if (this.client && this.client.isJoinedToRoom()) {
      const receivers = Photon?.LoadBalancing?.Constants?.ReceiverGroup?.All ?? 0;
      this.client.raiseEvent(PHOTON_EVENT_CODES.PLAYER_KILL, payload, { receivers });
    } else {
      this.dispatchNetworkPacket('PLAYER_KILL', killerActorNr, payload);
    }
  }

  /**
   * Réapparition d'un joueur après élimination
   */
  public sendRespawnEvent(spawnPos: [number, number, number]): void {
    if (!this.client || !this.client.isJoinedToRoom()) return;

    const receivers = Photon?.LoadBalancing?.Constants?.ReceiverGroup?.Others ?? 0;

    this.client.raiseEvent(
      PHOTON_EVENT_CODES.PLAYER_RESPAWN,
      {
        p: spawnPos,
        t: Date.now(),
      },
      { receivers }
    );
  }

  /**
   * Envoi de paquets de signalisation pour le Chat Vocal WebRTC de Proximité
   */
  public sendVoiceSignal(targetActorNr: number, type: string, payloadData: any): void {
    if (!this.client || !this.client.isJoinedToRoom()) return;

    const receivers = Photon?.LoadBalancing?.Constants?.ReceiverGroup?.Others ?? 0;

    this.client.raiseEvent(
      PHOTON_EVENT_CODES.VOICE_SIGNAL,
      {
        targetActorNr,
        senderActorNr: this.localActorNr,
        type,
        data: payloadData,
        t: Date.now(),
      },
      { receivers }
    );
  }

  // ==========================================================================
  // RÉCEPTION DES ÉVÉNEMENTS RÉSEAU
  // ==========================================================================

  private handlePhotonEvent(code: number, content: any, actorNr: number) {
    if (!content) return;

    switch (code) {
      // 1. Mise à jour de l'état d'un joueur distant
      case PHOTON_EVENT_CODES.PLAYER_STATE: {
        const existing = this.remotePlayers.get(actorNr);
        if (existing) {
          existing.position = content.p || existing.position;
          existing.rotation = content.r || existing.rotation;
          existing.velocity = content.v || existing.velocity;
          existing.selectedWeapon = content.w || existing.selectedWeapon;
          existing.health = content.hp !== undefined ? content.hp : existing.health;
          existing.shield = content.sh !== undefined ? content.sh : existing.shield;
          existing.isAlive = content.al === 1;
          existing.isFiring = content.fi === 1;
          existing.isSprinting = content.sp === 1;
          existing.isImmune = content.im === 1;
          existing.isInSanctuary = content.sc === 1;
          existing.team = content.tm || existing.team || 'SOLO';
          existing.lastUpdate = Date.now();
        } else {
          // Si le joueur n'était pas encore enregistré
          let actorTeam = content.tm;
          if (!actorTeam && this.client) {
            const room = this.client.myRoom();
            const act = room?.actors[actorNr];
            if (act) {
              actorTeam = act.customProperties?.team;
            }
          }
          this.remotePlayers.set(actorNr, {
            actorNr,
            uid: `player_${actorNr}`,
            callsign: `OPERATEUR_${actorNr}`,
            position: content.p || [0, 1.6, 0],
            rotation: content.r || [0, 0, 0],
            velocity: content.v || [0, 0, 0],
            health: content.hp || 100,
            maxHealth: 100,
            shield: content.sh || 50,
            maxShield: 50,
            isAlive: content.al !== 0,
            isSprinting: content.sp === 1,
            isImmune: content.im === 1,
            isInSanctuary: content.sc === 1,
            selectedWeapon: content.w || 'weapon_railgun',
            isFiring: content.fi === 1,
            team: actorTeam || 'SOLO',
            kills: 0,
            deaths: 0,
            score: 0,
            ping: 30,
            lastUpdate: Date.now(),
          });
        }
        this.notifyRemotePlayers();
        break;
      }

      // 2. Réception d'un tir adverse
      case PHOTON_EVENT_CODES.PLAYER_SHOOT: {
        this.dispatchNetworkPacket('PLAYER_SHOOT', actorNr, content);
        break;
      }

      // 3. Réception de dégâts
      case PHOTON_EVENT_CODES.PLAYER_DAMAGE: {
        this.dispatchNetworkPacket('PLAYER_DAMAGE', actorNr, content);
        break;
      }

      // 4. Notification d'élimination (Killfeed)
      case PHOTON_EVENT_CODES.PLAYER_KILL: {
        const killerId = content.killer;
        const victimId = content.victim;

        const killerPlayer = this.remotePlayers.get(killerId);
        const victimPlayer = this.remotePlayers.get(victimId);

        const killerName = killerId === this.localActorNr ? this.localCallsign : (killerPlayer?.callsign || `Joueur #${killerId}`);
        const victimName = victimId === this.localActorNr ? this.localCallsign : (victimPlayer?.callsign || `Joueur #${victimId}`);

        const killerTeam = killerId === this.localActorNr ? this.localTeam : killerPlayer?.team;
        const victimTeam = victimId === this.localActorNr ? this.localTeam : victimPlayer?.team;

        // Incrémentation des statistiques pour le tableau des scores
        if (killerId === this.localActorNr) {
          // Géré par App.tsx / onTargetFrag() localement
        } else if (killerPlayer) {
          killerPlayer.kills = (killerPlayer.kills || 0) + 1;
          killerPlayer.score = (killerPlayer.score || 0) + 100;
        }

        if (victimId === this.localActorNr) {
          // Mort du joueur local
        } else if (victimPlayer) {
          victimPlayer.isAlive = false;
          victimPlayer.health = 0;
          victimPlayer.deaths = (victimPlayer.deaths || 0) + 1;
        }

        this.notifyRemotePlayers();

        const entry: KillFeedEntry = {
          id: `kill_${Date.now()}_${Math.random()}`,
          killerName,
          killerTeam,
          victimName,
          victimTeam,
          weaponName: content.w || 'Arme',
          isHeadshot: content.hs === 1,
          timestamp: Date.now(),
        };

        this.killFeed.unshift(entry);
        if (this.killFeed.length > 8) this.killFeed.pop();
        this.killFeedListeners.forEach((fn) => fn(entry));
        this.dispatchNetworkPacket('PLAYER_KILL', actorNr, content);
        break;
      }

      // Sync bots list and states from Master to everyone
      case PHOTON_EVENT_CODES.BOT_SYNC: {
        if (Array.isArray(content)) {
          if (!this.isMasterClient()) {
            const now = Date.now();
            if (now - this.lastBotUpdateLogTime > 4000) {
              this.lastBotUpdateLogTime = now;
              console.log(
                `[PhotonClient] 📡 Réception réseau BOT_SYNC (Code 8) de Master #${actorNr} : ${content.length} bots synchronisés.`
              );
            }
          }

          // Nettoyer les bots obsolètes qui ne sont plus dans la liste du Master Client
          const currentBotActorNrs = new Set<number>(content.map(b => b.actorNr));
          for (const [key, rp] of this.remotePlayers.entries()) {
            if (rp.isBot && !currentBotActorNrs.has(key)) {
              this.remotePlayers.delete(key);
            }
          }

          content.forEach((botData: any) => {
            const existing = this.remotePlayers.get(botData.actorNr);
            if (existing) {
              existing.position = botData.position;
              existing.rotation = botData.rotation;
              existing.velocity = botData.velocity;
              existing.selectedWeapon = botData.selectedWeapon;
              existing.health = botData.health;
              existing.shield = botData.shield;
              existing.isAlive = botData.isAlive;
              existing.isFiring = botData.isFiring;
              existing.isSprinting = botData.isSprinting;
              existing.isImmune = botData.isImmune || false;
              existing.isInSanctuary = botData.isInSanctuary || false;
              existing.kills = botData.kills;
              existing.deaths = botData.deaths;
              existing.score = botData.score;
              existing.team = botData.team;
              existing.isBot = true;
              existing.lastUpdate = Date.now();
            } else {
              this.remotePlayers.set(botData.actorNr, {
                actorNr: botData.actorNr,
                uid: botData.uid,
                callsign: botData.callsign,
                team: botData.team,
                position: botData.position,
                rotation: botData.rotation,
                velocity: botData.velocity,
                health: botData.health,
                maxHealth: 100,
                shield: botData.shield,
                maxShield: 50,
                isAlive: botData.isAlive,
                isSprinting: botData.isSprinting,
                selectedWeapon: botData.selectedWeapon,
                isFiring: botData.isFiring,
                kills: botData.kills,
                deaths: botData.deaths,
                score: botData.score,
                ping: 12,
                isBot: true,
                isImmune: botData.isImmune || false,
                isInSanctuary: botData.isInSanctuary || false,
                lastUpdate: Date.now(),
              });
            }
          });
          this.notifyRemotePlayers();
        }
        break;
      }

      // 5. Réapparition d'un joueur
      case PHOTON_EVENT_CODES.PLAYER_RESPAWN: {
        const target = this.remotePlayers.get(actorNr);
        if (target) {
          target.isAlive = true;
          target.health = target.maxHealth;
          target.shield = target.maxShield;
          target.position = content.p || target.position;
          this.notifyRemotePlayers();
        }
        this.dispatchNetworkPacket('PLAYER_RESPAWN', actorNr, content);
        break;
      }

      // 6. Chat Vocal WebRTC Signalisation
      case PHOTON_EVENT_CODES.VOICE_SIGNAL: {
        // Ne traiter que si c'est destiné à nous (targetActorNr === 0 ou notre actorNr)
        if (!content.targetActorNr || content.targetActorNr === 0 || content.targetActorNr === this.localActorNr) {
          this.dispatchNetworkPacket('VOICE_SIGNAL', actorNr, content);
        }
        break;
      }

      default:
        break;
    }
  }

  private dispatchNetworkPacket(type: NetworkEventType, senderActorNr: number, payload: any) {
    const packet: NetworkEventPacket = {
      type,
      senderActorNr,
      timestamp: Date.now(),
      payload,
    };

    const listeners = this.eventListeners.get(senderActorNr) || this.eventListeners.get(0);
    if (listeners) {
      listeners.forEach((fn) => fn(packet));
    }
  }

  private updateRoomList(roomInfos: any[]) {
    this.availableRooms = (roomInfos || []).map((r) => {
      const customProps = r.getCustomProperties ? r.getCustomProperties() : (r.customProperties || {});
      return {
        name: r.name,
        maxPlayers: r.maxPlayers,
        playerCount: r.playerCount,
        mapName: customProps.map || 'rooftop_district',
        gameMode: customProps.mode || 'CYBER_FREE_FOR_ALL',
        isLocked: customProps.isPrivate === 1,
        ping: this.ping,
        customProperties: customProps,
      };
    });
    this.roomListListeners.forEach((fn) => fn(this.availableRooms));
  }

  // ==========================================================================
  // GETTERS & LISTENERS
  // ==========================================================================

  public getStatus(): PhotonConnectionStatus {
    return this.status;
  }

  public getStatusMessage(): string {
    return this.statusMessage;
  }

  public getErrorDetail(): string {
    return this.errorDetail;
  }

  public getCurrentRoom(): PhotonRoomInfo | null {
    return this.currentRoom;
  }

  public getLocalActorNr(): number {
    return this.localActorNr;
  }

  public getLocalCallsign(): string {
    return this.localCallsign;
  }

  public getLocalTeam(): 'RED' | 'BLUE' | 'SOLO' {
    return this.localTeam;
  }

  public isMasterClient(): boolean {
    if (!this.client || !this.client.isJoinedToRoom()) return true; // En solo / Test Arena, on est l'hôte local
    const room = this.client.myRoom();
    const myActor = this.client.myActor();
    if (!room || !myActor) return true;
    return room.masterClientId === myActor.actorNr;
  }

  public getRemotePlayers(): NetworkPlayerState[] {
    return Array.from(this.remotePlayers.values());
  }

  public getKillFeed(): KillFeedEntry[] {
    return this.killFeed;
  }

  public getPing(): number {
    return this.ping;
  }

  public onStatusChange(callback: StatusListener): () => void {
    this.statusListeners.add(callback);
    callback(this.status, this.statusMessage, this.errorDetail);
    return () => this.statusListeners.delete(callback);
  }

  public onRoomListUpdate(callback: RoomListListener): () => void {
    this.roomListListeners.add(callback);
    callback(this.availableRooms);
    return () => this.roomListListeners.delete(callback);
  }

  public onRemotePlayersChange(callback: RemotePlayersListener): () => void {
    this.remotePlayersListeners.add(callback);
    callback(Array.from(this.remotePlayers.values()));
    return () => this.remotePlayersListeners.delete(callback);
  }

  public onKillFeed(callback: KillFeedListener): () => void {
    this.killFeedListeners.add(callback);
    return () => this.killFeedListeners.delete(callback);
  }

  public onNetworkPacket(callback: NetworkEventListener): () => void {
    if (!this.eventListeners.has(0)) {
      this.eventListeners.set(0, new Set());
    }
    this.eventListeners.get(0)!.add(callback);
    return () => this.eventListeners.get(0)?.delete(callback);
  }

  private setStatus(status: PhotonConnectionStatus, message: string = '', errorDetail: string = '') {
    this.status = status;
    this.statusMessage = message;
    this.errorDetail = errorDetail;
    this.statusListeners.forEach((fn) => fn(status, message, errorDetail));
  }

  private lastRemotePlayersNotifyTime: number = 0;
  private lastRemotePlayersCount: number = -1;

  public notifyRemotePlayers(force: boolean = false) {
    const now = performance.now();
    const count = this.remotePlayers.size;
    if (!force && count === this.lastRemotePlayersCount && (now - this.lastRemotePlayersNotifyTime < 150)) {
      return;
    }
    this.lastRemotePlayersNotifyTime = now;
    this.lastRemotePlayersCount = count;

    const list = Array.from(this.remotePlayers.values());
    this.remotePlayersListeners.forEach((fn) => fn(list));
  }
}

export const photonClient = new PhotonNetworkService();
