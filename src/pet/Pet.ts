import * as vscode from 'vscode';
import { PetState, PetContext, TIMINGS, STATE_DURATIONS } from './PetState';
import { AnimationManager, PetType } from './AnimationManager';
import { MovementManager } from './MovementManager';
import { PetPanel } from './PetPanel';

const _setInterval = (fn: () => void, ms: number): number =>
  (global as any).setInterval(fn, ms) as number;
const _clearInterval = (id: number): void =>
  (global as any).clearInterval(id);
const _setTimeout = (fn: () => void, ms: number): number =>
  (global as any).setTimeout(fn, ms) as number;
const _clearTimeout = (id: number): void =>
  (global as any).clearTimeout(id);

type WanderPhase = 'none' | 'run_out' | 'rest' | 'run_back';

const HOP_TICK_MS   = 180;
const HOP_STEP_PX   = 8;
const CHAR_WIDTH_PX = 8;

const BARK_COUNT = 4;                                    // how many barks per trigger
const BARK_MS    = STATE_DURATIONS.barking ?? 1200;      // must stay in sync with PetState

export class Pet {
  private context:          PetContext;
  private animationManager: AnimationManager;
  private movementManager:  MovementManager;
  private petPanel:         PetPanel;

  private decorationType:       vscode.TextEditorDecorationType;
  private wanderDecorationType: vscode.TextEditorDecorationType;
  private lastRenderedPath: string = '';

  private statusBarItem: vscode.StatusBarItem;

  private animationTimer:      number | null = null;
  private movementTimer:       number | null = null;
  private nightModeTimer:      number | null = null;
  private temporaryStateTimer: number | null = null;
  private cursorDebounceTimer: number | null = null;
  private wanderRestTimer:     number | null = null;
  private barkChainTimer:      number | null = null;   // drives the multi-bark loop

  private wanderPhase:       WanderPhase = 'none';
  private wanderSpacesNow:   number      = 0;
  private wanderSpacesMax:   number      = 0;
  private wanderStep:        number      = 2;
  private wanderRestPending: boolean     = false;

  private hopTimer:                number | null = null;
  private isHopping:               boolean       = false;
  private hopTick:                 number        = 0;
  private hopPass:                 number        = 0;
  private hopPassesMax:            number        = 1;
  private hopOffsetPx:             number        = 0;
  private hopStartedInIdleSession: boolean       = false;
  private hopDoneCallback:         (() => void) | null = null;

  constructor(extensionContext: vscode.ExtensionContext) {
    this.animationManager = new AnimationManager(extensionContext.extensionPath, 'dog');
    this.movementManager  = new MovementManager();
    this.petPanel         = new PetPanel(extensionContext.extensionPath);

    this.petPanel.onToggle    = () => this.toggle();
    this.petPanel.onSwitchPet = (pet) => this.setPetType(pet);

    this.context = {
      state:              'idle',
      previousState:      'idle',
      errorCount:         0,
      isNightMode:        this.checkNightMode(),
      typingStartTime:    null,
      lastActivityTime:   Date.now(),
      codingSessionStart: Date.now(),
      isVisible:          true,
    };

    this.decorationType       = vscode.window.createTextEditorDecorationType({});
    this.wanderDecorationType = vscode.window.createTextEditorDecorationType({});

    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right, 100
    );
    this.syncStatusBar();
    this.statusBarItem.command = 'PetCode.openPanel';
    this.statusBarItem.show();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  start(): void {
    this.animationTimer = _setInterval(() => {
      if (!this.isHopping) {
        this.animationManager.nextFrame(this.context.state);
        this.render();
      }
    }, TIMINGS.ANIMATION_SPEED_MS);

    this.movementTimer = _setInterval(() => {
      if (this.isHopping) { return; }
      this.tickMovement();
      this.render();
    }, TIMINGS.MOVEMENT_SPEED_MS);

    this.nightModeTimer = _setInterval(() => {
      this.context.isNightMode = this.checkNightMode();
    }, TIMINGS.NIGHT_CHECK_MS);
  }

  stop(): void {
    if (this.animationTimer      !== null) { _clearInterval(this.animationTimer); }
    if (this.movementTimer       !== null) { _clearInterval(this.movementTimer); }
    if (this.hopTimer            !== null) { _clearInterval(this.hopTimer); }
    if (this.nightModeTimer      !== null) { _clearInterval(this.nightModeTimer); }
    if (this.temporaryStateTimer !== null) { _clearTimeout(this.temporaryStateTimer); }
    if (this.cursorDebounceTimer !== null) { _clearTimeout(this.cursorDebounceTimer); }
    if (this.wanderRestTimer     !== null) { _clearTimeout(this.wanderRestTimer); }
    if (this.barkChainTimer      !== null) { _clearTimeout(this.barkChainTimer); }

    vscode.window.visibleTextEditors.forEach(e => {
      e.setDecorations(this.decorationType, []);
      e.setDecorations(this.wanderDecorationType, []);
    });
  }

  // ── Public controls ───────────────────────────────────────────────────────────

  openPanel(): void {
    this.petPanel.open(
      this.animationManager.getPetType(),
      this.context.isVisible
    );
  }

  toggle(): void {
    this.context.isVisible = !this.context.isVisible;
    this.syncStatusBar();
    this.petPanel.pushState(this.animationManager.getPetType(), this.context.isVisible);
    if (!this.context.isVisible) {
      vscode.window.visibleTextEditors.forEach(e => {
        e.setDecorations(this.decorationType, []);
        e.setDecorations(this.wanderDecorationType, []);
      });
    }
  }

  hide(): void {
    this.context.isVisible = false;
    this.syncStatusBar();
    this.petPanel.pushState(this.animationManager.getPetType(), false);
    vscode.window.visibleTextEditors.forEach(e => {
      e.setDecorations(this.decorationType, []);
      e.setDecorations(this.wanderDecorationType, []);
    });
  }

  show(): void {
    this.context.isVisible = true;
    this.syncStatusBar();
    this.petPanel.pushState(this.animationManager.getPetType(), true);
    this.lastRenderedPath = '';
    this.render();
  }

  isVisible(): boolean {
    return this.context.isVisible;
  }

  setPetType(pet: PetType): void {
    this.animationManager.setPetType(pet);
    this.syncStatusBar();
    this.petPanel.pushState(pet, this.context.isVisible);
    this.lastRenderedPath = '';
    this.render();
  }

  triggerBark(): void {
    // Cancel any in-progress bark chain before starting a new one
    if (this.barkChainTimer !== null) {
      _clearTimeout(this.barkChainTimer);
      this.barkChainTimer = null;
    }

    let barksDone = 0;

    const doOneBark = () => {
      if (barksDone >= BARK_COUNT) { return; }
      barksDone++;
      this.triggerTemporaryState('barking');
      if (barksDone < BARK_COUNT) {
        // Wait for the current bark to finish, then fire the next one
        this.barkChainTimer = _setTimeout(doOneBark, BARK_MS + 80);
      } else {
        this.barkChainTimer = null;
      }
    };

    doOneBark();
  }

  // ── Status bar ────────────────────────────────────────────────────────────────

  private syncStatusBar(): void {
    const petType = this.animationManager.getPetType();
    const petLabel = petType === 'cat' ? 'Cat' : petType === 'cow' ? 'Cow' : 'Dog';
    this.statusBarItem.text    = this.context.isVisible
      ? '$(paw-icon) PetCode'
      : '$(paw-icon) PetCode·';
    this.statusBarItem.tooltip = this.context.isVisible
      ? `PetCode [${petLabel}] — click to open settings`
      : `PetCode [${petLabel}] hidden — click to open settings`;
  }

  // ── External events ───────────────────────────────────────────────────────────

  onTyping(): void {
    this.context.lastActivityTime = Date.now();
    if (!this.context.typingStartTime) {
      this.context.typingStartTime = Date.now();
    }
    if (this.wanderPhase !== 'none') { this.cancelWander(); }
    this.cancelHop();
    this.hopStartedInIdleSession = false;
    if (this.context.state === 'sleeping') { this.setState('running'); }
  }

  onCursorMove(editor: vscode.TextEditor): void {
    this.context.lastActivityTime = Date.now();
    if (this.wanderPhase === 'none' && !this.isHopping) {
      this.movementManager.followCursor(editor);
    }
    if (this.cursorDebounceTimer !== null) { _clearTimeout(this.cursorDebounceTimer); }
    this.cursorDebounceTimer = _setTimeout(() => {
      this.cursorDebounceTimer = null;
      this.lastRenderedPath = '';
      this.render();
    }, 80);
  }

  onErrorsChanged(errorCount: number, editor: vscode.TextEditor): void {
    const hadErrors = this.context.errorCount > 0;
    this.context.errorCount = errorCount;
    if (hadErrors && errorCount === 0) { this.triggerTemporaryState('barking'); return; }
    if (errorCount > 0) { this.movementManager.moveToFirstError(editor); }
  }

  onArrowLineChange(editor: vscode.TextEditor, fromLine: number, toLine: number): void {
    this.context.lastActivityTime = Date.now();
    if (this.wanderPhase !== 'none') { this.cancelWander(); }
    const maxLine = editor.document.lineCount - 1;
    const fromLen = editor.document.lineAt(Math.min(fromLine, maxLine)).text.length;
    const toLen   = editor.document.lineAt(Math.min(toLine,   maxLine)).text.length;
    this.animationManager.setDirection(toLen > fromLen);
  }

  // ── Hop sequence ──────────────────────────────────────────────────────────────

  private startHop(
    safetyCheck: 'right' | 'left',
    passes: number = 1,
    onDone: (() => void) | null = null
  ): void {
    if (this.isHopping) { return; }

    if (safetyCheck === 'left') {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !this.isSafeToHopLeft(editor)) { onDone?.(); return; }
    }

    this.isHopping       = true;
    this.hopTick         = 0;
    this.hopPass         = 0;
    this.hopPassesMax    = passes;
    this.hopOffsetPx     = 0;
    this.hopDoneCallback = onDone;

    this.animationManager.setDirection(true);
    this.animationManager.setFrameIndex(0);
    this.context.state    = 'jumping';
    this.lastRenderedPath = '';

    if (this.hopTimer !== null) { _clearInterval(this.hopTimer); }
    this.hopTimer = _setInterval(() => {
      if (!this.isHopping) {
        _clearInterval(this.hopTimer!);
        this.hopTimer = null;
        return;
      }
      this.tickHop();
      this.render();
    }, HOP_TICK_MS);
  }

  private tickHop(): void {
    const tickInPass = this.hopTick % 6;

    if (tickInPass < 3) {
      this.animationManager.setDirection(true);
      this.animationManager.setFrameIndex(tickInPass);
      this.hopOffsetPx = (tickInPass + 1) * HOP_STEP_PX;
    } else {
      const returnStep = tickInPass - 3;
      this.animationManager.setDirection(false);
      this.animationManager.setFrameIndex(returnStep);
      this.hopOffsetPx = (2 - returnStep) * HOP_STEP_PX;
    }

    this.hopTick++;

    if (this.hopTick % 6 === 0) {
      this.hopPass++;
      this.hopOffsetPx = 0;
      if (this.hopPass >= this.hopPassesMax) {
        this.finishHop();
      }
    }
  }

  private finishHop(): void {
    if (this.hopTimer !== null) { _clearInterval(this.hopTimer); this.hopTimer = null; }
    this.isHopping   = false;
    this.hopOffsetPx = 0;

    if (this.wanderPhase === 'run_out' || this.wanderPhase === 'run_back') {
      this.animationManager.setDirection(this.wanderPhase === 'run_out');
      this.context.state = 'running';
    } else {
      this.animationManager.setDirection(false);
      this.context.state = 'idle';
    }

    this.animationManager.resetFrame();
    this.lastRenderedPath = '';

    const cb = this.hopDoneCallback;
    this.hopDoneCallback = null;
    cb?.();

    if (this.wanderRestPending) {
      this.wanderRestPending = false;
      this.triggerWanderRest();
    }
  }

  private cancelHop(): void {
    if (!this.isHopping) { return; }
    if (this.hopTimer !== null) { _clearInterval(this.hopTimer); this.hopTimer = null; }
    this.isHopping         = false;
    this.hopOffsetPx       = 0;
    this.hopDoneCallback   = null;
    this.wanderRestPending = false;
    this.animationManager.setDirection(false);
    this.animationManager.resetFrame();
    this.lastRenderedPath = '';
  }

  private isSafeToHopLeft(editor: vscode.TextEditor): boolean {
    const line      = this.movementManager.getCurrentLine();
    const maxLine   = editor.document.lineCount - 1;
    const safeLine  = Math.min(Math.max(0, line), maxLine);
    const lineText  = editor.document.lineAt(safeLine).text;
    const lineLen   = lineText.length;
    const hopChars  = Math.ceil((3 * HOP_STEP_PX) / CHAR_WIDTH_PX);
    const checkFrom = lineLen - hopChars;
    if (checkFrom < 0) { return false; }
    return lineText.slice(checkFrom, lineLen).trim().length === 0;
  }

  // ── Master movement tick ──────────────────────────────────────────────────────

  private tickMovement(): void {
    if (this.wanderPhase !== 'none') { this.tickWander(); return; }
    this.evaluateState();
    this.updateMovement();
  }

  // ── Wander ────────────────────────────────────────────────────────────────────

  private tickWander(): void {
    switch (this.wanderPhase) {
      case 'run_out': {
        this.animationManager.setDirection(true);
        this.setState('running');
        this.wanderSpacesNow = Math.min(this.wanderSpacesNow + this.wanderStep, this.wanderSpacesMax);

        if (!this.isHopping && Math.random() < 0.10) {
          this.startHop('right', 1);
        }

        if (this.wanderSpacesNow >= this.wanderSpacesMax) {
          this.wanderPhase = 'rest';
          this.setState('idle');
          this.animationManager.setDirection(false);
          if (this.isHopping) {
            this.wanderRestPending = true;
          } else {
            this.triggerWanderRest();
          }
        }
        break;
      }

      case 'rest':
        if (!this.isHopping) { this.setState('idle'); }
        break;

      case 'run_back': {
        this.animationManager.setDirection(false);
        this.setState('running');
        this.wanderSpacesNow = Math.max(this.wanderSpacesNow - this.wanderStep, 0);

        if (!this.isHopping && Math.random() < 0.10) {
          this.startHop('left', 1);
        }

        if (this.wanderSpacesNow <= 0) {
          this.cancelWander();
          this.setState('idle');
        }
        break;
      }
    }
  }

  private triggerWanderRest(): void {
    this.startHop('right', 2, () => {
      const restMs = 1000 + Math.random() * 1000;
      this.wanderRestTimer = _setTimeout(() => {
        this.wanderRestTimer = null;
        if (this.wanderPhase === 'rest') {
          this.wanderPhase = 'run_back';
        }
      }, restMs);
    });
  }

  private startWander(): void {
    this.wanderSpacesNow         = 0;
    this.wanderSpacesMax         = 15 + Math.floor(Math.random() * 15);
    this.wanderPhase             = 'run_out';
    this.wanderRestPending       = false;
    this.hopStartedInIdleSession = false;
  }

  private cancelWander(): void {
    this.wanderPhase       = 'none';
    this.wanderSpacesNow   = 0;
    this.wanderSpacesMax   = 0;
    this.wanderRestPending = false;
    if (this.wanderRestTimer !== null) {
      _clearTimeout(this.wanderRestTimer);
      this.wanderRestTimer = null;
    }
    this.animationManager.setDirection(false);
  }

  // ── Rendering ─────────────────────────────────────────────────────────────────

  private render(): void {
    if (!this.context.isVisible) { return; }

    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    const currentPath = this.animationManager.getCurrentFramePath(this.context.state);
    const skipGuard   = this.wanderPhase !== 'none' || this.isHopping;
    if (!skipGuard && this.lastRenderedPath === currentPath) { return; }

    const currentUri = this.animationManager.getCurrentFrameUri(this.context.state);
    const range      = this.movementManager.getRange(editor);
    const hover      = this.getHoverMessage();

    const IMAGE_HEIGHT = 19;
    const lineHeight   = (editor.options as any).lineHeight as number || 20;
    const offsetPx     = Math.floor((lineHeight - IMAGE_HEIGHT) / 2) + 2;
    const totalMargin  = 4 + (this.wanderSpacesNow * CHAR_WIDTH_PX) + this.hopOffsetPx;

    editor.setDecorations(this.decorationType, []);
    editor.setDecorations(this.wanderDecorationType, [{
      range,
      hoverMessage: hover,
      renderOptions: {
        after: {
          contentIconPath: currentUri,
          width:           `${IMAGE_HEIGHT}px`,
          height:          `${IMAGE_HEIGHT}px`,
          margin:          `-${offsetPx + 4}px 0 0 ${totalMargin}px`,
        }
      }
    }]);

    this.lastRenderedPath = currentPath;
  }

  // ── State helpers ─────────────────────────────────────────────────────────────

  private evaluateState(): void {
    const now = Date.now();
    if (this.temporaryStateTimer !== null) { return; }

    const timeSinceActivity = now - this.context.lastActivityTime;
    const typingDuration    = this.context.typingStartTime
      ? now - this.context.typingStartTime : 0;
    const sessionDuration   = now - this.context.codingSessionStart;

    if (sessionDuration >= TIMINGS.TIRED_AFTER_MS) {
      if (timeSinceActivity >= TIMINGS.TIRED_RESET_MS) {
        this.context.codingSessionStart = Date.now();
      }
      this.setState('tired'); return;
    }

    if (this.context.errorCount >= TIMINGS.SCARED_ERROR_COUNT) {
      this.setState('scared'); return;
    }

    if (timeSinceActivity >= TIMINGS.PRE_SLEEP_TIRED_MS &&
        timeSinceActivity < TIMINGS.SLEEP_AFTER_MS &&
        this.wanderPhase === 'none' &&
        !this.isHopping) {
      this.context.typingStartTime = null;
      this.setState('tired'); return;
    }

    if (timeSinceActivity >= TIMINGS.SLEEP_AFTER_MS) {
      this.context.typingStartTime = null;
      if (timeSinceActivity >= TIMINGS.TIRED_RESET_MS) {
        this.context.codingSessionStart = Date.now();
      }
      this.setState('sleeping'); return;
    }

    if (this.context.errorCount >= TIMINGS.WORRIED_ERROR_COUNT) {
      this.setState('worried'); return;
    }

    if (timeSinceActivity >= TIMINGS.WANDER_AFTER_MS && this.wanderPhase === 'none') {
      this.startWander(); return;
    }

    if (
      timeSinceActivity >= TIMINGS.FIDGET_AFTER_MS &&
      timeSinceActivity <  TIMINGS.WANDER_AFTER_MS &&
      this.wanderPhase === 'none' &&
      !this.isHopping &&
      !this.hopStartedInIdleSession
    ) {
      this.hopStartedInIdleSession = true;
      this.startHop('right', 1);
      return;
    }

    if (timeSinceActivity >= TIMINGS.IDLE_AFTER_MS) {
      this.context.typingStartTime = null;
      this.setState('idle'); return;
    }

    if (this.context.isNightMode) { this.setState('night_idle'); return; }

    if (typingDuration >= TIMINGS.HAPPY_TYPING_MS) {
      this.setState('happy_running'); return;
    }

    this.setState('running');
  }

  private updateMovement(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }
    const state = this.context.state;
    if (state === 'tired' || state === 'scared' || state === 'sleeping') { return; }
    if (state === 'worried') { this.movementManager.moveToFirstError(editor); return; }
    this.movementManager.followCursor(editor);
  }

  private setState(newState: PetState): void {
    if (this.context.state !== newState) {
      this.context.previousState = this.context.state;
      this.context.state         = newState;
      if (!this.isHopping) { this.animationManager.resetFrame(); }
      this.lastRenderedPath = '';
    }
  }

  private triggerTemporaryState(state: PetState): void {
    if (this.temporaryStateTimer !== null) {
      _clearTimeout(this.temporaryStateTimer);
      this.temporaryStateTimer = null;
    }
    this.context.previousState = this.context.state;
    this.context.state         = state;
    this.animationManager.resetFrame();
    this.lastRenderedPath = '';
    const duration = STATE_DURATIONS[state] ?? 1000;
    this.temporaryStateTimer = _setTimeout(() => {
      this.context.state       = this.context.previousState;
      this.temporaryStateTimer = null;
      this.animationManager.resetFrame();
      this.lastRenderedPath = '';
    }, duration);
  }

  private getHoverMessage(): string {
    const petType = this.animationManager.getPetType();
    let icon: string;
    if (petType === 'cat') {
      icon = '🐱';
    } else if (petType === 'cow') {
      icon = '🐄';
    } else {
      icon = '🐶';
    }
    const barkSound = petType === 'cow' ? 'MOO MOO!' : 'WOOF WOOF!';
    const messages: Record<PetState, string> = {
      idle:          `${icon} Just chilling... Press Ctrl+Alt+B to make me bark!`,
      night_idle:    '🌙 Late night coding? Please take care of yourself...',
      running:       `${icon} Running alongside your code!`,
      happy_running: `${icon}✨ You're on a roll! Keep going!`,
      barking:       `${icon} ${barkSound}`,
      sleeping:      '💤 Zzz... (start typing to wake me up)',
      worried:       `😟 There are errors... I'm worried.`,
      scared:        '😱 TOO MANY ERRORS! I\'m hiding!',
      tired:         '😩 You\'ve been coding for a while. Take a break!',
      jumping:       `${icon} *boing!*`,
    };
    return messages[this.context.state];
  }

  private checkNightMode(): boolean {
    const hour = new Date().getHours();
    return hour >= TIMINGS.NIGHT_START_HOUR && hour < TIMINGS.NIGHT_END_HOUR;
  }

  dispose(): void {
    this.stop();
    this.decorationType.dispose();
    this.wanderDecorationType.dispose();
    this.statusBarItem.dispose();
    this.petPanel.dispose();
  }
}