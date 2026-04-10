"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PetPanel = void 0;
const vscode = require("vscode");
class PetPanel {
    constructor(_extensionPath) {
        this.currentPet = 'dog';
        this.currentVisible = true;
        this.onToggle = null;
        this.onSwitchPet = null;
    }
    open(currentPet, currentVisible) {
        this.currentPet = currentPet;
        this.currentVisible = currentVisible;
        this.showMenu();
    }
    pushState(pet, visible) {
        this.currentPet = pet;
        this.currentVisible = visible;
    }
    dispose() { }
    // ── Main menu ─────────────────────────────────────────────────────────────────
    async showMenu() {
        // $(dog-icon) / $(cat-icon) = your contributed woff icons (U+E001 / U+E002)
        // $(paw-icon) = U+E000, used for the menu title and status bar
        const petIcon = this.currentPet === 'cat' ? '$(cat-icon)' : '$(dog-icon)';
        const items = [
            {
                label: this.currentVisible
                    ? '$(eye-closed)  Hide pet'
                    : '$(eye)  Show pet',
                description: this.currentVisible
                    ? 'Currently visible in editor'
                    : 'Currently hidden',
                action: 'toggle',
            },
            {
                label: `${petIcon}  Switch pet`,
                description: `Currently: ${this.capitalize(this.currentPet)}`,
                action: 'switch',
            },
            {
                label: '$(megaphone)  Bark!',
                description: 'Ctrl+Alt+B',
                action: 'bark',
            },
        ];
        const pick = await vscode.window.showQuickPick(items, {
            title: '$(paw-icon) CodePet',
            placeHolder: 'What would you like to do?',
            matchOnDescription: true,
        });
        if (!pick) {
            return;
        }
        switch (pick.action) {
            case 'toggle':
                this.onToggle?.();
                break;
            case 'switch':
                await this.showPetPicker();
                break;
            case 'bark':
                vscode.commands.executeCommand('codepet.bark');
                break;
        }
    }
    // ── Pet picker submenu ────────────────────────────────────────────────────────
    async showPetPicker() {
        const pets = [
            {
                label: '$(dog-icon)  Dog',
                description: this.currentPet === 'dog' ? '$(check) Active' : '',
                petId: 'dog',
            },
            {
                label: '$(cat-icon)  Cat',
                description: this.currentPet === 'cat' ? '$(check) Active' : '',
                petId: 'cat',
            },
        ];
        const pick = await vscode.window.showQuickPick(pets, {
            title: '$(paw-icon) CodePet — Choose your companion',
            placeHolder: 'Select a companion',
        });
        if (pick && pick.petId !== this.currentPet) {
            this.currentPet = pick.petId;
            this.onSwitchPet?.(pick.petId);
        }
    }
    capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
}
exports.PetPanel = PetPanel;
//# sourceMappingURL=PetPanel.js.map