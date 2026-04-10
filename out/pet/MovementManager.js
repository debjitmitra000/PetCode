"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovementManager = void 0;
const vscode = require("vscode");
class MovementManager {
    constructor() {
        this.currentLine = 0;
    }
    getCurrentLine() {
        return this.currentLine;
    }
    jumpToLine(line) {
        this.currentLine = line;
    }
    followCursor(editor) {
        this.currentLine = editor.selection.active.line;
    }
    moveToFirstError(editor) {
        const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
        const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
        if (errors.length > 0) {
            this.currentLine = errors[0].range.start.line;
        }
    }
    clampToVisible(editor) {
        const visibleRanges = editor.visibleRanges;
        if (!visibleRanges.length) {
            return;
        }
        const topLine = visibleRanges[0].start.line;
        const bottomLine = visibleRanges[0].end.line;
        this.currentLine = Math.max(topLine, Math.min(this.currentLine, bottomLine));
    }
    // Step one line toward a target. Returns true when arrived.
    stepToward(targetLine) {
        if (this.currentLine === targetLine) {
            return true;
        }
        this.currentLine += this.currentLine < targetLine ? 1 : -1;
        return this.currentLine === targetLine;
    }
    // Pick a random visible line different from current position
    randomVisibleLine(editor) {
        const visibleRanges = editor.visibleRanges;
        if (!visibleRanges.length) {
            return this.currentLine;
        }
        const top = visibleRanges[0].start.line;
        const bottom = visibleRanges[0].end.line;
        const range = bottom - top;
        if (range <= 1) {
            return this.currentLine;
        }
        let target;
        do {
            target = top + Math.floor(Math.random() * range);
        } while (target === this.currentLine);
        return target;
    }
    getRange(editor) {
        const maxLine = editor.document.lineCount - 1;
        const safeLine = Math.min(Math.max(0, this.currentLine), maxLine);
        const lineLength = editor.document.lineAt(safeLine).text.length;
        const position = new vscode.Position(safeLine, lineLength);
        return new vscode.Range(position, position);
    }
}
exports.MovementManager = MovementManager;
//# sourceMappingURL=MovementManager.js.map