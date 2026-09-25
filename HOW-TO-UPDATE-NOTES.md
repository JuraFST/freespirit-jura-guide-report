# How to add or edit a guide note

This is for updating **guide notes only** — the short explanation that shows up
next to a guide's "Inactive in 2026" badge on your report
(https://jurafst.github.io/freespirit-jura-guide-report/). You do this once
per computer, then repeat a short loop any time you want to add or change a
note.

Everything else on the report (tour numbers, the "last updated" date, layout)
comes from Dodai's side automatically — don't edit those files, see the note
at the bottom.

Do the one-time setup below on whichever computer(s) you'll use — Mac and
Windows steps are separate, the rest of the guide is the same for both once
set up.

## One-time setup — macOS

### 1. Install git

Open **Terminal** (press `Cmd+Space`, type `Terminal`, hit enter).

Check if git is already installed:

```
git --version
```

If you see a version number, skip to step 2. If not, macOS will offer to
install it for you — click Install, wait for it to finish, then run the
command again to confirm.

### 2. Install the GitHub CLI

This lets you log into GitHub from the terminal without dealing with
passwords or keys.

```
brew install gh
```

If `brew` isn't recognized, install Homebrew first from
https://brew.sh (copy the install command shown on that page into
Terminal, run it, then run the `brew install gh` command above).

Then log in:

```
gh auth login
```

Answer the prompts:
- `GitHub.com`
- `HTTPS`
- `Login with a web browser` — press enter, it gives you a code and opens
  your browser. Paste the code, log into your `JuraFST` GitHub account, and
  approve it.

If it asks "Authenticate Git with your GitHub credentials?", answer **Yes** —
this is what lets `git push` work later without asking for a password.

### 3. Install Claude Code

If the Claude desktop app you're using already shows a "Code" or terminal
option for opening a project, you can use that directly and skip this step.

Otherwise, install it manually. It needs Node.js first:

```
brew install node
```

Then install Claude Code:

```
npm install -g @anthropic-ai/claude-code
```

Confirm it installed:

```
claude --version
```

If Terminal says `command not found`, close and reopen Terminal, then try
again.

Now skip down to **Get your report's files onto your computer**, below.

## One-time setup — Windows

### 1. Install Git for Windows

Download and run the installer from https://git-scm.com/download/win.
Keep the default options during install. This also installs **Git Bash** —
use that (not PowerShell or Command Prompt) for every command in this guide,
so the commands match exactly what's written here.

Open Git Bash (search for it in the Start menu) and confirm:

```
git --version
```

### 2. Install the GitHub CLI

Download and run the installer from https://cli.github.com (or, in Git Bash:
`winget install --id GitHub.cli -e`).

Then, in Git Bash, log in:

```
gh auth login
```

Answer the prompts:
- `GitHub.com`
- `HTTPS`
- `Login with a web browser` — press enter, it gives you a code and opens
  your browser. Paste the code, log into your `JuraFST` GitHub account, and
  approve it.

If it asks "Authenticate Git with your GitHub credentials?", answer **Yes** —
this is what lets `git push` work later without asking for a password.

### 3. Install Claude Code

If the Claude desktop app you're using already shows a "Code" or terminal
option for opening a project, you can use that directly and skip this step.

Otherwise, install Node.js first from https://nodejs.org (choose the LTS
version) or in Git Bash: `winget install OpenJS.NodeJS.LTS -e`.

Then, in Git Bash, install Claude Code:

```
npm install -g @anthropic-ai/claude-code
```

Confirm it installed:

```
claude --version
```

If Git Bash says `command not found`, close and reopen it, then try again.

## Get your report's files onto your computer

Pick a folder for the project (e.g. your Desktop), then in Terminal (Mac) or
Git Bash (Windows):

```
cd ~/Desktop
gh repo clone JuraFST/freespirit-jura-guide-report
cd freespirit-jura-guide-report
```

You now have a folder called `freespirit-jura-guide-report` with the report's
files in it. You only clone it once — after this you'll just reopen this same
folder.

## Every time you want to add or edit a note

### 1. Open the folder and start Claude Code

```
cd ~/Desktop/freespirit-jura-guide-report
git pull
claude
```

`git pull` makes sure you're starting from the latest version (in case
Dodai's side pushed a data update since you last opened this).

### 2. Ask Claude, in plain language

Just type what you want, for example:

```
Add a note for Marko Marić: on leave since August 2026.
```

or

```
Update the note for Ana Anić to say she left the company in June 2026.
```

Claude Code automatically reads a set of instructions already sitting in
this project's `.claude/skills/update-guide-notes/` folder (I set this up for
you, nothing to install or configure) and will:

1. Open `data-guide-notes.js`.
2. Add or edit the entry for that guide.
3. Commit and push the change to GitHub for you.

**Important:** the guide's name has to match exactly how it appears on the
live report. If you're not sure of the exact spelling, check
https://jurafst.github.io/freespirit-jura-guide-report/ first (Guides tab)
and copy the name from there.

### 3. Confirm it went live

Wait about a minute for GitHub to rebuild the page, then reload
https://jurafst.github.io/freespirit-jura-guide-report/ and check the note
shows up under the right guide.

## What not to touch

Don't ask Claude to edit these — they're kept in sync automatically from
Dodai's side, and any change made here would just get overwritten the next
time that sync runs:

- `data-2025.js`, `data-2026.js` — the tour data itself
- `last-update.js` — the "data as of" date
- `dist/`, `index.html`, `report.css` — the report's code and styling

If you need something changed in any of those, message Antun directly.
