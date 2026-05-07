import * as vscode from 'vscode';

export class MovementManager {
  private currentLine: number = 0;
  private targetLine:  number = 0;

  // Max lines to step per movement tick — keeps the pet smooth but not laggy
  private static readonly MAX_STEP = 3;

  getCurrentLine(): number {
    return this.currentLine;
  }

  getTargetLine(): number {
    return this.targetLine;
  }

  // Returns true if the pet is moving upward (toward lower line numbers)
  isMovingUp(): boolean {
    return this.targetLine < this.currentLine;
  }

  // Returns true if the pet hasn't reached its target yet
  isMoving(): boolean {
    return this.currentLine !== this.targetLine;
  }

  jumpToLine(line: number): void {
    this.currentLine = line;
    this.targetLine  = line;
  }

  followCursor(editor: vscode.TextEditor): void {
    this.targetLine = editor.selection.active.line;
  }

  // Call once per movement tick. Steps currentLine toward targetLine smoothly.
  tickFollow(): void {
    if (this.currentLine === this.targetLine) { return; }
    const diff = this.targetLine - this.currentLine;
    const step = Math.sign(diff) * Math.min(Math.abs(diff), MovementManager.MAX_STEP);
    this.currentLine += step;
  }

  moveToFirstError(editor: vscode.TextEditor): void {
    const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
    const errors = diagnostics.filter(
      d => d.severity === vscode.DiagnosticSeverity.Error
    );
    if (errors.length > 0) {
      this.targetLine = errors[0].range.start.line;
      this.tickFollow();
    }
  }

  clampToVisible(editor: vscode.TextEditor): void {
    const visibleRanges = editor.visibleRanges;
    if (!visibleRanges.length) { return; }
    const topLine    = visibleRanges[0].start.line;
    const bottomLine = visibleRanges[0].end.line;
    this.currentLine = Math.max(topLine, Math.min(this.currentLine, bottomLine));
  }

  // Step one line toward a target. Returns true when arrived.
  stepToward(targetLine: number): boolean {
    if (this.currentLine === targetLine) { return true; }
    this.currentLine += this.currentLine < targetLine ? 1 : -1;
    return this.currentLine === targetLine;
  }

  // Pick a random visible line different from current position
  randomVisibleLine(editor: vscode.TextEditor): number {
    const visibleRanges = editor.visibleRanges;
    if (!visibleRanges.length) { return this.currentLine; }
    const top    = visibleRanges[0].start.line;
    const bottom = visibleRanges[0].end.line;
    const range  = bottom - top;
    if (range <= 1) { return this.currentLine; }
    let target: number;
    do {
      target = top + Math.floor(Math.random() * range);
    } while (target === this.currentLine);
    return target;
  }

  getRange(editor: vscode.TextEditor): vscode.Range {
    const maxLine    = editor.document.lineCount - 1;
    const safeLine   = Math.min(Math.max(0, this.currentLine), maxLine);
    const lineLength = editor.document.lineAt(safeLine).text.length;
    const position   = new vscode.Position(safeLine, lineLength);
    return new vscode.Range(position, position);
  }
}