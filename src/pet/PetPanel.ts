import * as vscode from 'vscode';
import { PetType } from './AnimationManager';

export class PetPanel {
  private currentPet:     PetType = 'dog';
  private currentVisible: boolean = true;

  onToggle:    (() => void)             | null = null;
  onSwitchPet: ((pet: PetType) => void) | null = null;

  constructor(_extensionPath: string) {}

  open(currentPet: PetType, currentVisible: boolean): void {
    this.currentPet     = currentPet;
    this.currentVisible = currentVisible;
    this.showMenu();
  }

  pushState(pet: PetType, visible: boolean): void {
    this.currentPet     = pet;
    this.currentVisible = visible;
  }

  dispose(): void {}

  // ── Main menu ─────────────────────────────────────────────────────────────────

  private async showMenu(): Promise<void> {
    // $(dog-icon) / $(cat-icon) = your contributed woff icons (U+E001 / U+E002)
    // $(paw-icon) = U+E000, used for the menu title and status bar
    const petIcon = this.currentPet === 'cat' ? '$(cat-icon)' : '$(dog-icon)';

    type Item = vscode.QuickPickItem & { action: string };

    const items: Item[] = [
      {
        label:       this.currentVisible
          ? '$(eye-closed)  Hide pet'
          : '$(eye)  Show pet',
        description: this.currentVisible
          ? 'Currently visible in editor'
          : 'Currently hidden',
        action: 'toggle',
      },
      {
        label:       `${petIcon}  Switch pet`,
        description: `Currently: ${this.capitalize(this.currentPet)}`,
        action:      'switch',
      },
      {
        label:       '$(megaphone)  Bark!',
        description: 'Ctrl+Alt+B',
        action:      'bark',
      },
    ];

    const pick = await vscode.window.showQuickPick(items, {
      title:              '$(paw-icon) PetCode',
      placeHolder:        'What would you like to do?',
      matchOnDescription: true,
    });

    if (!pick) { return; }

    switch (pick.action) {
      case 'toggle': this.onToggle?.();          break;
      case 'switch': await this.showPetPicker(); break;
      case 'bark':   vscode.commands.executeCommand('PetCode.bark'); break;
    }
  }

  // ── Pet picker submenu ────────────────────────────────────────────────────────

  private async showPetPicker(): Promise<void> {
    type PetItem = vscode.QuickPickItem & { petId: PetType };

    const pets: PetItem[] = [
      {
        label:       '$(dog-icon)  Dog',
        description: this.currentPet === 'dog' ? '$(check) Active' : '',
        petId:       'dog',
      },
      {
        label:       '$(cat-icon)  Cat',
        description: this.currentPet === 'cat' ? '$(check) Active' : '',
        petId:       'cat',
      },
    ];

    const pick = await vscode.window.showQuickPick(pets, {
      title:       '$(paw-icon) PetCode — Choose your companion',
      placeHolder: 'Select a companion',
    });

    if (pick && pick.petId !== this.currentPet) {
      this.currentPet = pick.petId;
      this.onSwitchPet?.(pick.petId);
    }
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}