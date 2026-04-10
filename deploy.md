# CodePet — VS Code Extension Publishing Guide

Everything you need to go from your current local project to a live, public marketplace listing.

---

## Table of Contents

1. [Where you are right now](#1-where-you-are-right-now)
2. [Files to add before publishing](#2-files-to-add-before-publishing)
3. [Update package.json](#3-update-packagejson)
4. [Create a GitHub repository](#4-create-a-github-repository)
5. [Record a demo GIF](#5-record-a-demo-gif)
6. [Create a Microsoft account](#6-create-a-microsoft-account)
7. [Create your publisher account](#7-create-your-publisher-account)
8. [Generate a Personal Access Token](#8-generate-a-personal-access-token)
9. [Install vsce](#9-install-vsce)
10. [Compile and package](#10-compile-and-package)
11. [Test locally before publishing](#11-test-locally-before-publishing)
12. [Publish to the marketplace](#12-publish-to-the-marketplace)
13. [What your marketplace page will look like](#13-what-your-marketplace-page-will-look-like)
14. [Updating the extension later](#14-updating-the-extension-later)
15. [Bonus: Open VSX](#15-bonus-open-vsx)

---

## 1. Where You Are Right Now

Your project is complete and working. Here is what you already have:

```
codepet/
├── media/
│   ├── cat/          ← all cat SVG frames ✓
│   ├── dog/          ← all dog SVG frames ✓
│   └── codepet-icons.woff ✓
├── src/
│   ├── pet/
│   │   ├── AnimationManager.ts ✓
│   │   ├── MovementManager.ts  ✓
│   │   ├── Pet.ts              ✓
│   │   ├── PetPanel.ts         ✓
│   │   └── PetState.ts         ✓
│   ├── utils/
│   │   └── helpers.ts          ✓
│   └── extension.ts            ✓
├── .vscodeignore     ✓
├── icon.png          ✓
├── package.json      ✓  (use the updated version from this guide)
├── tsconfig.json     ✓
├── README.md         ← add the new one
├── CHANGELOG.md      ← add the new one
└── LICENSE           ← add the new one
```

The three files you were missing — `README.md`, `CHANGELOG.md`, and `LICENSE` — have been provided separately. Drop them into your project root before continuing.

---

## 2. Files to Add Before Publishing

### README.md
This becomes your entire marketplace page. Use the provided `README.md`.

One important thing: the README references a demo GIF:
```
![CodePet demo](https://raw.githubusercontent.com/YOUR_USERNAME/codepet/main/media/demo.gif)
```
You need to record this and add it to `media/` before pushing to GitHub. See section 5 for how to do that. If you want to publish without a GIF first, just delete that line from the README temporarily.

### CHANGELOG.md
Use the provided `CHANGELOG.md`. The marketplace shows this in a dedicated Changelog tab.

### LICENSE
Use the provided `LICENSE` file. Open it and replace `YOUR_NAME` with your actual name.

### icon.png
You already have `icon.png` in your root. Make sure it is exactly **128×128 pixels** and in PNG format. If it is a different size, resize it using any image editor or a free tool like [squoosh.app](https://squoosh.app).

---

## 3. Update package.json

Use the updated `package.json` provided separately. Before publishing, open it and replace two placeholders:

```json
"publisher": "YOUR_PUBLISHER_ID"
```
Replace with the publisher ID you create in section 7.

```json
"repository": {
  "type": "git",
  "url": "https://github.com/YOUR_USERNAME/codepet"
},
"homepage": "https://github.com/YOUR_USERNAME/codepet#readme",
"bugs": {
  "url": "https://github.com/YOUR_USERNAME/codepet/issues"
}
```
Replace `YOUR_USERNAME` with your GitHub username after you create the repo in section 4.

---

## 4. Create a GitHub Repository

The marketplace requires a public repository link. This is also where your README images will be hosted.

1. Go to [github.com](https://github.com) and sign in (or create a free account)
2. Click **+** → **New repository**
3. Set repository name to `codepet`
4. Set visibility to **Public**
5. Do **not** check "Add a README" — you already have one
6. Click **Create repository**

GitHub will show you the commands. In your project folder, open a terminal and run:

```bash
git init
git add .
git commit -m "Initial release"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/codepet.git
git push -u origin main
```

Once pushed, update the `repository`, `homepage`, and `bugs` fields in `package.json` with your real GitHub username, then commit again:

```bash
git add package.json
git commit -m "Add repository links"
git push
```

---

## 5. Record a Demo GIF

A GIF at the top of the README is the single highest-impact thing for getting installs. People decide in seconds — a GIF shows them exactly what they are getting.

### What to show in the recording (about 20–30 seconds)
1. Open a TypeScript or JavaScript file — show the pet appearing and running
2. Stop typing for a few seconds — show it go idle, then hop, then wander
3. Add a few deliberate errors — show it look worried then scared
4. Delete the errors — show it bark to celebrate
5. Press `Ctrl+Alt+B` — show the bark chain

### Recording tools (all free)

**Windows — ScreenToGif** (recommended)
1. Download from [screentogif.com](https://www.screentogif.com)
2. Open VS Code with CodePet running
3. In ScreenToGif: Recorder → select region over your VS Code window
4. Record your sequence, then Editor → save as GIF
5. Aim for under 5 MB — use ezgif.com to compress if needed

**Windows — ShareX**
1. Download from [getsharex.com](https://getsharex.com)
2. Capture → Animated GIF

**Mac — Gifox or Kap** (both have free tiers)

### Save and link the GIF
1. Save as `media/demo.gif`
2. Push to GitHub: `git add media/demo.gif && git commit -m "Add demo GIF" && git push`
3. The README already references it at the correct raw URL — no change needed

---

## 6. Create a Microsoft Account

You need a Microsoft account to access the VS Code Marketplace and Azure DevOps. If you already have an Outlook, Hotmail, Xbox, or any Microsoft account, skip to section 7.

1. Go to [account.microsoft.com](https://account.microsoft.com)
2. Click **Create a Microsoft account**
3. Enter an existing email (Gmail works fine) or create a new Outlook address
4. Set a password, fill in your name and date of birth
5. Verify with the code sent to your email
6. Done — use this account for all steps below

---

## 7. Create Your Publisher Account

A publisher is your identity on the marketplace. Every extension you publish lives under this name.

1. Go to [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage)
2. Sign in with your Microsoft account
3. Click **Create publisher**
4. Fill in the form:

| Field | What to enter |
|---|---|
| **Publisher ID** | e.g. `yourname` or `yourname-dev` — lowercase, hyphens only, **permanent and cannot be changed** |
| **Display name** | Your name or handle — shown on the page, can be changed later |
| **Description** | Optional one-liner about yourself |
| **Website** | Your GitHub profile or personal site (optional) |

5. Click **Create**

Your extension's full marketplace ID will be `your-publisher-id.codepet`, and it will be live at:
```
https://marketplace.visualstudio.com/items?itemName=your-publisher-id.codepet
```

Choose the publisher ID thoughtfully — it is permanent.

---

## 8. Generate a Personal Access Token

This is a secure token that lets `vsce` publish on your behalf.

### Step 1 — Set up Azure DevOps (one time only)

1. Go to [dev.azure.com](https://dev.azure.com)
2. Sign in with the **same Microsoft account** from section 6
3. If prompted, create an organization — give it any name, pick the closest region, click Continue
4. You may be asked to create a project — create one called anything (e.g. `extensions`). You will not use it, it just needs to exist.

### Step 2 — Create the token

1. Click your **profile picture** in the top right
2. Click **Personal access tokens**
3. Click **+ New Token**
4. Fill in the form:

| Field | Value |
|---|---|
| **Name** | `vsce-publish` |
| **Organization** | **All accessible organizations** |
| **Expiration** | 1 year |
| **Scopes** | Click **Custom defined**, scroll to **Marketplace**, check **Manage** |

5. Click **Create**
6. **Copy the token immediately** — it will never be shown again. Paste it into a Notepad or password manager.

If the token expires later, just delete it and create a new one, then run `vsce login` again.

---

## 9. Install vsce

`vsce` is the official CLI tool for packaging and publishing VS Code extensions.

```bash
npm install -g @vscode/vsce
```

Verify it installed:

```bash
vsce --version
```

---

## 10. Compile and Package

Always compile first to make sure `out/` is up to date:

```bash
npm run compile
```

Then package into a `.vsix` installer file:

```bash
vsce package
```

This creates `codepet-0.1.0.vsix` in your project root.

### If you get warnings

| Warning | Fix |
|---|---|
| Missing `publisher` | Add your publisher ID to `package.json` |
| Missing `icon` | Make sure `icon.png` is 128×128 and in the root |
| Missing repository | Add the `repository` field to `package.json` |
| README too short | The marketplace requires a non-trivial README — use the provided one |

To temporarily bypass the repository warning while testing:
```bash
vsce package --allow-missing-repository
```

---

## 11. Test Locally Before Publishing

Always install and test your `.vsix` before pushing to the marketplace.

```bash
code --install-extension codepet-0.1.0.vsix
```

Then:
- Reload VS Code (`Ctrl+Shift+P` → **Reload Window**)
- Open any `.ts` or `.js` file
- Confirm the pet appears at the end of your cursor line
- Type for a few seconds, stop, wait — check the state transitions
- Add TypeScript errors, watch it react
- Press `Ctrl+Alt+B` — confirm the bark chain fires 4 times
- Click the status bar item — confirm the settings menu opens
- Switch between dog and cat — confirm the pet changes
- Toggle visibility — confirm it hides and shows

To uninstall the test version afterwards:
```bash
code --uninstall-extension your-publisher-id.codepet
```

---

## 12. Publish to the Marketplace

### Log in

```bash
vsce login your-publisher-id
```

Paste your PAT from section 8 when prompted.

### Publish

```bash
vsce publish
```

The marketplace usually processes it within 5–10 minutes. Your page will be live at:
```
https://marketplace.visualstudio.com/items?itemName=your-publisher-id.codepet
```

### Alternative — publish with PAT inline (useful for scripts)

```bash
vsce publish -p YOUR_PAT_HERE
```

---

## 13. What Your Marketplace Page Will Look Like

| Element | Source |
|---|---|
| Extension name + icon | `displayName` + `icon` in package.json |
| Dark navy header banner | `galleryBanner` in package.json |
| Short description | `description` in package.json |
| Full page content | README.md (rendered as HTML) |
| Version, license, publisher | package.json fields |
| GitHub + issues links | `repository` + `bugs` in package.json |
| Categories and search tags | `categories` + `keywords` in package.json |
| Changelog tab | CHANGELOG.md |
| Q&A tab | Enabled by `"qna": "marketplace"` in package.json |
| Install count + rating | Populated automatically after publishing |

---

## 14. Updating the Extension Later

### Make your changes, then bump the version in package.json:

```json
"version": "0.1.1"
```

Follow semantic versioning:
- `0.1.0 → 0.1.1` — bug fix
- `0.1.0 → 0.2.0` — new feature
- `0.1.0 → 1.0.0` — major release

### Update CHANGELOG.md

Add a new entry at the top:

```markdown
## [0.1.1] - 2026-04-15

### Fixed
- Pet no longer disappears when switching tabs
```

### Publish the update

```bash
npm run compile
vsce publish
```

Or bump the version and publish in one command:

```bash
vsce publish patch    # 0.1.0 → 0.1.1
vsce publish minor    # 0.1.0 → 0.2.0
vsce publish major    # 0.1.0 → 1.0.0
```

### Push the update to GitHub too

```bash
git add .
git commit -m "Release 0.1.1 — fix tab switching"
git push
```

---

## 15. Bonus: Open VSX

Open VSX is an alternative marketplace used by VS Codium, Gitpod, and other VS Code-compatible editors. It takes about 2 minutes and is completely free.

1. Create an account at [open-vsx.org](https://open-vsx.org)
2. Generate a token in your account settings
3. Publish using the `.vsix` you already built:

```bash
npx ovsx publish codepet-0.1.0.vsix -p YOUR_OPEN_VSX_TOKEN
```

---

## Quick Reference — Commands in Order

```bash
# One-time setup
npm install -g @vscode/vsce
vsce login your-publisher-id

# Every release
npm run compile
vsce package
code --install-extension codepet-0.1.0.vsix   # test it
vsce publish
git add . && git commit -m "Release x.x.x" && git push
```

---

*Good luck with the launch! 🐾*