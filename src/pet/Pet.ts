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
  private extensionContext: vscode.ExtensionContext;

  private decorationType:       vscode.TextEditorDecorationType;
  private wanderDecorationType: vscode.TextEditorDecorationType;
  private lastRenderedPath: string = '';

  private statusBarItem: vscode.StatusBarItem;

  // "click" detection — bark when cursor lands exactly on the pet
  private lastCursorCol: number = -1;
  // pet name — set by user, shown in hover messages
  private petName: string = '';

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
    this.extensionContext = extensionContext;

    // Restore the last selected pet type across sessions
    const savedPet = extensionContext.globalState.get<PetType>('petType', 'dog');
    this.animationManager = new AnimationManager(extensionContext.extensionPath, savedPet);
    this.movementManager  = new MovementManager();
    this.petPanel         = new PetPanel(extensionContext.extensionPath);

    this.petPanel.onToggle    = () => this.toggle();
    this.petPanel.onSwitchPet = (pet) => this.setPetType(pet);
    this.petPanel.onRename    = () => this.renamePet();

    // Restore saved pet name
    this.petName = extensionContext.globalState.get<string>('petName', '');

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
    this.extensionContext.globalState.update('petType', pet);
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
    const petType  = this.animationManager.getPetType();
    const petLabel = petType === 'cat'    ? 'Cat'
                   : petType === 'cow'    ? 'Cow'
                   : petType === 'monkey' ? 'Monkey'
                   : petType === 'rabbit' ? 'Rabbit'
                   : petType === 'sheep'  ? 'Sheep'
                   : 'Dog';
    const name     = this.petName ? this.petName : petLabel;

    const stateEmoji: Record<PetState, string> = {
      idle:          '😊',
      night_idle:    '🌙',
      running:       '🏃',
      happy_running: '✨',
      barking:       '📣',
      sleeping:      '💤',
      worried:       '😟',
      scared:        '😱',
      tired:         '😩',
      jumping:       '🐾',
    };
    const emoji = this.context.isVisible
      ? (stateEmoji[this.context.state] ?? '😊')
      : '·';

    this.statusBarItem.text    = `$(paw-icon) ${name} ${emoji}`;
    this.statusBarItem.tooltip = this.context.isVisible
      ? `PetCode [${name}] — click to open settings`
      : `PetCode [${name}] hidden — click to open settings`;
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

    // ── Click detection: cursor lands on the pet's position → bark ───────────
    const petLine   = this.movementManager.getCurrentLine();
    const cursorPos = editor.selection.active;

    if (cursorPos.line === petLine && this.context.isVisible) {
      const lineLen   = editor.document.lineAt(petLine).text.length;
      const petCol    = lineLen + 1;                      // pet sits just past EOL
      const cursorCol = cursorPos.character;
      const prevCol   = this.lastCursorCol;
      this.lastCursorCol = cursorCol;

      // Trigger when cursor jumps to or past the pet column (new arrival only)
      if (cursorCol >= petCol && prevCol < petCol && this.temporaryStateTimer === null) {
        this.triggerBark();
        const petType = this.animationManager.getPetType();
        const msg = petType === 'cat'    ? '🐱 ...fine.'
                  : petType === 'cow'    ? '🐄 MOOOO!'
                  : petType === 'monkey' ? '🐒 OOH OOH AHH!'
                  : petType === 'rabbit' ? '🐰 SQUEAK!'
                  : petType === 'sheep'  ? '🐑 BAAAA!'
                  :                       '🐶 WOOF!';
        vscode.window.setStatusBarMessage(msg, 2000);
        return;
      }
    } else {
      this.lastCursorCol = -1;
    }

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

    if (state === 'worried') {
      this.movementManager.moveToFirstError(editor);
      return;
    }

    // Smooth follow: set target, step toward it
    this.movementManager.followCursor(editor);
    const wasMoving = this.movementManager.isMoving();
    this.movementManager.tickFollow();

    // Face the direction of travel when cursor-following (not during wander — wander handles its own direction)
    if (wasMoving && this.wanderPhase === 'none' && !this.isHopping) {
      this.animationManager.setDirection(!this.movementManager.isMovingUp());
    }
  }

  private setState(newState: PetState): void {
    if (this.context.state !== newState) {
      this.context.previousState = this.context.state;
      this.context.state         = newState;
      if (!this.isHopping) { this.animationManager.resetFrame(); }
      this.lastRenderedPath = '';
      this.syncStatusBar();
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
    this.syncStatusBar();
    const duration = STATE_DURATIONS[state] ?? 1000;
    this.temporaryStateTimer = _setTimeout(() => {
      this.context.state       = this.context.previousState;
      this.temporaryStateTimer = null;
      this.animationManager.resetFrame();
      this.lastRenderedPath = '';
      this.syncStatusBar();
    }, duration);
  }

  private getHoverMessage(): string {
    const petType = this.animationManager.getPetType();
    const state   = this.context.state;
    const name    = this.petName;

    // Each pet has its own voice
    if (petType === 'cat') {
      const messages: Record<PetState, string> = {
        idle:          `🐱 ${name ? `${name} stares into the void.` : '*stares into the void*'}`,
        night_idle:    '🌙 Cats own the night. You\'re just visiting.',
        running:       '🐱 I\'m not running. I\'m choosing to move quickly.',
        happy_running: '🐱 ...okay fine, this is kind of fun.',
        barking:       '🐱 MRRROW!',
        sleeping:      '💤 Do not disturb. I mean it.',
        worried:       '🐱 Errors. How disappointing.',
        scared:        '🐱 This many errors is beneath both of us.',
        tired:         '🐱 I\'ve been watching you struggle for a while now.',
        jumping:       '🐱 I meant to do that.',
      };
      return messages[state];
    }

    if (petType === 'cow') {
      const messages: Record<PetState, string> = {
        idle:          `🐄 ${name ? `${name} says: Moo.` : 'Moo.'}`,
        night_idle:    '🌙 Even cows need sleep... just saying.',
        running:       '🐄 Mooooving right along!',
        happy_running: '🐄 MOO MOO MOO! You\'re doing great!',
        barking:       '🐄 MOOOOOOO!!',
        sleeping:      '💤 Zzzz... moo... zzzz...',
        worried:       '🐄 Moo? (something seems wrong)',
        scared:        '🐄 MOO MOO MOO!! TOO MANY ERRORS!!',
        tired:         '🐄 ...moooo. Take a break, friend.',
        jumping:       '🐄 A jumping cow! Historic.',
      };
      return messages[state];
    }

    if (petType === 'monkey') {
      const messages: Record<PetState, string> = {
        idle:          `🐒 ${name ? `${name} is monkeying around!` : 'Monkeying around!'}`,
        night_idle:    '🌙 Monkeys sleep too... but I\'m watching you.',
        running:       '🐒 Swinging through your code!',
        happy_running: '🐒✨ OOH OOH! You\'re crushing it!!',
        barking:       '🐒 OOH OOH AHH AHH!!',
        sleeping:      '💤 Zzz... *snores softly*...',
        worried:       '🐒 Ooh? Errors detected...',
        scared:        '🐒 AAHH!! TOO MANY ERRORS!!',
        tired:         '🐒 ...ook. Seriously, take a break.',
        jumping:       '🐒 WHEEE!! Monkey jump!!',
      };
      return messages[state];
    }

    if (petType === 'rabbit') {
      const messages: Record<PetState, string> = {
        idle:          `🐰 ${name ? `${name} wiggles their nose.` : '*wiggles nose*'}`,
        night_idle:    '🌙 Rabbits are most active at dusk... perfect timing.',
        running:       '🐰 Hippity hoppity through your code!',
        happy_running: '🐰✨ BOING BOING BOING! You\'re amazing!!',
        barking:       '🐰 SQUEAK SQUEAK!!',
        sleeping:      '💤 Zzz... *twitches ears*...',
        worried:       '🐰 *thumps foot nervously* Errors...',
        scared:        '🐰 EEK!! TOO MANY ERRORS!! *hides*',
        tired:         '🐰 ...thump. Please take a carrot break.',
        jumping:       '🐰 BOING!! Look at me go!!',
      };
      return messages[state];
    }

    if (petType === 'sheep') {
      const messages: Record<PetState, string> = {
        idle:          `🐑 ${name ? `${name} grazes peacefully.` : '*grazes peacefully*'}`,
        night_idle:    '🌙 Counting sheep? I\'m right here.',
        running:       '🐑 Fluffy and surprisingly fast!',
        happy_running: '🐑✨ BAAA BAAA! You\'re on a roll!!',
        barking:       '🐑 BAAAAA!!',
        sleeping:      '💤 Zzz... *soft woolly snores*...',
        worried:       '🐑 Baa? Something\'s not right...',
        scared:        '🐑 BAAA BAAA!! TOO MANY ERRORS!!',
        tired:         '🐑 ...baa. Even sheep need rest, friend.',
        jumping:       '🐑 A sheep can jump too, you know!',
      };
      return messages[state];
    }

    // Dog (default) — eager and loyal
    const messages: Record<PetState, string> = {
      idle:          `🐶 ${name ? `${name} is chillin'!` : "Just chillin'!"}`,
      night_idle:    '🌙 Late night? I\'m here for you, always.',
      running:       '🐶 Running alongside your code! Let\'s go!',
      happy_running: '🐶✨ You\'re on a roll! Best human ever!!',
      barking:       '🐶 WOOF WOOF!!',
      sleeping:      '💤 Zzz... (start typing to wake me up!)',
      worried:       '😟 Errors... I\'m worried. You got this though!',
      scared:        '😱 TOO MANY ERRORS!! Please fix them!!',
      tired:         '😩 You\'ve been at this a while. Take a break!',
      jumping:       '🐶 BOING!!',
    };
    return messages[state];
  }

  async renamePet(): Promise<void> {
    const input = await vscode.window.showInputBox({
      title:       '$(paw-icon) Name your pet',
      prompt:      'Give your companion a name (leave blank to reset)',
      value:       this.petName,
      placeHolder: 'e.g. Biscuit, Mochi, Debug...',
    });
    if (input === undefined) { return; }   // user pressed Escape
    this.petName = input.trim();
    this.extensionContext.globalState.update('petName', this.petName);
    this.syncStatusBar();
    if (this.petName) {
      vscode.window.setStatusBarMessage(`🐾 Hello, ${this.petName}!`, 2000);
    }
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