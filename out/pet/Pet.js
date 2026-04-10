"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pet = void 0;
const vscode = require("vscode");
const PetState_1 = require("./PetState");
const AnimationManager_1 = require("./AnimationManager");
const MovementManager_1 = require("./MovementManager");
const PetPanel_1 = require("./PetPanel");
const _setInterval = (fn, ms) => global.setInterval(fn, ms);
const _clearInterval = (id) => global.clearInterval(id);
const _setTimeout = (fn, ms) => global.setTimeout(fn, ms);
const _clearTimeout = (id) => global.clearTimeout(id);
const HOP_TICK_MS = 180;
const HOP_STEP_PX = 8;
const CHAR_WIDTH_PX = 8;
const BARK_COUNT = 4; // how many barks per trigger
const BARK_MS = PetState_1.STATE_DURATIONS.barking ?? 1200; // must stay in sync with PetState
class Pet {
    constructor(extensionContext) {
        this.lastRenderedPath = '';
        this.animationTimer = null;
        this.movementTimer = null;
        this.nightModeTimer = null;
        this.temporaryStateTimer = null;
        this.cursorDebounceTimer = null;
        this.wanderRestTimer = null;
        this.barkChainTimer = null; // drives the multi-bark loop
        this.wanderPhase = 'none';
        this.wanderSpacesNow = 0;
        this.wanderSpacesMax = 0;
        this.wanderStep = 2;
        this.wanderRestPending = false;
        this.hopTimer = null;
        this.isHopping = false;
        this.hopTick = 0;
        this.hopPass = 0;
        this.hopPassesMax = 1;
        this.hopOffsetPx = 0;
        this.hopStartedInIdleSession = false;
        this.hopDoneCallback = null;
        this.animationManager = new AnimationManager_1.AnimationManager(extensionContext.extensionPath, 'dog');
        this.movementManager = new MovementManager_1.MovementManager();
        this.petPanel = new PetPanel_1.PetPanel(extensionContext.extensionPath);
        this.petPanel.onToggle = () => this.toggle();
        this.petPanel.onSwitchPet = (pet) => this.setPetType(pet);
        this.context = {
            state: 'idle',
            previousState: 'idle',
            errorCount: 0,
            isNightMode: this.checkNightMode(),
            typingStartTime: null,
            lastActivityTime: Date.now(),
            codingSessionStart: Date.now(),
            isVisible: true,
        };
        this.decorationType = vscode.window.createTextEditorDecorationType({});
        this.wanderDecorationType = vscode.window.createTextEditorDecorationType({});
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.syncStatusBar();
        this.statusBarItem.command = 'codepet.openPanel';
        this.statusBarItem.show();
    }
    // ── Lifecycle ─────────────────────────────────────────────────────────────────
    start() {
        this.animationTimer = _setInterval(() => {
            if (!this.isHopping) {
                this.animationManager.nextFrame(this.context.state);
                this.render();
            }
        }, PetState_1.TIMINGS.ANIMATION_SPEED_MS);
        this.movementTimer = _setInterval(() => {
            if (this.isHopping) {
                return;
            }
            this.tickMovement();
            this.render();
        }, PetState_1.TIMINGS.MOVEMENT_SPEED_MS);
        this.nightModeTimer = _setInterval(() => {
            this.context.isNightMode = this.checkNightMode();
        }, PetState_1.TIMINGS.NIGHT_CHECK_MS);
    }
    stop() {
        if (this.animationTimer !== null) {
            _clearInterval(this.animationTimer);
        }
        if (this.movementTimer !== null) {
            _clearInterval(this.movementTimer);
        }
        if (this.hopTimer !== null) {
            _clearInterval(this.hopTimer);
        }
        if (this.nightModeTimer !== null) {
            _clearInterval(this.nightModeTimer);
        }
        if (this.temporaryStateTimer !== null) {
            _clearTimeout(this.temporaryStateTimer);
        }
        if (this.cursorDebounceTimer !== null) {
            _clearTimeout(this.cursorDebounceTimer);
        }
        if (this.wanderRestTimer !== null) {
            _clearTimeout(this.wanderRestTimer);
        }
        if (this.barkChainTimer !== null) {
            _clearTimeout(this.barkChainTimer);
        }
        vscode.window.visibleTextEditors.forEach(e => {
            e.setDecorations(this.decorationType, []);
            e.setDecorations(this.wanderDecorationType, []);
        });
    }
    // ── Public controls ───────────────────────────────────────────────────────────
    openPanel() {
        this.petPanel.open(this.animationManager.getPetType(), this.context.isVisible);
    }
    toggle() {
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
    hide() {
        this.context.isVisible = false;
        this.syncStatusBar();
        this.petPanel.pushState(this.animationManager.getPetType(), false);
        vscode.window.visibleTextEditors.forEach(e => {
            e.setDecorations(this.decorationType, []);
            e.setDecorations(this.wanderDecorationType, []);
        });
    }
    show() {
        this.context.isVisible = true;
        this.syncStatusBar();
        this.petPanel.pushState(this.animationManager.getPetType(), true);
        this.lastRenderedPath = '';
        this.render();
    }
    isVisible() {
        return this.context.isVisible;
    }
    setPetType(pet) {
        this.animationManager.setPetType(pet);
        this.syncStatusBar();
        this.petPanel.pushState(pet, this.context.isVisible);
        this.lastRenderedPath = '';
        this.render();
    }
    triggerBark() {
        // Cancel any in-progress bark chain before starting a new one
        if (this.barkChainTimer !== null) {
            _clearTimeout(this.barkChainTimer);
            this.barkChainTimer = null;
        }
        let barksDone = 0;
        const doOneBark = () => {
            if (barksDone >= BARK_COUNT) {
                return;
            }
            barksDone++;
            this.triggerTemporaryState('barking');
            if (barksDone < BARK_COUNT) {
                // Wait for the current bark to finish, then fire the next one
                this.barkChainTimer = _setTimeout(doOneBark, BARK_MS + 80);
            }
            else {
                this.barkChainTimer = null;
            }
        };
        doOneBark();
    }
    // ── Status bar ────────────────────────────────────────────────────────────────
    syncStatusBar() {
        const petLabel = this.animationManager.getPetType() === 'cat' ? 'Cat' : 'Dog';
        this.statusBarItem.text = this.context.isVisible
            ? '$(paw-icon) CodePet'
            : '$(paw-icon) CodePet·';
        this.statusBarItem.tooltip = this.context.isVisible
            ? `CodePet [${petLabel}] — click to open settings`
            : `CodePet [${petLabel}] hidden — click to open settings`;
    }
    // ── External events ───────────────────────────────────────────────────────────
    onTyping() {
        this.context.lastActivityTime = Date.now();
        if (!this.context.typingStartTime) {
            this.context.typingStartTime = Date.now();
        }
        if (this.wanderPhase !== 'none') {
            this.cancelWander();
        }
        this.cancelHop();
        this.hopStartedInIdleSession = false;
        if (this.context.state === 'sleeping') {
            this.setState('running');
        }
    }
    onCursorMove(editor) {
        this.context.lastActivityTime = Date.now();
        if (this.wanderPhase === 'none' && !this.isHopping) {
            this.movementManager.followCursor(editor);
        }
        if (this.cursorDebounceTimer !== null) {
            _clearTimeout(this.cursorDebounceTimer);
        }
        this.cursorDebounceTimer = _setTimeout(() => {
            this.cursorDebounceTimer = null;
            this.lastRenderedPath = '';
            this.render();
        }, 80);
    }
    onErrorsChanged(errorCount, editor) {
        const hadErrors = this.context.errorCount > 0;
        this.context.errorCount = errorCount;
        if (hadErrors && errorCount === 0) {
            this.triggerTemporaryState('barking');
            return;
        }
        if (errorCount > 0) {
            this.movementManager.moveToFirstError(editor);
        }
    }
    onArrowLineChange(editor, fromLine, toLine) {
        this.context.lastActivityTime = Date.now();
        if (this.wanderPhase !== 'none') {
            this.cancelWander();
        }
        const maxLine = editor.document.lineCount - 1;
        const fromLen = editor.document.lineAt(Math.min(fromLine, maxLine)).text.length;
        const toLen = editor.document.lineAt(Math.min(toLine, maxLine)).text.length;
        this.animationManager.setDirection(toLen > fromLen);
    }
    // ── Hop sequence ──────────────────────────────────────────────────────────────
    startHop(safetyCheck, passes = 1, onDone = null) {
        if (this.isHopping) {
            return;
        }
        if (safetyCheck === 'left') {
            const editor = vscode.window.activeTextEditor;
            if (!editor || !this.isSafeToHopLeft(editor)) {
                onDone?.();
                return;
            }
        }
        this.isHopping = true;
        this.hopTick = 0;
        this.hopPass = 0;
        this.hopPassesMax = passes;
        this.hopOffsetPx = 0;
        this.hopDoneCallback = onDone;
        this.animationManager.setDirection(true);
        this.animationManager.setFrameIndex(0);
        this.context.state = 'jumping';
        this.lastRenderedPath = '';
        if (this.hopTimer !== null) {
            _clearInterval(this.hopTimer);
        }
        this.hopTimer = _setInterval(() => {
            if (!this.isHopping) {
                _clearInterval(this.hopTimer);
                this.hopTimer = null;
                return;
            }
            this.tickHop();
            this.render();
        }, HOP_TICK_MS);
    }
    tickHop() {
        const tickInPass = this.hopTick % 6;
        if (tickInPass < 3) {
            this.animationManager.setDirection(true);
            this.animationManager.setFrameIndex(tickInPass);
            this.hopOffsetPx = (tickInPass + 1) * HOP_STEP_PX;
        }
        else {
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
    finishHop() {
        if (this.hopTimer !== null) {
            _clearInterval(this.hopTimer);
            this.hopTimer = null;
        }
        this.isHopping = false;
        this.hopOffsetPx = 0;
        if (this.wanderPhase === 'run_out' || this.wanderPhase === 'run_back') {
            this.animationManager.setDirection(this.wanderPhase === 'run_out');
            this.context.state = 'running';
        }
        else {
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
    cancelHop() {
        if (!this.isHopping) {
            return;
        }
        if (this.hopTimer !== null) {
            _clearInterval(this.hopTimer);
            this.hopTimer = null;
        }
        this.isHopping = false;
        this.hopOffsetPx = 0;
        this.hopDoneCallback = null;
        this.wanderRestPending = false;
        this.animationManager.setDirection(false);
        this.animationManager.resetFrame();
        this.lastRenderedPath = '';
    }
    isSafeToHopLeft(editor) {
        const line = this.movementManager.getCurrentLine();
        const maxLine = editor.document.lineCount - 1;
        const safeLine = Math.min(Math.max(0, line), maxLine);
        const lineText = editor.document.lineAt(safeLine).text;
        const lineLen = lineText.length;
        const hopChars = Math.ceil((3 * HOP_STEP_PX) / CHAR_WIDTH_PX);
        const checkFrom = lineLen - hopChars;
        if (checkFrom < 0) {
            return false;
        }
        return lineText.slice(checkFrom, lineLen).trim().length === 0;
    }
    // ── Master movement tick ──────────────────────────────────────────────────────
    tickMovement() {
        if (this.wanderPhase !== 'none') {
            this.tickWander();
            return;
        }
        this.evaluateState();
        this.updateMovement();
    }
    // ── Wander ────────────────────────────────────────────────────────────────────
    tickWander() {
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
                    }
                    else {
                        this.triggerWanderRest();
                    }
                }
                break;
            }
            case 'rest':
                if (!this.isHopping) {
                    this.setState('idle');
                }
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
    triggerWanderRest() {
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
    startWander() {
        this.wanderSpacesNow = 0;
        this.wanderSpacesMax = 15 + Math.floor(Math.random() * 15);
        this.wanderPhase = 'run_out';
        this.wanderRestPending = false;
        this.hopStartedInIdleSession = false;
    }
    cancelWander() {
        this.wanderPhase = 'none';
        this.wanderSpacesNow = 0;
        this.wanderSpacesMax = 0;
        this.wanderRestPending = false;
        if (this.wanderRestTimer !== null) {
            _clearTimeout(this.wanderRestTimer);
            this.wanderRestTimer = null;
        }
        this.animationManager.setDirection(false);
    }
    // ── Rendering ─────────────────────────────────────────────────────────────────
    render() {
        if (!this.context.isVisible) {
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const currentPath = this.animationManager.getCurrentFramePath(this.context.state);
        const skipGuard = this.wanderPhase !== 'none' || this.isHopping;
        if (!skipGuard && this.lastRenderedPath === currentPath) {
            return;
        }
        const currentUri = this.animationManager.getCurrentFrameUri(this.context.state);
        const range = this.movementManager.getRange(editor);
        const hover = this.getHoverMessage();
        const IMAGE_HEIGHT = 19;
        const lineHeight = editor.options.lineHeight || 20;
        const offsetPx = Math.floor((lineHeight - IMAGE_HEIGHT) / 2) + 2;
        const totalMargin = 4 + (this.wanderSpacesNow * CHAR_WIDTH_PX) + this.hopOffsetPx;
        editor.setDecorations(this.decorationType, []);
        editor.setDecorations(this.wanderDecorationType, [{
                range,
                hoverMessage: hover,
                renderOptions: {
                    after: {
                        contentIconPath: currentUri,
                        width: `${IMAGE_HEIGHT}px`,
                        height: `${IMAGE_HEIGHT}px`,
                        margin: `-${offsetPx + 4}px 0 0 ${totalMargin}px`,
                    }
                }
            }]);
        this.lastRenderedPath = currentPath;
    }
    // ── State helpers ─────────────────────────────────────────────────────────────
    evaluateState() {
        const now = Date.now();
        if (this.temporaryStateTimer !== null) {
            return;
        }
        const timeSinceActivity = now - this.context.lastActivityTime;
        const typingDuration = this.context.typingStartTime
            ? now - this.context.typingStartTime : 0;
        const sessionDuration = now - this.context.codingSessionStart;
        if (sessionDuration >= PetState_1.TIMINGS.TIRED_AFTER_MS) {
            if (timeSinceActivity >= PetState_1.TIMINGS.TIRED_RESET_MS) {
                this.context.codingSessionStart = Date.now();
            }
            this.setState('tired');
            return;
        }
        if (this.context.errorCount >= PetState_1.TIMINGS.SCARED_ERROR_COUNT) {
            this.setState('scared');
            return;
        }
        if (timeSinceActivity >= PetState_1.TIMINGS.PRE_SLEEP_TIRED_MS &&
            timeSinceActivity < PetState_1.TIMINGS.SLEEP_AFTER_MS &&
            this.wanderPhase === 'none' &&
            !this.isHopping) {
            this.context.typingStartTime = null;
            this.setState('tired');
            return;
        }
        if (timeSinceActivity >= PetState_1.TIMINGS.SLEEP_AFTER_MS) {
            this.context.typingStartTime = null;
            if (timeSinceActivity >= PetState_1.TIMINGS.TIRED_RESET_MS) {
                this.context.codingSessionStart = Date.now();
            }
            this.setState('sleeping');
            return;
        }
        if (this.context.errorCount >= PetState_1.TIMINGS.WORRIED_ERROR_COUNT) {
            this.setState('worried');
            return;
        }
        if (timeSinceActivity >= PetState_1.TIMINGS.WANDER_AFTER_MS && this.wanderPhase === 'none') {
            this.startWander();
            return;
        }
        if (timeSinceActivity >= PetState_1.TIMINGS.FIDGET_AFTER_MS &&
            timeSinceActivity < PetState_1.TIMINGS.WANDER_AFTER_MS &&
            this.wanderPhase === 'none' &&
            !this.isHopping &&
            !this.hopStartedInIdleSession) {
            this.hopStartedInIdleSession = true;
            this.startHop('right', 1);
            return;
        }
        if (timeSinceActivity >= PetState_1.TIMINGS.IDLE_AFTER_MS) {
            this.context.typingStartTime = null;
            this.setState('idle');
            return;
        }
        if (this.context.isNightMode) {
            this.setState('night_idle');
            return;
        }
        if (typingDuration >= PetState_1.TIMINGS.HAPPY_TYPING_MS) {
            this.setState('happy_running');
            return;
        }
        this.setState('running');
    }
    updateMovement() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const state = this.context.state;
        if (state === 'tired' || state === 'scared' || state === 'sleeping') {
            return;
        }
        if (state === 'worried') {
            this.movementManager.moveToFirstError(editor);
            return;
        }
        this.movementManager.followCursor(editor);
    }
    setState(newState) {
        if (this.context.state !== newState) {
            this.context.previousState = this.context.state;
            this.context.state = newState;
            if (!this.isHopping) {
                this.animationManager.resetFrame();
            }
            this.lastRenderedPath = '';
        }
    }
    triggerTemporaryState(state) {
        if (this.temporaryStateTimer !== null) {
            _clearTimeout(this.temporaryStateTimer);
            this.temporaryStateTimer = null;
        }
        this.context.previousState = this.context.state;
        this.context.state = state;
        this.animationManager.resetFrame();
        this.lastRenderedPath = '';
        const duration = PetState_1.STATE_DURATIONS[state] ?? 1000;
        this.temporaryStateTimer = _setTimeout(() => {
            this.context.state = this.context.previousState;
            this.temporaryStateTimer = null;
            this.animationManager.resetFrame();
            this.lastRenderedPath = '';
        }, duration);
    }
    getHoverMessage() {
        const petType = this.animationManager.getPetType();
        const icon = petType === 'cat' ? '🐱' : '🐶';
        const messages = {
            idle: `${icon} Just chilling... Press Ctrl+Alt+B to make me bark!`,
            night_idle: '🌙 Late night coding? Please take care of yourself...',
            running: `${icon} Running alongside your code!`,
            happy_running: `${icon}✨ You're on a roll! Keep going!`,
            barking: `${icon} WOOF WOOF!`,
            sleeping: '💤 Zzz... (start typing to wake me up)',
            worried: `😟 There are errors... I'm worried.`,
            scared: '😱 TOO MANY ERRORS! I\'m hiding!',
            tired: '😩 You\'ve been coding for a while. Take a break!',
            jumping: `${icon} *boing!*`,
        };
        return messages[this.context.state];
    }
    checkNightMode() {
        const hour = new Date().getHours();
        return hour >= PetState_1.TIMINGS.NIGHT_START_HOUR && hour < PetState_1.TIMINGS.NIGHT_END_HOUR;
    }
    dispose() {
        this.stop();
        this.decorationType.dispose();
        this.wanderDecorationType.dispose();
        this.statusBarItem.dispose();
        this.petPanel.dispose();
    }
}
exports.Pet = Pet;
//# sourceMappingURL=Pet.js.map