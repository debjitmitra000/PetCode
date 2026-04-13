import * as vscode from 'vscode';
import * as path from 'path';
import { PetState } from './PetState';

export type PetType = 'dog' | 'cat' | 'cow';

// Normal frames (facing left — default direction)
const SVG_FRAMES: Record<PetState, string[]> = {
  idle:          ['idle_1.svg',       'idle_2.svg'],
  night_idle:    ['night_idle_1.svg', 'night_idle_2.svg'],
  running:       ['run_1.svg',        'run_2.svg',        'run_3.svg'],
  happy_running: ['happy_run_1.svg',  'happy_run_2.svg'],
  barking:       ['bark_1.svg',       'bark_2.svg'],
  sleeping:      ['sleep_1.svg',      'sleep_2.svg'],
  worried:       ['worried.svg'],
  scared:        ['scared_1.svg',     'scared_2.svg'],
  tired:         ['tired.svg'],
  jumping:       ['jump_1.svg',       'jump_2.svg',       'jump_3.svg'],
};

// Rotated frames (facing right)
const SVG_FRAMES_ROTATED: Partial<Record<PetState, string[]>> = {
  running:       ['run_1_rotated.svg',       'run_2_rotated.svg',       'run_3_rotated.svg'],
  happy_running: ['happy_run_1_rotated.svg', 'happy_run_2_rotated.svg'],
  jumping:       ['jump_1_rotated.svg',      'jump_2_rotated.svg',      'jump_3_rotated.svg'],
};

export class AnimationManager {
  private frameIndex:    number   = 0;
  private useRotated:    boolean  = false;
  private extensionPath: string;
  private petType:       PetType;

  constructor(extensionPath: string, petType: PetType = 'dog') {
    this.extensionPath = extensionPath;
    this.petType       = petType;
  }

  setPetType(petType: PetType): void {
    this.petType    = petType;
    this.frameIndex = 0;
  }

  getPetType(): PetType {
    return this.petType;
  }

  setDirection(facingRight: boolean): void {
    if (this.useRotated !== facingRight) {
      this.useRotated = facingRight;
      this.frameIndex = 0;
    }
  }

  setFrameIndex(index: number): void {
    this.frameIndex = index;
  }

  isRotated(): boolean {
    return this.useRotated;
  }

  getCurrentFrameUri(state: PetState): vscode.Uri {
    const frames   = this.getFrames(state);
    const filename = frames[this.frameIndex % frames.length];
    const fullPath = path.join(this.extensionPath, 'media', this.petType, filename);
    return vscode.Uri.file(fullPath);
  }

  getCurrentFramePath(state: PetState): string {
    const frames = this.getFrames(state);
    // Include petType so a pet-switch always forces a re-render
    return `${this.petType}/${frames[this.frameIndex % frames.length]}`;
  }

  nextFrame(state: PetState): void {
    const frames    = this.getFrames(state);
    this.frameIndex = (this.frameIndex + 1) % frames.length;
  }

  resetFrame(): void {
    this.frameIndex = 0;
  }

  private getFrames(state: PetState): string[] {
    if (this.useRotated && SVG_FRAMES_ROTATED[state]) {
      return SVG_FRAMES_ROTATED[state]!;
    }
    return SVG_FRAMES[state];
  }
}