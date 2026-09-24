/**
 * Système de Gestion des Entrées (Clavier / Souris / Gamepad)
 * 
 * Prépare les contrôles FPS pour la phase de gameplay :
 * - Déplacements : ZQSD / WASD
 * - Actions : Saut (Space), Sprint (Shift), Rechargement (R), Tir (Clic gauche), Viser (Clic droit)
 * - Gestion du Pointer Lock API pour le réticule FPS
 */

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
  crouch: boolean;
  reload: boolean;
  fire: boolean;
  aim: boolean;
  targetLock: boolean;
  autoAimAssist: boolean;
  mouseDeltaX: number;
  mouseDeltaY: number;
}

class InputSystem {
  private state: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
    crouch: false,
    reload: false,
    fire: false,
    aim: false,
    targetLock: false,
    autoAimAssist: true,
    mouseDeltaX: 0,
    mouseDeltaY: 0,
  };

  private isListening: boolean = false;
  private isPointerLocked: boolean = false;
  private lockListeners: Set<(locked: boolean) => void> = new Set();
  private pendingWeaponSelect: number | null = null;
  private pendingWeaponScroll: number = 0;
  private touchLookDeltaX: number = 0;
  private touchLookDeltaY: number = 0;

  public init() {
    if (this.isListening || typeof window === 'undefined') return;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('wheel', this.handleWheel, { passive: true });
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);

    this.isListening = true;
  }

  public destroy() {
    if (!this.isListening || typeof window === 'undefined') return;

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('wheel', this.handleWheel);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);

    this.isListening = false;
  }

  public isTouchDevice(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches ||
      window.innerWidth <= 1024
    );
  }

  public setVirtualInput(action: keyof InputState, value: boolean) {
    if (action in this.state) {
      (this.state as unknown as Record<string, boolean | number>)[action] = value;
    }
  }

  public toggleTargetLock(): boolean {
    this.state.targetLock = !this.state.targetLock;
    return this.state.targetLock;
  }

  public setTargetLock(active: boolean) {
    this.state.targetLock = active;
  }

  public isTargetLockActive(): boolean {
    return this.state.targetLock;
  }

  public addTouchLookDelta(dx: number, dy: number) {
    this.touchLookDeltaX += dx;
    this.touchLookDeltaY += dy;
  }

  public selectWeapon(index: number) {
    this.pendingWeaponSelect = index;
  }

  public requestPointerLock(element?: HTMLElement | null) {
    const target = element || document.body || document.documentElement;
    if (target && target.requestPointerLock) {
      try {
        const promise = target.requestPointerLock() as unknown as Promise<void> | undefined;
        if (promise && typeof promise.catch === 'function') {
          promise.catch((err) => {
            console.warn('Pointer lock request rejected by browser:', err);
          });
        }
      } catch (err) {
        console.warn('Pointer lock request error:', err);
      }
    }
  }

  public exitPointerLock() {
    if (document.exitPointerLock && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch (err) {
        console.warn('Pointer lock exit error:', err);
      }
    }
  }

  public isLocked(): boolean {
    return this.isPointerLocked;
  }

  public onLockChange(callback: (locked: boolean) => void): () => void {
    this.lockListeners.add(callback);
    callback(this.isPointerLocked);
    return () => {
      this.lockListeners.delete(callback);
    };
  }

  public getState(): InputState {
    return { ...this.state };
  }

  public consumeDeltas(): { dx: number; dy: number } {
    const dx = this.state.mouseDeltaX + this.touchLookDeltaX;
    const dy = this.state.mouseDeltaY + this.touchLookDeltaY;
    this.state.mouseDeltaX = 0;
    this.state.mouseDeltaY = 0;
    this.touchLookDeltaX = 0;
    this.touchLookDeltaY = 0;
    return { dx, dy };
  }

  public resetDeltas() {
    this.state.mouseDeltaX = 0;
    this.state.mouseDeltaY = 0;
    this.touchLookDeltaX = 0;
    this.touchLookDeltaY = 0;
  }

  /**
   * Récupère et réinitialise les intentions de changement d'arme (touches 1, 2, 3 ou molette)
   */
  public consumeWeaponSwitch(): { selectIndex: number | null; scrollDelta: number } {
    const select = this.pendingWeaponSelect;
    const scroll = this.pendingWeaponScroll;
    this.pendingWeaponSelect = null;
    this.pendingWeaponScroll = 0;
    return { selectIndex: select, scrollDelta: scroll };
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'KeyZ':
        this.state.forward = true;
        break;
      case 'KeyS':
        this.state.backward = true;
        break;
      case 'KeyA':
      case 'KeyQ':
        this.state.left = true;
        break;
      case 'KeyD':
        this.state.right = true;
        break;
      case 'Space':
        this.state.jump = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.state.sprint = true;
        break;
      case 'KeyC':
      case 'ControlLeft':
        this.state.crouch = true;
        break;
      case 'KeyR':
        this.state.reload = true;
        break;
      case 'Digit1':
      case 'Numpad1':
        this.pendingWeaponSelect = 0;
        break;
      case 'Digit2':
      case 'Numpad2':
        this.pendingWeaponSelect = 1;
        break;
      case 'Digit3':
      case 'Numpad3':
        this.pendingWeaponSelect = 2;
        break;
      case 'Digit4':
      case 'Numpad4':
        this.pendingWeaponSelect = 3;
        break;
      case 'Digit5':
      case 'Numpad5':
        this.pendingWeaponSelect = 4;
        break;
    }
  };

  private handleWheel = (e: WheelEvent) => {
    if (this.isPointerLocked) {
      if (e.deltaY > 0) {
        this.pendingWeaponScroll += 1;
      } else if (e.deltaY < 0) {
        this.pendingWeaponScroll -= 1;
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'KeyZ':
        this.state.forward = false;
        break;
      case 'KeyS':
        this.state.backward = false;
        break;
      case 'KeyA':
      case 'KeyQ':
        this.state.left = false;
        break;
      case 'KeyD':
        this.state.right = false;
        break;
      case 'Space':
        this.state.jump = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.state.sprint = false;
        break;
      case 'KeyC':
      case 'ControlLeft':
        this.state.crouch = false;
        break;
      case 'KeyR':
        this.state.reload = false;
        break;
    }
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) this.state.fire = true;
    if (e.button === 2) this.state.aim = true;
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.state.fire = false;
    if (e.button === 2) this.state.aim = false;
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isPointerLocked) {
      this.state.mouseDeltaX += e.movementX;
      this.state.mouseDeltaY += e.movementY;
    }
  };

  private handlePointerLockChange = () => {
    this.isPointerLocked = document.pointerLockElement !== null;
    this.lockListeners.forEach((cb) => cb(this.isPointerLocked));
  };
}

export const inputSystem = new InputSystem();
