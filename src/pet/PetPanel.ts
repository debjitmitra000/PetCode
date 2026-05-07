import * as vscode from 'vscode';
import { PetType } from './AnimationManager';

export class PetPanel {
  private currentPet:     PetType = 'dog';
  private currentVisible: boolean = true;

  onToggle:    (() => void)             | null = null;
  onSwitchPet: ((pet: PetType) => void) | null = null;
  onRename:    (() => void)             | null = null;

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
    let petIcon: string;
    if (this.currentPet === 'cat') {
      petIcon = '$(cat-icon)';
    } else if (this.currentPet === 'cow') {
      petIcon = '$(cow-icon)';
    } else if (this.currentPet === 'monkey') {
      petIcon = '$(monkey-icon)';
    } else {
      petIcon = '$(dog-icon)';
    }

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
        label:       '$(edit)  Name your pet',
        description: 'Give your companion a name',
        action:      'rename',
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
      case 'rename': this.onRename?.();          break;
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
      {
        label:       '$(cow-icon)  Cow',
        description: this.currentPet === 'cow' ? '$(check) Active' : '',
        petId:       'cow',
      },
      {
        label:       '$(monkey-icon)  Monkey',
        description: this.currentPet === 'monkey' ? '$(check) Active' : '',
        petId:       'monkey',
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