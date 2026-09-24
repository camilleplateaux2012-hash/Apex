/**
 * Système Audio Procédural Cyberpunk (Web Audio API)
 * 
 * Génère des effets sonores synthétiques rétro-futuristes sans aucun fichier mp3 externe :
 * - Bip de survol (hover)
 * - Clic mécanique cyberpunk
 * - Ouverture de modal / transition d'écran
 * - Alerte / Erreur glitch
 * - Son de rechargement cybernétique
 */

class CyberAudioSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol / 100));
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  /**
   * Bip discret de survol des boutons néon
   */
  public playHover() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime); // Note A5
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(this.volume * 0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {
      // Audio autoplay policy
    }
  }

  /**
   * Clic cybernétique percutant
   */
  public playClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(this.volume * 0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Transition de panneau / modal
   */
  public playModalOpen() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(this.volume * 0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Accord de validation / Boot complet
   */
  public playBootSuccess() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const notes = [440, 554.37, 659.25, 880]; // A major cyber chime
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0, this.ctx!.currentTime + idx * 0.08);
        gain.gain.linearRampToValueAtTime(this.volume * 0.3, this.ctx!.currentTime + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.08 + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(this.ctx!.currentTime + idx * 0.08);
        osc.stop(this.ctx!.currentTime + idx * 0.08 + 0.35);
      });
    } catch (e) {
      // ignore
    }
  }

  /**
   * Tir de pistolet laser percutant avec balayage de fréquence
   */
  public playLaserShot() {
    this.playRifleShot();
  }

  /**
   * Tir de fusil d'assaut à impulsions (Équilibré & Punchy)
   */
  public playRifleShot() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // Oscillateur principal : zap laser
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1300, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.11);

      gain.gain.setValueAtTime(this.volume * 0.42, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.14);

      // Couche sub-bass punch
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(190, t);
      subOsc.frequency.exponentialRampToValueAtTime(50, t + 0.09);
      subGain.gain.setValueAtTime(this.volume * 0.45, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(t);
      subOsc.stop(t + 0.1);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Tir de mitraillette SMG plasma (Ultra-rapide, son incisif)
   */
  public playSmgShot() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2100, t);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.06);

      gain.gain.setValueAtTime(this.volume * 0.32, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.07);

      // Transitoire haute fréquence (clic plasma)
      const click = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      click.type = 'square';
      click.frequency.setValueAtTime(3500, t);
      click.frequency.exponentialRampToValueAtTime(900, t + 0.02);
      clickGain.gain.setValueAtTime(this.volume * 0.18, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
      click.connect(clickGain);
      clickGain.connect(this.ctx.destination);
      click.start(t);
      click.stop(t + 0.03);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Tir de Sniper Railgun (Déflagration massive électromagnétique + onde de choc)
   */
  public playSniperShot() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;

      // 1. Décharge d'arc électrique haute fréquence
      const arcOsc = this.ctx.createOscillator();
      const arcGain = this.ctx.createGain();
      arcOsc.type = 'sawtooth';
      arcOsc.frequency.setValueAtTime(3200, t);
      arcOsc.frequency.exponentialRampToValueAtTime(180, t + 0.18);
      arcGain.gain.setValueAtTime(this.volume * 0.55, t);
      arcGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      arcOsc.connect(arcGain);
      arcGain.connect(this.ctx.destination);
      arcOsc.start(t);
      arcOsc.stop(t + 0.25);

      // 2. Onde de choc Sub-Bass sismique
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(260, t);
      subOsc.frequency.exponentialRampToValueAtTime(35, t + 0.28);
      subGain.gain.setValueAtTime(this.volume * 0.7, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(t);
      subOsc.stop(t + 0.38);

      // 3. Rémanence métallique / Traînée de canon
      const ringOsc = this.ctx.createOscillator();
      const ringGain = this.ctx.createGain();
      ringOsc.type = 'sine';
      ringOsc.frequency.setValueAtTime(680, t + 0.04);
      ringGain.gain.setValueAtTime(0, t);
      ringGain.gain.linearRampToValueAtTime(this.volume * 0.22, t + 0.05);
      ringGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      ringOsc.connect(ringGain);
      ringGain.connect(this.ctx.destination);
      ringOsc.start(t + 0.04);
      ringOsc.stop(t + 0.42);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Cliquetis / Enclenchement de changement d'arme
   */
  public playWeaponSwitch() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // Son mécanique de loquet / servo
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, t);
      osc.frequency.exponentialRampToValueAtTime(1450, t + 0.08);

      gain.gain.setValueAtTime(this.volume * 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.11);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Joue le son correspondant au type d'arme configuré
   */
  public playWeaponFire(soundType: string) {
    switch (soundType) {
      case 'pulse_smg':
        this.playSmgShot();
        break;
      case 'rail_sniper':
        this.playSniperShot();
        break;
      case 'laser_rifle':
      default:
        this.playRifleShot();
        break;
    }
  }

  /**
   * Bip d'impact / Hitmarker sonore quand une cible est touchée
   */
  public playHitmarker(isCrit = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isCrit ? 1760 : 1320, t);
      osc.frequency.exponentialRampToValueAtTime(isCrit ? 2200 : 880, t + 0.06);

      gain.gain.setValueAtTime(this.volume * (isCrit ? 0.4 : 0.25), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.08);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Impact laser sur le décor (étincelles métalliques)
   */
  public playImpact() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.06);

      gain.gain.setValueAtTime(this.volume * 0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.07);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Saut propulseur cybernétique
   */
  public playJump() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(420, t + 0.12);

      gain.gain.setValueAtTime(this.volume * 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.15);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Pas discret (bruit de pas d'exosquelette)
   */
  public playFootstep() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.04);

      gain.gain.setValueAtTime(this.volume * 0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.05);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Séquence de rechargement cybernétique (éjection + recharge cellule)
   */
  public playReload() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // Étape 1 : Éjection batterie
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(500, t);
      osc1.frequency.exponentialRampToValueAtTime(180, t + 0.15);
      gain1.gain.setValueAtTime(this.volume * 0.2, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.2);

      // Étape 2 : Enclenchement nouvelle cellule néon
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(320, t + 0.35);
      osc2.frequency.exponentialRampToValueAtTime(880, t + 0.55);
      gain2.gain.setValueAtTime(0, t + 0.35);
      gain2.gain.linearRampToValueAtTime(this.volume * 0.25, t + 0.38);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t + 0.35);
      osc2.stop(t + 0.65);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Clic à vide (chargeur vide)
   */
  public playEmptyClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(950, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.03);

      gain.gain.setValueAtTime(this.volume * 0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.04);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Explosion / Destruction de cible
   */
  public playTargetDestroyed() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.25);

      gain.gain.setValueAtTime(this.volume * 0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.3);
    } catch (e) {
      // ignore
    }
  }
}

export const audioSystem = new CyberAudioSystem();
