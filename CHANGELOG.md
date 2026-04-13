# Changelog

All notable changes to PetCode will be documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.4] - 2026-04-14

### Added

- 🐄 **Cow companion** — a fully animated cow with all 28 state frames (idle, run, happy run, bark, sleep, jump, scared, worried, tired, night idle, and all rotated variants)
- `cow-icon` contributed to the VS Code icon font at `U+E003` in `petcode-icons.woff`
- Cow-aware hover message: shows 🐄 emoji and "MOO MOO!" in the barking state
- Cow option in the pet picker submenu with `$(cow-icon)` label
- Status bar tooltip correctly shows "Cow" when the cow is selected
- Added `cow` to marketplace keywords

---

## [0.1.0] - 2026-04-10

### Added

- Animated dog and cat companions living inside the VS Code editor as text decorations
- 10 pet states: idle, running, happy running, sleeping, worried, scared, tired, barking, jumping, night idle
- Pet follows the active cursor line in real time
- Happy running state triggers after 4+ seconds of continuous typing
- Worried state when 2+ errors are present; scared state at 5+ errors
- Bark animation triggered on error clearance or via `Ctrl+Alt+B` / `Cmd+Alt+B`
- Multi-bark chain (4 barks) when triggered
- Idle → fidget hop (8 s) → wander (12 s) → tired (22 s) → sleep (25 s) progression
- Wander behaviour: pet runs out along the line, rests with a double hop, then runs back
- Jump / hop animations during fidget and wander phases
- Night idle mode between 4–6 AM
- Session fatigue: tired state after 2 hours of continuous coding
- Auto-hide during active debug sessions; restores on session end
- Toggle visibility command (`codepet.toggle`)
- Status bar item showing current pet and visibility state
- Quick-pick settings menu (open via status bar click or `codepet.openPanel`)
- Switch between dog and cat from the settings menu
- Custom icon font (`codepet-icons.woff`) for paw, dog, and cat icons in the UI
- Direction-aware animations: rotated frames when the pet faces right