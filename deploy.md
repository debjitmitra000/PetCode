# CodePet — Step-by-Step Publishing Guide

Follow every section in order. Do not skip ahead.

---

## Before You Start — Checklist

Make sure all of these files exist in your project root right now:

- `README.md` ✓ (provided)
- `CHANGELOG.md` ✓ (provided)
- `LICENSE` ✓ (provided — open it and replace `YOUR_NAME` with your real name)
- `icon.png` ✓ (already in your root — verify it is exactly 128×128 px)
- `package.json` ✓ (use the updated version provided)

Open `LICENSE` now and replace `YOUR_NAME` before continuing.

---

## Step 1 — Create a GitHub Account (skip if you have one)

1. Go to [github.com](https://github.com)
2. Click **Sign up**
3. Enter your email, create a password, choose a username
4. Verify your email address
5. You now have a GitHub account

---

## Step 2 — Install Git on Your Computer (skip if already installed)

Check if Git is already installed — open a terminal and run:

```bash
git --version
```

If you see a version number, skip to Step 3.

If not:

**Windows:**
1. Go to [git-scm.com/download/win](https://git-scm.com/download/win)
2. Download and run the installer
3. Click Next through all steps — defaults are fine
4. Open a new terminal and run `git --version` to confirm

**Mac:**
1. Run `git --version` in terminal — macOS will prompt you to install Xcode Command Line Tools automatically
2. Click Install and wait for it to finish

---

## Step 3 — Push Your Project to GitHub

### 3A — Create a new repository on GitHub

1. Go to [github.com](https://github.com) and sign in
2. Click the **+** icon in the top right → **New repository**
3. Set the repository name to `codepet`
4. Set visibility to **Public** (required for the marketplace to link to it)
5. Leave everything else unchecked — do NOT add a README, .gitignore, or license here
6. Click **Create repository**

You will see a page with setup instructions. Keep this tab open.

### 3B — Configure Git with your identity (first time only)

Open a terminal in your CodePet project folder and run:

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

Use the same email as your GitHub account.

### 3C — Push your code

In your terminal, still inside the CodePet project folder, run these commands one by one:

```bash
git init
git add .
git commit -m "Initial release v0.1.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/codepet.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

When prompted, enter your GitHub username and password. If GitHub rejects your password, you need a Personal Access Token instead — see the note below.

> **Note — GitHub no longer accepts passwords for pushes.** If it asks for a password and rejects it, go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token. Give it `repo` scope, copy the token, and use it as your password when pushing.

### 3D — Verify the push worked

Go to `https://github.com/YOUR_USERNAME/codepet` in your browser. You should see all your files listed there.

### 3E — Update package.json with your GitHub links

Now that your repo exists, open `package.json` and update these three fields:

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

Save the file, then push the update:

```bash
git add package.json
git commit -m "Add repository links"
git push
```

---

## Step 4 — Record a Demo GIF

A GIF at the top of your README is the most important thing for getting installs. People decide in seconds — a GIF shows them exactly what they are getting. Do this before publishing.

### 4A — Download a recording tool

**Windows — ScreenToGif (free)**
1. Go to [screentogif.com](https://www.screentogif.com)
2. Click Download → download the portable `.exe` (no install needed)
3. Run it

**Mac — Kap (free)**
1. Go to [getkap.co](https://getkap.co)
2. Download and open Kap

### 4B — What to record

Open VS Code with a TypeScript or JavaScript file. Then record this sequence:

1. Start typing — show the pet running alongside the cursor
2. Keep typing for 5 seconds — show it switch to happy running
3. Stop typing and wait 8–10 seconds — show it go idle, then do the fidget hop
4. Wait a few more seconds — show it start wandering along the line
5. Add a few TypeScript errors (e.g. write `const x: string = 123`) — show it go worried
6. Press `Ctrl+Alt+B` — show the bark chain

Aim for 20–30 seconds total. Shorter is better.

### 4C — Export and optimize

1. Export as GIF
2. If the file is over 3 MB, go to [ezgif.com/optimize](https://ezgif.com/optimize), upload it, and compress it — this keeps your marketplace page loading fast
3. Save the file as `demo.gif` inside your `media/` folder

### 4D — Push the GIF to GitHub

```bash
git add media/demo.gif
git commit -m "Add demo GIF"
git push
```

### 4E — Fix the GIF URL in README.md

Open `README.md` and replace `YOUR_USERNAME` in this line with your actual GitHub username:

```
![CodePet demo](https://raw.githubusercontent.com/YOUR_USERNAME/codepet/main/media/demo.gif)
```

Then push:

```bash
git add README.md
git commit -m "Fix demo GIF URL in README"
git push
```

---

## Step 5 — Create a Microsoft Account (skip if you have one)

You need a Microsoft account to access the VS Code Marketplace. Outlook, Hotmail, Xbox, and Microsoft 365 accounts all count — if you have any of these, skip to Step 6.

1. Go to [account.microsoft.com](https://account.microsoft.com)
2. Click **Create a Microsoft account**
3. Choose **Use your email instead** if you want to use Gmail or another existing email, or click **Get a new email address** for a free Outlook address
4. Enter your email and create a password
5. Fill in your name and date of birth
6. Enter the verification code sent to your email
7. Complete the short CAPTCHA

You now have a Microsoft account. Use this for all remaining steps.

---

## Step 6 — Create Your Publisher Account on the Marketplace

A publisher account is your identity on the VS Code Marketplace — like a username. All your extensions will be listed under it.

1. Go to [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage)
2. Click **Sign in** in the top right — use your Microsoft account from Step 5
3. If asked to grant permissions, click **Accept**
4. Click **Create publisher**
5. Fill in the form:

| Field | What to enter |
|---|---|
| **Publisher ID** | Something short and lowercase, e.g. `yourname` or `yourname-dev`. Use only letters, numbers, and hyphens. **This is permanent — you cannot change it later.** |
| **Display name** | Your name or handle — this can be changed later |
| **Description** | Optional. A line about yourself. |
| **Website** | Optional. Your GitHub profile URL. |

6. Click **Create**

You will land on your publisher dashboard. Keep note of the publisher ID you just chose.

### 6A — Add your publisher ID to package.json

Open `package.json` and replace the placeholder:

```json
"publisher": "your-publisher-id"
```

Save, commit, and push:

```bash
git add package.json
git commit -m "Add publisher ID"
git push
```

---

## Step 7 — Set Up Azure DevOps and Generate a Token

The marketplace uses Azure DevOps to verify your identity when publishing. You need to generate a Personal Access Token (PAT) — think of it as a secure password for the `vsce` publishing tool.

### 7A — Set up Azure DevOps (one time)

1. Go to [dev.azure.com](https://dev.azure.com)
2. Sign in with the **same Microsoft account** you used in Step 5
3. If this is your first time, you will be prompted to create an organization:
   - Click **Create new organization**
   - Accept the terms
   - Give it any name (e.g. your username) — it does not matter
   - Choose the region closest to you
   - Click **Continue**
4. It may ask you to create a project — type any name (e.g. `extensions`) and click **Create project**. You will never actually use this project. It just needs to exist.

### 7B — Generate the Personal Access Token

1. In Azure DevOps, click your **profile picture / avatar** in the top right corner
2. Click **Personal access tokens**
3. Click **+ New Token** (blue button, top right)
4. Fill in the fields:

| Field | What to enter |
|---|---|
| **Name** | `vsce-publish` |
| **Organization** | Select **All accessible organizations** from the dropdown |
| **Expiration** | 1 year (the maximum) |
| **Scopes** | Click **Custom defined** at the bottom of the form |

5. After selecting Custom defined, scroll down the scopes list until you find **Marketplace**
6. Expand it and tick **Manage** — this is the only scope you need
7. Click **Create**
8. A dialog shows your token — a long string of random characters

> **⚠️ Copy it immediately and paste it somewhere safe** (Notepad, password manager). Once you close this dialog the token is gone forever. If you lose it, just delete it and create a new one.

---

## Step 8 — Install Node.js and vsce

### 8A — Check if Node.js is installed

```bash
node --version
npm --version
```

If both print version numbers, skip to 8B.

If not, go to [nodejs.org](https://nodejs.org), download the **LTS** version, and install it.

### 8B — Install vsce

`vsce` is the official VS Code Extension CLI tool used to package and publish extensions.

```bash
npm install -g @vscode/vsce
```

Verify it installed:

```bash
vsce --version
```

---

## Step 9 — Compile Your Extension

Run this in your project folder to compile the TypeScript source into the `out/` folder:

```bash
npm run compile
```

Make sure it completes with no errors before continuing.

---

## Step 10 — Package into a .vsix File

```bash
vsce package
```

This creates a file called `codepet-0.1.0.vsix` in your project root. This is a self-contained installer for your extension.

### If you get warnings or errors

| Problem | Fix |
|---|---|
| `Missing publisher name` | Make sure `"publisher"` is set in package.json |
| `icon.png not found` | Confirm `icon.png` is in your project root and is 128×128 px |
| `Missing repository` | Make sure the `repository` field is in package.json |
| TypeScript errors | Fix them and run `npm run compile` again |

---

## Step 11 — Test the Extension Locally

Always test the `.vsix` file before publishing. This is what people will actually install.

### Install it into VS Code

```bash
code --install-extension codepet-0.1.0.vsix
```

### Reload VS Code

Press `Ctrl+Shift+P` → type **Reload Window** → press Enter.

### Test everything

Go through this checklist:

- [ ] Open a `.ts` or `.js` file — pet appears at the end of the cursor line
- [ ] Type for a few seconds — pet runs
- [ ] Type for 5+ seconds — pet switches to happy running
- [ ] Stop typing for 6 seconds — pet goes idle
- [ ] Wait 8 seconds — pet does a fidget hop
- [ ] Wait 12 seconds — pet starts wandering along the line
- [ ] Wait 25 seconds — pet falls asleep
- [ ] Add TypeScript errors — pet looks worried, then scared at 5+
- [ ] Fix all errors — pet barks to celebrate
- [ ] Press `Ctrl+Alt+B` — bark chain fires (4 barks)
- [ ] Click the status bar **🐾 CodePet** item — settings menu opens
- [ ] Switch from dog to cat in the menu — pet changes
- [ ] Toggle visibility off and on — pet hides and reappears
- [ ] Start a debug session (`F5`) — pet hides automatically

If anything is wrong, fix it in your source code, run `npm run compile`, repackage with `vsce package`, reinstall, and retest.

### Uninstall the test version when done

```bash
code --uninstall-extension your-publisher-id.codepet
```

---

## Step 12 — Log In to the Marketplace and Publish

### Log in with your PAT

```bash
vsce login your-publisher-id
```

Paste the Personal Access Token from Step 7B when prompted. You will see:

```
Successfully logged in as your-publisher-id
```

### Publish

```bash
vsce publish
```

The tool will compile, package, and upload automatically. You will see a success message with a link to your marketplace page.

Processing usually takes **5–10 minutes**. After that your extension is live at:

```
https://marketplace.visualstudio.com/items?itemName=your-publisher-id.codepet
```

---

## Step 13 — Verify Your Marketplace Page

Open the URL above and confirm:

- [ ] The dark navy banner and your icon look correct
- [ ] The README renders properly — GIF is visible at the top
- [ ] The commands table and states table are readable
- [ ] The **Changelog** tab shows your version history
- [ ] The sidebar shows your GitHub repository link and license
- [ ] The Install button works

---

## Step 14 — Publishing Updates in the Future

When you make changes and want to release a new version, follow this exact sequence every time:

**1. Make your code changes**

**2. Bump the version in package.json**

```json
"version": "0.1.1"
```

- Bug fix → `0.1.0` to `0.1.1`
- New feature → `0.1.0` to `0.2.0`
- Major rewrite → `0.1.0` to `1.0.0`

**3. Add an entry to the top of CHANGELOG.md**

```markdown
## [0.1.1] - 2026-04-15

### Fixed
- Pet no longer disappears when switching tabs

### Added
- Rabbit companion
```

**4. Compile, package, test, publish**

```bash
npm run compile
vsce package
code --install-extension codepet-0.1.1.vsix
# test it — if all good:
vsce publish
```

**5. Push to GitHub**

```bash
git add .
git commit -m "Release v0.1.1"
git push
```

### Token expiry

Your PAT expires after 1 year. When it does, go back to [dev.azure.com](https://dev.azure.com), delete the old token, create a new one following Step 7B again, and run `vsce login` again.

---

## Step 15 — Bonus: Publish to Open VSX (Optional)

Open VSX is a second marketplace used by VS Codium, Gitpod, and other VS Code-compatible editors. It takes 3 extra minutes.

1. Go to [open-vsx.org](https://open-vsx.org) and create a free account
2. Go to your account settings and generate an access token
3. Publish using the `.vsix` you already built:

```bash
npx ovsx publish codepet-0.1.0.vsix -p YOUR_OPEN_VSX_TOKEN
```

CodePet is now on both marketplaces.

---

## Full Command Reference

```bash
# One-time setup
npm install -g @vscode/vsce
vsce login your-publisher-id        # paste PAT when prompted

# Every release
npm run compile                     # compile TypeScript
vsce package                        # creates codepet-X.X.X.vsix
code --install-extension codepet-0.1.0.vsix   # test locally
code --uninstall-extension your-publisher-id.codepet  # clean up
vsce publish                        # publish to marketplace

# Push to GitHub
git add .
git commit -m "Release vX.X.X"
git push
```