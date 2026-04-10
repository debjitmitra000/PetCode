"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const Pet_1 = require("./pet/Pet");
let pet = null;
function activate(context) {
    vscode.window.showInformationMessage('🐾 CodePet is alive!');
    pet = new Pet_1.Pet(context);
    pet.start();
    // ── Commands ──────────────────────────────────────────────────
    const barkCmd = vscode.commands.registerCommand('codepet.bark', () => {
        pet?.triggerBark();
        vscode.window.setStatusBarMessage('🐾 WOOF!', 2000);
    });
    const toggleCmd = vscode.commands.registerCommand('codepet.toggle', () => {
        pet?.toggle();
    });
    // Opens the QuickPick settings menu
    const openPanelCmd = vscode.commands.registerCommand('codepet.openPanel', () => {
        pet?.openPanel();
    });
    // ── Debug session — auto-hide while debugging ─────────────────
    let wasHiddenBeforeDebug = false;
    const onDebugStart = vscode.debug.onDidStartDebugSession(() => {
        wasHiddenBeforeDebug = !(pet?.isVisible() ?? true);
        pet?.hide();
    });
    const onDebugStop = vscode.debug.onDidTerminateDebugSession(() => {
        if (!wasHiddenBeforeDebug) {
            pet?.show();
        }
    });
    // ── Event Listeners ───────────────────────────────────────────
    const onTyping = vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || event.document !== editor.document) {
            return;
        }
        pet?.onTyping();
    });
    let lastKnownLine = 0;
    const onCursor = vscode.window.onDidChangeTextEditorSelection(event => {
        const editor = event.textEditor;
        const targetLine = editor.selection.active.line;
        if (event.kind === vscode.TextEditorSelectionChangeKind.Keyboard &&
            targetLine !== lastKnownLine) {
            pet?.onArrowLineChange(editor, lastKnownLine, targetLine);
        }
        lastKnownLine = targetLine;
        pet?.onCursorMove(editor);
    });
    const onDiagnostics = vscode.languages.onDidChangeDiagnostics(event => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const isActiveFile = event.uris.some(uri => uri.toString() === editor.document.uri.toString());
        if (!isActiveFile) {
            return;
        }
        const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
        const errorCount = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
        pet?.onErrorsChanged(errorCount, editor);
    });
    context.subscriptions.push(barkCmd, toggleCmd, openPanelCmd, onTyping, onCursor, onDiagnostics, onDebugStart, onDebugStop, { dispose: () => pet?.dispose() });
}
exports.activate = activate;
function deactivate() {
    pet?.dispose();
    pet = null;
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map