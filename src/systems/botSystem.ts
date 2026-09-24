/**
 * SYSTÈME DE BOTS AUTORITAIRE (IA & Synchronisation Master Client)
 * 
 * Ce système gère l'orchestration complète des bots IA :
 * - Remplissage automatique des salons vides (remplacement dynamique des joueurs)
 * - Simulation IA complète de déplacement tactique (lanes, chokepoints, capture de zone)
 * - Combat (Détection de cibles, calcul de précision selon la difficulté, rechargement)
 * - Autorité Master Client absolue : Seul le Master Client simule et diffuse l'état des bots
 * - Transition transparente si le Master Client quitte la partie
 */

import * as THREE from 'three';
import { photonClient } from '../net/photonClient.ts';
import { WEAPONS_CATALOG } from '../config/weaponsConfig.ts';
import { getMapById, isPositionInsideSanctuary } from '../config/mapsConfig.ts';
import type { NetworkPlayerState } from '../types/network.ts';

export type BotDifficulty = 'FACILE' | 'MOYEN' | 'DIFFICILE';

interface LocalBotSimulation {
  actorNr: number;
  uid: string;
  callsign: string;
  team: 'RED' | 'BLUE' | 'SOLO';
  position: THREE.Vector3;
  rotation: THREE.Vector3;
  velocity: THREE.Vector3;
  health: number;
  shield: number;
  isAlive: boolean;
  selectedWeapon: string;
  isFiring: boolean;
  isSprinting: boolean;
  kills: number;
  deaths: number;
  score: number;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  reloadTimer: number;
  fireCooldown: number;
  respawnTimer: number;
  immunityTimer: number;
  isInSanctuary: boolean;
  
  // IA State
  currentLaneIndex: number;
  waypointIndex: number;
  targetActorNr: number | null; // Cible verrouillée (joueur ou autre bot)
  strafingTimer: number;
  strafingDir: number;
  lastTargetPos: THREE.Vector3 | null;
}

const CALLSIGNS = [
  'GHOST_07', 'NEON_WRAITH', 'CYBER_STALKER', 'AERO_VIPER', 'HEX_RAVEN',
  'TOXIC_BLADE', 'VIRTUAL_PULSE', 'GRID_RUNNER', 'ZERO_COOL', 'OMEGA_OPERATIVE',
  'SYNTAX_ERROR', 'NIGHT_HAWK', 'KRONOS_9', 'CHIP_DAMAGE', 'PHANTOM_LINK'
];

class BotSystem {
  private bots: Map<number, LocalBotSimulation> = new Map();
  private updateInterval: any = null;
  private lastTime: number = Date.now();
  private networkBroadcastTimer: number = 0;
  private nextBotId: number = 1;
  private lastLogTime: number = 0;

  constructor() {
    // S'abonner aux événements réseau (pour les dégâts reçus par les bots)
    photonClient.onNetworkPacket((packet) => {
      this.handleNetworkPacket(packet);
    });
  }

  /**
   * Démarre le système de simulation de bots
   */
  public start() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    this.lastTime = Date.now();
    this.lastLogTime = 0;
    this.bots.clear();

    const isMaster = photonClient.isMasterClient();
    console.log(
      `[BotSystem] 🚀 Démarrage du système de simulation de bots. Suis-je Master Client autoritaire ? ${isMaster}`
    );

    // Boucle de simulation à 20Hz (chaque 50ms)
    this.updateInterval = setInterval(() => {
      this.tick();
    }, 50);
  }

  /**
   * Arrête la simulation
   */
  public stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    const count = this.bots.size;
    this.bots.clear();
    console.log(`[BotSystem] 🛑 Système arrêté. (${count} bots nettoyés)`);
  }

  /**
   * Renvoie la difficulté configurée pour la room active (stockée en custom property)
   */
  public getDifficulty(): BotDifficulty {
    const room = photonClient.getCurrentRoom();
    if (!room || !room.customProperties) return 'MOYEN';
    const diff = room.customProperties.difficulty || 'MOYEN';
    return diff as BotDifficulty;
  }

  /**
   * Exécute un pas de simulation de tous les bots
   */
  private tick() {
    const isMaster = photonClient.isMasterClient();

    // 1. SI NON-MASTER : Seul le Master Client simule les bots
    if (!isMaster) {
      if (this.bots.size > 0) {
        console.log(`[BotSystem] Client non-Master détecté : purge des ${this.bots.size} bots locaux (autorité au Master Client).`);
        this.bots.clear();
      }
      return;
    }

    const now = Date.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    const room = photonClient.getCurrentRoom();
    const gameMode = room ? room.gameMode : 'CYBER_FREE_FOR_ALL';
    const mapId = room ? (room.mapName || 'rooftop_district') : 'rooftop_district';

    // 2. REMPLISSAGE ET RÉGULATION AUTOMATIQUE DE LA LISTE DES BOTS
    this.regulateBotsCount(room);

    // Journal périodique d'état de l'autorité (toutes les 4 secondes)
    if (now - this.lastLogTime > 4000) {
      this.lastLogTime = now;
      console.log(
        `[BotSystem] 👑 Master Client Autoritaire actif | Simulation de ${this.bots.size} bots | Map: ${mapId} | Mode: ${gameMode}`
      );
    }

    // 3. SIMULATION IA DE CHAQUE BOT INDIVIDUELLEMENT
    const mapData = getMapById(mapId);
    const playersList = photonClient.getRemotePlayers().filter(p => !p.isBot);
    
    // Inclure le joueur local dans la liste des ennemis potentiels pour les bots
    const localPlayerNr = photonClient.getLocalActorNr();
    const localPlayerState: NetworkPlayerState = {
      actorNr: localPlayerNr,
      uid: 'local',
      callsign: photonClient.getLocalCallsign(),
      team: photonClient.getLocalTeam(),
      position: [0, 0, 0],
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
      ping: 0,
      lastUpdate: Date.now(),
    };

    const localPos = (window as any).localPlayerPosition || [0, 0, 0];
    localPlayerState.position = [localPos[0], localPos[1], localPos[2]];
    localPlayerState.isAlive = (window as any).localPlayerHP !== undefined ? (window as any).localPlayerHP > 0 : true;

    const allTargets: NetworkPlayerState[] = [localPlayerState, ...playersList];

    this.bots.forEach((bot) => {
      if (!bot.isAlive) {
        bot.isFiring = false;
        bot.respawnTimer -= delta;
        if (bot.respawnTimer <= 0) {
          this.respawnBot(bot, mapData);
        }
        return;
      }

      if (bot.fireCooldown > 0) bot.fireCooldown -= delta;
      if (bot.immunityTimer > 0) bot.immunityTimer = Math.max(0, bot.immunityTimer - delta);

      // Régénération dans la zone sanctuaire d'équipe du bot
      if (mapData && mapData.sanctuaryZones) {
        const teamSanctuary = bot.team === 'RED' ? mapData.sanctuaryZones.red : bot.team === 'BLUE' ? mapData.sanctuaryZones.blue : null;
        if (teamSanctuary && isPositionInsideSanctuary(bot.position, teamSanctuary)) {
          bot.isInSanctuary = true;
          bot.health = Math.min(100, bot.health + 25 * delta);
          bot.shield = Math.min(50, bot.shield + 20 * delta);
        } else {
          bot.isInSanctuary = false;
        }
      }

      if (bot.isReloading) {
        bot.reloadTimer -= delta;
        if (bot.reloadTimer <= 0) {
          bot.isReloading = false;
          bot.ammo = bot.maxAmmo;
        }
      }

      // 3.1. CIBLAGE ET ANALYSE RADAR DE PROXIMITÉ
      this.processCiblage(bot, allTargets, gameMode, mapData);

      // 3.2. RECHERCHE DE CHEMIN & DÉPLACEMENT IA
      this.processDeplacement(bot, mapData, delta);

      // 3.3. LOGIQUE DE COMBAT ET TIR TACTIQUE
      this.processCombat(bot, allTargets, delta);
    });

    // 4. CONVERTIR ET METTRE À JOUR LOCALEMENT POUR AFFICHAGE IMMÉDIAT
    const botNetworkStates: NetworkPlayerState[] = Array.from(this.bots.values()).map((b) => ({
      actorNr: b.actorNr,
      uid: b.uid,
      callsign: b.callsign,
      team: b.team,
      position: [parseFloat(b.position.x.toFixed(2)), parseFloat(b.position.y.toFixed(2)), parseFloat(b.position.z.toFixed(2))],
      rotation: [parseFloat(b.rotation.x.toFixed(2)), parseFloat(b.rotation.y.toFixed(2)), parseFloat(b.rotation.z.toFixed(2))],
      velocity: [parseFloat(b.velocity.x.toFixed(1)), parseFloat(b.velocity.y.toFixed(1)), parseFloat(b.velocity.z.toFixed(1))],
      health: b.health,
      maxHealth: 100,
      shield: b.shield,
      maxShield: 50,
      isAlive: b.isAlive,
      selectedWeapon: b.selectedWeapon,
      isFiring: b.isFiring,
      isSprinting: b.isSprinting,
      kills: b.kills,
      deaths: b.deaths,
      score: b.score,
      ping: 8,
      isBot: true,
      isImmune: b.immunityTimer > 0,
      isInSanctuary: b.isInSanctuary,
      lastUpdate: Date.now(),
    }));

    photonClient.updateBotPlayers(botNetworkStates);

    // 5. DIFFUSION DE L'ÉTAT DES BOTS AUX AUTRES JOUEURS SI DANS UNE ROOM (20 Hz)
    if (photonClient.getStatus() === 'IN_ROOM') {
      this.networkBroadcastTimer += delta;
      if (this.networkBroadcastTimer >= 0.05) { // 20 Hz
        this.networkBroadcastTimer = 0;
        this.broadcastBotsState(botNetworkStates);
      }
    }
  }

  /**
   * Gère le remplissage des places vides avec des bots jusqu'à maxPlayers (ou 6 en solo)
   */
  private regulateBotsCount(room: any) {
    const maxPlayers = room ? (room.maxPlayers || 8) : 6;
    const gameMode = room ? room.gameMode : 'CYBER_FREE_FOR_ALL';
    const realPlayersCount = (photonClient.getRemotePlayers().filter(p => !p.isBot).length) + 1; // + local player
    const targetBotsCount = Math.max(0, maxPlayers - realPlayersCount);

    const activeBots = Array.from(this.bots.values());
    const currentBotsCount = activeBots.length;

    if (currentBotsCount < targetBotsCount) {
      // Ajouter un bot avec identifiant unique incrémental
      const newBotActorNr = 500 + (this.nextBotId++);
      const callsign = CALLSIGNS[Math.floor(Math.random() * CALLSIGNS.length)] + `_[BOT]`;
      
      // Déterminer son équipe
      let botTeam: 'RED' | 'BLUE' | 'SOLO' = 'SOLO';
      if (gameMode === 'TEAM_DEATHMATCH') {
        let redCount = 0;
        let blueCount = 0;
        if (photonClient.getLocalTeam() === 'RED') redCount++;
        else if (photonClient.getLocalTeam() === 'BLUE') blueCount++;

        photonClient.getRemotePlayers().forEach((p) => {
          if (p.team === 'RED') redCount++;
          if (p.team === 'BLUE') blueCount++;
        });

        botTeam = redCount <= blueCount ? 'RED' : 'BLUE';
      }

      const mapId = room ? (room.mapName || 'rooftop_district') : 'rooftop_district';
      const mapData = getMapById(mapId);
      const randomWeapon = WEAPONS_CATALOG[Math.floor(Math.random() * WEAPONS_CATALOG.length)];

      const bot: LocalBotSimulation = {
        actorNr: newBotActorNr,
        uid: `bot_${newBotActorNr}_${Date.now()}`,
        callsign,
        team: botTeam,
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Vector3(0, 0, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        health: 100,
        shield: 50,
        isAlive: true,
        selectedWeapon: randomWeapon.id,
        isFiring: false,
        isSprinting: false,
        kills: 0,
        deaths: 0,
        score: 0,
        ammo: randomWeapon.magazineSize,
        maxAmmo: randomWeapon.magazineSize,
        isReloading: false,
        reloadTimer: 0,
        fireCooldown: 0,
        respawnTimer: 0,
        immunityTimer: 3.0,
        isInSanctuary: true,
        
        currentLaneIndex: Math.floor(Math.random() * 3),
        waypointIndex: 0,
        targetActorNr: null,
        strafingTimer: 0,
        strafingDir: 1,
        lastTargetPos: null,
      };

      this.respawnBot(bot, mapData);
      this.bots.set(newBotActorNr, bot);
      console.log(
        `[BotSystem] 🤖 NOUVEAU BOT CRÉÉ : "${bot.callsign}" (ActorNr: ${bot.actorNr}) | Équipe: ${bot.team} | Arme: ${bot.selectedWeapon} | Pos: [${bot.position.x.toFixed(1)}, ${bot.position.y.toFixed(1)}, ${bot.position.z.toFixed(1)}] | Cibles max: ${maxPlayers} (Joueurs réels: ${realPlayersCount})`
      );
    } else if (currentBotsCount > targetBotsCount && currentBotsCount > 0) {
      const keys = Array.from(this.bots.keys());
      const lastKey = keys[keys.length - 1];
      const removedBot = this.bots.get(lastKey);
      this.bots.delete(lastKey);
      console.log(`[BotSystem] 👤 Vrai joueur connecté : Retrait du bot "${removedBot?.callsign}" (#${lastKey})`);
    }
  }

  /**
   * Respawne un bot à un point de spawn valide de la carte
   */
  private respawnBot(bot: LocalBotSimulation, mapData: any) {
    // Choisir un spawn point adapté à son équipe ou neutre
    const eligibleSpawns = mapData.spawnPoints.filter(
      (s: any) => s.team === bot.team.toLowerCase() || bot.team === 'SOLO' || s.team === 'neutral'
    );
    const spawn = eligibleSpawns.length > 0 
      ? eligibleSpawns[Math.floor(Math.random() * eligibleSpawns.length)]
      : mapData.spawnPoints[0];

    bot.position.set(spawn.position[0], spawn.position[1], spawn.position[2]);
    bot.rotation.set(0, spawn.yaw || 0, 0);
    bot.velocity.set(0, 0, 0);
    bot.health = 100;
    bot.shield = 50;
    bot.isAlive = true;
    bot.isFiring = false;
    bot.isReloading = false;
    bot.targetActorNr = null;
    bot.waypointIndex = 0;
    bot.respawnTimer = 0;
    bot.immunityTimer = 3.0; // 3 secondes d'immunité au respawn
    bot.isInSanctuary = true;

    const randomWeapon = WEAPONS_CATALOG[Math.floor(Math.random() * WEAPONS_CATALOG.length)];
    bot.selectedWeapon = randomWeapon.id;
    bot.ammo = randomWeapon.magazineSize;
    bot.maxAmmo = randomWeapon.magazineSize;

    console.log(`[BotSystem] 📍 Bot "${bot.callsign}" (#${bot.actorNr}) respawn au point "${spawn.name}" [${spawn.position.join(', ')}]`);
  }

  /**
   * Processus IA : Recherche de cible et radar de visibilité
   */
  private processCiblage(bot: LocalBotSimulation, allTargets: NetworkPlayerState[], gameMode: string, mapData?: any) {
    let closestDist = 45; // Rayon max de détection : 45m
    let selectedTarget: NetworkPlayerState | null = null;

    allTargets.forEach((target) => {
      if (!target.isAlive || target.actorNr === bot.actorNr) return;

      // Si TDM, ne cibler que les adversaires
      if (gameMode === 'TEAM_DEATHMATCH' && target.team === bot.team) return;

      // Ne pas cibler les joueurs sous bouclier d'immunité ou dans leur base sanctuaire protégée
      if (target.isImmune) return;
      if (mapData && mapData.sanctuaryZones) {
        const targetTeam = (target.team || '').toLowerCase();
        const targetSanctuary = targetTeam === 'red' ? mapData.sanctuaryZones.red : targetTeam === 'blue' ? mapData.sanctuaryZones.blue : null;
        if (targetSanctuary && isPositionInsideSanctuary(target.position, targetSanctuary)) return;
      }

      const botPos = bot.position;
      const targetPos = new THREE.Vector3(target.position[0], target.position[1], target.position[2]);
      const dist = botPos.distanceTo(targetPos);

      if (dist < closestDist) {
        closestDist = dist;
        selectedTarget = target;
      }
    });

    if (selectedTarget) {
      bot.targetActorNr = (selectedTarget as NetworkPlayerState).actorNr;
      bot.lastTargetPos = new THREE.Vector3(
        (selectedTarget as NetworkPlayerState).position[0],
        (selectedTarget as NetworkPlayerState).position[1],
        (selectedTarget as NetworkPlayerState).position[2]
      );
    } else {
      bot.targetActorNr = null;
    }
  }

  /**
   * Processus IA : Déplacement intelligent le long des lanes
   */
  private processDeplacement(bot: LocalBotSimulation, mapData: any, delta: number) {
    const diff = this.getDifficulty();
    const speed = bot.isSprinting ? 9.5 : bot.targetActorNr ? 4.2 : 5.8;

    // Si on a un ennemi ciblé, on adopte un déplacement tactique (Strafe de combat, recherche de couverture)
    if (bot.targetActorNr && bot.lastTargetPos) {
      bot.isSprinting = false;

      // Tourner lentement vers l'ennemi
      const toTarget = bot.lastTargetPos.clone().sub(bot.position);
      const angle = Math.atan2(toTarget.x, toTarget.z);
      bot.rotation.y = THREE.MathUtils.lerp(bot.rotation.y, angle, delta * 8);

      // Strafe latéral pour esquiver les tirs
      bot.strafingTimer -= delta;
      if (bot.strafingTimer <= 0) {
        bot.strafingTimer = 1.2 + Math.random() * 1.5;
        bot.strafingDir = Math.random() > 0.5 ? 1 : -1;
      }

      // Aller vers l'ennemi tout en strafant sur le côté
      const forwardDir = toTarget.clone().normalize();
      const rightDir = new THREE.Vector3(-forwardDir.z, 0, forwardDir.x); // Droite orthogonale

      const strafeMultiplier = diff === 'DIFFICILE' ? 0.9 : diff === 'MOYEN' ? 0.5 : 0.2;
      const moveVec = forwardDir.multiplyScalar(0.4).add(rightDir.multiplyScalar(bot.strafingDir * strafeMultiplier)).normalize();

      bot.velocity.copy(moveVec.multiplyScalar(speed));
      bot.position.addScaledVector(bot.velocity, delta);

      // Limiter la hauteur à 0 (sol) ou s'aligner sur les obstacles de verticalité
      bot.position.y = THREE.MathUtils.clamp(bot.position.y, 0, 8);
      return;
    }

    // --- MODE NAVIGATION PATROUILLE (En route vers le centre de capture) ---
    bot.isSprinting = diff === 'DIFFICILE' ? Math.random() > 0.4 : diff === 'MOYEN' ? Math.random() > 0.7 : false;

    // Définir des waypoints dynamiques d'accès selon les lanes
    const laneWaypoints: THREE.Vector3[] = [];
    const captureZonePos = mapData.captureZone 
      ? new THREE.Vector3(mapData.captureZone.position[0], mapData.captureZone.position[1], mapData.captureZone.position[2])
      : new THREE.Vector3(0, 0, 0);

    // Dynamic simple waypoint calculation depending on laneIndex
    // Lane 0: Gauche, Lane 1: Centre, Lane 2: Droite
    if (bot.currentLaneIndex === 0) {
      laneWaypoints.push(new THREE.Vector3(-25, 0.1, bot.position.z > 0 ? 15 : -15));
      laneWaypoints.push(captureZonePos);
    } else if (bot.currentLaneIndex === 2) {
      laneWaypoints.push(new THREE.Vector3(25, 0.1, bot.position.z > 0 ? 15 : -15));
      laneWaypoints.push(captureZonePos);
    } else {
      // Centre direct
      laneWaypoints.push(new THREE.Vector3(0, 0.1, bot.position.z > 0 ? 12 : -12));
      laneWaypoints.push(captureZonePos);
    }

    if (bot.waypointIndex >= laneWaypoints.length) {
      // On est arrivé à la capture zone ! Rester dans un rayon de capture et faire une ronde
      const targetAngle = (Date.now() * 0.001) + bot.actorNr;
      const patrolPos = captureZonePos.clone().add(new THREE.Vector3(Math.cos(targetAngle) * 3, 0.1, Math.sin(targetAngle) * 3));
      
      const toPatrol = patrolPos.clone().sub(bot.position);
      const rotAngle = Math.atan2(toPatrol.x, toPatrol.z);
      bot.rotation.y = THREE.MathUtils.lerp(bot.rotation.y, rotAngle, delta * 6);
      
      if (toPatrol.length() > 0.5) {
        bot.velocity.copy(toPatrol.normalize().multiplyScalar(speed * 0.7));
        bot.position.addScaledVector(bot.velocity, delta);
      }
    } else {
      // Aller vers le waypoint actif
      const nextWaypoint = laneWaypoints[bot.waypointIndex];
      const toWay = nextWaypoint.clone().sub(bot.position);
      
      const rotAngle = Math.atan2(toWay.x, toWay.z);
      bot.rotation.y = THREE.MathUtils.lerp(bot.rotation.y, rotAngle, delta * 6);

      if (toWay.length() < 1.5) {
        // Waypoint atteint, passer au suivant
        bot.waypointIndex++;
      } else {
        bot.velocity.copy(toWay.normalize().multiplyScalar(speed));
        bot.position.addScaledVector(bot.velocity, delta);
      }
    }

    // S'assurer que le bot ne traverse pas le sol
    if (bot.position.y < 0.1) bot.position.y = 0.1;
  }

  /**
   * Processus IA : Logique de combat, rechargement et tir d'armes
   */
  private processCombat(bot: LocalBotSimulation, allTargets: NetworkPlayerState[], delta: number) {
    if (!bot.targetActorNr || !bot.lastTargetPos) return;
    if (bot.isReloading) return;

    // Si plus de munitions, on recharge
    if (bot.ammo <= 0) {
      bot.isReloading = true;
      bot.reloadTimer = 1.5; // Temps de reload moyen
      return;
    }

    // Cooldown de cadence de tir de l'arme
    if (bot.fireCooldown <= 0) {
      const weapon = WEAPONS_CATALOG.find(w => w.id === bot.selectedWeapon) || WEAPONS_CATALOG[0];
      bot.fireCooldown = weapon.fireRateSeconds;
      bot.ammo -= 1;
      bot.isFiring = true;

      // Calcul de la précision de tir basé sur la difficulté
      const diff = this.getDifficulty();
      let hitChance = 0.5; // Moyen par défaut
      let headshotChance = 0.1;

      if (diff === 'FACILE') {
        hitChance = 0.28;
        headshotChance = 0.05;
      } else if (diff === 'DIFFICILE') {
        hitChance = 0.75;
        headshotChance = 0.35;
      }

      const hitRoll = Math.random() < hitChance;
      const headshotRoll = Math.random() < headshotChance;

      // Calcul de la position de bouche d'arme simulée
      const muzzlePos = bot.position.clone().add(new THREE.Vector3(0.2, 1.4, 0.4).applyEuler(new THREE.Euler(0, bot.rotation.y, 0)));

      // Direction du tir
      const targetEntity = allTargets.find(t => t.actorNr === bot.targetActorNr);
      if (!targetEntity) return;

      const targetPosition = new THREE.Vector3(targetEntity.position[0], targetEntity.position[1], targetEntity.position[2]);
      
      // Si on rate le tir, on ajoute un décalage de dispersion à la trajectoire
      if (!hitRoll) {
        const spreadAmount = diff === 'FACILE' ? 2.5 : diff === 'MOYEN' ? 1.2 : 0.4;
        targetPosition.add(new THREE.Vector3((Math.random() - 0.5) * spreadAmount, (Math.random() - 0.5) * spreadAmount, (Math.random() - 0.5) * spreadAmount));
      }

      const fireDirection = targetPosition.clone().sub(muzzlePos).normalize();

      // Diffuser le tir laser visuel sur tout le réseau
      photonClient.sendShootEvent(
        [muzzlePos.x, muzzlePos.y, muzzlePos.z],
        [fireDirection.x, fireDirection.y, fireDirection.z],
        bot.selectedWeapon,
        weapon.visual.beamColor
      );

      // Si le bot a fait mouche, on inflige des dégâts à l'adversaire
      if (hitRoll && targetEntity.isAlive) {
        const damage = headshotRoll 
          ? Math.round(weapon.damage * weapon.headshotMultiplier) 
          : weapon.damage;

        // Propager l'événement de dégâts officiellement
        photonClient.sendDamageEvent(
          targetEntity.actorNr,
          damage,
          headshotRoll,
          bot.selectedWeapon,
          [targetPosition.x, targetPosition.y, targetPosition.z]
        );

        // Si le tir élimine l'ennemi
        if (targetEntity.health - damage <= 0) {
          bot.kills++;
          bot.score += 100;
          photonClient.sendArbitraryKillEvent(bot.actorNr, bot.callsign, targetEntity.actorNr, bot.selectedWeapon, headshotRoll);
        }
      }
    } else {
      bot.isFiring = false;
    }
  }

  /**
   * Diffuse la liste des états complets des bots par le réseau (raiseEvent code 8)
   */
  private broadcastBotsState(botStates?: any[]) {
    const payload = botStates || Array.from(this.bots.values()).map((b) => ({
      actorNr: b.actorNr,
      uid: b.uid,
      callsign: b.callsign,
      team: b.team,
      position: [parseFloat(b.position.x.toFixed(2)), parseFloat(b.position.y.toFixed(2)), parseFloat(b.position.z.toFixed(2))],
      rotation: [parseFloat(b.rotation.x.toFixed(2)), parseFloat(b.rotation.y.toFixed(2)), parseFloat(b.rotation.z.toFixed(2))],
      velocity: [parseFloat(b.velocity.x.toFixed(1)), parseFloat(b.velocity.y.toFixed(1)), parseFloat(b.velocity.z.toFixed(1))],
      health: b.health,
      shield: b.shield,
      isAlive: b.isAlive,
      selectedWeapon: b.selectedWeapon,
      isFiring: b.isFiring,
      isSprinting: b.isSprinting,
      isImmune: b.immunityTimer > 0,
      isInSanctuary: b.isInSanctuary,
      kills: b.kills,
      deaths: b.deaths,
      score: b.score,
    }));

    const receivers = 0; // Constants.ReceiverGroup.Others
    if (photonClient['client']) {
      photonClient['client'].raiseEvent(
        8, // BOT_SYNC
        payload,
        { receivers }
      );
    }
  }

  /**
   * Reçoit et traite les dégâts infligés aux bots depuis le réseau
   */
  private handleNetworkPacket(packet: any) {
    if (!photonClient.isMasterClient()) return;

    if (packet.type === 'PLAYER_DAMAGE' && packet.payload) {
      const { target, dmg, shooter, crit, w } = packet.payload;
      const bot = this.bots.get(target);

      if (bot && bot.isAlive) {
        // 1. Bouclier d'immunité de réapparition actif (3s)
        if (bot.immunityTimer > 0) {
          console.log(`[BotSystem] 🛡️ Dégâts annulés : Le bot "${bot.callsign}" a son bouclier d'immunité actif !`);
          return;
        }

        // 2. Sanctuaire d'équipe protégé
        if (bot.isInSanctuary) {
          console.log(`[BotSystem] 🛡️ Dégâts annulés : Le bot "${bot.callsign}" est dans son Sanctuaire de base protégé !`);
          return;
        }

        let damageLeft = dmg || 20;

        // Déduction du bouclier d'abord
        if (bot.shield > 0) {
          const shieldDmg = Math.min(bot.shield, damageLeft);
          bot.shield -= shieldDmg;
          damageLeft -= shieldDmg;
        }

        // Déduction de la vie
        if (damageLeft > 0) {
          bot.health = Math.max(0, bot.health - damageLeft);
        }

        // Si le bot meurt sous ce tir
        if (bot.health <= 0) {
          bot.isAlive = false;
          bot.deaths++;
          bot.respawnTimer = 4.0; // Respawn après 4 secondes
          bot.isFiring = false;

          // Propager le kill du bot sur le réseau pour l'ajouter au killfeed et statistiques de scores globales
          let shooterName = 'OPERATEUR';
          if (shooter === photonClient.getLocalActorNr()) {
            shooterName = photonClient.getLocalCallsign();
          } else {
            const remoteShooter = photonClient.getRemotePlayers().find(p => p.actorNr === shooter);
            if (remoteShooter) shooterName = remoteShooter.callsign;
          }

          photonClient.sendArbitraryKillEvent(shooter, shooterName, bot.actorNr, w || 'weapon_railgun', crit === 1);
        }
      }
    }
  }
}

export const botSystem = new BotSystem();
