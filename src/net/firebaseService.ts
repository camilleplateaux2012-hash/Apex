/**
 * ============================================================================
 * SERVICE FIREBASE (Auth anonyme + Firestore)
 * ============================================================================
 * 
 * Gère la persistance des données joueur :
 * - Authentification anonyme Firebase
 * - Profil joueur (callsign, rang, crédits)
 * - Skins débloqués
 * - Statistiques de match (kills, deaths, wins, matches)
 * 
 * En cas d'absence de clés réelles, un mode démo local (localStorage) prend
 * le relais de manière transparente afin que l'UI fonctionne immédiatement.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  type Auth, 
  type User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  type Firestore 
} from 'firebase/firestore';

import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig.ts';
import { GAME_CONFIG } from '../config/gameConfig.ts';
import type { PlayerProfile, PlayerStats } from '../types/game.ts';

class FirebaseService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private currentUser: User | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.isConfigured = isFirebaseConfigured();
    if (this.isConfigured) {
      try {
        this.app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        this.auth = getAuth(this.app);
        this.db = getFirestore(this.app);
      } catch (err) {
        console.warn("[FirebaseService] Échec de l'initialisation Firebase, bascule en mode simulation locale :", err);
        this.isConfigured = false;
      }
    } else {
      console.info("[FirebaseService] Clés Firebase non configurées dans firebaseConfig.ts. Mode local actif.");
    }
  }

  public getStatus() {
    return {
      isConfigured: this.isConfigured,
      isAuthenticated: Boolean(this.currentUser),
      userId: this.currentUser?.uid || null,
    };
  }

  /**
   * Connexion anonyme du joueur
   */
  public async authenticateAnonymously(): Promise<string> {
    if (!this.isConfigured || !this.auth) {
      // Mode simulation hors-ligne / local
      const mockUid = this.getLocalMockUid();
      return mockUid;
    }

    try {
      const userCredential = await signInAnonymously(this.auth);
      this.currentUser = userCredential.user;
      return this.currentUser.uid;
    } catch (error) {
      console.warn("[FirebaseService] Erreur lors de signInAnonymously(), repli sur l'ID local :", error);
      return this.getLocalMockUid();
    }
  }

  /**
   * Écouteur sur l'état d'authentification
   */
  public onAuthChange(callback: (user: User | null) => void): () => void {
    if (this.auth) {
      return onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user;
        callback(user);
      });
    }
    // Simulation
    callback(null);
    return () => {};
  }

  /**
   * Charge ou crée le profil joueur dans Firestore (collection `players/{uid}`)
   */
  public async loadOrCreatePlayerProfile(uid: string): Promise<PlayerProfile> {
    if (!this.isConfigured || !this.db) {
      return this.getLocalProfile(uid);
    }

    try {
      const userRef = doc(this.db, 'players', uid);
      const snapshot = await getDoc(userRef);

      if (snapshot.exists()) {
        const data = snapshot.data() as PlayerProfile;
        // Met à jour la date de dernière connexion
        await updateDoc(userRef, { lastLoginAt: new Date().toISOString() });
        return data;
      } else {
        // Création du profil initial
        const newProfile: PlayerProfile = {
          uid,
          callsign: `RUNNER_${uid.slice(0, 4).toUpperCase()}`,
          isAnonymous: true,
          credits: GAME_CONFIG.DEFAULT_PLAYER.credits,
          neonCores: GAME_CONFIG.DEFAULT_PLAYER.neonCores,
          rank: GAME_CONFIG.DEFAULT_PLAYER.rank,
          rankScore: GAME_CONFIG.DEFAULT_PLAYER.rankScore,
          selectedSkinId: 'skin_default_railgun',
          unlockedSkinIds: ['skin_default_railgun', 'skin_default_plasma'],
          stats: { ...GAME_CONFIG.DEFAULT_PLAYER.stats },
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };

        await setDoc(userRef, newProfile);
        return newProfile;
      }
    } catch (err) {
      console.warn("[FirebaseService] Erreur Firestore, lecture depuis le stockage local :", err);
      return this.getLocalProfile(uid);
    }
  }

  /**
   * Met à jour les statistiques du joueur après un match
   */
  public async updateStats(uid: string, newStats: Partial<PlayerStats>): Promise<void> {
    if (!this.isConfigured || !this.db) {
      const p = this.getLocalProfile(uid);
      p.stats = { ...p.stats, ...newStats };
      this.saveLocalProfile(p);
      return;
    }

    try {
      const userRef = doc(this.db, 'players', uid);
      await updateDoc(userRef, {
        stats: newStats,
      });
    } catch (err) {
      console.error("[FirebaseService] Impossible de mettre à jour les stats :", err);
    }
  }

  /**
   * Débloquer un skin d'arme
   */
  public async unlockSkin(uid: string, skinId: string, costCredits: number): Promise<boolean> {
    const profile = await this.loadOrCreatePlayerProfile(uid);
    if (profile.credits < costCredits) {
      return false;
    }

    const updatedCredits = profile.credits - costCredits;
    const updatedSkins = [...profile.unlockedSkinIds, skinId];

    if (!this.isConfigured || !this.db) {
      profile.credits = updatedCredits;
      profile.unlockedSkinIds = updatedSkins;
      this.saveLocalProfile(profile);
      return true;
    }

    try {
      const userRef = doc(this.db, 'players', uid);
      await updateDoc(userRef, {
        credits: updatedCredits,
        unlockedSkinIds: updatedSkins,
      });
      return true;
    } catch (err) {
      console.error("[FirebaseService] Erreur lors du déblocage du skin :", err);
      return false;
    }
  }

  /**
   * Sauvegarde l'état complet du profil joueur (Firestore ou LocalStorage)
   */
  public async savePlayerProfile(profile: PlayerProfile): Promise<void> {
    this.saveLocalProfile(profile);

    if (this.isConfigured && this.db && profile.uid) {
      try {
        const userRef = doc(this.db, 'players', profile.uid);
        await setDoc(userRef, profile, { merge: true });
      } catch (err) {
        console.warn("[FirebaseService] Échec de la synchronisation distante du profil :", err);
      }
    }
  }

  // --- Gestionnaires locaux de secours (LocalStorage) ---

  private getLocalMockUid(): string {
    let id = localStorage.getItem('cyberstrike_local_uid');
    if (!id) {
      id = 'local_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('cyberstrike_local_uid', id);
    }
    return id;
  }

  private getLocalProfile(uid: string): PlayerProfile {
    const stored = localStorage.getItem(`cyberstrike_profile_${uid}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // fallback
      }
    }

    const defaultProfile: PlayerProfile = {
      uid,
      callsign: `RUNNER_${uid.slice(-4).toUpperCase()}`,
      isAnonymous: true,
      credits: GAME_CONFIG.DEFAULT_PLAYER.credits,
      neonCores: GAME_CONFIG.DEFAULT_PLAYER.neonCores,
      rank: GAME_CONFIG.DEFAULT_PLAYER.rank,
      rankScore: GAME_CONFIG.DEFAULT_PLAYER.rankScore,
      selectedSkinId: 'skin_default_railgun',
      unlockedSkinIds: ['skin_default_railgun', 'skin_default_plasma'],
      stats: { ...GAME_CONFIG.DEFAULT_PLAYER.stats },
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    this.saveLocalProfile(defaultProfile);
    return defaultProfile;
  }

  private saveLocalProfile(profile: PlayerProfile): void {
    localStorage.setItem(`cyberstrike_profile_${profile.uid}`, JSON.stringify(profile));
  }
}

// Instance Singleton
export const firebaseService = new FirebaseService();
