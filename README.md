# PetCode 🐾

> A virtual pet that lives inside your VS Code editor — reacts to your typing, errors, idle time, and even the hour of night.

![PetCode demo](https://github.com/debjitmitra000/PetCode/raw/main/media/demo.gif)

---

## What is PetCode?

PetCode is a tiny animated companion that sits at the end of your cursor line and reacts to everything you do in real time. Type a lot and it runs happily alongside you. Leave it alone and it wanders around, fidgets, and eventually falls asleep. Rack up errors and it gets worried — then scared. Fix them all and it celebrates with a bark (or a moo 🐄).

It lives entirely inside the editor as a text decoration — no panels, no sidebars, no popups.

---

## Features

- 🐕🐈🐄🐒🐇🐏 **Dog, cat, cow, monkey, rabbit, or sheep** — switch your companion any time from the settings menu
- 💾 **Remembers your pet** — your chosen pet and name persist across VS Code restarts
- 🏃 **Follows your cursor** — moves smoothly line by line as you navigate
- ✨ **Happy running** — gets excited when you type for 4+ seconds straight
- 😱 **Scared of errors** — reacts as your error count climbs
- 🎉 **Barks when errors clear** — celebrates when you fix all the bugs
- 💤 **Falls asleep** — naps after ~25 seconds of inactivity
- 🌙 **Night mode** — switches to a calm idle between 4–6 AM
- 🐾 **Wanders & hops** — starts exploring your file when bored
- 🏷️ **Name your pet** — give your companion a custom name
- 📊 **Live status bar** — shows your pet's current state emoji in real time
- 🔇 **Toggle on/off** — hide when you need to focus
- 🔕 **Auto-hides during debug sessions** — stays out of the way when you're debugging

---

## Companions

| Pet | Emoji | Personality |
|---|---|---|
| **Dog** | 🐕 | Loyal and eager — cheers you on and barks with enthusiasm |
| **Cat** | 🐈 | Aloof and judgmental — tolerates your presence, barely |
| **Cow** | 🐄 | Gentle and wholesome — moos its way through your codebase |
| **Monkey** | 🐒 | Chaotic and excitable — swings through your code with energy |
| **Rabbit** | 🐇 | Bouncy and skittish — hops along and squeaks when startled |
| **Sheep** | 🐑 | Calm and woolly — grazes through your code, baaas when surprised |

---

## Commands

| Command | Keybinding | Description |
|---|---|---|
| `PetCode: Make your pet bark` | `Ctrl+Alt+B` / `Cmd+Alt+B` | Triggers a bark animation |
| `PetCode: Toggle pet visibility` | — | Show or hide the pet |
| `PetCode: Open settings` | Click the status bar item | Opens the settings menu |

---

## Pet States

| State | What triggers it |
|---|---|
| **Running** | Actively typing |
| **Happy running** | Typing for 4+ seconds straight |
| **Idle** | 6 seconds of no activity |
| **Fidgeting** | 8 seconds idle — does a little hop |
| **Wandering** | 12 seconds idle — walks along the line |
| **Tired** | 22 seconds idle — droops before sleeping |
| **Sleeping** | 25 seconds idle — fully asleep |
| **Worried** | 2+ errors in the active file |
| **Scared** | 5+ errors in the active file |
| **Barking** | Errors cleared, or `Ctrl+Alt+B` |
| **Night idle** | Between 4–6 AM |
| **Jumping** | Hops during wander / fidget animations |

---

## Settings Menu

Click the **🐾 PetCode** item in your status bar to open the quick-pick menu. From there you can:

- Show or hide the pet
- Switch between dog, cat, cow, monkey, rabbit, and sheep
- Name your pet
- Trigger a bark

---

## Installation

Search for **PetCode** in the Extensions panel (`Ctrl+Shift+X`) and click Install, or install from the [marketplace page](https://marketplace.visualstudio.com/items?itemName=debjitmitra000.petcode-debjitmitra000&ssr=false#overview).

---

## Requirements

- VS Code 1.80.0 or later
- No other dependencies

---

## License

MIT — see [LICENSE](LICENSE)